import {
  evaluateFormula,
  type Binding,
  type DashboardComponent,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import { readPrimitiveState } from "./state";
import type { RuntimeStateValues } from "./types";

export function isComponentVisible(
  component: DashboardComponent,
  bindings: Binding[],
  stateValues: RuntimeStateValues,
): boolean {
  const rule = component.visibility;
  if (!rule || rule.kind === "always") {
    return true;
  }

  const binding = rule.bindingId
    ? bindings.find((candidate) => candidate.bindingId === rule.bindingId)
    : undefined;
  const value = binding?.stateId ? readPrimitiveState(stateValues[binding.stateId]) : undefined;

  if (rule.kind === "binding") {
    if (value === undefined) {
      return true;
    }
    return compareStatePrimitive(value, rule.expected);
  }

  if (rule.kind === "formula") {
    try {
      return Boolean(
        evaluateFormula(rule.formula ?? "true", {
          value,
          expected: rule.expected,
          ...(binding?.stateId ? { [binding.stateId]: value } : {}),
        }),
      );
    } catch {
      return true;
    }
  }

  return true;
}

function compareStatePrimitive(
  current: StatePrimitive | undefined,
  expected: StatePrimitive | undefined,
): boolean {
  return current === expected;
}
