import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "packages/editor"),
  publicDir: path.resolve(__dirname, "packages/editor/public"),
  base: "./",
  resolve: {
    alias: {
      "@dashboard-ng/runtime": path.resolve(__dirname, "packages/runtime/src"),
      "@dashboard-ng/shared": path.resolve(__dirname, "packages/shared/src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "admin"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "packages/editor/index_m.html"),
    },
  },
});
