// src/pages/NotFound.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  useEffect(() => { console.error("404 — no route for:", location.pathname); }, [location.pathname]);

  return (
    <div className="bg-bg min-h-screen font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="text-[96px] font-bold text-amber leading-none mb-4 tracking-[-0.04em]"
          style={{ filter: "drop-shadow(0 0 24px rgba(245,158,11,0.25))" }}>
          404
        </div>
        <div className="text-[11px] text-dim tracking-[0.2em] uppercase mb-2">Route Not Found</div>
        <div className="text-[10px] text-dim mb-8">
          <span className="text-danger">ERR</span> → {location.pathname}
        </div>
        <a href="/"
          className="inline-block bg-amber/10 text-amber border border-amber/30 rounded px-6 py-2 text-[10px] tracking-[0.12em] uppercase no-underline transition-colors hover:bg-amber/20">
          ← Return to Engine
        </a>
      </div>
    </div>
  );
}