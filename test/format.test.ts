import { describe, expect, it } from "bun:test";
import { formatCost, formatPercent } from "../src/format.ts";

describe("formatPercent", () => {
  it("rounds to whole percents when given a fraction", () => {
    expect(formatPercent(23.4)).toBe("23%");
    expect(formatPercent(99.5)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatCost", () => {
  it("formats the cost as US dollars", () => {
    expect(formatCost(7)).toBe("$7.00");
    expect(formatCost(1234.567)).toBe("$1,234.57");
  });
});
