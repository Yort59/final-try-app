import { BotPanel } from "./BotPanel";
import { TradesPanel } from "./TradesPanel";
import { useBot, totalEquity, unrealizedPnl, realizedPnl } from "../hooks/useBot";
import { fmtUsd, pctChange } from "../lib/market";
import { Wallet } from "lucide-react";

// Universal star imports to completely stop Vite/esbuild compile crashes
import * as ChartsModule from "./Charts";
import * as MarketWatchModule from "./MarketWatch";

// Dynamic fallbacks: extracts the correct component automatically whether it's default or named
const ChartComponent = (ChartsModule as any).ChartBox || (ChartsModule as any).Charts || (ChartsModule as any).default || (() => null);
const MarketWatchComponent = (MarketWatchModule as any).MarketWatch || (MarketWatchModule as any).default || (() => null);

export function Dashboard() {
  const bot = useBot();
  const { config, runtime, running, livePairs, liveBalance } = bot;

  const equity = totalEquity(runtime);
  const uPnl = unrealizedPnl(runtime);
  const rPnl = realizedPnl(runtime);
  const totalProfit = uPnl + rPnl;
  const profitPct = pctChange(runtime.startingCash, equity);

  const displayBalance = liveBalance !== null ? liveBalance : runtime.cash;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans space-y-6">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">AlphaBot ADVANCED</h1>
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
              Coinbase Live
            </span>
          </div>
          <p className="text-xs text-slate-400">Automated Grid & Strategy Engine</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-slate-300">Bot: {running ? "Running" : "Idle"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs">
            <Wallet size={14} className="text-emerald-400" />
            <span className="text-slate-400">Live Balance:</span>
            <span className="font-mono text-white font-medium">{fmtUsd(displayBalance)}</span>
          </div>
        </div>
      </header>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Total Portfolio Equity</p>
          <p className="text-xl font-bold font-mono text-white mt-1">{fmtUsd(equity)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Cash: {fmtUsd(runtime.cash)}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Total P&L</p>
          <p className={`text-xl font-bold font-mono mt-1 ${totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtUsd(totalProfit)} ({profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}%)
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Realized: {fmtUsd(rPnl)}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Active Positions</p>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {Object.keys(runtime.positions).length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Open trades: {runtime.trades.filter(t => t.status === "open").length}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
          <p className="text-xs text-slate-400">Active Strategy</p>
          <p className="text-xl font-bold font-mono text-blue-400 uppercase mt-1">
            {config.strategy}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Ticks processed: {runtime.tickCount}</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BotPanel
            config={config}
            runtime={runtime}
            running={running}
            onStart={bot.start}
            onStop={bot.stop}
            onReset={bot.reset}
            onUpdateConfig={bot.updateConfig}
            onUpdateParams={bot.updateParams}
            onSetStartingBalance={bot.setStartingBalance}
            livePairs={livePairs}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
            <ChartComponent runtime={runtime} config={config} />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
            <MarketWatchComponent runtime={runtime} config={config} onTogglePair={bot.togglePair} />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
           <TradesPanel runtime={runtime} />

          </div>
        </div>
      </div>
    </div>
  );
}
