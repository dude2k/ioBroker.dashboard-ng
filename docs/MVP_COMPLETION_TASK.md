# MVP Completion Task

This document is the exact task description for completing the remaining
Dashboard-NG MVP after the first installable baseline.

## Current Baseline

The project is an installable ioBroker adapter baseline.

- Adapter display name: `ioBroker Dashboard-NG`
- Adapter name: `dashboard-ng`
- NPM package name: `iobroker.dashboard-ng`
- GitHub repository: `https://github.com/dude2k/ioBroker.dashboard-ng`
- GitHub test install URL: `https://github.com/dude2k/ioBroker.dashboard-ng`
- Current status reported by the user: adapter installs successfully, the
  instance can be created and runs.

Do not rename the adapter, package or repository unless the user explicitly
requests it.

## Objective

Complete the remaining MVP from the original product prompt so a normal
ioBroker user can create, save, load, use and export a modern responsive Smart
Home dashboard without HTML, CSS or JavaScript.

The finished MVP must still be installable from GitHub and must not regress the
currently working adapter startup.

## Non-Negotiable Constraints

- Keep the adapter name `dashboard-ng`.
- Keep the package name `iobroker.dashboard-ng`.
- Keep Editor and Viewer as separate bundles.
- Keep the Viewer independent from heavy editor-only dependencies.
- Do not execute arbitrary user JavaScript.
- Keep formulas sandboxed through the shared formula evaluator.
- Store dashboards and assets through ioBroker-compatible adapter storage.
- Keep schema changes versioned, migrated and tested.
- Keep `.ai/` ignored and never commit secrets or local private paths.
- Prefer strong defaults over endless one-off styling controls.
- Do not add plugin system, marketplace, pro model, PIN protection, full role
  system, full VIS/VIS2 migration or AI dashboard generation in the MVP.

## Required Working Method

Before implementing a work package:

1. Read `AGENTS.md`.
2. Read this file.
3. Read the relevant docs under `docs/`.
4. Run `git status --short` and do not overwrite unrelated user changes.
5. Inspect the existing implementation before designing new abstractions.
6. Keep each change focused and update docs in the same commit when behavior,
   schema, architecture or scope changes.

After every substantial work package:

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `npm pack --dry-run` when install packaging can be affected.
5. Run `npm run adapter:check` before release-oriented changes are called done.
6. Verify that GitHub installation still works when install behavior changes.

## Definition Of Done For The Full MVP

The full MVP is complete only when all items below are true:

- The adapter can be installed from GitHub through the ioBroker Admin custom URL
  installer.
- The adapter instance starts without runtime errors.
- The Editor opens from the adapter admin page.
- The Viewer opens through the ioBroker web adapter path.
- A user can create a dashboard from scratch.
- A user can add, move, resize and configure components on a grid.
- Grid placement uses snap-to-grid.
- The layout responds usefully on phone, tablet, desktop and wall-panel sizes.
- Portrait and landscape orientations are supported.
- A user can create and switch pages.
- A user can bind ioBroker states through a searchable object/state picker.
- Bound states are read live.
- Writable states can be changed from the Viewer.
- Missing states are visibly marked after import or deletion.
- Formula bindings work with clear validation and error messages.
- Conditional visibility works.
- Conditional styles work.
- Click/tap, long press and simple conditional actions work.
- Light and dark themes work.
- Central design settings can be adjusted without destroying the design system.
- Dashboard save and load work through adapter storage.
- Dashboard import and export work.
- Template import and export work.
- One or two polished starter templates are included.
- Asset upload and asset references work for dashboard use.
- Kiosk/fullscreen mode works.
- Wake Lock is requested when available and fails gracefully when unavailable.
- Burn-in protection can be enabled and disabled.
- Connection loss keeps the dashboard visible and shows a subtle reconnect
  state.
- The Viewer automatically reconnects.
- Old schema versions can migrate to the current schema.
- Failed migrations keep the original dashboard intact and report a clear error.
- Build, lint and tests pass.
- The ioBroker adapter checker has no MVP-blocking errors left.
- README and docs describe the implemented behavior accurately.

## Work Package 1: Release And Adapter-Check Hardening

Goal: remove checker findings that block a clean ioBroker release path while
keeping GitHub test installation working.

Tasks:

- Add or update ioBroker metadata required by the current checker:
  - `common.tier`
  - `common.licenseInformation`
  - supported Node.js and js-controller versions
  - admin and web dependency versions
  - translated `common.titleLang`, `common.desc` and `common.news` entries
