const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  // Always try to parse JSON; fall back to text on failure
  let body;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const msg =
      (typeof body === "object" && body?.message) ||
      `HTTP ${res.status} — ${res.statusText}`;
    throw new Error(msg);
  }

  return body;
}
/**
 * POST /api/start
 * Starts the chaos engine with the given config.
 *
 * @param {{ url: string, method: string, headers: object,
 *           body: object, generations: number,
 *           population: number, mode: string }} config
 */
export async function startEngine(config) {
  return request("/api/start", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

/**
 * POST /api/stop
 * Terminates the running engine process.
 */
export async function stopEngine() {
  return request("/api/stop", { method: "POST" });
}

/**
 * GET /api/status
 * Returns current engine status + generation data array.
 *
 * @returns {{ status: "idle"|"running"|"complete"|"error",
 *             message: string,
 *             data: Array }}
 */
export async function fetchStatus() {
  return request("/api/status");
}

export async function fetchConfig() {
  return request("/api/config");
}

export async function downloadReport() {
  const res = await fetch(`${BASE_URL}/api/download`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "chaos_gen_report.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * GET /health
 * Lightweight ping to check the backend is reachable.
 */
export async function healthCheck() {
  return request("/health");
}