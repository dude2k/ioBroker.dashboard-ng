# ioBroker Dashboard-NG

Modern responsive dashboards for ioBroker.

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
- Safe formulas for calculated values.
- Simple tap actions such as toggle state or set state.
- Light and dark theme presets.
- Import/export for dashboards.
- Kiosk/fullscreen, optional Wake Lock and burn-in protection.

## Installation

This project is currently an MVP foundation. For development:

```bash
npm install
npm run build
```

For a first ioBroker test installation from GitHub:

```bash
iobroker url https://github.com/dude2k/ioBroker.dashboard-ng
```

For an ioBroker development instance, install the adapter from the repository
root once build output exists.

## First Steps

1. Open the adapter admin page.
2. Add a Light Card, Sensor Card or Scene Button from the palette.
3. Place it on the grid.
4. Bind an ioBroker state in the inspector.
5. Save the dashboard.
6. Open the Viewer through the ioBroker web adapter link.

## Editor

The Editor contains a component palette, responsive grid canvas, state picker and
property inspector. It supports undo/redo, copy/paste, import/export and preview
sizes for phone, tablet, desktop and wall panel.

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

## Known MVP Limits

- Only Light Card, Sensor Card and Scene Button are implemented first.
- Device detection is intentionally basic.
- Asset upload is prepared in the schema but not fully implemented.
- No plugin system, marketplace or VIS/VIS2 import.
- No arbitrary JavaScript and no complex automation workflows.

## Deutsch

Dashboard-NG ist ein moderner ioBroker-Adapter fuer responsive Smart-Home-
Dashboards. Nutzer sollen ohne HTML, CSS oder JavaScript schoene Dashboards
erstellen koennen. Der MVP konzentriert sich auf Editor, Viewer, Grid-Layout,
State-Binding, sichere Formeln, Import/Export, Themes und stabile Migrationen.

## License

MIT
