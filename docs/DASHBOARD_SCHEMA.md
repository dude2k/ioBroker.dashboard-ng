# Dashboard Schema

Current schema version: `2`

Dashboard data is JSON and must remain migratable. Never change this schema
without updating migrations, validation and tests.

## Root Project

```ts
DashboardProject {
  schemaVersion: number;
  projectId: string;
  name: string;
  pages: Page[];
  layouts: Record<string, Layout>;
  components: Component[];
  bindings: Binding[];
  actions: Action[];
  themes: Theme[];
  assets: Asset[];
  templates: Template[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  migrationHistory: MigrationEntry[];
}
```

## Page

A page represents one dashboard screen, for example living room, energy or
climate.

Important fields:

- `pageId`
- `parentId` (optional; references a Section or Container on the same page)
- `name`
- `icon`
- `order`
- `componentIds`
- `settings`

## Layout

Layouts define grid behavior. MVP uses grid-based placement with breakpoints:

- `phone`
- `tablet`
- `desktop`
- `wall`

Each component stores placement per breakpoint with `x`, `y`, `w`, `h`.

## Component

Components are concrete UI elements:

- `componentId`
- `type`
- `pageId`
- `name`
- `props`
- `style`
- `layout`
- `bindingIds`
- `actionIds`
- `visibility`

Editor-only component metadata may be stored in `style` so that editor state
survives save/load without affecting the Viewer:

- `editorLocked`: prevents accidental move, resize, delete and keyboard nudging
  in the Editor.
- `editorHidden`: renders the component as a muted placeholder in the Editor.

The Viewer ignores these editor-only keys.

MVP runtime component types:

- `light-card`
- `sensor-card`
- `scene-button`
- `room-card`
- `thermostat-card`
- `blind-card`
- `energy-card`
- `mini-chart-card`
- `camera-card`
- `section`
- `container`

Nested children keep their normal responsive placements, interpreted relative
to a twelve-column grid inside the parent. Parent references cannot cross pages
or form cycles.

## Binding

Bindings connect component properties to ioBroker states or formulas:

- `bindingId`
- `componentId`
- `target`
- `kind`: `state` or `formula`
- `stateId`
- `formula`
- `mode`: `read`, `write` or `readwrite`
- `transform`
- `missing`

Optional value transforms can apply a safe formula using `value`, round to a
configured number of decimal places and select a display format such as number,
percent, temperature, power or energy.

Formula state references use `state("full.ioBroker.id")`. The runtime extracts
these references and subscribes to them on the active page. Direct identifiers
remain supported for simple IDs. Formulas support arithmetic, comparison and
boolean operators plus `min`, `max`, `abs` and `round`. They may return a number,
boolean or string. Stored formulas are syntax-validated with the project and do
not execute JavaScript.

## Action

Actions describe interactions:

- Trigger: `tap`, `longPress`, `swipe`
- Optional condition
- Steps such as set state, toggle state, navigate, open URL or run scene
- Optional ordered `elseSteps` when the condition is false

Formula conditions can use an optional input state through the `value`
identifier and any number of explicit `state("id")` references. Swipe means one
direction-independent horizontal swipe; direction specific gestures are
intentionally outside the MVP schema.

Actions are intentionally simple. They are not an automation platform.

## Theme

Themes use design tokens:

- colors
- typography
- spacing
- radius
- shadow
- blur
- border
- variants

MVP presets:

- Modern Dark
- Clean Light

## Asset

Assets represent images, icons, backgrounds or future local media:

- `assetId`
- `name`
- `kind`
- `mimeType`
- `url`
- `storagePath`
- `createdAt`

Uploads use an image Data URL in `url`; explicit HTTP(S) references remain
external. Both forms are preserved by ordinary dashboard JSON export/import.

## Template

Templates are reusable JSON snippets:

- `templateId`
- `name`
- `kind`: page, section or componentGroup
- `componentIds`
- `page`
- `components`
- `bindings`
- `actions`
- `metadata`

Templates cannot contain executable code.

## Project Settings

Runtime settings include kiosk, burn-in protection, Wake Lock, Advanced Mode
and `reconnectIntervalMs`. Schema v2 requires reconnect intervals between 500
and 60000 milliseconds; v1 dashboards migrate to the 2500 ms default. Schema
v3 adds optional nested component parent relationships.

## Migrations

Rules:

- Increase `schemaVersion` for every schema change.
- Add a migration from previous version to new version.
- Back up the original before writing migrated data.
- Verify migrated writes and restore the original if persistence fails.
- Create a backup before migration.
- Validate after migration.
- Keep old data untouched if migration fails.
- Update this document and tests.

## Validation

Validation checks:

- root object shape
- known schema version
- required arrays
- unique IDs
- page references
- component references from bindings/actions
- positive grid dimensions

## Example JSON

```json
{
  "schemaVersion": 1,
  "projectId": "default",
  "name": "My Home",
  "pages": [
    {
      "pageId": "page-home",
      "name": "Home",
      "icon": "House",
      "order": 0,
      "componentIds": ["cmp-light", "cmp-temp"],
      "settings": {
        "kiosk": true
      }
    }
  ],
  "layouts": {
    "default": {
      "layoutId": "default",
      "columns": 12,
      "rowHeight": 40,
      "gap": 12,
      "breakpoints": {
        "phone": 4,
        "tablet": 8,
        "desktop": 12,
        "wall": 12
      }
    }
  },
  "components": [
    {
      "componentId": "cmp-light",
      "type": "light-card",
      "pageId": "page-home",
      "name": "Living Room Light",
      "props": {
        "title": "Living Room"
      },
      "style": {},
      "layout": {
        "desktop": { "x": 0, "y": 0, "w": 3, "h": 3 }
      },
      "bindingIds": ["bind-light"],
      "actionIds": ["act-light"],
      "visibility": { "kind": "always" }
    }
  ],
  "bindings": [
    {
      "bindingId": "bind-light",
      "componentId": "cmp-light",
      "target": "value",
      "kind": "state",
      "stateId": "alias.0.living.light",
      "mode": "readwrite",
      "missing": false
    }
  ],
  "actions": [
    {
      "actionId": "act-light",
      "componentId": "cmp-light",
      "trigger": "tap",
      "steps": [
        {
          "kind": "toggleState",
          "stateId": "alias.0.living.light"
        }
      ]
    }
  ],
  "themes": [],
  "assets": [],
  "templates": [],
  "settings": {
    "activeThemeId": "modern-dark",
    "kiosk": true,
    "burnInProtection": true
  },
  "createdAt": "2026-06-30T00:00:00.000Z",
  "updatedAt": "2026-06-30T00:00:00.000Z",
  "migrationHistory": []
}
```
