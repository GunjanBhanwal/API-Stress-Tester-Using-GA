import { useState, useRef, useEffect, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { T, chartDefaults, globalCSS, Header } from "../components/Header";
import { Main } from "../components/Main";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ── Mock data generator ───────────────────────────────────────────────────────
const MOCK_KEYS = ["items", "email", "username", "metadata"];

function genMockGenerations(count = 50) {
  let baseMax = 130, baseAvg = 65;
  const w = { items: 0.25, email: 0.25, username: 0.25, metadata: 0.25 };
  return Array.from({ length: count }, (_, i) => {
    const spike = Math.random() > 0.82 ? Math.random() * 500 : 0;
    baseMax = Math.min(1400, Math.max(80, baseMax + (Math.random() - 0.44) * 70 + spike));
    baseAvg = Math.min(baseMax * 0.88, Math.max(40, baseAvg + (Math.random() - 0.44) * 35));
    const best_key_mutated = MOCK_KEYS[Math.floor(Math.random() * MOCK_KEYS.length)];
    if (best_key_mutated === "items") w.items = Math.min(0.88, w.items + 0.018);
    MOCK_KEYS.forEach(k => { if (k !== best_key_mutated) w[k] = Math.max(0.02, w[k] - 0.005); });
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    MOCK_KEYS.forEach(k => (w[k] /= total));
    return { generation: i + 1, max_latency_ms: Math.round(baseMax), avg_latency_ms: Math.round(baseAvg), best_key_mutated, weights: { ...w } };
  });
}

export const mockGenerations = genMockGenerations(50);

// ── Shared helpers ────────────────────────────────────────────────────────────
const KEY_COLORS = { items: T.amber, email: T.blue, username: T.green, metadata: T.purple };
const keyColor = k => KEY_COLORS[k] ?? T.textDim;

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

function EmptyChart({ height = 140 }) {
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

// ── Generation Log ────────────────────────────────────────────────────────────
const ALL_FILTERS = ["all", "items", "email", "username", "metadata"];

function GenerationLog({ data, filter, onFilterChange }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data.length]);

  const filtered = filter === "all" ? data : data.filter(d => d.best_key_mutated === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
      {/* Log header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Generation Log <span style={{ color: T.amber }}>({data.length})</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ALL_FILTERS.map(f => (
            <Pill key={f} active={filter === f} onClick={() => onFilterChange(f)} color={f === "all" ? T.textDim : keyColor(f)}>
              {f}
            </Pill>
          ))}
        </div>
      </div>

      {/* Table */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {!filtered.length ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, fontFamily: T.mono, fontSize: 11, color: T.textDim, letterSpacing: "0.05em" }}>
            — no entries —
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: T.mono }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: T.surface2, zIndex: 1 }}>
                {[["GEN","50px"],["MAX ms","72px"],["AVG ms","72px"],["BEST KEY","110px"],["WEIGHTS",null]].map(([h, w]) => (
                  <th key={h} style={{
                    padding: "5px 14px", textAlign: "left", fontSize: 8, color: T.textDim,
                    letterSpacing: "0.09em", fontWeight: 500,
                    borderBottom: `1px solid ${T.border}`, width: w ?? "auto",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.generation} className={i % 2 === 0 ? "log-row-even" : "log-row-odd"} style={{ animation: "fade-in 0.2s ease" }}>
                  <td style={{ padding: "4px 14px", color: T.textDim }}>{d.generation}</td>
                  <td style={{ padding: "4px 14px", color: T.red,  fontWeight: 600 }}>{d.max_latency_ms}</td>
                  <td style={{ padding: "4px 14px", color: T.blue }}>{d.avg_latency_ms}</td>
                  <td style={{ padding: "4px 14px" }}><Tag label={d.best_key_mutated} color={keyColor(d.best_key_mutated)} /></td>
                  <td style={{ padding: "4px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(d.weights).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 9, color: keyColor(k), letterSpacing: "0.04em" }}>
                          {k[0].toUpperCase()}:{Math.round(v * 100)}%
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

// ── Weight Drift Chart ────────────────────────────────────────────────────────
function WeightChart({ data }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.update("none"); }, [data]);

  if (!data.length) return <EmptyChart height={140} />;

  const chartData = {
    labels: data.map(d => d.generation),
    datasets: [
      { label: "items",    data: data.map(d => Math.round(d.weights.items    * 100)), borderColor: T.amber,  backgroundColor: T.amber + "22", borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true  },
      { label: "email",    data: data.map(d => Math.round(d.weights.email    * 100)), borderColor: T.blue,   backgroundColor: "transparent",  borderWidth: 1,   pointRadius: 0, tension: 0.4, fill: false },
      { label: "username", data: data.map(d => Math.round(d.weights.username * 100)), borderColor: T.green,  backgroundColor: "transparent",  borderWidth: 1,   pointRadius: 0, tension: 0.4, fill: false },
      { label: "metadata", data: data.map(d => Math.round(d.weights.metadata * 100)), borderColor: T.purple, backgroundColor: "transparent",  borderWidth: 1,   pointRadius: 0, tension: 0.4, fill: false },
    ],
  };

  const options = {
    ...chartDefaults,
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: v => v + "%" } },
    },
  };

  return <div style={{ height: 140 }}><Line ref={ref} data={chartData} options={options} /></div>;
}

// ── Footer (exported) ─────────────────────────────────────────────────────────
export function Footer({ genData, logFilter, onFilterChange }) {
  return (
    <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, flexShrink: 0, height: 240 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <GenerationLog data={genData} filter={logFilter} onFilterChange={onFilterChange} />
      </div>

      <div style={{ width: 1, background: T.border, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          <span style={{ color: T.amber }}>≈</span> Mutation Weight Drift
        </div>
        <div style={{ flex: 1 }}>
          <WeightChart data={genData} />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_HEADERS = [
  { id: "1", key: "Authorization", value: "Bearer eyJhbGci..." },
  { id: "2", key: "Content-Type",  value: "application/json"  },
];

const DEFAULT_BODY = `{
  "username": "test",
  "email": "test@test.com",
  "items": [1, 2, 3],
  "metadata": "none"
}`;

const USE_MOCK = true; 

export default function Index() {
  const [method,         setMethod]         = useState("POST");
  const [url,            setUrl]            = useState("http://victim:5000/api/data");
  const [headers,        setHeaders]        = useState(DEFAULT_HEADERS);
  const [body,           setBody]           = useState(DEFAULT_BODY);
  const [generations,    setGenerations]    = useState(50);
  const [populationSize, setPopulationSize] = useState(10);
  const [mode,           setMode]           = useState("adaptive");
  const [status,         setStatus]         = useState("idle");
  const [genData,        setGenData]        = useState([]);
  const [logFilter,      setLogFilter]      = useState("all");

  const timerRef   = useRef(null);
  const mockIdxRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopEngine = useCallback(() => { clearTimer(); setStatus("complete"); }, [clearTimer]);

  const startEngine = useCallback(async () => {
    setGenData([]);
    setStatus("running");

    if (USE_MOCK) {
      mockIdxRef.current = 0;
      timerRef.current = setInterval(() => {
        if (mockIdxRef.current >= mockGenerations.length) { stopEngine(); return; }
        mockIdxRef.current += 1;
        setGenData(mockGenerations.slice(0, mockIdxRef.current));
      }, 400);
      return;
    }

    // Real API path — uncomment and import api when USE_MOCK = false
    // try {
    //   const hdrs = {};
    //   headers.forEach(h => { if (h.key) hdrs[h.key] = h.value; });
    //   await api.startEngine({ url, method, headers: hdrs, body, generations, population: populationSize, mode });
    //   timerRef.current = setInterval(async () => {
    //     try {
    //       const res = await api.fetchStatus();
    //       setGenData(res.data);
    //       if (res.status === "complete" || res.status === "error") { setStatus(res.status); clearTimer(); }
    //     } catch {}
    //   }, 2000);
    // } catch { setStatus("error"); }
  }, [stopEngine, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const currentGen = genData.length ? genData[genData.length - 1].generation : 0;

  return (
    <>
      <style>{globalCSS}</style>

      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{
          display: "flex", flexDirection: "column",
          width: "100%", maxWidth: 1140,
          height: "calc(100vh - 32px)", maxHeight: 740,
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 0 0 1px #000, 0 32px 80px rgba(0,0,0,0.8)",
        }}>
          <Header
            status={status} currentGen={currentGen} totalGens={generations}
            method={method} url={url}
            onMethodChange={setMethod} onUrlChange={setUrl}
            onRun={startEngine} onStop={stopEngine}
          />

          <Main
            headers={headers} body={body}
            generations={generations} populationSize={populationSize} mode={mode}
            genData={genData}
            onHeadersChange={setHeaders} onBodyChange={setBody}
            onGenerationsChange={setGenerations} onPopulationSizeChange={setPopulationSize}
            onModeChange={setMode}
          />

          <Footer genData={genData} logFilter={logFilter} onFilterChange={setLogFilter} />
        </div>
      </div>
    </>
  );
}