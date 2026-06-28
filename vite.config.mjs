import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    proxy: {
      "/api/command": "http://127.0.0.1:8787",
    },
    warmup: {
      clientFiles: ["./src/start-the-app.jsx"],
    },
  },
  plugins: [react()],
});
