## Context

This is an empty plugin repo. The upcoming architecture change must create a stable foundation for backend TypeScript services, a React frontend, and their shared contracts within the DSH plugin environment.

See `proposal.md` for motivation and capabilities. These specs define the required behavior:
- `specs/plugin-architecture/spec.md`
- `specs/backend-architecture/spec.md`
- `specs/frontend-architecture/spec.md`

## Goals / Non-Goals

**Goals**
- Establish a clear backend/frontend/shared separation.
- Define DSH runtime integration points without assuming undocumented internals.
- Define explicit typed API contracts between backend and frontend.
- Encode security defaults for secrets and interview-sensitive data.
- Make the plugin reloadable and stable during active interviews.

**Non-Goals**
- Implement any interview-domain feature in this change.
- Lock exact package versions or CI pipelines.
- Migrate existing code; there is no existing code yet.
- Introduce external authentication systems beyond DSH-provided config/secret access.

## Decisions

### Decision: Monorepo-style folder separation
- **Chosen**: `backend/`, `frontend/`, `shared/`
- **Rationale**: Keeps build/test boundaries clear and prevents accidental UI logic in backend or vice versa.
- **Alternatives considered**: single `src/` with subfolders. Rejected because it makes plugin packaging, tests, and future CI boundaries harder.

### Decision: Shared contracts live in `shared/`
- **Chosen**: Explicit TypeScript interfaces/events/types in `shared/`.
- **Rationale**: Prevents coupling via inferred shapes and makes API review easier.
- **Alternatives considered**: duplicating types in backend and frontend. Rejected because drift is likely.

### Decision: Backend uses DSH SDK/adapters as an infra boundary
- **Chosen**: thin entrypoints + services + data layers, with DSH SDK usage confined to `backend/infra/`.
- **Rationale**: limits blast radius if DSH runtime APIs evolve.
- **Alternatives considered**: calling DSH SDK directly from services. Rejected because it mixes domain logic with runtime coupling.

### Decision: Frontend treats backend as the source of truth
- **Chosen**: frontend never implements backend-sensitive validation, encryption, or permission checks.
- **Rationale**: reduces secret exposure in bundles and keeps trust boundaries clear.
- **Alternatives considered**: duplicating sensitive rules in frontend. Rejected for security and maintenance reasons.

### Decision: Explicit errors and fail-fast startup
- **Chosen**: typed errors/result wrappers in backend, early startup validation for required config/secrets.
- **Rationale**: interview workflows cannot tolerate late failure during an active session.
- **Alternatives considered**: generic error throws with console logs. Rejected because observability and recovery are weaker.

## Risks / Trade-offs

- **Risk**: DSH runtime surface changes later. **Mitigation**: isolate runtime calls in `backend/infra/` so adaptation cost is localized.
- **Risk**: Frontend bundle accidentally includes sensitive logic. **Mitigation**: enforce repo constraints in `Agent.md`, code review rules, and future lint/type boundaries.
- **Risk**: Interview performance regressions from unplanned async work. **Mitigation**: require async operations to be cancellable and explicitly approved for active-interview paths.
