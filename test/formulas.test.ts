import { describe, expect, it } from "vitest";
import {
  evaluateFormula,
  FormulaError,
  getFormulaStateIds,
  validateFormula,
} from "@dashboard-ng/shared";

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

  it("reads arbitrary ioBroker IDs through the safe state function", () => {
    const formula = '(state("0_userdata.0.solar-power") + state("alias.0.grid.power")) / 1000';
    expect(
      evaluateFormula(formula, {
        "0_userdata.0.solar-power": 750,
        "alias.0.grid.power": 250,
      }),
    ).toBe(1);
    expect(getFormulaStateIds(formula)).toEqual(["0_userdata.0.solar-power", "alias.0.grid.power"]);
  });

  it("supports safe string comparisons", () => {
    expect(evaluateFormula('state("home.mode") == "away"', { "home.mode": "away" })).toBe(true);
  });

  it("validates formulas without requiring live state values", () => {
    expect(validateFormula('round(state("sensor.power") / 1000, 2)')).toEqual({
      valid: true,
      stateIds: ["sensor.power"],
    });
    expect(validateFormula("value + )")).toMatchObject({ valid: false, stateIds: [] });
  });

  it("rejects unsafe syntax and non-finite operations", () => {
    expect(() => evaluateFormula("10 % 0")).toThrow("Modulo by zero");
    expect(() => evaluateFormula("Math.random()", {})).toThrow(FormulaError);
    expect(() => evaluateFormula('state("missing")', {})).toThrow('Unknown state "missing"');
    expect(() => evaluateFormula("1 + ".repeat(2000) + "1")).toThrow("character limit");
  });

  it("rejects unknown variables", () => {
    expect(() => evaluateFormula("missing + 1", {})).toThrow(FormulaError);
  });
});
