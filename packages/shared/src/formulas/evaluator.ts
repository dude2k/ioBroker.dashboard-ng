export type FormulaValue = number | boolean;
export type FormulaContext = Record<string, number | boolean | string | null | undefined>;

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," }
  | { type: "boolean"; value: boolean };

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

export function evaluateFormula(expression: string, context: FormulaContext = {}): FormulaValue {
  const parser = new FormulaParser(tokenize(expression), context);
  const result = parser.parse();
  if (typeof result !== "number" && typeof result !== "boolean") {
    throw new FormulaError("Formula did not produce a number or boolean.");
  }
  return result;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
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
      } else {
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
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: FormulaContext,
  ) {}

  parse(): FormulaValue {
    const value = this.parseOr();
    if (this.current()) {
      throw new FormulaError("Unexpected token at end of formula.");
    }
    return value;
  }

  private parseOr(): FormulaValue {
    let left = this.parseAnd();
    while (this.matchOperator("||")) {
      const right = this.parseAnd();
      left = toBoolean(left) || toBoolean(right);
    }
    return left;
  }

  private parseAnd(): FormulaValue {
    let left = this.parseEquality();
    while (this.matchOperator("&&")) {
      const right = this.parseEquality();
      left = toBoolean(left) && toBoolean(right);
    }
    return left;
  }

  private parseEquality(): FormulaValue {
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

  private parseComparison(): FormulaValue {
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

  private parseAdditive(): FormulaValue {
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

  private parseMultiplicative(): FormulaValue {
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

  private parseUnary(): FormulaValue {
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

  private parsePrimary(): FormulaValue {
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

  private parseFunctionCall(name: string): FormulaValue {
    const args: FormulaValue[] = [];
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

  private readIdentifier(identifier: string): FormulaValue {
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

  private current(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token | undefined {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private matchOperator(operator: string): boolean {
    const token = this.current();
    if (token?.type === "operator" && token.value === operator) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchParen(paren: "(" | ")"): boolean {
    const token = this.current();
    if (token?.type === "paren" && token.value === paren) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchComma(): boolean {
    const token = this.current();
    if (token?.type === "comma") {
      this.index += 1;
      return true;
    }
    return false;
  }
}

function callFunction(name: string, args: FormulaValue[]): FormulaValue {
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

function requireArgCount(
  name: string,
  args: number[],
  min: number,
  max = Number.POSITIVE_INFINITY,
): void {
  if (args.length < min || args.length > max) {
    throw new FormulaError(`Function "${name}" received ${args.length} arguments.`);
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** Math.max(0, Math.min(6, Math.trunc(decimals)));
  return Math.round(value * factor) / factor;
}

function toNumber(value: FormulaValue): number {
  if (typeof value === "number") {
    return value;
  }
  return value ? 1 : 0;
}

function toBoolean(value: FormulaValue): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return value !== 0;
}
