import { useEffect, useState } from "react";
import { Bot, Pause, Play, RotateCcw, Wallet } from "lucide-react";
import type { BotConfig, BotRuntimeState } from "../lib/types";
import { ALL_PAIRS } from "../lib/types";
import { totalEquity } from "../hooks/useBot";

interface BotPanelProps {
  config: BotConfig;
  runtime: BotRuntimeState;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUpdateConfig: (patch: Partial<BotConfig>) => void;
  onUpdateParams: (patch: Record<string, number>) => void;
  onSetStartingBalance: (amount: number) => void;
  livePairs?: string[];
}

export function BotPanel({
  config, runtime, running, onStart, onStop, onReset, onUpdateConfig, onUpdateParams, onSetStartingBalance, livePairs,
}: BotPanelProps) {
  const currentPair = config.pairs[0] ?? "BTC-USD";
  const availablePairs = (livePairs && livePairs.length > 0) ? livePairs : ALL_PAIRS;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-2 ${running ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
          <Bot size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white">Grid Trading Bot</h2>
          <p className="text-xs text-slate-500">{running ? `Running • tick #${runtime.tickCount}` : "Idle"}</p>
        </div>
        {running ? (
          <button onClick={onStop} className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/25">
            <Pause size={14} /> Stop
          </button>
        ) : (
          <button onClick={onStart} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25">
            <Play size={14} /> Start
          </button>
        )}
        <button onClick={onReset} title="Reset account & trades" className="rounded-lg bg-slate-800 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* 1. Coinbase Trading Pair Dropdown */}
      <div className="border-t border-slate-800/80 pt-4">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Trading Pair</label>
        <select
          value={currentPair}
          onChange={(e) => onUpdateConfig({ pairs: [e.target.value] })}
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
        >
          {availablePairs.map((pair) => {
            const pairStr = typeof pair === "string" ? pair : (pair as any).symbol;
            return (
              <option key={pairStr} value={pairStr}>
                {pairStr}
              </option>
            );
          })}
        </select>
      </div>

      {/* 2. Low Price & High Price (Grid Range) */}
      <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4">
        <NumberField
          label="Low Price ($)"
          value={config.params.gridLower ?? 60000}
          onCommit={(v) => onUpdateParams({ gridLower: v })}
        />
        <NumberField
          label="High Price ($)"
          value={config.params.gridUpper ?? 80000}
          onCommit={(v) => onUpdateParams({ gridUpper: v })}
        />
      </div>

      {/* 3. Investment & Capital */}
      <div className="space-y-3 border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          <Wallet size={12} /> Investment & Capital
        </div>
        <NumberField
          label="Starting Balance / Investment"
          prefix="$"
          value={config.startingBalance}
          onCommit={onSetStartingBalance}
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs text-slate-300">Auto-reinvest Profits</p>
            <p className="text-[11px] text-slate-500">Compound gains automatically</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.autoReinvest}
            onClick={() => onUpdateConfig({ autoReinvest: !config.autoReinvest })}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${config.autoReinvest ? "bg-emerald-500" : "bg-slate-700"}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${config.autoReinvest ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 4. Grid Count */}
      <div className="border-t border-slate-800/80 pt-4">
        <Field label="Grid Count (Levels)" value={String(config.params.gridLevels ?? 10)}>
          <input
            type="range"
            min={2}
            max={50}
            step={1}
            value={config.params.gridLevels ?? 10}
            onChange={(e) => onUpdateParams({ gridLevels: Number(e.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-blue-500"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono-num text-slate-200">{value}</span>
      </div>
      {children}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  prefix?: string;
  suffix?: string;
  max?: number;
  hint?: string;
}

function NumberField({ label, value, onCommit, prefix, suffix, max, hint }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const change = (raw: string) => {
    setText(raw);
    const v = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(v) && v >= 0 && (max == null || v <= max)) {
      onCommit(v);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 px-3 focus-within:border-blue-500/60">
        {prefix && <span className="mr-1 text-sm text-slate-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          value={text}
          onChange={(e) => change(e.target.value)}
          onBlur={() => setText(String(value))}
          className="font-mono-num w-full bg-transparent py-2 text-sm text-white outline-none"
        />
        {suffix && <span className="ml-1 text-sm text-slate-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}