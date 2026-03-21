import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export async function startEngine(payload) {
  await api.post("/api/start", payload);
}

export async function fetchStatus() {
  const { data } = await api.get("/api/status");
  return data;
}

export function getDownloadUrl() {
  return `${API_BASE}/api/download`;
}
