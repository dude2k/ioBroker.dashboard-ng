# Architecture

## Overview

Dashboard-NG is one ioBroker adapter with four main runtime parts:

- Adapter Backend in `src/`
- Shared Runtime Components in `packages/runtime/`
- Editor Frontend in `packages/editor/`, built to `admin/`
- Viewer Frontend in `packages/viewer/`, built to `www/`

Shared schema, migration, formula, action and theme code lives in
`packages/shared/`. Shared React renderers for dashboard cards live in
`packages/runtime/`.

## Adapter Backend

The backend uses `@iobroker/adapter-core` and owns:

- Adapter lifecycle and `info.connection`.
- Dashboard load/save through adapter file storage.
- Import/export validation and migration.
- State/object search for the Editor state picker.
- Controlled state writes from dashboard actions.
- Future asset and template storage.

Frontend communication is command-based through ioBroker `sendTo` messages:

- `dashboard.load`
- `dashboard.save`
- `dashboard.export`
- `dashboard.import`
- `objects.search`
- `states.read`
- `state.write`

## Editor Frontend

The Editor is a React/Vite app. It provides:

- Component palette.
- Page management for creating, renaming, duplicating, deleting and switching
  dashboard pages.
- Grid canvas with snap-to-grid.
- Property inspector.
- State picker.
- Undo/redo, copy/paste and import/export.
- Responsive preview sizes.
- Theme switching.

It can run against a real ioBroker socket or a browser-local demo fallback for
development.

## Viewer Frontend

The Viewer is a separate React/Vite app. It renders the dashboard runtime only:

- Live state display.
- State write actions.
- Kiosk/fullscreen.
- Wake Lock when available.
- Burn-in protection.
- Connection status hint and reconnect attempts.

The Viewer must stay smaller and simpler than the Editor.

## Shared Runtime Components

`packages/runtime` contains the shared React renderer used by both Editor
preview and Viewer. It owns:

- Typed runtime card props and state resolution.
- Component renderers for every MVP card.
- Internal base components for text, icons, images, containers, buttons and
  value display.
- Common runtime layout helpers for breakpoints, grid placement and clamping.
- Empty, loading, missing-state and error presentation.

Editor-specific configuration UI remains in `packages/editor`. The Viewer
imports the runtime only and does not depend on Inspector, Palette or drag/drop
code.

## Shared Packages

`packages/shared` contains:

- Schema types.
- Dashboard defaults and starter templates.
- Validation.
- Migration pipeline.
- Safe formula evaluator.
- Action engine.
- Theme presets.
- Component catalog metadata.

Shared code must stay UI-framework-light unless it is intentionally in frontend
packages.

## State Binding Service

The backend state binding service searches ioBroker objects and reads/writes
states. It maps object metadata into a neutral `StateOption` shape:

- ID
- display name
- type
- role
- unit
- min/max
- read/write flags

Device detection is heuristic and must not depend on one adapter family.

## Storage Service

Dashboard JSON is stored in the adapter data area. The MVP uses a default
dashboard file and keeps migration backups before writing upgraded data. Assets
and templates use the same storage boundary later.

No external database is required for the MVP.

## Migration System

All dashboards carry `schemaVersion`. Loading runs the central migration
pipeline:

1. Clone the original dashboard as backup.
2. Migrate step by step to the current version.
3. Validate the migrated dashboard.
4. Save only if migration and validation succeed.

Migration failure must leave the original data untouched.

## Import/Export

Exports are portable JSON bundles with dashboard data and metadata. Imports run
through migration and validation, then save the dashboard. Missing states are
detected by the state binding layer and marked in UI.

Assets can later be embedded or referenced in the export format.

## Asset Management

MVP prepares assets as schema entities. Actual binary storage is planned in the
adapter data area. External URLs must be validated and rendered conservatively.

## Security Model

- No arbitrary user JavaScript.
- Formula evaluation uses a small parser, not `eval` or `Function`.
- State writes go through controlled actions.
- External URLs and images are treated as untrusted input.
- Secrets must never be stored in frontend configuration or committed files.
- MVP has Edit/View switching only, not a full role system.

## Performance Principles

- Viewer and Editor are separate bundles.
- Viewer subscribes only to states needed by the current dashboard/page.
- State updates should be batched when update frequency is high.
- Component rendering should be stable and avoid avoidable full-page rerenders.
- Assets should be cached by the browser and ioBroker web adapter.

## Build And Deployment

- `npm run build:adapter` compiles backend and shared code to `build/`.
- `npm run build:editor` builds the Editor to `admin/`.
- `npm run build:viewer` builds the Viewer to `www/`.
- `npm run build` runs all build steps.
- `io-package.json` points adapter runtime to `build/src/main.js`.
