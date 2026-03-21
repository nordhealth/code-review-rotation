import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "server/utils/rotation/**/*.ts",
        "server/utils/auth-constants.ts",
        "server/utils/api-key.ts",
        "app/lib/utils.ts",
      ],
      exclude: ["server/utils/rotation/index.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname),
      "@": resolve(__dirname, "app"),
    },
  },
});
