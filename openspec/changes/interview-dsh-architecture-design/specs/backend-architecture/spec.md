## Purpose

Defines backend module boundaries, DSH runtime integration shape, API contract rules, and security/error handling requirements.

## ADDED Requirements

### Requirement: Module boundaries and layering
The backend SHALL be organized into layers:
- entrypoints: DSH plugin hooks and runtime adapters
- services: interview/business logic
- data: persistence, encryption, repositories
- infra: DSH SDK wrappers, logging, config

UI frameworks and frontend routing logic SHALL NOT be introduced in backend modules.

#### Scenario: Service change
- **WHEN** an interview flow is modified
- **THEN** changes MUST stay inside a service layer, entrypoint MUST stay thin, and data access MUST stay in the data layer.

### Requirement: API contract stability
All public backend APIs exposed to frontend SHALL be typed with explicit input/output interfaces in `shared/`. Mutable endpoints SHALL declare success and error shapes.

#### Scenario: Frontend integration
- **WHEN** frontend calls backend
- **THEN** it MUST consume only declared shared types and MUST handle declared error shapes.

### Requirement: Error handling and secrets
All backend handlers SHALL use explicit error types or result wrappers. Secrets, tokens, and keys SHALL be loaded from DSH config/secret providers and MUST NOT be hardcoded.

#### Scenario: Missing secret
- **WHEN** a required secret/config is absent
- **THEN** the plugin SHALL fail fast with a typed error during startup or hook registration, not during an interview action.

### Requirement: Stability during active interviews
Long-running or risky async work SHALL NOT be triggered from active interview hooks unless explicitly isolated and cancellable.

#### Scenario: Runtime behavior
- **WHEN** an interview is in progress
- **THEN** backend MUST avoid non-essential network sync or large recomputation on the same execution path.
