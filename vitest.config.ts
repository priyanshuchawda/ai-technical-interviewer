import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

if (fs.existsSync(".env.local")) {
  const envConfig = fs.readFileSync(".env.local", "utf8");
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"?([^"#\r\n]*)"?/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["cogram-sdk-node/**", "cogram-sdk-python/**", "node_modules/**", "e2e/**"],
    maxConcurrency: 1,
    fileParallelism: false,
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "src/lib/evals/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
