import { useState } from "react";
import { X } from "lucide-react";
import type { BotRuntimeState, Trade } from "../lib/types";
import { fmtPrice, fmtUsd } from "../lib/market";

interface TradesPanelProps {
  runtime: BotRuntimeState;
}

export function TradesPanel({ runtime }: TradesPanelProps) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const open = runtime.trades.filter((t) => t.status === "open").reverse();
  const closed = runtime.trades.filter((t) => t.status === "closed").reverse();
  const list = tab === "open" ? open : closed;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 p-4">
        <h2 className="text-sm font-semibold text-white">Trades</h2>
        <div className="flex rounded-lg bg-slate-800/60 p-0.5 text-xs">
          <button
            onClick={() => setTab("open")}
            className={`rounded-md px-3 py-1 transition-colors ${
              tab === "open" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Open ({open.length})
          </button>
          <button
            onClick={() => setTab("closed")}
            className={`rounded-md px-3 py-1 transition-colors ${
              tab === "closed" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            History ({closed.length})
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto no-scrollbar">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {tab === "open"
              ? "No open positions. Active trades will populate automatically from Coinbase."
              : "Closed trades will appear here."}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {list.map((t) => (
              <TradeRow
                key={t.id}
                trade={t}
                price={runtime.prices[t.pair]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  price,
}: {
  trade: Trade;
  price: number | undefined;
}) {
  const isBuy = trade.side === "buy";
  const px = price ?? trade.exitPrice ?? trade.entryPrice;
  const livePnl =
    trade.status === "open"
      ? isBuy
        ? (px - trade.entryPrice) * trade.qty
        : (trade.entryPrice - px) * trade.qty
      : trade.pnl ?? 0;
  const pct =
    ((px - trade.entryPrice) / trade.entryPrice) * 100 * (isBuy ? 1 : -1);

  return (
    <div className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-800/30">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
          isBuy
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-rose-500/15 text-rose-400"
        }`}
      >
        {isBuy ? "B" : "S"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono-num text-sm font-medium text-white">
            {trade.pair}
          </p>
          {trade.auto ? (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-blue-400">
              Auto
            </span>
          ) : (
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-300">
              Manual
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-slate-500">{trade.reason}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-mono-num text-xs text-slate-400">
          Entry ${fmtPrice(trade.entryPrice)}
        </p>
        <p className="font-mono-num text-xs text-slate-500">
          Qty {trade.qty.toFixed(trade.qty < 1 ? 4 : 3)}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-mono-num text-sm font-medium ${
            livePnl >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {livePnl >= 0 ? "+" : ""}
          {fmtUsd(livePnl)}
        </p>
        <p
          className={`font-mono-num text-[11px] ${
            livePnl >= 0 ? "text-emerald-500/70" : "text-rose-500/70"
          }`}
        >
          {trade.status === "open"
            ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
            : "closed"}
        </p>
      </div>
    </div>
  );
}

export default TradesPanel;