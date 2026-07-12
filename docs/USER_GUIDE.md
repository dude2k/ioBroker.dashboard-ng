# Dashboard-NG User Guide

## Overview

Dashboard-NG is an ioBroker adapter for building responsive Smart Home
dashboards without writing HTML, CSS or JavaScript. The Editor is used to
create dashboards; the Viewer is the lightweight surface used on phones,
tablets, desktops and wall panels.

Dashboard-NG is currently an alpha release. Use it for testing and development
until a stable 1.0.0 release is available.

## Installation

Build a checkout before installing it in ioBroker:

```bash
npm install
npm run build
```

For a test installation from GitHub, run this in the ioBroker host:

```bash
iobroker url https://github.com/dude2k/ioBroker.dashboard-ng
```

Create an adapter instance in the ioBroker admin after installation. The admin
page opens the Editor. The Viewer is served by the adapter and is intended for
daily dashboard use.

## Create A Dashboard

1. Open the adapter admin page and create or select a dashboard.
2. Add a page if the dashboard needs more than one view.
3. Drag a card from the component palette onto the grid.
4. Select the card and configure it in the inspector.
5. Bind the required ioBroker states, then save.
6. Open the Viewer on the target device.

The grid snaps cards to columns and rows. Pages, layouts, components, bindings,
actions, themes, assets and templates are stored as versioned dashboard JSON.

## Use The Editor

The palette contains the available cards and starter templates. The canvas is
used to select, move and resize cards. The inspector changes the selected card;
when several cards are selected, alignment and distribution controls are
available.

The component hierarchy supports Sections and Containers. Use them to group
related cards. A nested component uses the 12-column grid of its parent
container, while a page uses the responsive device grid.

Advanced Mode exposes exact `x`, `y`, width and height controls. Select a
phone, tablet, desktop or wall-panel preview to add a layout override for that
breakpoint. A reset returns the selected breakpoint to its inherited layout.

Use undo/redo while arranging the page. Copy, paste, duplicate, lock and
editor-hide are available for selected cards. The Editor preview shares the
same card runtime as the Viewer.

## Bind States And Formulas

Bindings connect a component property to an ioBroker state. Search the state
picker by object ID, name, role or unit. Its metadata indicates type, writable
access, ranges and aliases. A missing state is kept visibly marked so an
imported dashboard can be corrected instead of silently losing its binding.

Use formulas for calculated values, conditions and styles. Formulas are parsed
by a small safe expression language; arbitrary JavaScript is never executed.
For example:

```text
(state("alias.0.solar.power") + state("alias.0.grid.power")) / 1000
```

Available operators are `+`, `-`, `*`, `/`, `%`, comparisons, `&&`, `||` and
unary `+`, `-`, `!`. Available functions are `state`, `min`, `max`, `abs` and
`round`. Binding and transform formulas can use `value`; comparison formulas
can also use `expected`. See [the schema documentation](DASHBOARD_SCHEMA.md)
for the complete binding model.

## Themes, Actions And Styles

Choose one of the four theme presets in Project Settings: Modern Dark, Clean
Light, Glass Panel or Minimal Wall Tablet. Project Settings lets you adjust the
shared design tokens for the active theme, and the Viewer uses the same tokens.

Cards can expose simple actions such as toggling a state or writing a value.
Visibility and conditional styles can react to state values or formulas. Keep
these rules small and understandable, especially for wall-panel dashboards.

## Templates, Assets, Import And Export

Export produces portable dashboard JSON. Import validates and migrates the
dashboard before it is saved. If an import has unavailable states, remap them
explicitly in the Editor.

Save a page, section or component group as a reusable template. Starter
templates are included for a wall-panel room overview and a compact mobile
status page.

Uploaded images and SVG icons are embedded as Data URLs, so they remain part of
an exported dashboard. HTTP(S) assets remain external and require their source
server to be reachable from the Viewer device.

## Viewer And Kiosk Use

The Viewer is intentionally separate from the Editor and loads only the
dashboard runtime. It reconnects after connection loss and keeps the last
dashboard visible while state data may be stale.

For a dedicated display, enable fullscreen or kiosk use. Where the browser
supports it, Wake Lock can keep the display awake. Burn-in protection provides
subtle periodic movement or dimming and can be disabled when it is unsuitable
for the device.

## Troubleshooting

- A card shows no value: verify the state ID, state type and adapter access in
  the state picker.
- An imported binding is marked missing: select a replacement state and save.
- A formula fails: use the Editor validation and test controls, then check
  quoting and full state IDs.
- A dashboard does not fit a device: select that breakpoint in the preview and
  add a layout override in Advanced Mode.
- The Viewer shows stale data: check the ioBroker connection; the Viewer will
  reconnect and refresh states automatically.

## Development And Support

Run the project checks from the repository root:

```bash
npm test
npm run lint
npm run build
npm run release:check
```

`release:check` runs formatting, linting, tests, all builds, package tests,
integration tests and adapter checks. Technical details are documented in the
[architecture](ARCHITECTURE.md), [product specification](PRODUCT_SPEC.md) and
[roadmap](ROADMAP.md). Dashboard-NG is released under the MIT license.

## Current Limits

The project has no plugin system, marketplace, VIS/VIS2 migration or arbitrary
user JavaScript. Device mapping is heuristic and should be checked against the
actual ioBroker objects in each installation. Broader real-world ioBroker
installation coverage remains necessary before a stable release.
