import { useState, useEffect } from "react";

const BACKEND_URL = "";

export function useCoinbaseLive(tradingMode:"live") {
  const [livePairs, setLivePairs] = useState<string[]>([]);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch available trading pairs from the backend
    fetch("/api/trade", {
      method: "GET",
    })
      .then((res: Response

      ) => res.json())
      .then((data: any) => {
        if (data.success && data.pairs) {
          setLivePairs(data.pairs);
        }
      })
      .catch((err: any) => console.error("Error fetching Coinbase pairs:", err));

    // 2. Fetch account balance from the backend
    fetch(`${BACKEND_URL}/api/coinbase/accounts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Absolute override: If the backend calculated a combined total balance, force-apply it right away
          if (data.availableBalance !== undefined && data.availableBalance !== null) {
            setLiveBalance(Number(data.availableBalance));
          } else if (data.accounts && data.accounts.length > 0) {
            const usdAccount = data.accounts.find(
              (acc: any) => acc.currency === "USD" || acc.currency === "USDC"
            );
            if (usdAccount && usdAccount.available_balance) {
              setLiveBalance(parseFloat(usdAccount.available_balance.value));
            }
          }
        }
      })
      .catch((err: any) => console.error("Error fetching Coinbase balances:", err));
  }, [tradingMode]);

  return { livePairs, liveBalance };
}
