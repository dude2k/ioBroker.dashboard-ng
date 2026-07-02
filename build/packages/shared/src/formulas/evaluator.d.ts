export type FormulaValue = number | boolean;
export type FormulaContext = Record<string, number | boolean | string | null | undefined>;
export declare class FormulaError extends Error {
    constructor(message: string);
}
export declare function evaluateFormula(expression: string, context?: FormulaContext): FormulaValue;
