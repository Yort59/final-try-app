import { Dashboard } from "./components/Dashboard";
import { BotPanel } from "./components/BotPanel";
import TradesPanel from "./components/TradesPanel";
import { useBot } from "./hooks/useBot";

export default function App() {
  const { config, runtime, running, start, stop, reset, updateConfig, updateParams, setStartingBalance, togglePair } = useBot();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Alphabot ADVANCED
          </h1>
          <p className="text-xs text-slate-400">
            Coinbase High-Frequency Automated Grid & Circuit Order Engine
          </p>
        </div>
      </header>

      {/* Real-Time Stats, Price Movement Graph, Total Profit, Total Fees & YORT Branding */}
      <Dashboard runtime={runtime} />

      {/* Bot Configuration: Trading Pairs, Strategy, Capital, Grid Parameters */}
      <BotPanel
        config={config}
        runtime={runtime}
        running={running}
        onStart={start}
        onStop={stop}
        onReset={reset}
        onUpdateConfig={updateConfig}
        onUpdateParams={updateParams}
        onSetStartingBalance={setStartingBalance}
        onTogglePair={togglePair}
      />

      {/* Open Orders & Trade History Panel */}
      <TradesPanel runtime={runtime} />
    </div>
  );
}