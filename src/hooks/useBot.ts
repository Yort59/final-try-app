import { useCallback, useEffect, useRef, useState } from "react";
import type { BotConfig, BotRuntimeState, PersistedState, Trade, TradeSide } from "../lib/types";
import { loadState, saveState, resetRuntime } from "../lib/storage";
import { evaluateSignal, updateCandles } from "../lib/market";
import { seedPairData } from "../lib/types";
import { useCoinbaseLive } from "./useCoinbaseLive";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Helper function to dispatch live order requests to local Node.js server (server.js)
async function sendLiveOrder(pair: string, side: TradeSide, size: number) {
  try {
    const res = await fetch("http://192.168.1.227:8080/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pair, side, size, mode: "live" }),
    });
    const data = await res.json();
    console.log("[LIVE API ORDER SENT]:", data);
  } catch (err) {
    console.error("[LIVE API ORDER ERROR]: Could not reach server on port 8080", err);
  }
}

interface Book {
  cash: number;
  positions: Record<string, number>;
  trades: Trade[];
}

const isOpen = (t: Trade) => t.status === "open";

function closeOne(book: Book, t: Trade, price: number, note: string): void {
  if (t.side === "buy") {
    book.cash += t.qty * price;
    const left = (book.positions[t.pair] ?? 0) - t.qty;
    if (left > 1e-9) book.positions[t.pair] = left;
    else delete book.positions[t.pair];
    t.pnl = (price - t.entryPrice) * t.qty;
  } else {
    book.cash += t.qty * (2 * t.entryPrice - price);
    t.pnl = (t.entryPrice - price) * t.qty;
  }
  t.exitPrice = price;
  t.closedAt = Date.now();
  t.status = "closed";
  t.reason = `${t.reason}\n${note}`;
}

function openLong(book: Book, pair: string, price: number, size: number, reason: string, auto: boolean): void {
  const qty = size / price;
  book.cash -= size;
  book.positions[pair] = (book.positions[pair] ?? 0) + qty;
  book.trades.push({
    id: uid(),
    pair,
    side: "buy",
    qty,
    entryPrice: price,
    exitPrice: null,
    openedAt: Date.now(),
    closedAt: null,
    pnl: null,
    reason,
    auto,
    status: "open",
  });
}

function buySize(config: BotConfig, book: Book, prices: Record<string, number>): number {
  const wanted = config.autoReinvest ? (equityOf(book, prices) * config.reinvestPct) / 100 : config.tradeSize;
  if (!config.autoReinvest && book.cash < wanted) return 0;
  const size = Math.min(wanted, book.cash);
  return size >= 1 ? size : 0;
}

function equityOf(book: Book, prices: Record<string, number>): number {
  return book.cash + Object.entries(book.positions).reduce((sum, [pair, qty]) => sum + qty * (prices[pair] ?? 0), 0);
}

export interface BotController {
  config: BotConfig;
  runtime: BotRuntimeState;
  running: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  updateConfig: (patch: Partial<BotConfig>) => void;
  updateParams: (patch: Record<string, number>) => void;
  setStartingBalance: (amount: number) => void;
  manualTrade: (pair: string, side: TradeSide) => void;
  closeTrade: (id: string) => void;
  togglePair: (symbol: string) => void;
  livePairs: string[];
  liveBalance: number | null;
}

