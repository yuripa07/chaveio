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
      SESSION_SECRET: "test-session-secret-for-vitest",
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    },
    coverage: {
      provider: "v8",
      include: ["src/app/api/**"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage/integration",
    },
  },
});
