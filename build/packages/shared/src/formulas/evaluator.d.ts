export type FormulaValue = number | boolean | string;
export type FormulaContext = Record<string, number | boolean | string | null | undefined>;
export interface FormulaValidationResult {
    valid: boolean;
    stateIds: string[];
    error?: string;
}
export declare class FormulaError extends Error {
    constructor(message: string);
}
export declare function evaluateFormula(expression: string, context?: FormulaContext): FormulaValue;
export declare function getFormulaStateIds(expression: string, localIdentifiers?: string[]): string[];
export declare function validateFormula(expression: string): FormulaValidationResult;
