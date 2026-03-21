// ─── INDEX.JSX ────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import { T, globalCSS, Header } from "../components/Header";
import { Main } from "../components/Main";
import { Footer } from "../components/Footer";
import { mockGenerations } from "../data/mock-generations";

// ─── Defaults ─────────────────────────────────────────────────────────────────
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

const USE_MOCK = true; // set false to hit real API

// ─── Page ─────────────────────────────────────────────────────────────────────
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

  const stopEngine = useCallback(() => {
    clearTimer();
    setStatus("complete");
  }, [clearTimer]);

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

    // Real API — uncomment when USE_MOCK = false
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

      <div style={{
        background: T.bg, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}>
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