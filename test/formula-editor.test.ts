import { describe, expect, it } from "vitest";
import {
  createFormulaPreviewContext,
  insertFormulaStateReference,
} from "../packages/editor/src/lib/formulas";

describe("formula editor helpers", () => {
  it("inserts safe state references at the current selection", () => {
    expect(insertFormulaStateReference("value + 1", "0_userdata.0.power", 0, 5)).toEqual({
      expression: 'state("0_userdata.0.power") + 1',
      cursor: 27,
    });
  });

  it("adds aliases to the live preview context", () => {
    expect(createFormulaPreviewContext({ "sensor.power": 1500 }, { value: 15 })).toEqual({
      "sensor.power": 1500,
      value: 15,
    });
  });
});
