import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { T } from "../components/Header";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 — no route for:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", fontFamily: T.mono,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 96, fontWeight: 700, color: T.amber,
          letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 16,
          filter: "drop-shadow(0 0 24px rgba(245,158,11,0.25))",
        }}>
          404
        </div>

        <div style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
          Route Not Found
        </div>

        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 32, fontFamily: T.mono }}>
          <span style={{ color: T.red }}>ERR</span> → {location.pathname}
        </div>

        <a
          href="/"
          style={{
            display: "inline-block",
            background: T.amber + "18", color: T.amber,
            border: `1px solid ${T.amber}45`, borderRadius: 4,
            padding: "8px 24px", fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = T.amber + "30")}
          onMouseLeave={e => (e.currentTarget.style.background = T.amber + "18")}
        >
          ← Return to Engine
        </a>
      </div>
    </div>
  );
}