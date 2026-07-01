import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@dashboard-ng/runtime": path.resolve(__dirname, "packages/runtime/src"),
      "@dashboard-ng/shared": path.resolve(__dirname, "packages/shared/src"),
    },
  },
});
