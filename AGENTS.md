# ioBroker Dashboard-NG Agent Guide

Read this file first before making changes. It is the project constitution for
coding agents and human contributors.

## Project

`ioBroker Dashboard-NG` is a modern open-source ioBroker adapter for building
responsive Smart Home dashboards without requiring users to write HTML, CSS or
JavaScript.

Adapter name: `dashboard-ng`
NPM package: `iobroker.dashboard-ng`
License: MIT

## Product Goal

Dashboard-NG should be a modern alternative to classic ioBroker visualizations:
polished, responsive, flexible, intuitive and stable on wall tablets. A normal
ioBroker user must be able to create a good-looking dashboard quickly.

## Target Users

- Primary: normal ioBroker users without programming knowledge.
- Secondary: advanced ioBroker users who need more precise layout, formulas and
  state binding.
- Not primary for MVP: developers building third-party widgets or marketplaces.

## MVP Scope

- ioBroker adapter backend in TypeScript.
- Separate Editor and Viewer frontend bundles.
- Versioned JSON dashboard schema.
- Dashboard save/load, import/export and migrations.
- Grid-based drag-and-drop layout with snap-to-grid.
- State picker, state read/write, missing-state hints.
- Safe formulas and calculated values.
- Conditional visibility, styles and simple actions.
- Theme system with Modern Dark and Clean Light presets.
- Kiosk/fullscreen, optional Wake Lock and burn-in protection.
- MVP component runtime: Light Card, Sensor Card, Scene Button, Room,
  Thermostat, Blind/Shutter, Energy, Mini Chart and Camera.
- README, product docs, architecture docs, schema docs, roadmap and ADR.

## Non-Goals for MVP

- No plugin system.
- No marketplace.
- No external component API.
- No user-entered JavaScript.
- No full VIS/VIS2 migration.
- No automation platform or Blockly replacement.
- No PIN protection, roles or commercial feature split.
- No auto-generated dashboard assistant.

## Core Architecture Decisions

- Build an own ioBroker adapter instead of an external app.
- Keep Editor and Viewer as separate Vite/React bundles.
- Keep shared schema, migrations, formulas, themes and action types in
  `packages/shared`.
- Keep shared React dashboard rendering in `packages/runtime` so Editor preview
  and Viewer use the same component runtime without loading editor-only UI.
- Use a versioned JSON schema with a central migration pipeline.
- Store dashboards through an ioBroker-compatible adapter file storage service.
- Use a grid-first layout and design tokens, not free-form pixel chaos.
- Do not execute arbitrary user JavaScript. Formulas use a small safe parser.
- Keep Viewer lightweight and avoid loading editor-only code in the Viewer.

## Important Folders

```text
/
  AGENTS.md
  admin/                  Built admin/editor assets and adapter icon
  docs/                   Product, architecture, schema, roadmap and ADRs
  packages/shared/        Schema, migrations, formulas, actions, themes
  packages/runtime/       Shared React runtime renderers for Editor/Viewer
  packages/editor/        React/Vite dashboard editor
  packages/viewer/        React/Vite dashboard viewer
  src/                    ioBroker adapter backend
  test/                   Unit tests
  www/                    Built viewer assets
```

Local, non-committed agent notes may live in `.ai/`. Never commit `.ai/`.

## Commands

- Install: `npm install`
- Build all bundles: `npm run build`
- Build adapter only: `npm run build:adapter`
- Build editor: `npm run build:editor`
- Build viewer: `npm run build:viewer`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`
- Adapter package check: `npm run adapter:check`

## Quality Rules

- Keep TypeScript strict.
- Prefer small, typed modules over monolithic files.
- Keep schema validation and migrations centralized.
- Add or update tests for migrations, formulas and shared logic.
- Keep Viewer performance in mind: low re-render count, small dependencies,
  subscriptions only for needed states.
- Use clear, user-facing errors for migration, import, binding and formula
  failures.
- Avoid hardcoded local paths and machine-specific assumptions.
- Do not commit secrets, tokens, passwords or personal data.

## Migration Rules

- Every dashboard schema change must increment `schemaVersion`.
- Every schema version bump needs a migration from the previous version.
- Create a backup before migration.
- Validate after migration.
- If migration fails, keep the original dashboard unchanged and surface a clear
  error.
- Update `docs/DASHBOARD_SCHEMA.md` and tests in the same change.

## Dashboard Schema Rules

- Schema definitions live under `packages/shared/src/schema`.
- `docs/DASHBOARD_SCHEMA.md` is the human-readable source for contributors.
- Keep stable IDs for projects, pages, components, bindings, actions, themes,
  assets and templates.
- Prefer additive schema changes. Breaking changes need an ADR-level reason.

## UI/UX Rules

- Build the usable editor/viewer as the first screen. Do not add marketing
  landing pages.
- Use icons for tool buttons where possible.
- Keep dashboards polished by default through design tokens and presets.
- Do not expose endless one-off styling controls in the MVP.
- Preserve responsiveness across phone, tablet, desktop and wall panel sizes.
- Keep text fitting inside controls at common viewport widths.

## ioBroker Compatibility Rules

- Keep `io-package.json` valid and aligned with adapter code.
- Use `@iobroker/adapter-core` for the adapter lifecycle.
- Keep `admin/` for editor/admin assets and `www/` for viewer assets.
- Avoid adapter-specific device assumptions. Use objects, states, roles, common
  metadata, aliases and enums heuristically.
- Prepare for ioBroker adapter checks before release.

## Secrets and Local Notes

- Never commit secrets, API tokens, passwords or private paths.
- `.ai/` is for temporary local KI/AI notes only and must stay ignored.
- `AGENTS.md` and `docs/` are public project context and should be committed.
