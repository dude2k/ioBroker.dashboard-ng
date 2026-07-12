import { describe, expect, it } from "vitest";
import {
  applyPageTemplate,
  collectMissingStateIds,
  createDefaultDashboard,
  createPageTemplate,
  exportTemplate,
  importDashboardProject,
  importTemplate,
  markMissingStates,
  remapDashboardStates,
  upgradeStarterTemplates,
  validateDashboardProject,
} from "../packages/shared/src";

describe("portable dashboards and templates", () => {
  it("ships complete starter templates that can create valid pages", () => {
    const project = createDefaultDashboard({ now: "2026-07-12T00:00:00.000Z" });
    expect(project.templates).toHaveLength(2);
    expect(project.templates.every((template) => (template.components?.length ?? 0) >= 4)).toBe(
      true,
    );

    const applied = applyPageTemplate(project, project.templates[0]!);
    expect(applied.pages).toHaveLength(2);
    expect(applied.settings.activePageId).not.toBe(project.settings.activePageId);
    expect(validateDashboardProject(applied).valid).toBe(true);
  });

  it("upgrades only known empty starter placeholders", () => {
    const project = createDefaultDashboard();
    project.templates[0]!.components = [];
    project.templates.push({
      templateId: "tpl-user",
      name: "User",
      kind: "page",
      componentIds: [],
      metadata: {},
    });
    const upgraded = upgradeStarterTemplates(project);
    expect(upgraded.templates[0]!.components!.length).toBeGreaterThan(0);
    expect(upgraded.templates.at(-1)?.templateId).toBe("tpl-user");
  });

  it("roundtrips a page template with components, bindings and actions", () => {
    const project = createDefaultDashboard();
    const template = createPageTemplate(project, "page-home", "Reusable room");
    const imported = importTemplate(exportTemplate(template));

    expect(imported.name).toBe("Reusable room");
    expect(imported.components).toHaveLength(3);
    expect(imported.bindings).toHaveLength(2);
    expect(imported.actions).toHaveLength(2);
  });

  it("migrates imports, marks missing states and remaps every state reference", () => {
    const project = createDefaultDashboard();
    project.bindings[0]!.formula = 'state("alias.0.extra")';
    project.actions[0]!.condition = {
      kind: "stateEquals",
      stateId: "alias.0.condition",
      value: true,
    };
    const available = ["alias.0.living.temperature", "alias.0.replacement"];
    const imported = importDashboardProject(JSON.parse(JSON.stringify(project)), available);

    expect(collectMissingStateIds(imported.project, available)).toEqual([
      "alias.0.condition",
      "alias.0.extra",
      "alias.0.living.light",
      "alias.0.scene.evening",
    ]);
    expect(imported.project.bindings[0]!.missing).toBe(true);

    const remapped = markMissingStates(
      remapDashboardStates(imported.project, {
        "alias.0.living.light": "alias.0.replacement",
        "alias.0.extra": "alias.0.replacement",
        "alias.0.condition": "alias.0.replacement",
        "alias.0.scene.evening": "alias.0.replacement",
      }),
      available,
    );
    expect(collectMissingStateIds(remapped, available)).toEqual([]);
    expect(remapped.bindings[0]!.formula).toContain('state("alias.0.replacement")');
    expect(remapped.bindings.every((binding) => !binding.missing)).toBe(true);
  });

  it("keeps embedded assets in a dashboard JSON roundtrip", () => {
    const project = createDefaultDashboard();
    project.assets.push({
      assetId: "asset-logo",
      name: "logo.png",
      kind: "image",
      mimeType: "image/png",
      url: "data:image/png;base64,AA==",
      createdAt: "2026-07-12T00:00:00.000Z",
    });
    const imported = importDashboardProject(JSON.parse(JSON.stringify(project)));
    expect(imported.project.assets[0]?.url).toBe("data:image/png;base64,AA==");
  });

  it("rejects malformed template files", () => {
    expect(() => importTemplate({ format: "other", version: 1 })).toThrow("Unsupported template");
  });
});
