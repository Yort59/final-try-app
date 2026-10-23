import { ALL_PAIRS, type Candle, type BotConfig } from "./types";

export function stepPrice(symbol: string, prevPrice: number): number {
  const vol = 0.002;
  const drift = 0;
  const meanReversion = 0;

  const shock = (Math.random() - 0.5) * 2 * vol;
  const next = prevPrice * (1 + shock + drift + meanReversion);
  
  return Math.max(0.00001, next);
}

export function updateCandles(candles: Candle[], price: number, windowMs = 5000): Candle[] {
  const now = Date.now();
  const last = candles[candles.length - 1];
  if (!last) {
    return [...candles, { t: now, o: price, h: price, l: price, c: price }].slice(-120);
  }
  if (now - last.t >= windowMs) {
    return [...candles.slice(-119), { t: now, o: price, h: price, l: price, c: price }];
  }
  const updated: Candle = {
    ...last,
    c: price,
    h: Math.max(last.h, price),
    l: Math.min(last.l, price),
  };
  return [...candles.slice(0, -1), updated];
}

export function sma(values: number[], window: number): number | null {
  if (values.length < window) return null;
  let sum = 0;
  for (let i = values.length - window; i < values.length; i++) sum += values[i];
  return sum / window;
}

export function rsi(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function channel(values: number[], window: number): { high: number | null; low: number | null } {
  if (values.length < window + 1) return { high: null, low: null };
  const slice = values.slice(values.length - window - 1, values.length - 1);
  return { high: Math.max(...slice), low: Math.min(...slice) };
}

export interface Signal {
  side: "buy" | "sell" | null;
  reason: string;
}

export function evaluateSignal(
  strategy: BotConfig["strategy"],
  params: BotConfig["params"],
  history: number[],
): Signal {
  if (strategy === "manual") return { side: null, reason: "Manual mode" };
  if (history.length < 5) return { side: null, reason: "Insufficient data" };

  const currentPrice = history[history.length - 1];

  // 1. SMA Strategy
  if (strategy === "sma") {
    const fast = sma(history, Math.round(params.smaFast ?? 9));
    const slow = sma(history, Math.round(params.smaSlow ?? 21));
    if (fast == null || slow == null) return { side: null, reason: "Warming up" };
    const prevFast = sma(history.slice(0, -1), Math.round(params.smaFast ?? 9));
    const prevSlow = sma(history.slice(0, -1), Math.round(params.smaSlow ?? 21));
    if (prevFast == null || prevSlow == null) return { side: null, reason: "Warming up" };
    if (prevFast <= prevSlow && fast > slow) return { side: "buy", reason: "Fast SMA crossed above slow SMA" };
    if (prevFast >= prevSlow && fast < slow) return { side: "sell", reason: "Fast SMA crossed below slow SMA" };
    return { side: null, reason: fast > slow ? "Uptrend, holding" : "Downtrend, no position" };
  }

  // 2. RSI Strategy
  if (strategy === "rsi") {
    const r = rsi(history, Math.round(params.rsiPeriod ?? 14));
    if (r == null) return { side: null, reason: "Warming up" };
    const oversold = params.rsiOversold ?? 30;
    const overbought = params.rsiOverbought ?? 70;
    if (r < oversold) return { side: "buy", reason: `RSI ${r.toFixed(1)} oversold` };
    if (r > overbought) return { side: "sell", reason: `RSI ${r.toFixed(1)} overbought` };
    return { side: null, reason: `RSI ${r.toFixed(1)} neutral` };
  }

  // 3. Grid Strategy
  if (strategy === "grid") {
    const lower = params.gridLower ?? 60000;
    const upper = params.gridUpper ?? 80000;
    const grids = params.gridLevels ?? 10;

    if (currentPrice <= lower) return { side: "buy", reason: "Hit grid absolute lower bound" };
    if (currentPrice >= upper) return { side: "sell", reason: "Hit grid absolute upper bound" };

    const lastPrice = history[history.length - 2] ?? currentPrice;
    const gridStep = (upper - lower) / grids;

    const currentGridIndex = Math.floor((currentPrice - lower) / gridStep);
    const lastGridIndex = Math.floor((lastPrice - lower) / gridStep);

    if (currentGridIndex < lastGridIndex) {
      return { side: "buy", reason: `Grid level crossed down (L${currentGridIndex})` };
    } else if (currentGridIndex > lastGridIndex) {
      return { side: "sell", reason: `Grid level crossed up (L${currentGridIndex})` };
    }

    return { side: null, reason: "Inside grid level bounds" };
  }

  return { side: null, reason: "Idle" };
}

export function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export function fmtUsd(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

export { ALL_PAIRS };
