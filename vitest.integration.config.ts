import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config(); // load .env for DATABASE_URL

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
    coverage: {
      provider: "v8",
      include: ["src/app/api/**"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage/integration",
    },
  },
});
