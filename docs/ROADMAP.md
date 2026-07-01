# Roadmap

## MVP

- Adapter backend with ioBroker lifecycle.
- Editor and Viewer bundles.
- Dashboard schema version 1.
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

## Post-MVP

- Rich per-card inspector controls.
- Mini Chart history abstraction.
- Camera asset and snapshot source management.
- Better device mapping heuristics.
- Template library with one or two polished starter dashboards.
- Asset upload and management.
- More responsive layout overrides in Advanced Mode.

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
