import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-for-vitest",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/db.ts"], // DB singleton requires real connection — covered by integration tests
      reporter: ["text", "html"],
      reportsDirectory: "coverage/unit",
    },
  },
});
