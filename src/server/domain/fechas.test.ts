import { describe, expect, it } from "vitest";
import { hoy } from "./fechas";

describe("hoy", () => {
  it("usa la fecha de Argentina, no la de UTC", () => {
    // 31/12 a las 23:30 en Buenos Aires = 1/1 02:30 en UTC
    expect(hoy(new Date("2027-01-01T02:30:00Z"))).toBe("2026-12-31");
    expect(hoy(new Date("2027-01-01T03:30:00Z"))).toBe("2027-01-01");
  });
});
