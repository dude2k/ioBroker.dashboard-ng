# Dashboard Schema

Current schema version: `1`

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

## Action

Actions describe interactions:

- Trigger: `tap`, `longPress`, `swipe`
- Optional condition
- Steps such as set state, toggle state, navigate, open URL or run scene

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

## Template

Templates are reusable JSON snippets:

- `templateId`
- `name`
- `kind`: page, section or componentGroup
- `componentIds`
- `page`
- `metadata`

Templates cannot contain executable code.

## Migrations

Rules:

- Increase `schemaVersion` for every schema change.
- Add a migration from previous version to new version.
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
