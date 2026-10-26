import { describe, expect, it } from "vitest";
import { sameOrigin } from "./csrf";

const req = (h: Record<string, string>) => new Request("https://dinexr.app/api/x", { method: "POST", headers: h });
describe("sameOrigin", () => {
  it("accepts same origin and missing Origin", () => {
    expect(sameOrigin(req({ origin: "https://dinexr.app", host: "dinexr.app" }))).toBe(true);
    expect(sameOrigin(req({ host: "dinexr.app" }))).toBe(true);
  });
  it("rejects a foreign or malformed Origin", () => {
    expect(sameOrigin(req({ origin: "https://evil.example", host: "dinexr.app" }))).toBe(false);
    expect(sameOrigin(req({ origin: "not a url", host: "dinexr.app" }))).toBe(false);
  });
});
