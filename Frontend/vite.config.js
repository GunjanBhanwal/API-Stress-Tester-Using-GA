import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
 
    // Dev-server proxy — /api/* and /health requests are forwarded to Flask.
    // This means you can set VITE_API_URL="" (empty) during dev and let the
    // proxy handle CORS entirely, OR keep VITE_API_URL=http://localhost:5001
    // and rely on Flask's flask-cors allow-all setting.
    proxy: {
      "/api": {
        target:      "http://localhost:5001",
        changeOrigin: true,
      },
      "/health": {
        target:      "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
})