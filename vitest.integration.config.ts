import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/globalSetup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    env: {
      JWT_SECRET: "test-secret-for-vitest",
    },
  },
});
