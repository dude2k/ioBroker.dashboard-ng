import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@dashboard-ng/shared": path.resolve(__dirname, "packages/shared/src"),
    },
  },
});
