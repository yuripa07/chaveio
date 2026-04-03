import { execSync } from "child_process";

export function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
  });
}
