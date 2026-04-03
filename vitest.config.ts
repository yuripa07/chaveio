import { defineConfig } from "vitest/config";
import path from "path";

const TEST_DB_URL = `file:${path.resolve(__dirname, "prisma/test.db")}`;

process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = "test-secret-for-vitest";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup:["tests/integration/globalSetup.ts"],
    
    // --> Vitest 4: top-level options (replaces removed poolOptions.threads.singleThread)
    // Stops SQLite "database is locked" / contention from parallel workers + files.
    fileParallelism: false,
    maxWorkers: 1,

    env: {
      DATABASE_URL: TEST_DB_URL,
      JWT_SECRET: "test-secret-for-vitest",
    },
  },
});