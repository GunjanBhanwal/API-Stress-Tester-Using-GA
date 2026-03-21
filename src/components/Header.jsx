export const T = {
  bg:       "#0a0a0a",
  surface:  "#111111",
  surface2: "#181818",
  surface3: "#202020",
  border:   "#2c2c2c",
  borderHi: "#3a3a3a",
  text:     "#e2e2e2",
  textDim:  "#6b7280",
  amber:    "#f59e0b",
  red:      "#f87171",
  blue:     "#60a5fa",
  green:    "#4ade80",
  purple:   "#a78bfa",
  mono:     "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
};

// ── Chart Defaults (shared via import) ────────────────────────────────────────
export const chartDefaults = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: T.textDim,
        font: { size: 10, family: T.mono },
        boxWidth: 10,
        padding: 12,
      },
    },
    tooltip: {
      backgroundColor: T.surface3,
      borderColor: T.border,
      borderWidth: 1,
      titleColor: T.text,
      bodyColor: T.textDim,
      titleFont: { family: T.mono, size: 11 },
      bodyFont: { family: T.mono, size: 11 },
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: T.textDim, font: { size: 9, family: T.mono }, maxTicksLimit: 8 },
      grid: { color: T.border + "80" },
      border: { color: T.border },
    },
    y: {
      ticks: { color: T.textDim, font: { size: 9, family: T.mono } },
      grid: { color: T.border + "80" },
      border: { color: T.border },
    },
  },
};

// ── Global CSS (injected once by Index) ───────────────────────────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: ${T.mono}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${T.surface}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
  select option { background: ${T.surface2}; color: ${T.text}; }
  @keyframes pulse-bar {
    0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
    50%       { transform: scaleY(1);   opacity: 1; }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .log-row-even { background: transparent; }
  .log-row-odd  { background: ${T.surface}66; }
  .log-row-even:hover, .log-row-odd:hover { background: ${T.surface3}; }
`;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  idle:     { color: T.textDim, dot: T.textDim, screen: "01 · CONFIGURE" },
  running:  { color: T.amber,   dot: T.amber,   screen: "02 · RUNNING"   },
  complete: { color: T.green,   dot: T.green,   screen: "03 · COMPLETE"  },
  error:    { color: T.red,     dot: T.red,     screen: "—  · ERROR"     },
};

function RunningBars() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 14 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 3, height: 14, background: T.amber, borderRadius: 2,
          animation: `pulse-bar 0.8s ease-in-out ${i * 0.15}s infinite`,
          transformOrigin: "bottom",
        }} />
      ))}
    </div>
  );
}

export function Header({ status, currentGen, totalGens, method, url, onMethodChange, onUrlChange, onRun, onStop }) {
  const sc = STATUS_MAP[status] ?? STATUS_MAP.idle;
  const isRunning = status === "running";
  const isComplete = status === "complete";
  const genLabel = isRunning
    ? `GEN ${String(currentGen).padStart(2, "0")} / ${String(totalGens).padStart(2, "0")}`
    : status.toUpperCase();

  return (
    <div style={{ background: T.surface2, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={T.amber} strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
            Chaos<span style={{ color: T.amber }}>-Gen</span>
          </span>
          <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 14, fontSize: 9, color: T.textDim, letterSpacing: "0.08em", fontFamily: T.mono }}>
            SCREEN {sc.screen}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning && <RunningBars />}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: sc.color + "12", border: `1px solid ${sc.color}35`,
            borderRadius: 4, padding: "4px 12px",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: sc.dot,
              boxShadow: isRunning ? `0 0 8px ${T.amber}` : "none",
            }} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: sc.color, letterSpacing: "0.1em", fontWeight: 500 }}>
              {genLabel}
            </span>
          </div>
        </div>
      </div>

      {/* URL bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px 10px", borderTop: `1px solid ${T.border}` }}>
        <select
          value={method}
          onChange={e => onMethodChange(e.target.value)}
          style={{
            background: T.amber + "15", border: `1px solid ${T.amber}40`, borderRadius: 4,
            color: T.amber, fontFamily: T.mono, fontSize: 10, fontWeight: 600,
            padding: "5px 8px", outline: "none", cursor: "pointer", letterSpacing: "0.06em", flexShrink: 0,
          }}
        >
          {["POST", "GET", "PUT", "DELETE", "PATCH"].map(m => <option key={m}>{m}</option>)}
        </select>

        <input
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="http://target:5000/api/endpoint"
          style={{
            flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
            color: T.text, fontFamily: T.mono, fontSize: 11, padding: "6px 10px", outline: "none",
            transition: "border-color 0.12s",
          }}
          onFocus={e => (e.target.style.borderColor = T.amber + "55")}
          onBlur={e => (e.target.style.borderColor = T.border)}
        />

        {status === "idle" && (
          <button onClick={onRun} style={{
            background: T.amber, color: "#000", border: "none", borderRadius: 4,
            padding: "6px 20px", fontFamily: T.mono, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
          }}>▶ Run Engine</button>
        )}

        {isRunning && (
          <button onClick={onStop} style={{
            background: "transparent", color: T.amber, border: `1px solid ${T.amber}55`,
            borderRadius: 4, padding: "6px 18px", fontFamily: T.mono, fontSize: 10,
            letterSpacing: "0.08em", cursor: "pointer", flexShrink: 0,
          }}>■ Stop</button>
        )}

        {isComplete && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onRun} style={{
              background: T.amber, color: "#000", border: "none", borderRadius: 4,
              padding: "6px 18px", fontFamily: T.mono, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase",
            }}>↺ Re-run</button>
            <button style={{
              background: "transparent", color: T.textDim, border: `1px solid ${T.border}`,
              borderRadius: 4, padding: "6px 14px", fontFamily: T.mono, fontSize: 10,
              letterSpacing: "0.06em", cursor: "pointer",
            }}>⬇ Report</button>
          </div>
        )}
      </div>
    </div>
  );
}