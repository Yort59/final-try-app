export function evaluateSignal(
  strategy: string,
  params: Record<string, number>,
  priceHistory: number[]
): { side: "buy" | "sell" | null; reason: string } {
  if (priceHistory.length < 5) return { side: null, reason: "Insufficient data" };

  const currentPrice = priceHistory[priceHistory.length - 1];

  if (strategy === "grid") {
    const lower = params.gridLower ?? currentPrice * 0.9;
    const upper = params.gridUpper ?? currentPrice * 1.1;
    const grids = params.gridLevels ?? 10;

    if (currentPrice < lower || currentPrice > upper) {
      return { side: null, reason: "Price out of grid range" };
    }

    const gridStep = (upper - lower) / grids;
    const lastPrice = priceHistory[priceHistory.length - 2] ?? currentPrice;

    const currentGridIndex = Math.floor((currentPrice - lower) / gridStep);
    const lastGridIndex = Math.floor((lastPrice - lower) / gridStep);

    if (currentGridIndex < lastGridIndex) {
      return { side: "buy", reason: `Grid level crossed down (L${currentGridIndex})` };
    } else if (currentGridIndex > lastGridIndex) {
      return { side: "sell", reason: `Grid level crossed up (L${currentGridIndex})` };
    }

    return { side: null, reason: "Inside grid level" };
  }

  // Existing strategies (SMA Crossover, RSI, etc.) remain here...
  return { side: null, reason: "No signal" };
}