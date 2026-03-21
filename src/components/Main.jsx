import { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { T, chartDefaults } from "./Header";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ── Shared primitives (local to Main) ─────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: T.mono }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
        color: T.text, fontFamily: T.mono, fontSize: 11, padding: "6px 10px",
        outline: "none", width: "100%", transition: "border-color 0.12s", ...style,
      }}
      onFocus={e => (e.target.style.borderColor = T.amber + "60")}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />
  );
}

function Textarea({ value, onChange, rows = 9 }) {
  return (
    <textarea
      value={value} onChange={onChange} rows={rows}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
        color: T.green, fontFamily: T.mono, fontSize: 11, padding: "8px 10px",
        outline: "none", width: "100%", resize: "vertical", lineHeight: 1.65,
        transition: "border-color 0.12s",
      }}
      onFocus={e => (e.target.style.borderColor = T.green + "55")}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />
  );
}

function Tag({ label, color = T.amber }) {
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}40`,
      borderRadius: 3, padding: "1px 8px", fontSize: 10,
      fontFamily: T.mono, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Pill({ active, onClick, children, color = T.amber }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color + "1a" : "transparent",
      color: active ? color : T.textDim,
      border: `1px solid ${active ? color + "55" : T.border}`,
      borderRadius: 4, padding: "3px 10px", fontSize: 10,
      fontFamily: T.mono, letterSpacing: "0.06em",
      cursor: "pointer", transition: "all 0.12s", textTransform: "uppercase",
    }}>{children}</button>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent",
      color: active ? T.amber : T.textDim,
      border: "none", borderBottom: `2px solid ${active ? T.amber : "transparent"}`,
      padding: "9px 16px", fontSize: 10, fontFamily: T.mono,
      letterSpacing: "0.08em", textTransform: "uppercase",
      cursor: "pointer", transition: "color 0.12s, border-color 0.12s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function StatCard({ label, value, unit = "", accent = T.text }) {
  return (
    <div style={{
      background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px",
    }}>
      <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: T.mono }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: T.mono, color: accent, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}<span style={{ fontSize: 10, color: T.textDim, marginLeft: 3, fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}

function EmptyChart({ height = 160 }) {
  return (
    <div style={{
      height, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", color: T.textDim, fontFamily: T.mono,
      fontSize: 11, border: `1px dashed ${T.border}`, borderRadius: 6,
      gap: 8, letterSpacing: "0.05em",
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h2l3-8 4 16 3-8h6" stroke={T.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      awaiting signal…
    </div>
  );
}

// ── Headers Tab ───────────────────────────────────────────────────────────────
function HeadersTab({ headers, onChange }) {
  const add    = () => onChange([...headers, { id: crypto.randomUUID(), key: "", value: "" }]);
  const remove = id => onChange(headers.filter(h => h.id !== id));
  const update = (id, field, val) => onChange(headers.map(h => h.id === id ? { ...h, [field]: val } : h));

  return (
    <div>
      <Label>Request Headers</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 28px", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.06em" }}>KEY</span>
        <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.06em" }}>VALUE</span>
        <span />
      </div>

      {headers.map(h => (
        <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 28px", gap: 6, marginBottom: 6 }}>
          <Input value={h.key}   onChange={e => update(h.id, "key",   e.target.value)} placeholder="Header-Name" />
          <Input value={h.value} onChange={e => update(h.id, "value", e.target.value)} placeholder="value" />
          <button onClick={() => remove(h.id)} style={{
            background: T.red + "15", color: T.red, border: `1px solid ${T.red}35`,
            borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1,
          }}>×</button>
        </div>
      ))}

      <button
        onClick={add}
        style={{
          background: "transparent", color: T.textDim, border: `1px dashed ${T.border}`,
          borderRadius: 4, padding: "6px 12px", fontSize: 10, fontFamily: T.mono,
          letterSpacing: "0.06em", cursor: "pointer", width: "100%", marginTop: 6,
          transition: "color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={e => { e.target.style.color = T.amber; e.target.style.borderColor = T.amber + "55"; }}
        onMouseLeave={e => { e.target.style.color = T.textDim; e.target.style.borderColor = T.border; }}
      >
        + Add Header
      </button>

      <div style={{
        marginTop: 14, background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 4, padding: "8px 12px", fontSize: 10, color: T.textDim, fontFamily: T.mono, lineHeight: 1.6,
      }}>
        <span style={{ color: T.amber }}>※</span>{" "}
        For local targets use <span style={{ color: T.green }}>http://host.docker.internal:PORT</span>
      </div>
    </div>
  );
}

// ── Body Tab ──────────────────────────────────────────────────────────────────
const KEY_COLORS = { items: T.amber, email: T.blue, username: T.green, metadata: T.purple };
const keyColor = k => KEY_COLORS[k] ?? T.textDim;

function BodyTab({ body, onChange }) {
  let parsed = null, parseError = null;
  try { parsed = JSON.parse(body); } catch (e) { parseError = e.message; }
  const keys = parsed ? Object.keys(parsed) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Label>JSON Payload</Label>
        <span style={{ fontSize: 9, fontFamily: T.mono, color: parseError ? T.red : T.green, letterSpacing: "0.06em" }}>
          {parseError ? "⚠ INVALID JSON" : "✓ VALID JSON"}
        </span>
      </div>

      <Textarea value={body} onChange={e => onChange(e.target.value)} />

      {keys.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.06em" }}>MUTATION KEYS →</span>
          {keys.map(k => <Tag key={k} label={k} color={keyColor(k)} />)}
        </div>
      )}

      {parseError && (
        <div style={{
          marginTop: 8, background: T.red + "10", border: `1px solid ${T.red}30`,
          borderRadius: 4, padding: "6px 10px", fontSize: 10, color: T.red, fontFamily: T.mono,
        }}>{parseError}</div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
const MODE_DESC = {
  adaptive: "Mutation weights evolve each generation based on latency delta. High-impact keys are amplified over time.",
  baseline: "Uniform mutation across all payload keys. No weight adjustment between generations.",
  both:     "Runs adaptive and baseline engines in parallel. Final report includes comparative analysis.",
};

function SettingsTab({ generations, populationSize, mode, onGenerationsChange, onPopulationSizeChange, onModeChange }) {
  return (
    <div>
      <Label>Engine Parameters</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.08em", marginBottom: 5 }}>GENERATIONS</div>
          <Input type="number" value={generations} onChange={e => onGenerationsChange(Number(e.target.value))}
            style={{ textAlign: "center", fontSize: 16, fontWeight: 600, color: T.amber }} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.08em", marginBottom: 5 }}>POPULATION</div>
          <Input type="number" value={populationSize} onChange={e => onPopulationSizeChange(Number(e.target.value))}
            style={{ textAlign: "center", fontSize: 16, fontWeight: 600, color: T.blue }} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.08em", marginBottom: 8 }}>MUTATION MODE</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["adaptive", "baseline", "both"].map(m => (
            <Pill key={m} active={mode === m} onClick={() => onModeChange(m)}>{m}</Pill>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 14, background: T.surface, border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.amber}`, borderRadius: "0 4px 4px 0",
        padding: "10px 12px", fontSize: 11, color: T.textDim, fontFamily: T.mono, lineHeight: 1.7,
      }}>
        {MODE_DESC[mode]}
      </div>
    </div>
  );
}

