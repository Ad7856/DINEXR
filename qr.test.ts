import { describe, expect, it } from "vitest";
import { qrPngBuffer, tableUrl } from "./qr";

describe("tableUrl", () => {
  it("builds the customer URL and trims trailing slashes", () => {
    expect(tableUrl("https://dinexr.app/", "demo-restaurant", "table-01")).toBe("https://dinexr.app/r/demo-restaurant/t/table-01");
  });
  it("rejects malformed slugs and codes", () => {
    expect(() => tableUrl("https://x.y", "Bad Slug", "table-01")).toThrow();
    expect(() => tableUrl("https://x.y", "demo-restaurant", "../x")).toThrow();
  });
});
describe("qrPngBuffer", () => {
  it("produces a PNG", async () => {
    const buf = await qrPngBuffer("https://dinexr.app/r/demo-restaurant/t/table-01");
    expect([...buf.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
