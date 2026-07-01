import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "packages/viewer"),
  base: "./",
  resolve: {
    alias: {
      "@dashboard-ng/runtime": path.resolve(__dirname, "packages/runtime/src"),
      "@dashboard-ng/shared": path.resolve(__dirname, "packages/shared/src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "www"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "packages/viewer/index.html"),
    },
  },
});
