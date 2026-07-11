import { describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";

describe("dashboard entity validation", () => {
  it.each([
    ["Project", "$.name", (value: Record<string, unknown>) => (value.name = "")],
    [
      "Page",
      "$.pages[0].componentIds",
      (value: Record<string, unknown>) => {
        (value.pages as Array<Record<string, unknown>>)[0]!.componentIds = "broken";
      },
    ],
    [
      "Layout",
      "$.layouts.default.columns",
      (value: Record<string, unknown>) => {
        (value.layouts as Record<string, Record<string, unknown>>).default!.columns = 0;
      },
    ],
    [
      "Component",
      "$.components[0].props",
      (value: Record<string, unknown>) => {
        (value.components as Array<Record<string, unknown>>)[0]!.props = null;
      },
    ],
    [
      "Binding",
      "$.bindings[0].mode",
      (value: Record<string, unknown>) => {
        (value.bindings as Array<Record<string, unknown>>)[0]!.mode = "execute";
      },
    ],
    [
      "Action",
      "$.actions[0].steps[0].kind",
      (value: Record<string, unknown>) => {
        const action = (value.actions as Array<Record<string, unknown>>)[0]!;
        (action.steps as Array<Record<string, unknown>>)[0]!.kind = "script";
      },
    ],
    [
      "Theme",
      "$.themes[0].tokens.colors",
      (value: Record<string, unknown>) => {
        const theme = (value.themes as Array<Record<string, unknown>>)[0]!;
        (theme.tokens as Record<string, unknown>).colors = null;
      },
    ],
    [
      "Asset",
      "$.assets[0].kind",
      (value: Record<string, unknown>) => {
        value.assets = [{ assetId: "asset-1", name: "Asset", kind: "script", createdAt: "now" }];
      },
    ],
    [
      "Template",
      "$.templates[0].metadata.owner",
      (value: Record<string, unknown>) => {
        const template = (value.templates as Array<Record<string, unknown>>)[0]!;
        template.metadata = { owner: 42 };
      },
    ],
  ])("rejects invalid %s data", (_entity, path, mutate) => {
    const dashboard = structuredClone(createDefaultDashboard()) as unknown as Record<
      string,
      unknown
    >;
    mutate(dashboard);
    const validation = validateDashboardProject(dashboard);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path })]));
  });
});
