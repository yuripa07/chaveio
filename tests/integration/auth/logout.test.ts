import { describe, it, expect, afterAll } from "vitest";
import { testPrisma } from "../helpers";
import { SESSION_COOKIE } from "@/lib/session";

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie and returns success", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});