- Remove deprecated or invalid `io-package.json` fields where current ioBroker
  conventions require it:
  - remove deprecated `common.title` if safe
  - remove deprecated `common.main` if package `main` is sufficient
  - remove deprecated `common.materialize`
  - replace or remove invalid `common.www`
- Add `.commitinfo` to `.gitignore`.
- Add `@iobroker/testing` and at least one adapter startup or package test.
- Add a GitHub Actions workflow for install, lint, tests, build and packaging.
- Add a README changelog section.
- Add a copyright line under README license.
- Decide and document the build-output strategy:
  - Prefer not committing generated build output if GitHub installs continue to
    build through `prepare`.
  - If checker requirements force a different release strategy, document the
    reason in `docs/ARCHITECTURE.md`.
- Update repository About text and topics manually on GitHub:
  - suggested description: `Modern responsive dashboard adapter for ioBroker`
  - suggested topics: `iobroker`, `iobroker-adapter`, `dashboard`,
    `smart-home`, `visualization`, `react`, `typescript`

Acceptance criteria:

- `npm run adapter:check` no longer reports repository-name errors.
- Remaining checker findings are either fixed or explicitly documented as
  post-MVP release work.
- GitHub custom URL installation still succeeds.

## Work Package 2: Shared Runtime Component System

Goal: make component rendering consistent between Editor preview and Viewer.

Tasks:

- Introduce a typed component runtime layer shared by Editor preview and Viewer.
- Keep editor-only configuration UI outside the Viewer bundle.
- Implement component renderers for:
  - `light-card`
  - `sensor-card`
  - `scene-button`
  - `room-card`
  - `thermostat-card`
  - `blind-card`
  - `energy-card`
  - `mini-chart-card`
  - `camera-card`
- Implement internal base components as needed:
  - Text
  - Icon
  - Image
  - Container
  - Button
  - Value Display
- Mark catalog entries `implemented: true` only when the component works in both
  Editor preview and Viewer.
- Add empty, loading, missing-state and error states for every public card.
- Add tests for component catalog defaults and schema compatibility.

Acceptance criteria:

- Every MVP card can be added in the Editor.
- Every MVP card renders in the Viewer.
- Every MVP card has meaningful default props and layout.
- No card crashes when bindings or states are missing.

## Work Package 3: Editor Layout And Interaction

Goal: turn the Editor foundation into a usable dashboard builder.

Tasks:

- Implement real drag-and-drop from the palette to the canvas.
- Implement component move and resize on the grid.
- Keep snap-to-grid behavior stable.
- Add sections, cards and containers as first-class layout concepts.
- Support nested components where the schema allows it.
- Add page management:
  - create page
  - rename page
  - duplicate page
  - delete page with confirmation
  - switch active page
- Add responsive preview modes for:
  - phone
  - tablet
  - desktop
  - wall panel
- Add portrait and landscape preview handling.
- Add Advanced Mode for precise layout values and breakpoint overrides.
- Add multi-select.
- Add duplicate.
- Add optional alignment tools if they stay lightweight.
- Add lock/unlock and hide/show component controls.
- Add keyboard-friendly basics where practical:
  - delete selected component
  - copy
  - paste
  - undo
  - redo

Acceptance criteria:

- A normal user can build a simple room dashboard without editing JSON.
- Moving or resizing a component does not corrupt layout data.
- Undo and redo work for add, move, resize, delete and property changes.
- Phone/tablet/desktop/wall previews do not overlap incoherently.

## Work Package 4: Inspector, Bindings, Actions And Styles UI

Goal: expose schema capabilities through a clear, non-technical UI.

Tasks:

- Expand the property inspector for every MVP card.
- Provide binding controls per component property.
- Provide formula binding controls with inline validation.
- Provide value transformation controls where useful.
- Provide action configuration UI:
  - click/tap
  - long press
  - swipe if feasible without making mobile behavior fragile
  - multiple ordered actions
  - else actions
- Provide supported action steps:
  - set state
  - toggle state
  - run scene
  - navigate page
  - open URL
- Provide condition UI:
  - state equals
  - state not equals
  - state greater than
  - state less than
  - formula true
- Provide conditional visibility UI.
- Provide conditional style UI.
- Keep the default UI simple and hide advanced condition/style details behind
  Advanced Mode.

Acceptance criteria:

