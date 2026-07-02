# Product Spec

## What Is Dashboard-NG?

Dashboard-NG is a modern ioBroker adapter for building responsive Smart Home
dashboards. It provides an Editor for creating dashboards and a Viewer for
wall panels, phones, tablets and desktops.

The product is meant to feel more like a current app builder than a classic
visualization canvas: strong defaults, clean themes, fast editing and stable
runtime behavior.

## Target Users

- Normal ioBroker users who want beautiful dashboards without coding.
- Smart Home enthusiasts who want state binding, formulas and advanced layout
  control.
- Kiosk and wall-panel users who need reliable day-to-day operation.

## Problems Solved

- Classic visualizations often require manual CSS/HTML/JS knowledge.
- Pixel-perfect layouts are fragile across devices.
- State binding can be hard for normal users.
- Viewer performance on wall tablets is often weak.
- Long-term dashboard compatibility needs explicit schema and migrations.

## MVP Functions

- Create, load, save, export and import dashboards.
- Place components on a grid with snap-to-grid.
- Bind ioBroker states through a searchable state picker.
- Read and write states.
- Use safe formulas for calculated values.
- Use conditional visibility, styles and simple actions.
- Switch between Light and Dark theme presets.
- Use Editor and Viewer as separate surfaces.
- Use kiosk/fullscreen, optional Wake Lock and burn-in protection.
- See missing states clearly after import or object deletion.

## Non-Goals

- No plugin system or marketplace.
- No external component API.
- No arbitrary JavaScript entered by users.
- No full VIS/VIS2 import.
- No automation platform.
- No paid/pro features.

## Operation Concept

The user starts in the Editor, adds components from the palette, places them on
the grid with a snapped drop preview, adjusts position and size through handles,
binds states in the inspector and immediately sees a live preview.
Advanced Mode can expose more precise settings, but the default workflow must
stay simple.

## Editor Concept

- Left palette: components and templates.
- Center: page tabs and responsive grid canvas with multi-select, snap-to-grid,
  move handles, resize handles and portrait/landscape preview frames.
- Right inspector: selected component or multi-selection, bindings, actions,
  visibility and style.
- Top bar: save, import/export, undo/redo, copy/paste, duplicate, lock,
  editor-hide, theme, preview size, orientation and Edit/View switch.
- State picker: search object IDs, names, roles, units and write capability.

## Viewer Concept

The Viewer renders only the dashboard runtime. It should not load editor-only
dependencies. It keeps the dashboard visible during connection loss, reconnects
automatically and shows a small status hint when data may be stale.

## Components

The shared runtime renders these MVP cards in both Editor preview and Viewer:

- Light Card: read/write on/off state, optional brightness later.
- Sensor Card: value display with unit and status.
- Scene Button: trigger a state or scene action.
- Room Card: compact room overview.
- Thermostat Card: current and target temperature display.
- Blind/Shutter Card: position display.
- Energy Card: power or energy value display.
- Mini Chart Card: compact trend display.
- Camera Card: image or snapshot display.

Base components may exist internally: Text, Icon, Image, Container, Button and
Value Display.

## Template Concept

Templates can represent whole pages, sections or component groups. MVP ships
with starter templates for a wall-panel room overview and a compact mobile
status page. Templates are JSON data using the same schema, not executable code.

## Kiosk And Wall Panel

Viewer supports kiosk/fullscreen, optional Wake Lock and burn-in protection.
Burn-in protection uses subtle periodic movement or dimming and can be disabled.
The Viewer must remain readable and responsive on older tablets.
