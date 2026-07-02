import { describe, expect, it } from "vitest";
import { resolveRuntimeBreakpoint } from "../packages/runtime/src/layout";

describe("runtime layout", () => {
  it("resolves viewer breakpoints from viewport width", () => {
    expect(resolveRuntimeBreakpoint(390)).toBe("phone");
    expect(resolveRuntimeBreakpoint(800)).toBe("tablet");
    expect(resolveRuntimeBreakpoint(1280)).toBe("desktop");
    expect(resolveRuntimeBreakpoint(1600)).toBe("wall");
  });
});
