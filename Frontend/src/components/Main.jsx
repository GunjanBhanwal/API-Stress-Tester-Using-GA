import { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { chartDefaults } from "./Header";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Dynamic key colors — must stay inline since they're runtime values
const KEY_PALETTE = { items: "#f59e0b", email: "#60a5fa", username: "#4ade80", metadata: "#a78bfa" };
const keyCol = k => KEY_PALETTE[k] ?? "#6b7280";

// ── Primitives ────────────────────────────────────────────────────────────────
function Label({ children }) {
  return <div className="text-[9px] text-dim tracking-[0.1em] uppercase mb-2 font-mono">{children}</div>;
}

function TextInput({ value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      className={`bg-surface border border-border rounded text-text font-mono text-[11px] px-2.5 py-1.5 outline-none w-full transition-colors focus:border-amber/50 placeholder:text-dim ${className}`}
    />
  );
}

function Textarea({ value, onChange }) {
  return (
    <textarea
      value={value} onChange={onChange} rows={9}
      className="bg-surface border border-border rounded text-success font-mono text-[11px] px-2.5 py-2 outline-none w-full resize-y leading-relaxed transition-colors focus:border-success/40"
    />
  );
}

function Tag({ label, color }) {
  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-mono tracking-[0.06em] uppercase whitespace-nowrap border"
      style={{ background: color + "18", color, borderColor: color + "40" }}>
      {label}
    </span>
  );
}

