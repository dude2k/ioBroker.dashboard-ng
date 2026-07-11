import type { FormulaContext, StatePrimitive } from "@dashboard-ng/shared";

export function createFormulaPreviewContext(
  stateValues: Record<string, StatePrimitive>,
  aliases: FormulaContext = {},
): FormulaContext {
  return { ...stateValues, ...aliases };
}

export function insertFormulaStateReference(
  expression: string,
  stateId: string,
  selectionStart = expression.length,
  selectionEnd = selectionStart,
): { expression: string; cursor: number } {
  const reference = `state(${JSON.stringify(stateId)})`;
  const before = expression.slice(0, selectionStart);
  const after = expression.slice(selectionEnd);
  const prefix = before && !/[\s+\-*/%(<>=!,]$/.test(before) ? " " : "";
  const suffix = after && !/^[\s+\-*/%)<>=!,]/.test(after) ? " " : "";
  const insertion = `${prefix}${reference}${suffix}`;
  return {
    expression: `${before}${insertion}${after}`,
    cursor: before.length + prefix.length + reference.length,
  };
}
