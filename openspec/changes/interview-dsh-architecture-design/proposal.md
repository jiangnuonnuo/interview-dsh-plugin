## Why

This project needs a shared, explicit architecture contract before any feature work. Without it, the backend (TypeScript/DSH runtime) and frontend (React/TS) can drift in structure, security posture, and plugin boundaries. Defining the architecture first lets every later change target the same interfaces, directory layout, and DSH runtime assumptions.

## What Changes

- Define the plugin's canonical folder layout for backend, frontend, shared contracts, tests, and OpenSpec artifacts.
- Define backend module boundaries and DSH runtime integration points.
- Define frontend integration points with DSH Web, routing, and data access patterns.
- Define cross-cutting rules for security, secrets, errors, and testing.
- Freeze these rules in OpenSpec so every future change inherits them.

## Capabilities

### New Capabilities

- `plugin-architecture`: Overall plugin layout, build/test tooling, and cross-cutting conventions
- `backend-architecture`: Service boundaries, DSH runtime integration, API contracts, and error handling rules
- `frontend-architecture`: React app structure, DSH Web integration, routing, state/data flow, and UI constraints

## Non-goals

- Does not define any interview-domain feature, page, or workflow.
- Does not implement backend services, UI screens, or data models.
- Does not choose third-party UI libraries or migration paths beyond DSH-recommended options.
- Does not lock exact package versions; that belongs to implementation.

## Impact

- Establishes repo-wide scaffolding and plugin registration conventions.
- Introduces shared API/event contracts between backend and frontend.
- Adds constraints on secrets handling, encryption, and plugin reload behavior.
- Affects future PRs, CI, and any agent/tooling that edits this repo.
