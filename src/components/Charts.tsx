import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
  fill?: boolean;
  strokeWidth?: number;
}

export function Sparkline({ data, color, height = 40, width = 120, fill = true, strokeWidth = 1.5 }: SparklineProps) {
  const { path, area } = useMemo(() => {
    if (data.length < 2) return { path: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return [x, y] as const;
    });
    const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const area = `${path} L${width} ${height} L0 ${height} Z`;
    return { path, area };
  }, [data, width, height]);

  if (!path) return <div style={{ height, width }} className="text-gray-600 text-[10px] flex items-center justify-center">—</div>;

  const gid = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface CandleChartProps {
  candles: { o: number; h: number; l: number; c: number }[];
  height?: number;
}

export function CandleChart({ candles, height = 260 }: CandleChartProps) {
  const view = useMemo(() => candles.slice(-60), [candles]);
  const { min, max } = useMemo(() => {
    if (!view.length) return { min: 0, max: 1 };
    let mn = Infinity;
    let mx = -Infinity;
    for (const c of view) {
      mn = Math.min(mn, c.l);
      mx = Math.max(mx, c.h);
    }
    const pad = (mx - mn) * 0.08;
    return { min: mn - pad, max: mx + pad };
  }, [view]);

  const W = 800;
  const H = height;
  const padLeft = 8;
  const padRight = 64;
  const chartW = W - padLeft - padRight;
  const chartH = H - 24;
  const range = max - min || 1;
  const cw = chartW / view.length;
  const bodyW = Math.max(2, cw * 0.6);

  const y = (v: number) => 8 + chartH - ((v - min) / range) * chartH;

  const lastPrice = view.length ? view[view.length - 1].c : 0;
  const prevPrice = view.length > 1 ? view[view.length - 2].c : lastPrice;
  const up = lastPrice >= prevPrice;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padLeft} x2={W - padRight} y1={8 + chartH * f} y2={8 + chartH * f} stroke="#1a2030" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        {view.map((c, i) => {
          const cx = padLeft + i * cw + cw / 2;
          const isUp = c.c >= c.o;
          const color = isUp ? "#22c55e" : "#ef4444";
          const yo = y(c.o);
          const yc = y(c.c);
          const top = Math.min(yo, yc);
          const h = Math.max(1.5, Math.abs(yo - yc));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={h} fill={color} rx="1" />
            </g>
          );
        })}
        {view.length > 0 && (
          <g>
            <line
              x1={padLeft}
              x2={W - padRight}
              y1={y(lastPrice)}
              y2={y(lastPrice)}
              stroke={up ? "#22c55e" : "#ef4444"}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.7"
            />
            <rect x={W - padRight + 2} y={y(lastPrice) - 9} width={padRight - 4} height={18} rx="3" fill={up ? "#22c55e" : "#ef4444"} />
            <text x={W - padRight / 2} y={y(lastPrice) + 4} textAnchor="middle" fontSize="11" fill="#0a0e17" className="font-mono-num" fontWeight="600">
              {lastPrice >= 1000 ? lastPrice.toFixed(0) : lastPrice.toFixed(3)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function PnlChart({ data, height = 120 }: { data: number[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-slate-500">
        Close a trade to see your realized P&amp;L curve
      </div>
    );
  }
  const W = 600;
  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => height - 4 - ((v - min) / range) * (height - 8);
  const zero = y(0);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const color = data[data.length - 1] >= 0 ? "#22c55e" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full">
      <line x1={0} x2={W} y1={zero} y2={zero} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
      <path d={`${line} L${W} ${zero} L0 ${zero} Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