export function useBot(livePrice?: number | null): BotController {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;
  const intervalRef = useRef<number | null>(null);

  // Fetch live pairs and balance from Coinbase backend hook
  const { livePairs, liveBalance } = useCoinbaseLive(state.config.tradingMode);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const tick = useCallback(() => {
    setState((prev) => {
      const { config, runtime } = prev;
      if (!runtime.running) return prev;

      const book: Book = {
        cash: runtime.cash,
        positions: { ...runtime.positions },
        trades: runtime.trades.map((t) => ({ ...t })),
      };
      const prices = { ...runtime.prices };
      const priceHistory = { ...runtime.priceHistory };
      const candleHistory = { ...runtime.candleHistory };
      let lastSignal = runtime.lastSignal;

      const active = new Set([...config.pairs, ...book.trades.filter(isOpen).map((t) => t.pair)]);
      for (const pair of active) {
        if (prices[pair] == null) continue;
        
        let next = prices[pair];
        if (pair === "BTC-USD" && livePrice != null && !isNaN(livePrice)) {
          next = livePrice;
        } else {
          next = prices[pair] * (1 + (Math.random() - 0.49) * 0.005);
        }

        prices[pair] = next;
        priceHistory[pair] = [...(priceHistory[pair] ?? []).slice(-199), next];
        candleHistory[pair] = updateCandles(candleHistory[pair] ?? [], next);
      }

      for (const t of book.trades) {
        if (!isOpen(t)) continue;
        const price = prices[t.pair];
        if (price == null) continue;
        const dir = t.side === "buy" ? 1 : -1;
        const stop = t.entryPrice * (1 - (dir * config.stopLossPct) / 100);
        const target = t.entryPrice * (1 + (dir * config.takeProfitPct) / 100);
        const hitStop = dir === 1 ? price <= stop : price >= stop;
        const hitTarget = dir === 1 ? price >= target : price <= target;
        if (hitStop) {
          closeOne(book, t, price, "Stop-loss hit");
          if (config.tradingMode === "live") {
            sendLiveOrder(t.pair, "sell", t.qty * price);
          }
        } else if (hitTarget) {
          closeOne(book, t, price, "Take-profit hit");
          if (config.tradingMode === "live") {
            sendLiveOrder(t.pair, "sell", t.qty * price);
          }
        }
      }

      if (config.strategy !== "manual") {
        for (const pair of config.pairs) {
          const price = prices[pair];
          if (price == null) continue;
          const sig = evaluateSignal(
            config.strategy,
            config.params,
            priceHistory[pair] ?? [],
          );

          if (sig.side === "sell") {
            const longs = book.trades.filter((t) => isOpen(t) && t.pair === pair && t.side === "buy");
            if (longs.length > 0) {
              for (const t of longs) {
                closeOne(book, t, price, sig.reason);
                if (config.tradingMode === "live") {
                  sendLiveOrder(t.pair, "sell", t.qty * price);
                }
              }
              lastSignal = { pair, side: "sell", reason: sig.reason, at: Date.now() };
            }
          } else if (sig.side === "buy") {
            const openCount = book.trades.filter(isOpen).length;
            const alreadyOpen = book.trades.some((t) => isOpen(t) && t.pair === pair);
            if (!alreadyOpen && openCount < config.maxOpenTrades) {
              const size = buySize(config, book, prices);
              if (size > 0) {
                openLong(book, pair, price, size, sig.reason, true);
                lastSignal = { pair, side: "buy", reason: sig.reason, at: Date.now() };
                if (config.tradingMode === "live") {
                  sendLiveOrder(pair, "buy", size);
                }
              }
            }
          }
        }
      }

      const equity = equityOf(book, prices);
      const equityCurve = [...runtime.equityCurve, { t: Date.now(), value: equity }].slice(-240);

      return {
        config,
        runtime: {
          ...runtime,
          prices,
          priceHistory,
          candleHistory,
          positions: book.positions,
          trades: book.trades,
          cash: book.cash,
          equityCurve,
          lastSignal,
          tickCount: runtime.tickCount + 1,
        },
      };
    });
  }, [livePrice]);

  const start = useCallback(() => {
    setState((prev) => ({ ...prev, runtime: { ...prev.runtime, running: true } }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, runtime: { ...prev.runtime, running: false } }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      config: prev.config,
      runtime: { ...resetRuntime(prev.config), running: false },
    }));
  }, []);

  const updateConfig = useCallback((patch: Partial<BotConfig>) => {
    setState((prev) => ({ ...prev, config: { ...prev.config, ...patch } }));
  }, []);

  const updateParams = useCallback((patch: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, params: { ...prev.config.params, ...patch } },
    }));
  }, []);

  const setStartingBalance = useCallback((amount: number) => {
    setState((prev) => {
      if (!(amount > 0)) return prev;
      const config = { ...prev.config, startingBalance: amount };
      if (prev.runtime.trades.length > 0) return { ...prev, config };
      return {
        config,
        runtime: { ...prev.runtime, cash: amount, startingCash: amount, equityCurve: [{ t: Date.now(), value: amount }] },
      };
    });
  }, []);

  const manualTrade = useCallback((pair: string, side: TradeSide) => {
    setState((prev) => {
      const { config, runtime } = prev;
      const price = runtime.prices[pair];
      if (!price) return prev;
      const book: Book = {
        cash: runtime.cash,
        positions: { ...runtime.positions },
        trades: runtime.trades.map((t) => ({ ...t })),
      };

      if (side === "buy") {
        const size = buySize(config, book, runtime.prices);
        if (size <= 0) return prev;
        openLong(book, pair, price, size, "Manual buy", false);
        if (config.tradingMode === "live") {
          sendLiveOrder(pair, "buy", size);
        }
      } else {
        const longs = book.trades.filter((t) => isOpen(t) && t.pair === pair && t.side === "buy");
        if (longs.length === 0) return prev;
        for (const t of longs) {
          closeOne(book, t, price, "Manual close");
          if (config.tradingMode === "live") {
            sendLiveOrder(pair, "sell", t.qty * price);
          }
        }
      }

      return {
        config,
        runtime: {
          ...runtime,
          positions: book.positions,
          trades: book.trades,
          cash: book.cash,
          equityCurve: [...runtime.equityCurve, { t: Date.now(), value: equityOf(book, runtime.prices) }].slice(-240),
          lastSignal: { pair, side, reason: "Manual order", at: Date.now() },
        },
      };
    });
  }, []);

  const closeTrade = useCallback((id: string) => {
    setState((prev) => {
      const { runtime, config } = prev;
      if (!runtime.trades.some((t) => t.id === id && isOpen(t))) return prev;
      const book: Book = {
        cash: runtime.cash,
        positions: { ...runtime.positions },
        trades: runtime.trades.map((t) => ({ ...t })),
      };
      const t = book.trades.find((x) => x.id === id)!;
      const price = runtime.prices[t.pair];
      if (price == null) return prev;
      closeOne(book, t, price, "Manual close");
      if (config.tradingMode === "live") {
        sendLiveOrder(t.pair, "sell", t.qty * price);
      }
      return {
        config,
        runtime: {
          ...runtime,
          positions: book.positions,
          trades: book.trades,
          cash: book.cash,
          equityCurve: [...runtime.equityCurve, { t: Date.now(), value: equityOf(book, runtime.prices) }].slice(-240),
        },
      };
    });
  }, []);

  const togglePair = useCallback((symbol: string) => {
    setState((prev) => {
      const has = prev.config.pairs.includes(symbol);
      if (has && prev.config.pairs.length === 1) return prev;
      const pairs = has ? prev.config.pairs.filter((p) => p !== symbol) : [...prev.config.pairs, symbol];
      let runtime = prev.runtime;
      if (!has && runtime.prices[symbol] == null) {
        const seed = seedPairData(symbol);
        runtime = {
          ...runtime,
          prices: { ...runtime.prices, [symbol]: seed.price },
          priceHistory: { ...runtime.priceHistory, [symbol]: seed.history },
          candleHistory: { ...runtime.candleHistory, [symbol]: seed.candles },
        };
      }
      return { config: { ...prev.config, pairs }, runtime };
    });
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = window.setInterval(() => {
      if (stateRef.current.runtime.running) tick();
    }, 1200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  return {
    config: state.config,
    runtime: state.runtime,
    running: state.runtime.running,
    start,
    stop,
    reset,
    updateConfig,
    updateParams,
    setStartingBalance,
    manualTrade,
    closeTrade,
    togglePair,
    livePairs,
    liveBalance,
  };
}

export function totalEquity(runtime: BotRuntimeState): number {
  return (
    runtime.cash +
    Object.entries(runtime.positions).reduce((s, [pair, qty]) => s + qty * (runtime.prices[pair] ?? 0), 0)
  );
}

export function unrealizedPnl(runtime: BotRuntimeState): number {
  let total = 0;
  for (const t of runtime.trades) {
    if (t.status !== "open") continue;
    const price = runtime.prices[t.pair] ?? t.entryPrice;
    if (t.side === "buy") total += (price - t.entryPrice) * t.qty;
    else total += (t.entryPrice - price) * t.qty;
  }
  return total;
}

export function realizedPnl(runtime: BotRuntimeState): number {
  return runtime.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
}