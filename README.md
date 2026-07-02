# ioBroker Dashboard-NG

Modern responsive dashboards for ioBroker.

## Project Status

**Dashboard-NG is not finished yet.** Version `0.3.0` is an installable alpha
baseline for early testing and development. The adapter can be installed from
GitHub and an instance can run, but the complete MVP feature set from
`docs/MVP_COMPLETION_TASK.md` is still in progress.

Do not treat this project as production-ready. Expect missing features, schema
changes and possible breaking changes before a stable `1.0.0` release.

## Version

- Current adapter version: `0.3.0`
- Current GitHub tag: `v0.3.0`
- Release status: alpha / installable MVP foundation
- Versioning scheme: SemVer-style package versions and Git tags named
  `vX.Y.Z`

Dashboard-NG is an ioBroker adapter with a dedicated Editor and Viewer. It helps
normal users build polished Smart Home dashboards without writing HTML, CSS or
JavaScript.

## Features

- Responsive grid editor with snap-to-grid.
- Separate lightweight Viewer for wall tablets and phones.
- Dashboard save/load through ioBroker-compatible adapter storage.
- Versioned JSON schema with migrations.
- State picker with object search.
- State read/write bindings.
- Shared card runtime for Editor preview and Viewer.
- Safe formulas for calculated values.
- Simple tap actions such as toggle state or set state.
- Light and dark theme presets.
- Import/export for dashboards.
- Kiosk/fullscreen, optional Wake Lock and burn-in protection.

## Installation

This project is currently an unfinished alpha/MVP foundation. For development:

```bash
npm install
npm run build
```

For a first ioBroker test installation from GitHub:

```bash
iobroker url https://github.com/dude2k/ioBroker.dashboard-ng
```

This installation method is intended for testing the current alpha state. The
adapter is not yet released through npm or the official ioBroker repositories.

For an ioBroker development instance, install the adapter from the repository
root once build output exists.

## First Steps

1. Open the adapter admin page.
2. Add a card from the palette.
3. Place it on the grid.
4. Bind an ioBroker state in the inspector.
5. Save the dashboard.
6. Open the Viewer through the ioBroker web adapter link.

## Editor

The Editor contains a component palette, page management, responsive grid
canvas, state picker and property inspector. Palette cards can be dragged onto
the canvas with a snapped drop preview based on the component default size.
Selected cards can be moved and resized on the grid through editor handles. It
supports multi-select, duplicate, lock, editor-hide, undo/redo, copy/paste,
import/export and preview sizes for phone, tablet, desktop and wall panel, each
with portrait and landscape orientation.

## Viewer

The Viewer renders dashboards for daily use. It keeps the dashboard visible
during reconnects, can enter fullscreen, can request Wake Lock when available
and can apply subtle burn-in protection for OLED or wall-panel displays.

## Dashboard Creation

Dashboards are made from pages, layouts, components, bindings, actions, themes,
assets and templates. The default editing model is grid-first, not a fragile
pixel canvas.

## State Binding

Bindings connect component properties to ioBroker states. The state picker uses
object metadata such as role, type, unit, min/max and write capability. Missing
states are marked so imported dashboards remain understandable.

## Formulas

Formulas allow calculated values such as:

```text
(stateA + stateB) / 1000
```

Formula evaluation is sandboxed by a small parser. Dashboard-NG does not execute
arbitrary user JavaScript.

## Themes

The MVP contains two theme presets:

- Modern Dark
- Clean Light

Themes use design tokens for colors, typography, spacing, radius, shadows,
borders and related visual defaults.

## Import And Export

Export creates portable JSON data. Import runs migration and validation before
saving. Future versions will add richer asset handling and missing-state mapping.

## Kiosk Mode

Viewer supports fullscreen, optional Wake Lock and burn-in protection. These
features are designed for wall tablets and can be disabled.

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

Useful scripts:

- `npm run dev:editor`
- `npm run dev:viewer`
- `npm run build:adapter`
- `npm run build:editor`
- `npm run build:viewer`
- `npm run adapter:check`

## ioBroker Compatibility

The adapter uses `@iobroker/adapter-core`, `io-package.json`, `admin/` for the
Editor and `www/` for the Viewer. It is prepared for ioBroker adapter checks,
but the MVP still needs validation in real ioBroker installations before a
stable release.

ioBroker uploads the Viewer files from `www/` into the `dashboard-ng` file
namespace. The web adapter URL is `/dashboard-ng/index.html`; `/adapter/...`
is reserved for admin adapter files and would target `dashboard-ng.admin`.
Dashboard-NG still ships a small admin redirect so old bookmarks to
`/adapter/dashboard-ng/index.html` do not end in a 404.

## Changelog

### Unreleased

- Added portrait/landscape responsive preview frames for phone, tablet, desktop
  and wall panel modes.
- Added multi-select editor actions for duplicate, lock, editor-hide, delete
  and keyboard nudging.

### 0.3.0 (2026-07-01)

- Added editor page management for creating, switching, renaming, duplicating
  and deleting dashboard pages.
- Improved editor palette drag/drop with snapped grid drop preview and
  catalog-based default component sizes.
- Added snapped editor move/resize handles with local layout preview before
  committing changes.
- Updated GitHub Actions workflow steps to Node 24-compatible action versions.

### 0.2.2 (2026-07-01)

- Added an admin-side compatibility redirect for the old
  `/adapter/dashboard-ng/index.html` URL.

### 0.2.1 (2026-07-01)

- Corrected the ioBroker web adapter Viewer link from
  `/adapter/dashboard-ng/index.html` to `/dashboard-ng/index.html`.

### 0.2.0 (2026-07-01)

- Added shared runtime renderers for Editor preview and Viewer.
- Enabled Room, Thermostat, Blind/Shutter, Energy, Mini Chart and Camera cards
  with safe default rendering states.

### 0.1.0 (2026-07-01)

- First installable GitHub alpha baseline.
- Added TypeScript adapter backend, Editor bundle and Viewer bundle.
- Added dashboard schema, migrations, storage, import/export foundation and
  initial tests.
- Added first implemented components: Light Card, Sensor Card and Scene Button.
- Added project documentation and remaining MVP completion task list.

## Known MVP Limits

- All MVP cards render, but advanced per-card inspector controls are still
  basic.
- Device detection is intentionally basic.
- Asset upload is prepared in the schema but not fully implemented.
- No plugin system, marketplace or VIS/VIS2 import.
- No arbitrary JavaScript and no complex automation workflows.

## Deutsch

Dashboard-NG ist ein moderner ioBroker-Adapter fuer responsive Smart-Home-
Dashboards. Nutzer sollen ohne HTML, CSS oder JavaScript schoene Dashboards
erstellen koennen. Der MVP konzentriert sich auf Editor, Viewer, Grid-Layout,
State-Binding, sichere Formeln, Import/Export, Themes und stabile Migrationen.

Wichtig: Dieses Projekt ist noch nicht fertig. Version `0.3.0` ist eine
installierbare Alpha-Grundlage fuer Tests und Weiterentwicklung, aber noch keine
stabile Produktivversion.

## License

MIT

Copyright (c) 2026 ioBroker Dashboard-NG contributors
