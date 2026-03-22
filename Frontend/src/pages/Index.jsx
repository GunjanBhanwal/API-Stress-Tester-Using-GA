// src/pages/Index.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { Main }   from "../components/Main";
import { Footer } from "../components/Footer";
import * as api   from "../lib/api";

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

export default function Index() {
  const [method,         setMethod]         = useState("POST");
  const [url,            setUrl]            = useState("http://localhost:5000/api/data");
  const [headers,        setHeaders]        = useState(DEFAULT_HEADERS);
  const [body,           setBody]           = useState(DEFAULT_BODY);
  const [generations,    setGenerations]    = useState(50);
  const [populationSize, setPopulationSize] = useState(10);
  const [mode,           setMode]           = useState("adaptive");
  const [status,         setStatus]         = useState("idle");
  const [genData,        setGenData]        = useState([]);
  const [logFilter,      setLogFilter]      = useState("all");
  const [errorMsg,       setErrorMsg]       = useState(null);

  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopEngine = useCallback(async () => {
    clearTimer();
    try { await api.stopEngine(); } catch {}
    setStatus("complete");
  }, [clearTimer]);

  const startEngine = useCallback(async () => {
    setGenData([]); setErrorMsg(null); setStatus("running");

    const hdrs = {};
    headers.forEach(h => { if (h.key.trim()) hdrs[h.key.trim()] = h.value; });

    let parsedBody;
    try { parsedBody = JSON.parse(body); }
    catch { setErrorMsg("Request body is not valid JSON. Fix it in the Body tab."); setStatus("idle"); return; }

    try {
      await api.startEngine({ url, method, headers: hdrs, body: parsedBody, generations, population: populationSize, mode });
    } catch (err) { setErrorMsg(err.message); setStatus("error"); return; }

    timerRef.current = setInterval(async () => {
      try {
        const res = await api.fetchStatus();
        if (Array.isArray(res.data)) setGenData(res.data);
        if (res.status === "complete" || res.status === "error") {
          clearTimer(); setStatus(res.status);
          if (res.status === "error") setErrorMsg(res.message ?? "Engine reported an error.");
        }
      } catch (err) { console.warn("[poll] fetchStatus failed:", err.message); }
    }, 2000);
  }, [url, method, headers, body, generations, populationSize, mode, clearTimer]);

  const downloadReport = useCallback(async () => {
    try { await api.downloadReport(); } catch (err) { setErrorMsg(err.message); }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const currentGen = genData.length ? genData[genData.length - 1].generation : 0;

  return (
    <div className="bg-bg min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col w-full max-w-[1140px] h-[calc(100vh-32px)] max-h-[740px] bg-surface2 border border-border rounded-xl overflow-hidden shadow-[0_0_0_1px_#000,0_32px_80px_rgba(0,0,0,0.8)]">

        <Header
          status={status} currentGen={currentGen} totalGens={generations}
          method={method} url={url}
          onMethodChange={setMethod} onUrlChange={setUrl}
          onRun={startEngine} onStop={stopEngine} onDownload={downloadReport}
        />

        {errorMsg && (
          <div className="flex items-center justify-between px-5 py-2 bg-danger/5 border-b border-danger/20 text-[10px] font-mono text-danger tracking-[0.05em] shrink-0">
            <span><span className="font-bold">ERR</span> → {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="bg-transparent border-none text-dim cursor-pointer text-sm leading-none">×</button>
          </div>
        )}

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
  );
}