// ── Live Stats ────────────────────────────────────────────────────────────────
function LiveStats({ data }) {
  const peak      = data.length ? Math.max(...data.map(d => d.max_latency_ms)) : null;
  const avgOfAvgs = data.length ? Math.round(data.reduce((s, d) => s + d.avg_latency_ms, 0) / data.length) : null;
  const trend     = data.length > 1 ? data[data.length - 1].max_latency_ms - data[data.length - 2].max_latency_ms : null;
  const trendAccent = trend === null ? T.textDim : trend > 50 ? T.red : trend > 0 ? T.amber : T.green;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
      <StatCard label="Peak"     value={peak      ?? "—"} unit="ms" accent={T.red}  />
      <StatCard label="Mean Avg" value={avgOfAvgs ?? "—"} unit="ms" accent={T.blue} />
      <StatCard label="Δ Trend"  value={trend !== null ? (trend >= 0 ? `+${trend}` : `${trend}`) : "—"} unit="ms" accent={trendAccent} />
    </div>
  );
}

// ── Latency Chart ─────────────────────────────────────────────────────────────
function LatencyChart({ data }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.update("none"); }, [data]);

  if (!data.length) return <EmptyChart height={160} />;

  const chartData = {
    labels: data.map(d => d.generation),
    datasets: [
      { label: "max", data: data.map(d => d.max_latency_ms), borderColor: T.red,  backgroundColor: T.red  + "18", borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true  },
      { label: "avg", data: data.map(d => d.avg_latency_ms), borderColor: T.blue, backgroundColor: "transparent",  borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false },
    ],
  };

  return <div style={{ height: 160 }}><Line ref={ref} data={chartData} options={chartDefaults} /></div>;
}

// ── Main (exported) ───────────────────────────────────────────────────────────
export function Main({
  headers, body, generations, populationSize, mode, genData,
  onHeadersChange, onBodyChange, onGenerationsChange, onPopulationSizeChange, onModeChange,
}) {
  const [tab, setTab] = useState("headers");

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* LEFT — config tabs */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 6px", flexShrink: 0 }}>
          {["headers", "body", "settings"].map(t => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {tab === "headers"  && <HeadersTab  headers={headers} onChange={onHeadersChange} />}
          {tab === "body"     && <BodyTab     body={body}        onChange={onBodyChange}    />}
          {tab === "settings" && (
            <SettingsTab
              generations={generations} populationSize={populationSize} mode={mode}
              onGenerationsChange={onGenerationsChange}
              onPopulationSizeChange={onPopulationSizeChange}
              onModeChange={onModeChange}
            />
          )}
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{ width: 1, background: T.border, flexShrink: 0 }} />

      {/* RIGHT — live telemetry */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{
          fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.1em",
          textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: genData.length ? T.green : T.textDim, display: "inline-block" }} />
          Live Telemetry
        </div>
        <LiveStats data={genData} />
        <LatencyChart data={genData} />
      </div>
    </div>
  );
}