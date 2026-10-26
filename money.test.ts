import { describe, expect, it } from "vitest";
import { parsePercentToBps, parseRupees } from "./money";
import { startOfTodayIST } from "./time";

describe("parseRupees", () => {
  it("converts to paise", () => { expect(parseRupees("249")).toBe(24900); expect(parseRupees("249.5")).toBe(24950); expect(parseRupees("0.07")).toBe(7); });
  it("rejects bad input", () => { for (const s of ["", "-5", "abc", "1.234", "99999999"]) expect(parseRupees(s)).toBeNull(); });
});
describe("parsePercentToBps", () => {
  it("converts and bounds", () => { expect(parsePercentToBps("5")).toBe(500); expect(parsePercentToBps("2.5")).toBe(250); expect(parsePercentToBps("101")).toBeNull(); });
});
describe("startOfTodayIST", () => {
  it("rolls over at IST midnight", () => {
    expect(startOfTodayIST(new Date("2026-10-25T20:00:00Z")).toISOString()).toBe("2026-10-25T18:30:00.000Z");
    expect(startOfTodayIST(new Date("2026-10-25T10:00:00Z")).toISOString()).toBe("2026-10-24T18:30:00.000Z");
  });
});
