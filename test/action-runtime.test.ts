import { describe, expect, it, vi } from "vitest";
import {
  runDashboardAction,
  type DashboardAction,
  type StatePrimitive,
} from "@dashboard-ng/shared";

describe("action runtime", () => {
  it("runs else steps when a state condition is false", async () => {
    const writes: Array<[string, StatePrimitive]> = [];
    const action: DashboardAction = {
      actionId: "act-else",
      componentId: "cmp-1",
      trigger: "swipe",
      condition: { kind: "stateGreaterThan", stateId: "sensor.value", value: 20 },
      steps: [{ kind: "setState", stateId: "result", value: "warm" }],
      elseSteps: [{ kind: "setState", stateId: "result", value: "cool" }],
    };

    await runDashboardAction(action, {
      getState: async () => 18,
      setState: async (id, value) => writes.push([id, value]),
      navigate: vi.fn(),
      openUrl: vi.fn(),
    });

    expect(writes).toEqual([["result", "cool"]]);
  });

  it("provides an optional input state to formula conditions", async () => {
    const navigate = vi.fn();
    const action: DashboardAction = {
      actionId: "act-formula",
      componentId: "cmp-1",
      trigger: "tap",
      condition: { kind: "formula", stateId: "sensor.value", formula: "value >= 10" },
      steps: [{ kind: "navigate", pageId: "page-2" }],
    };

    await runDashboardAction(action, {
      getState: async () => 12,
      setState: vi.fn(),
      navigate,
      openUrl: vi.fn(),
    });

    expect(navigate).toHaveBeenCalledWith("page-2");
  });
});
