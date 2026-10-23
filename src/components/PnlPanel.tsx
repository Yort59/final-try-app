import { useMemo } from "react";
import { TrendingUp, DollarSign, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { BotRuntimeState } from "@/lib/types";
import { realizedPnl, totalEquity, unrealizedPnl } from "@/hooks/useBot";
import { fmtUsd, pctChange } from "@/lib/market";
import { Sparkline } from "./Charts";

interface PnlPanelProps {
  runtime: BotRuntimeState;
}

export function PnlPanel({ runtime }: PnlPanelProps) {
  const equity = totalEquity(runtime);
  const unreal = unrealizedPnl(runtime);
  const realized = realizedPnl(runtime);
  const totalPnl = equity - runtime.startingCash;
  const totalPct = pctChange(runtime.startingCash, equity);

  // Fee calculation matching your trade type safety
  const totalFees = useMemo(() => {
    if (!runtime.trades) return 0;
    return runtime.trades.reduce((acc, t: any) => {
      const qty = t.size || t.amount || t.qty || 0;
      const price = t.price || 0;
      return acc + qty * price * 0.006;
    }, 0);
  }, [runtime.trades]);

  const equitySeries = useMemo(() => {
    if (!runtime.equityCurve) return [];
    return runtime.equityCurve.slice(-60).map((e) => e.value);
  }, [runtime.equityCurve]);

  return (
    <div className="space-y-4 p-4 text-white">
      {/* Signature & Circuit Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="text-xs font-medium text-slate-300">
            30% Circuit Protection & Trailing Auto-Resume Armed
          </span>
        </div>
        <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">
          Created by <strong className="text-blue-400">YORT</strong>
        </span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Profit Box */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Total Profit
              </p>
              <p
                className={`mt-2 font-mono text-2xl font-semibold ${
                  realized + unreal >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {fmtUsd(realized + unreal)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Realized: {fmtUsd(realized)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 text-slate-400">
              <TrendingUp size={18} />
            </div>
          </div>
        </div>

        {/* Total Fee Box */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Total Fees Paid
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-amber-400">
                {fmtUsd(totalFees)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Est. Coinbase Taker Fees
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 text-slate-400">
              <DollarSign size={18} />
            </div>
          </div>
        </div>

        {/* Total P&L Box */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Total P&L
              </p>
              <p
                className={`mt-2 font-mono text-2xl font-semibold ${
                  totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {fmtUsd(totalPnl)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {totalPct >= 0 ? "+" : ""}
                {totalPct.toFixed(2)}% all-time
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 text-slate-400">
              {totalPnl >= 0 ? (
                <ArrowUpRight size={18} />
              ) : (
                <ArrowDownRight size={18} />
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Equity Box */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Portfolio Equity
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-white">
                {fmtUsd(equity)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cash {fmtUsd(runtime.cash)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 text-slate-400">
              <Activity size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Price Movement & Equity Curve Graph */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Real-Time Price & Equity Movement Graph
            </h3>
            <p className="text-xs text-slate-500">
              Live tracking across grid trade ticks
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <Activity size={14} className="animate-pulse" /> Live Feed
          </span>
        </div>

        <div className="w-full h-40 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-2">
          {equitySeries.length > 1 ? (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkline
                data={equitySeries}
                color="#10b981"
                width={720}
                height={110}
              />
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono">
              Awaiting initial market price movement ticks...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}