# ADR-0001: Core Architecture

Status: Accepted

Date: 2026-06-30

## Context

Dashboard-NG needs to be a normal installable ioBroker adapter with a modern
dashboard editor and a performant viewer. The product must be easy for normal
users, stable for wall panels and maintainable over multiple schema versions.

## Decisions

1. Build an own ioBroker adapter.
2. Keep Editor and Viewer as separate bundles.
3. Use a versioned JSON dashboard schema.
4. Do not build a plugin system in the MVP.
5. Do not allow freely entered JavaScript.
6. Use a grid-based layout as the default editing model.
7. Use design tokens and curated theme presets.

## Rationale

An own adapter gives users standard ioBroker installation, lifecycle and file
storage. Separate bundles keep the Viewer lightweight and avoid shipping editor
code to wall tablets. A versioned JSON schema enables controlled migrations and
long-term compatibility.

No plugin system and no arbitrary JavaScript keep the MVP safe, understandable
and supportable. A grid layout gives users responsive structure without asking
them to manage pixel-perfect layouts for every device. Design tokens preserve a
polished look while still allowing useful customization.

## Consequences

- Adapter metadata, backend and build output must stay aligned.
- Every schema change needs migration, validation, tests and docs.
- Viewer features must avoid editor-only dependencies.
- Advanced flexibility must be modeled through safe schema fields, formulas and
  actions, not executable code.
- Some power-user features are intentionally delayed until the product core is
  stable.