- A user can configure a Light Card to toggle a state.
- A user can configure a Scene Button to write a value.
- A user can configure navigation between pages.
- A user can hide a component based on a state or formula.
- A user can apply at least one conditional style based on a state or formula.

## Work Package 5: State Picker And Device Mapping

Goal: make ioBroker state selection usable for normal users across common
adapter ecosystems.

Tasks:

- Replace the flat search-only picker with an object tree plus search.
- Search by object ID, localized name, role, type, unit and room/function enum.
- Show read/write capability, role, unit, min, max and quality hints.
- Support alias states.
- Read and expose `ack`, `q`, `ts` and `lc` where relevant.
- Mark missing or deleted states clearly.
- Add a `DeviceMappingService` or equivalent shared abstraction.
- Detect common device groups heuristically:
  - Light
  - Thermostat
  - Blind/Shutter
  - Sensor
  - Scene
  - Energy
  - Camera
- Use ioBroker metadata rather than hardcoded adapter-specific paths.
- Optionally use `enum.rooms`.
- Optionally use `enum.functions`.
- Allow manual mapping when automatic detection is wrong.

Acceptance criteria:

- A user can find a state by name or ID.
- A user can browse objects in a tree.
- A user can select a writable state only where writing is needed.
- Detected devices can prefill card bindings.
- Manual corrections are possible and persist in the dashboard schema.

## Work Package 6: Live State Runtime And Reconnect

Goal: replace basic polling with a robust live runtime where possible.

Tasks:

- Subscribe only to states used by the active dashboard or page.
- Avoid duplicate subscriptions.
- Clean up subscriptions on page changes and unmount.
- Keep polling fallback if a live socket is unavailable.
- Batch or debounce frequent updates when needed.
- Keep the dashboard visible during disconnect.
- Show a subtle reconnect/stale-data hint.
- Automatically reconnect.
- Preserve last known values until fresh values arrive.
- Avoid unnecessary Viewer re-renders.

Acceptance criteria:

- State updates appear in the Viewer without manual reload.
- Disconnect does not blank the dashboard.
- Reconnect refreshes stale values.
- Large dashboards do not subscribe to unrelated states.

## Work Package 7: Formula And Calculated Value UX

Goal: make formulas useful without exposing arbitrary JavaScript.

Tasks:

- Keep the safe formula parser as the only formula execution engine.
- Add formula editor UI with:
  - state insertion
  - syntax validation
  - test evaluation with current values
  - clear error messages
- Support calculated values for components.
- Support formulas in conditions.
- Support formulas in conditional styles.
- Document supported operators and functions.
- Add tests for valid formulas, invalid formulas and edge cases.

Acceptance criteria:

- `(stateA + stateB) / 1000` style formulas work.
- Invalid formulas are reported without crashing Editor or Viewer.
- Formula conditions can control visibility or actions.

## Work Package 8: Templates, Import/Export And Assets

Goal: make dashboards portable and provide good starter designs.

Tasks:

- Keep dashboard export as portable JSON.
- Keep dashboard import running migration and validation before save.
- Add template export.
- Add template import.
- Allow users to save their own templates.
- Add one or two polished starter templates:
  - wall-panel room overview
  - compact mobile status dashboard
- Add asset upload and management for:
  - images
  - icons or icon references
  - background images
- Decide and document whether exported assets are embedded or referenced.
- Detect missing states during import.
- Provide missing-state mapping during import.
- Mark unresolved missing states in Editor and Viewer.

Acceptance criteria:

- A dashboard can be exported and imported without losing IDs or schema version.
- A template can be exported and imported.
- Starter templates can be used without manual JSON editing.
- Missing states are visible and can be remapped.
- Assets survive export/import according to the documented strategy.

## Work Package 9: Theme System And Design Controls

Goal: let users customize the look while keeping polished defaults.

Tasks:

- Keep `Modern Dark` and `Clean Light` working.
- Add central design controls for:
  - accent color
  - background
  - card background
  - text colors
  - radius
  - shadow
  - spacing
  - typography scale
  - borders
- Apply theme tokens consistently in Editor preview and Viewer.
- Add optional presets only if they are polished:
  - Glass Panel
  - Minimal Wall Tablet
- Do not add density modes in the MVP.
- Avoid endless per-component styling controls.

Acceptance criteria:

- Theme changes are visible in both Editor preview and Viewer.
- Light and dark presets remain readable.
- Component text fits on phone, tablet, desktop and wall layouts.

## Work Package 10: Kiosk, Fullscreen, Wake Lock And Burn-In

