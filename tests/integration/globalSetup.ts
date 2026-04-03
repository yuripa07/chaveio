import { execSync } from "child_process";

export function setup() {
  execSync("pnpm prisma migrate deploy", {
    stdio: "pipe",
  });
}
