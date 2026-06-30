import { describe, expect, it } from "vitest";
import { evaluateFormula, FormulaError } from "@dashboard-ng/shared";

describe("formula evaluator", () => {
  it("evaluates arithmetic without using arbitrary JavaScript", () => {
    expect(evaluateFormula("(stateA + stateB) / 1000", { stateA: 420, stateB: 580 })).toBe(1);
  });

  it("supports comparisons and boolean operators", () => {
    expect(
      evaluateFormula("temperature > 20 && windowOpen == false", {
        temperature: 21.5,
        windowOpen: false,
      }),
    ).toBe(true);
  });

  it("supports safe helper functions", () => {
    expect(evaluateFormula("round(max(a, b) / 3, 2)", { a: 5, b: 10 })).toBe(3.33);
  });

  it("rejects unknown variables", () => {
    expect(() => evaluateFormula("missing + 1", {})).toThrow(FormulaError);
  });
});
