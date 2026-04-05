import { describe, it, expect } from "vitest";
import { decodeTokenPayload } from "@/lib/token-client";

describe("decodeTokenPayload", () => {
  function makeToken(payload: object): string {
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${b64}.signature`;
  }

  it("decodes a valid JWT payload", () => {
    const token = makeToken({ participantId: "p1", tournamentId: "t1", isCreator: false });
    const result = decodeTokenPayload(token);
    expect(result?.participantId).toBe("p1");
    expect(result?.tournamentId).toBe("t1");
    expect(result?.isCreator).toBe(false);
  });

  it("returns null for a token with too few segments", () => {
    expect(decodeTokenPayload("onlyone")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeTokenPayload("")).toBeNull();
  });

  it("returns null when payload is not valid JSON", () => {
    const badB64 = Buffer.from("not-json").toString("base64url");
    expect(decodeTokenPayload(`header.${badB64}.sig`)).toBeNull();
  });
});