Goal: make Viewer operation reliable on wall tablets.

Tasks:

- Provide Viewer controls for fullscreen and reload.
- Provide Editor/Admin settings for:
  - enable kiosk behavior
  - enable Wake Lock
  - enable burn-in protection
  - burn-in movement/dimming strength if needed
- Request Wake Lock only when supported.
- Fail gracefully when Wake Lock is unavailable or denied.
- Add subtle periodic pixel/layout shift or dimming for burn-in protection.
- Keep burn-in protection non-disruptive.
- Ensure the Viewer remains usable after browser visibility changes.

Acceptance criteria:

- Fullscreen can be entered from the Viewer.
- Wake Lock does not throw visible errors on unsupported devices.
- Burn-in protection can be enabled and disabled.
- The dashboard remains readable during burn-in movement or dimming.

## Work Package 11: Schema, Migrations And Storage Safety

Goal: keep long-term dashboard compatibility reliable.

Tasks:

- Update schema types for every new feature.
- Increment `schemaVersion` for every schema change.
- Add migration from the previous schema version.
- Create backup before migration.
- Validate after migration.
- Keep failed migrations non-destructive.
- Add migration tests for every version bump.
- Add validation tests for required entities:
  - Project
  - Page
  - Layout
  - Component
  - Binding
  - Action
  - Theme
  - Asset
  - Template
- Keep storage compatible with ioBroker file/object persistence.

Acceptance criteria:

- Old dashboards load through the migration pipeline.
- Invalid imports show a clear error.
- No migration silently drops user data.
- Tests cover all schema versions.

## Work Package 12: Documentation And User Guidance

Goal: make the project understandable for users, contributors and future coding
agents.

Tasks:

- Update README in English and German.
- Include:
  - what Dashboard-NG is
  - features
  - installation
  - first steps
  - Editor usage
  - Viewer usage
  - dashboard creation
  - state binding
  - formulas
  - themes
  - import/export
  - templates
  - kiosk mode
  - development setup
  - build
  - tests
  - license
  - ioBroker compatibility
  - known MVP limits
- Update `docs/PRODUCT_SPEC.md` whenever scope changes.
- Update `docs/ARCHITECTURE.md` whenever architecture changes.
- Update `docs/DASHBOARD_SCHEMA.md` whenever schema changes.
- Update `docs/ROADMAP.md` when a work package is completed or moved.
- Add ADRs for major technical decisions, especially new large dependencies.
- Keep `AGENTS.md` aligned with durable project rules.

Acceptance criteria:

- A new contributor can read the docs and understand the architecture.
- A user can install and try the adapter from README alone.
- A future coding agent can continue work from `AGENTS.md` and this file.

## Recommended Implementation Order

1. Release and adapter-check hardening that does not risk the running instance.
2. Shared component runtime.
3. Full component set.
4. Editor drag/drop, resize and page management.
5. Inspector bindings, actions, visibility and styles.
6. State picker tree and device mapping.
7. Live subscriptions and reconnect hardening.
8. Formula UX and calculated values.
9. Templates, import/export and assets.
10. Theme editor and design controls.
11. Kiosk settings and wall-panel hardening.
12. Final docs, checker cleanup and release readiness.

## Suggested Commit Boundaries

Use small commits with focused subjects, for example:

- `Harden ioBroker metadata`
- `Add shared dashboard component runtime`
- `Implement thermostat and blind cards`
- `Add editor page management`
- `Add state tree picker`
- `Add device mapping heuristics`
- `Wire viewer state subscriptions`
- `Add template import export`
- `Add asset storage`
- `Document MVP completion status`

## Final Verification Checklist

Run these checks before calling the rest implementation complete:

```bash
npm install
npm test
npm run lint
npm run build
npm pack --dry-run
npm run adapter:check
```

Then verify in a real ioBroker test instance:

```bash
iobroker url https://github.com/dude2k/ioBroker.dashboard-ng
```

Manual verification:

- Create adapter instance.
- Open Editor.
- Create dashboard.
- Add every MVP card once.
- Bind at least one real readable state.
- Bind at least one writable state.
- Save dashboard.
- Open Viewer.
- Verify live value updates.
- Trigger a state write.
- Export dashboard.
- Import dashboard.
- Verify missing-state behavior with one deliberately missing state.
- Test phone, tablet, desktop and wall preview sizes.
- Test fullscreen, Wake Lock fallback and burn-in protection.

Only after all checks pass should the MVP be described as complete.
