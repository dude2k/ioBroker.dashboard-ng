"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaError = void 0;
exports.evaluateFormula = evaluateFormula;
class FormulaError extends Error {
    constructor(message) {
        super(message);
        this.name = "FormulaError";
    }
}
exports.FormulaError = FormulaError;
function evaluateFormula(expression, context = {}) {
    const parser = new FormulaParser(tokenize(expression), context);
    const result = parser.parse();
    if (typeof result !== "number" && typeof result !== "boolean") {
        throw new FormulaError("Formula did not produce a number or boolean.");
    }
    return result;
}
function tokenize(expression) {
    const tokens = [];
    let index = 0;
    while (index < expression.length) {
        const char = expression[index] ?? "";
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        if (/\d|\./.test(char)) {
            const start = index;
            index += 1;
            while (index < expression.length && /[\d.]/.test(expression[index] ?? "")) {
                index += 1;
            }
            const value = Number(expression.slice(start, index));
            if (!Number.isFinite(value)) {
                throw new FormulaError(`Invalid number at position ${start}.`);
            }
            tokens.push({ type: "number", value });
            continue;
        }
        if (/[A-Za-z_]/.test(char)) {
            const start = index;
            index += 1;
            while (index < expression.length && /[A-Za-z0-9_.:-]/.test(expression[index] ?? "")) {
                index += 1;
            }
            const value = expression.slice(start, index);
            if (value === "true" || value === "false") {
                tokens.push({ type: "boolean", value: value === "true" });
            }
            else {
                tokens.push({ type: "identifier", value });
            }
            continue;
        }
        const twoChar = expression.slice(index, index + 2);
        if ([">=", "<=", "==", "!=", "&&", "||"].includes(twoChar)) {
            tokens.push({ type: "operator", value: twoChar });
            index += 2;
            continue;
        }
        if (["+", "-", "*", "/", "%", ">", "<", "!"].includes(char)) {
            tokens.push({ type: "operator", value: char });
            index += 1;
            continue;
        }
        if (char === "(" || char === ")") {
            tokens.push({ type: "paren", value: char });
            index += 1;
            continue;
        }
        if (char === ",") {
            tokens.push({ type: "comma", value: "," });
            index += 1;
            continue;
        }
        throw new FormulaError(`Unsupported character "${char}" at position ${index}.`);
    }
    return tokens;
}
class FormulaParser {
    tokens;
    context;
    index = 0;
    constructor(tokens, context) {
        this.tokens = tokens;
        this.context = context;
    }
    parse() {
        const value = this.parseOr();
        if (this.current()) {
            throw new FormulaError("Unexpected token at end of formula.");
        }
        return value;
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.matchOperator("||")) {
            const right = this.parseAnd();
            left = toBoolean(left) || toBoolean(right);
        }
        return left;
    }
    parseAnd() {
        let left = this.parseEquality();
        while (this.matchOperator("&&")) {
            const right = this.parseEquality();
            left = toBoolean(left) && toBoolean(right);
        }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (true) {
            if (this.matchOperator("==")) {
                left = left === this.parseComparison();
                continue;
            }
            if (this.matchOperator("!=")) {
                left = left !== this.parseComparison();
                continue;
            }
            return left;
        }
    }
    parseComparison() {
        let left = this.parseAdditive();
        while (true) {
            if (this.matchOperator(">=")) {
                left = toNumber(left) >= toNumber(this.parseAdditive());
                continue;
            }
            if (this.matchOperator("<=")) {
                left = toNumber(left) <= toNumber(this.parseAdditive());
                continue;
            }
            if (this.matchOperator(">")) {
                left = toNumber(left) > toNumber(this.parseAdditive());
                continue;
            }
            if (this.matchOperator("<")) {
                left = toNumber(left) < toNumber(this.parseAdditive());
                continue;
            }
            return left;
        }
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (true) {
            if (this.matchOperator("+")) {
                left = toNumber(left) + toNumber(this.parseMultiplicative());
                continue;
            }
            if (this.matchOperator("-")) {
                left = toNumber(left) - toNumber(this.parseMultiplicative());
                continue;
            }
            return left;
        }
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (true) {
            if (this.matchOperator("*")) {
                left = toNumber(left) * toNumber(this.parseUnary());
                continue;
            }
            if (this.matchOperator("/")) {
                const right = toNumber(this.parseUnary());
                if (right === 0) {
                    throw new FormulaError("Division by zero.");
                }
                left = toNumber(left) / right;
                continue;
            }
            if (this.matchOperator("%")) {
                left = toNumber(left) % toNumber(this.parseUnary());
                continue;
            }
            return left;
        }
    }
    parseUnary() {
        if (this.matchOperator("-")) {
            return -toNumber(this.parseUnary());
        }
        if (this.matchOperator("+")) {
            return toNumber(this.parseUnary());
        }
        if (this.matchOperator("!")) {
            return !toBoolean(this.parseUnary());
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const token = this.consume();
        if (!token) {
            throw new FormulaError("Unexpected end of formula.");
        }
        if (token.type === "number" || token.type === "boolean") {
            return token.value;
        }
        if (token.type === "identifier") {
            if (this.matchParen("(")) {
                return this.parseFunctionCall(token.value);
            }
            return this.readIdentifier(token.value);
        }
        if (token.type === "paren" && token.value === "(") {
            const value = this.parseOr();
            if (!this.matchParen(")")) {
                throw new FormulaError("Missing closing parenthesis.");
            }
            return value;
        }
        throw new FormulaError("Unexpected token in formula.");
    }
    parseFunctionCall(name) {
        const args = [];
        if (this.matchParen(")")) {
            return callFunction(name, args);
        }
        while (true) {
            args.push(this.parseOr());
            if (this.matchParen(")")) {
                return callFunction(name, args);
            }
            if (!this.matchComma()) {
                throw new FormulaError("Expected comma in function call.");
            }
        }
    }
    readIdentifier(identifier) {
        if (!(identifier in this.context)) {
            throw new FormulaError(`Unknown formula variable "${identifier}".`);
        }
        const value = this.context[identifier];
        if (typeof value === "number" || typeof value === "boolean") {
            return value;
        }
        if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        throw new FormulaError(`Formula variable "${identifier}" is not numeric or boolean.`);
    }
    current() {
        return this.tokens[this.index];
    }
    consume() {
        const token = this.tokens[this.index];
        this.index += 1;
        return token;
    }
    matchOperator(operator) {
        const token = this.current();
        if (token?.type === "operator" && token.value === operator) {
            this.index += 1;
            return true;
        }
        return false;
    }
    matchParen(paren) {
        const token = this.current();
        if (token?.type === "paren" && token.value === paren) {
            this.index += 1;
            return true;
        }
        return false;
    }
    matchComma() {
        const token = this.current();
        if (token?.type === "comma") {
            this.index += 1;
            return true;
        }
        return false;
    }
}
function callFunction(name, args) {
    const numbers = args.map(toNumber);
    switch (name) {
        case "min":
            requireArgCount(name, numbers, 1);
            return Math.min(...numbers);
        case "max":
            requireArgCount(name, numbers, 1);
            return Math.max(...numbers);
        case "abs":
            requireArgCount(name, numbers, 1, 1);
            return Math.abs(numbers[0] ?? 0);
        case "round":
            requireArgCount(name, numbers, 1, 2);
            return roundTo(numbers[0] ?? 0, numbers[1] ?? 0);
        default:
            throw new FormulaError(`Unsupported function "${name}".`);
    }
}
function requireArgCount(name, args, min, max = Number.POSITIVE_INFINITY) {
    if (args.length < min || args.length > max) {
        throw new FormulaError(`Function "${name}" received ${args.length} arguments.`);
    }
}
function roundTo(value, decimals) {
    const factor = 10 ** Math.max(0, Math.min(6, Math.trunc(decimals)));
    return Math.round(value * factor) / factor;
}
function toNumber(value) {
    if (typeof value === "number") {
        return value;
    }
    return value ? 1 : 0;
}
function toBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }
    return value !== 0;
}
//# sourceMappingURL=evaluator.js.map