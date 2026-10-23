export type TradeSide = "buy" | "sell";

// 1. Explicitly added the missing Candle interface definition
export interface Candle {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
}

export const ALL_PAIRS = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"];

export interface Trade {
  id: string;
  pair: string;
  side: TradeSide;
  qty: number;
  entryPrice: number;
  exitPrice: number | null;
  openedAt: number;
  closedAt: number | null;
  pnl: number | null;
  reason: string;
  auto: boolean;
  status: "open" | "closed";
}

export interface BotConfig {
  pairs: string[];
  strategy: "sma" | "rsi" | "grid" | "manual";
  tradeSize: number;
  autoReinvest: boolean;
  reinvestPct: number;
  maxOpenTrades: number;
  stopLossPct: number;
  takeProfitPct: number;
  tradingMode: "live";
  startingBalance: number;
  params: {
    smaFast?: number;
    smaSlow?: number;
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    gridLower?: number;
    gridUpper?: number;
    gridLevels?: number;
    [key: string]: number | undefined;
  };
}

export const DEFAULT_CONFIG: BotConfig = {
  pairs: ["BTC-USD", "ETH-USD"],
  strategy: "sma",
  tradeSize: 100,
  autoReinvest: false,
  reinvestPct: 50,
  maxOpenTrades: 5,
  stopLossPct: 2,
  takeProfitPct: 4,
  tradingMode: "live",
  startingBalance: 10,
  params: {
    smaFast: 9,
    smaSlow: 21,
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    gridLower: 60000,
    gridUpper: 80000,
    gridLevels: 10,
  },
};

export interface BotRuntimeState {
  running: boolean;
  cash: number;
  startingCash: number;
  positions: Record<string, number>;
  trades: Trade[];
  prices: Record<string, number>;
  priceHistory: Record<string, number[]>;
  candleHistory: Record<string, Candle[]>; // 2. Updated from any[] to Candle[]
  equityCurve: { t: number; value: number }[];
  lastSignal: { pair: string; side: TradeSide; reason: string; at: number } | null;
  tickCount: number;
}

export function makeInitialRuntime(startingBalance = 10): BotRuntimeState {
  return {
    running: false,
    cash: startingBalance,
    startingCash: startingBalance,
    positions: {},
    trades: [],
    prices: {},
    priceHistory: {},
    candleHistory: {},
    equityCurve: [{ t: Date.now(), value: startingBalance }],
    lastSignal: null,
    tickCount: 0,
  };
}

export interface PersistedState {
  config: BotConfig;
  runtime: BotRuntimeState;
}

export function seedPairData(symbol: string) {
  let basePrice = 67000;
  if (symbol.includes("ETH")) basePrice = 3500;
  if (symbol.includes("SOL")) basePrice = 150;
  if (symbol.includes("XRP")) basePrice = 0.55;

  const history: number[] = [];
  let current = basePrice;
  for (let i = 0; i < 50; i++) {
    current = current * (1 + (Math.random() - 0.49) * 0.005);
    history.push(current);
  }

  return {
    price: current,
    history,
    candles: [],
  };
}
