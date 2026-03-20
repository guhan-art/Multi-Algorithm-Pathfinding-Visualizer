import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Multi-Algorithm-Pathfinding-Visualizer/",
  server: {
    port: 5173
  }
});