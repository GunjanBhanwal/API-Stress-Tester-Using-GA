import { useRef, useEffect, useMemo } from "react";

const PALETTE = ["#f59e0b","#60a5fa","#4ade80","#a78bfa","#f87171","#f472b6","#34d399","#818cf8"];
const keyColor = (key, allKeys) => PALETTE[allKeys.indexOf(key) % PALETTE.length];

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

// ── Summary Cards 
function SummaryCards({ data }) {
  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[11px] text-dim tracking-[0.05em]">
        — awaiting data —
      </div>
    );
  }

  const gens       = data.filter(d => d.generation > 0);
  const baseline   = data[0]?.max_latency_ms ?? 0;
  const latencies  = gens.map(d => d.max_latency_ms);
  const diversities= gens.map(d => d.diversity_score);
  const firs       = gens.map(d => d.fitness_improvement_rate).filter(v => v != null);
  const peak       = gens.length ? Math.max(...latencies) : 0;
  const peakGen    = gens.find(d => d.max_latency_ms === peak)?.generation ?? "—";
  const avgLat     = gens.length ? Math.round(gens.reduce((s,d) => s + d.avg_latency_ms,0) / gens.length) : 0;
  const convGen    = gens.find(d => d.weights && Math.max(...Object.values(d.weights)) > 0.6)?.generation ?? "—";
  const finalW     = gens.length ? gens[gens.length-1].weights : {};
  const topKey     = Object.keys(finalW).length ? Object.keys(finalW).reduce((a,b) => finalW[a] > finalW[b] ? a : b) : "—";
  const topWeight  = finalW[topKey] != null ? (finalW[topKey]*100).toFixed(1) : "—";
  const initDiv    = diversities.length ? diversities[0].toFixed(4) : "—";
  const finalDiv   = diversities.length ? diversities[diversities.length-1].toFixed(4) : "—";
  const avgFir     = firs.length ? (firs.reduce((a,b) => a+b,0)/firs.length).toFixed(2) : "—";

  const metrics = [
    { label:"Baseline Lat",   value:`${baseline.toFixed(2)}`, unit:"ms", accent:"#60a5fa" },
    { label:"Peak Latency",   value:`${peak.toFixed(2)}`,     unit:"ms", accent:"#f87171" },
    { label:"Peak at Gen",    value:String(peakGen),          unit:"",   accent:"#f87171" },
    { label:"Avg Latency",    value:String(avgLat),           unit:"ms", accent:"#60a5fa" },
    { label:"Converged Gen",  value:String(convGen),          unit:"",   accent:"#4ade80" },
    { label:"Top Key",        value:topKey,                   unit:"",   accent:"#f59e0b" },
    { label:"Top Weight",     value:topWeight,                unit:"%",  accent:"#f59e0b" },
    { label:"Init Diversity", value:initDiv,                  unit:"",   accent:"#60a5fa" },
    { label:"Final Diversity",value:finalDiv,                 unit:"",   accent:"#6b7280" },
    { label:"Avg FIR",        value:avgFir,                   unit:"%",  accent:"#4ade80" },
  ];

  return (
    <div className="p-2.5 h-full overflow-y-auto">
      <div className="text-[9px] text-dim font-mono tracking-[0.1em] uppercase mb-2">
        <span className="text-amber">≈</span> Run Summary
      </div>
      <div className="grid grid-cols-5 gap-1">
        {metrics.map(({ label, value, unit, accent }) => (
          <div key={label} className="bg-surface3 border border-border rounded px-2 py-1.5"
            style={{ borderTopWidth:"2px", borderTopColor: accent }}>
            <div className="text-[7px] text-dim font-mono tracking-[0.07em] uppercase mb-1 truncate">{label}</div>
            <div className="text-[13px] font-mono font-semibold leading-none truncate" style={{ color: accent }}>
              {value}
              {unit && <span className="text-[8px] text-dim ml-0.5 font-normal">{unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generation Log
function GenerationLog({ data, filter, onFilterChange, allKeys }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data.length]);

  const filters  = ["all", ...allKeys];
  const filtered = filter === "all" ? data : data.filter(d => d.best_key_mutated === filter);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="text-[9px] text-dim font-mono tracking-[0.1em] uppercase">
          Generation Log <span className="text-amber">({data.length})</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <Pill key={f} active={filter===f} onClick={() => onFilterChange(f)}
              color={f==="all" ? "#6b7280" : keyColor(f, allKeys)}>
              {f}
            </Pill>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {!filtered.length ? (
          <div className="flex items-center justify-center h-20 font-mono text-[11px] text-dim tracking-[0.05em]">
            — no entries —
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead>
              <tr className="sticky top-0 bg-surface2 z-10">
                {[["GEN","50px"],["MAX ms","72px"],["AVG ms","72px"],["BEST KEY","110px"],["WEIGHTS",null]].map(([h,w]) => (
                  <th key={h} className="px-3.5 py-1.5 text-left text-[8px] text-dim tracking-[0.09em] font-medium border-b border-border"
                    style={{ width: w ?? "auto" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.generation} className={`${i%2===0 ? "bg-transparent" : "bg-surface/40"} hover:bg-surface3`}>
                  <td className="px-3.5 py-1 text-dim">{d.generation}</td>
                  <td className="px-3.5 py-1 text-danger font-semibold">{d.max_latency_ms}</td>
                  <td className="px-3.5 py-1 text-info">{d.avg_latency_ms}</td>
                  <td className="px-3.5 py-1"><Tag label={d.best_key_mutated} color={keyColor(d.best_key_mutated, allKeys)} /></td>
                  <td className="px-3.5 py-1">
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(d.weights).map(([k,v]) => (
                        <span key={k} className="text-[9px] tracking-[0.04em]" style={{ color: keyColor(k, allKeys) }}>
                          {k[0].toUpperCase()}:{Math.round(v*100)}%
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Footer (exported)
export function Footer({ genData, logFilter, onFilterChange }) {
  const allKeys = useMemo(() => {
    if (!genData.length) return [];
    const first = genData.find(d => d.weights && Object.keys(d.weights).length > 0);
    return first ? Object.keys(first.weights) : [];
  }, [genData]);

  return (
    <div className="flex border-t border-border shrink-0 h-60">
      <div className="flex-1 flex flex-col overflow-hidden">
        <GenerationLog data={genData} filter={logFilter} onFilterChange={onFilterChange} allKeys={allKeys} />
      </div>
      <div className="w-px bg-border shrink-0" />
      <div className="flex-1 overflow-hidden">
        <SummaryCards data={genData} />
      </div>
    </div>
  );
}