function Pill({ active, onClick, children, color }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-[0.06em] uppercase cursor-pointer transition-all border"
      style={{
        background:  active ? color + "1a" : "transparent",
        color:       active ? color : "#6b7280",
        borderColor: active ? color + "55" : "#2c2c2c",
      }}>
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-[10px] font-mono tracking-[0.08em] uppercase cursor-pointer bg-transparent border-0 border-b-2 whitespace-nowrap transition-colors
        ${active ? "text-amber border-amber" : "text-dim border-transparent"}`}>
      {children}
    </button>
  );
}

function StatCard({ label, value, unit = "", accent }) {
  return (
    <div className="bg-surface3 border border-border rounded-md px-3.5 py-2.5">
      <div className="text-[9px] text-dim tracking-[0.1em] uppercase mb-1.5 font-mono">{label}</div>
      <div className="text-xl font-mono font-semibold leading-none tracking-tight" style={{ color: accent }}>
        {value}<span className="text-[10px] text-dim ml-1 font-normal">{unit}</span>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-dim font-mono text-[11px] border border-dashed border-border rounded-md gap-2 tracking-[0.05em]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h2l3-8 4 16 3-8h6" stroke="#2c2c2c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      awaiting signal…
    </div>
  );
}

// ── Headers Tab ───────────────────────────────────────────────────────────────
function HeadersTab({ headers, onChange }) {
  const add    = () => onChange([...headers, { id: crypto.randomUUID(), key: "", value: "" }]);
  const remove = id => onChange(headers.filter(h => h.id !== id));
  const update = (id, f, v) => onChange(headers.map(h => h.id === id ? { ...h, [f]: v } : h));

  return (
    <div>
      <Label>Request Headers</Label>
      <div className="grid grid-cols-[1fr_2fr_28px] gap-1.5 mb-1.5">
        <span className="text-[9px] text-dim font-mono tracking-[0.06em]">KEY</span>
        <span className="text-[9px] text-dim font-mono tracking-[0.06em]">VALUE</span>
        <span />
      </div>
      {headers.map(h => (
        <div key={h.id} className="grid grid-cols-[1fr_2fr_28px] gap-1.5 mb-1.5">
          <TextInput value={h.key}   onChange={e => update(h.id,"key",  e.target.value)} placeholder="Header-Name" />
          <TextInput value={h.value} onChange={e => update(h.id,"value",e.target.value)} placeholder="value" />
          <button onClick={() => remove(h.id)}
            className="bg-danger/10 text-danger border border-danger/25 rounded cursor-pointer text-sm leading-none hover:bg-danger/20">
            ×
          </button>
        </div>
      ))}
      <button onClick={add}
        className="w-full mt-1.5 py-1.5 text-[10px] font-mono tracking-[0.06em] text-dim border border-dashed border-border rounded cursor-pointer bg-transparent hover:text-amber hover:border-amber/40 transition-colors">
        + Add Header
      </button>
      <div className="mt-3.5 bg-surface border border-border rounded px-3 py-2 text-[10px] text-dim font-mono leading-relaxed">
        <span className="text-amber">※</span>{" "}
        For local targets use <span className="text-success">http://host.docker.internal:PORT</span>
      </div>
    </div>
  );
}

// ── Body Tab ──────────────────────────────────────────────────────────────────
function BodyTab({ body, onChange }) {
  let parsed = null, parseError = null;
  try { parsed = JSON.parse(body); } catch (e) { parseError = e.message; }
  const keys = parsed ? Object.keys(parsed) : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <Label>JSON Payload</Label>
        <span className={`text-[9px] font-mono tracking-[0.06em] ${parseError ? "text-danger" : "text-success"}`}>
          {parseError ? "⚠ INVALID JSON" : "✓ VALID JSON"}
        </span>
      </div>
      <Textarea value={body} onChange={e => onChange(e.target.value)} />
      {keys.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-dim font-mono tracking-[0.06em]">MUTATION KEYS →</span>
          {keys.map(k => <Tag key={k} label={k} color={keyCol(k)} />)}
        </div>
      )}
      {parseError && (
        <div className="mt-2 bg-danger/10 border border-danger/25 rounded px-2.5 py-1.5 text-[10px] text-danger font-mono">
          {parseError}
        </div>
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
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div>
          <div className="text-[9px] text-dim font-mono tracking-[0.08em] mb-1.5">GENERATIONS</div>
          <TextInput type="number" value={generations} onChange={e => onGenerationsChange(Number(e.target.value))}
            className="text-center text-base font-semibold text-amber" />
        </div>
        <div>
          <div className="text-[9px] text-dim font-mono tracking-[0.08em] mb-1.5">POPULATION</div>
          <TextInput type="number" value={populationSize} onChange={e => onPopulationSizeChange(Number(e.target.value))}
            className="text-center text-base font-semibold text-info" />
        </div>
      </div>
      <div className="mb-2.5">
        <div className="text-[9px] text-dim font-mono tracking-[0.08em] mb-2">MUTATION MODE</div>
        <div className="flex gap-1.5">
          {["adaptive","baseline","both"].map(m => (
            <Pill key={m} active={mode === m} onClick={() => onModeChange(m)} color="#f59e0b">{m}</Pill>
          ))}
        </div>
      </div>
      <div className="mt-3.5 bg-surface border-y border-r border-l-2 border-border border-l-amber rounded-r px-3 py-2.5 text-[11px] text-dim font-mono leading-relaxed">
        {MODE_DESC[mode]}
      </div>
    </div>
  );
}

// ── Live Stats ────────────────────────────────────────────────────────────────
function LiveStats({ data }) {
  const peak      = data.length ? Math.max(...data.map(d => d.max_latency_ms)) : null;
  const avgOfAvgs = data.length ? Math.round(data.reduce((s,d) => s + d.avg_latency_ms, 0) / data.length) : null;
  const trend     = data.length > 1 ? Math.round(data[data.length-1].max_latency_ms - data[data.length-2].max_latency_ms) : null;
  const trendColor= trend === null ? "#6b7280" : trend > 50 ? "#f87171" : trend > 0 ? "#f59e0b" : "#4ade80";

  return (
    <div className="grid grid-cols-3 gap-2 mb-3.5">
      <StatCard label="Peak"     value={peak      ?? "—"} unit="ms" accent="#f87171" />
      <StatCard label="Mean Avg" value={avgOfAvgs ?? "—"} unit="ms" accent="#60a5fa" />
      <StatCard label="Δ Trend"
        value={trend !== null ? (trend >= 0 ? `+${trend}` : `${trend}`) : "—"}
        unit="ms" accent={trendColor} />
    </div>
  );
}

// ── Latency Chart ─────────────────────────────────────────────────────────────
function LatencyChart({ data }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.update("none"); }, [data]);

  if (!data.length) return <EmptyChart />;

  const chartData = {
    labels: data.map(d => d.generation),
    datasets: [
      { label:"max", data: data.map(d => d.max_latency_ms), borderColor:"#f87171", backgroundColor:"#f8717118", borderWidth:1.5, pointRadius:0, tension:0.4, fill:true  },
      { label:"avg", data: data.map(d => d.avg_latency_ms), borderColor:"#60a5fa", backgroundColor:"transparent",  borderWidth:1.5, pointRadius:0, tension:0.4, fill:false },
    ],
  };

  return <div className="h-48"><Line ref={ref} data={chartData} options={chartDefaults} /></div>;
}

// ── Main (exported) ───────────────────────────────────────────────────────────
export function Main({ headers, body, generations, populationSize, mode, genData,
  onHeadersChange, onBodyChange, onGenerationsChange, onPopulationSizeChange, onModeChange }) {
  const [tab, setTab] = useState("headers");

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* LEFT — config tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b border-border px-1.5 shrink-0">
          {["headers","body","settings"].map(t => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {tab === "headers"  && <HeadersTab  headers={headers} onChange={onHeadersChange} />}
          {tab === "body"     && <BodyTab     body={body}       onChange={onBodyChange}    />}
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

      <div className="w-px bg-border shrink-0" />

      {/* RIGHT — live telemetry + chart */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-1.5 text-[9px] text-dim font-mono tracking-[0.1em] uppercase mb-3">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${genData.length ? "bg-success" : "bg-dim"}`} />
          Live Telemetry
        </div>
        <LiveStats data={genData} />
        <LatencyChart data={genData} />
      </div>
    </div>
  );
}