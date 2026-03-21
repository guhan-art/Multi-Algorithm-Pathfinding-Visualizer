import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveProductionBase() {
  const envBase = process.env.VITE_BASE_PATH;
  if (envBase) {
    return envBase.startsWith("/") ? envBase : `/${envBase}`;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (repository && repository.includes("/")) {
    const repoName = repository.split("/")[1];
    return `/${repoName}/`;
  }

  return "/Multi-Algorithm-Pathfinding-Visualizer/";
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use repo subpath for production build (GitHub Pages) and root for local dev.
  base: command === "build" ? resolveProductionBase() : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
}));