# Roadmap

## MVP

- Adapter backend with ioBroker lifecycle.
- Editor and Viewer bundles.
- Dashboard schema version 2.
- Migration and validation pipeline.
- Adapter file storage.
- Dashboard import/export.
- Grid-based editor with snap-to-grid.
- State picker with object search.
- State read/write.
- Safe formulas and calculated values.
- Shared runtime renderers for Light, Sensor, Scene, Room, Thermostat, Blind,
  Energy, Mini Chart and Camera cards.
- Theme presets: Modern Dark and Clean Light.
- Kiosk/fullscreen, optional Wake Lock and burn-in protection.
- README in German and English.
- Docs, ADR, tests, linting and build scripts.

Detailed remaining MVP implementation tasks are tracked in
`docs/MVP_COMPLETION_TASK.md`.

## Current Implementation Status

Completed work packages:

- AP0/AP1: installable adapter foundation, metadata hardening and alpha
  versioning.
- AP2: shared runtime component system for Editor preview and Viewer.
- AP3a: page management.
- AP3b: palette drag/drop with snapped canvas placement.
- AP3c: component move and resize handles with undo/redo support.
- AP3d: responsive preview devices with portrait/landscape handling.
- AP3e: multi-select, duplicate, lock, editor-hide and keyboard basics.
- AP3f: local validation, documentation alignment and checker cleanup.
- AP4a-AP4f: card properties, target bindings, actions, visibility,
  conditional styles and prepared formula bindings.
- AP4g: value transforms, action conditions and else steps, horizontal swipe
  actions, and Advanced Mode for complex inspector controls.
- AP5a: searchable ioBroker object tree with access, alias, enum, range and
  state-quality metadata.
- AP5b: metadata-based device mapping for lights, thermostats, blinds, sensors,
  scenes, energy meters and cameras with manual overrides.
- AP6a: deduplicated active-page live state subscriptions with batched updates,
  cleanup and polling fallback.
- AP6b: reconnect hardening with stale-data indication, immediate state refresh
  after reconnect and no-op state batch suppression.
- AP7: safe multi-state formula engine, Editor state insertion, syntax
  validation, test evaluation and calculated values in components, conditions
  and styles.
- AP11: schema v2, complete MVP entity validation, additive migration history,
  pre-write backups and automatic restore on migration persistence failure.
- AP17: schema-v3 Sections, Containers and nested component editing.
- AP18: precise Advanced Mode layout values and per-breakpoint overrides.
- AP19: lightweight multi-selection alignment and distribution tools.
- AP20: automated release gate covering format, lint, unit, build, package,
  integration and adapter checks.
- AP21: English and German user guides plus product and roadmap documentation
  alignment.

## Post-MVP

- Additional specialist controls for individual card types.
- Mini Chart history abstraction.
- Camera asset and snapshot source management.
- Better device mapping heuristics.

## Later Possible Features

- VIS/VIS2 import helper for selected simple cases.
- More chart data sources such as History, SQL or InfluxDB.
- Optional Grafana-like external embed support.
- Advanced alignment tools.
- Component locking and layer panel.
- Shared community templates without a marketplace in core.

## Explicitly Excluded

- Plugin system in MVP.
- Marketplace in MVP.
- Arbitrary JavaScript from users.
- Complex workflow automation.
- PIN protection and full role system.
- Paid/pro feature split.
- Automatic AI dashboard generator in MVP.

## Quality Milestones

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Adapter starts in a local ioBroker development instance.
- Import/export roundtrip preserves schema version and IDs.
- Migration tests cover every schema version bump.
- Viewer remains usable on tablet-sized screens.
- Adapter check issues are resolved before release.
