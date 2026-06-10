import { describe, expect, it } from "vitest";
import { clampQuantity, formatTND } from "./money";

describe("formatTND", () => {
  it("formats with two decimals and a TND suffix", () => {
    expect(formatTND(20)).toBe("20.00 TND");
    expect(formatTND(7.5)).toBe("7.50 TND");
  });

  it("falls back to 0 for non-finite input", () => {
    expect(formatTND(NaN)).toBe("0.00 TND");
  });
});

describe("clampQuantity", () => {
  it("clamps to the available stock", () => {
    expect(clampQuantity(10, 3)).toBe(3);
  });

  it("never goes below zero", () => {
    expect(clampQuantity(-5, 10)).toBe(0);
  });

  it("floors fractional quantities", () => {
    expect(clampQuantity(2.9, 10)).toBe(2);
  });

  it("returns 0 when stock is zero", () => {
    expect(clampQuantity(5, 0)).toBe(0);
  });
});
