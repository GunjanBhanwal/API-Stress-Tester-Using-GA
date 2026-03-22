// src/components/Header.jsx
export const chartDefaults = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#6b7280", font: { size: 10, family: "'JetBrains Mono', monospace" }, boxWidth: 10, padding: 12 },
    },
    tooltip: {
      backgroundColor: "#202020", borderColor: "#2c2c2c", borderWidth: 1,
      titleColor: "#e2e2e2", bodyColor: "#6b7280",
      titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
      bodyFont:  { family: "'JetBrains Mono', monospace", size: 11 },
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks:  { color: "#6b7280", font: { size: 9, family: "'JetBrains Mono', monospace" }, maxTicksLimit: 8 },
      grid:   { color: "#2c2c2c80" },
      border: { color: "#2c2c2c" },
    },
    y: {
      ticks:  { color: "#6b7280", font: { size: 9, family: "'JetBrains Mono', monospace" } },
      grid:   { color: "#2c2c2c80" },
      border: { color: "#2c2c2c" },
    },
  },
};

function RunningBars() {
  return (
    <div className="flex items-center gap-0.5 h-3.5">
      {[0,1,2,3].map(i => (
        <div key={i}
          className="w-0.5 h-3.5 bg-amber rounded-sm origin-bottom"
          style={{ animation: `pulse-bar 0.8s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

export function Header({ status, currentGen, totalGens, method, url, onMethodChange, onUrlChange, onRun, onStop, onDownload }) {
  const isRunning  = status === "running";
  const isComplete = status === "complete";
  const isError    = status === "error";

  const screenLabel = { idle: "01 · CONFIGURE", running: "02 · RUNNING", complete: "03 · COMPLETE", error: "— · ERROR" }[status] ?? "01 · CONFIGURE";
  const genLabel    = isRunning
    ? `GEN ${String(currentGen).padStart(2,"0")} / ${String(totalGens).padStart(2,"0")}`
    : status.toUpperCase();

  const badgeClass  = {
    idle:     "bg-dim/10     border-dim/20     text-dim",
    running:  "bg-amber/10   border-amber/20   text-amber",
    complete: "bg-success/10 border-success/20 text-success",
    error:    "bg-danger/10  border-danger/20  text-danger",
  }[status] ?? "bg-dim/10 border-dim/20 text-dim";

  const dotClass = {
    idle: "bg-dim", running: "bg-amber shadow-[0_0_8px_#f59e0b]",
    complete: "bg-success", error: "bg-danger",
  }[status] ?? "bg-dim";

  return (
    <div className="bg-surface2 border-b border-border shrink-0">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12">
        <div className="flex items-center gap-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-xs tracking-[0.2em] uppercase font-semibold text-text">
            Chaos<span className="text-amber">-Gen</span>
          </span>
          <div className="border-l border-border pl-4 text-[9px] text-dim tracking-[0.08em] font-mono">
            SCREEN {screenLabel}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && <RunningBars />}
          <div className={`flex items-center gap-2 border rounded px-3 py-1 ${badgeClass}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span className="font-mono text-[10px] tracking-widest font-medium">{genLabel}</span>
          </div>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-5 pb-2.5 pt-2 border-t border-border">
        <select
          value={method} onChange={e => onMethodChange(e.target.value)}
          className="bg-amber/10 border border-amber/30 rounded text-amber font-mono text-[10px] font-semibold px-2 py-1.5 outline-none cursor-pointer tracking-[0.06em] shrink-0"
        >
          {["POST","GET","PUT","DELETE","PATCH"].map(m => <option key={m}>{m}</option>)}
        </select>

        <input
          value={url} onChange={e => onUrlChange(e.target.value)}
          placeholder="http://target:5000/api/endpoint"
          className="flex-1 bg-surface border border-border rounded text-text font-mono text-[11px] px-2.5 py-1.5 outline-none transition-colors focus:border-amber/40"
        />

        {status === "idle" && (
          <button onClick={onRun} className="shrink-0 bg-amber text-black font-bold font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded border-0 cursor-pointer">
            ▶ Run Engine
          </button>
        )}
        {isRunning && (
          <button onClick={onStop} className="shrink-0 bg-transparent text-amber border border-amber/30 font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded cursor-pointer">
            ■ Stop
          </button>
        )}
        {isComplete && (
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onRun} className="bg-amber text-black font-bold font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded border-0 cursor-pointer">
              ↺ Re-run
            </button>
            <button onClick={onDownload} className="bg-transparent text-dim border border-border font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded cursor-pointer">
              ⬇ Report
            </button>
          </div>
        )}
        {isError && (
          <button onClick={onRun} className="shrink-0 bg-danger text-black font-bold font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 rounded border-0 cursor-pointer">
            ↺ Retry
          </button>
        )}
      </div>
    </div>
  );
}