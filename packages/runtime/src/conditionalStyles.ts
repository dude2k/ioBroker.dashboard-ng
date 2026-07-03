import type { Binding, DashboardComponent, StatePrimitive } from "@dashboard-ng/shared";
import { isComponentVisible } from "./visibility";
import type { RuntimeStateValues } from "./types";

export type ConditionalStyleTone = "accent" | "warning" | "danger" | "muted";
export type ConditionalStyleOperator =
  "equals" | "notEquals" | "greaterThan" | "lessThan" | "formula";

export interface ConditionalStyleRule {
  enabled: boolean;
  tone: ConditionalStyleTone;
  stateId?: string;
  operator: ConditionalStyleOperator;
  expected?: StatePrimitive;
  formula?: string;
}

export function getConditionalStyleRule(
  component: DashboardComponent,
): ConditionalStyleRule | undefined {
  const rule = component.style.conditional;
  if (!isConditionalStyleRule(rule)) {
    return undefined;
  }
  return rule;
}

export function resolveConditionalStyleClass(
  component: DashboardComponent,
  bindings: Binding[],
  stateValues: RuntimeStateValues,
): string {
  const rule = getConditionalStyleRule(component);
  if (!rule?.enabled) {
    return "";
  }

  const visibilityComponent: DashboardComponent = {
    ...component,
    visibility: toVisibilityRule(component, rule, bindings),
  };
  return isComponentVisible(visibilityComponent, bindings, stateValues)
    ? `has-conditional-${rule.tone}`
    : "";
}

function toVisibilityRule(
  component: DashboardComponent,
  rule: ConditionalStyleRule,
  bindings: Binding[],
): DashboardComponent["visibility"] {
  if (rule.operator === "formula") {
    return {
      kind: "formula",
      formula: rule.formula ?? "true",
      ...(rule.expected !== undefined ? { expected: rule.expected } : {}),
    };
  }

  const binding = bindings.find(
    (candidate) => candidate.componentId === component.componentId && candidate.target === "style",
  );
  if (!binding) {
    return { kind: "formula", formula: "false" };
  }
  if (rule.operator === "equals") {
    return {
      kind: "binding",
      bindingId: binding.bindingId,
      ...(rule.expected !== undefined ? { expected: rule.expected } : {}),
    };
  }

  return {
    kind: "formula",
    bindingId: binding.bindingId,
    formula: styleFormulaForOperator(rule.operator),
    ...(rule.expected !== undefined ? { expected: rule.expected } : {}),
  };
}

function styleFormulaForOperator(operator: ConditionalStyleOperator): string {
  switch (operator) {
    case "notEquals":
      return "value != expected";
    case "greaterThan":
      return "value > expected";
    case "lessThan":
      return "value < expected";
    case "equals":
      return "value == expected";
    case "formula":
      return "true";
  }
}

function isConditionalStyleRule(value: unknown): value is ConditionalStyleRule {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ConditionalStyleRule>;
  return (
    typeof candidate.enabled === "boolean" &&
    typeof candidate.tone === "string" &&
    typeof candidate.operator === "string"
  );
}
