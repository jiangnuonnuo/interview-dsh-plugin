## Purpose

Defines the React frontend architecture, DSH Web integration constraints, routing, and data access boundaries for interview workflows.

## ADDED Requirements

### Requirement: App structure
The frontend SHALL organize code by feature/domain with shared UI primitives separated from business screens.

#### Scenario: New feature screen
- **WHEN** a new interview feature screen is added
- **THEN** it MUST live under a feature folder and reuse shared primitives instead of duplicating UI logic.

### Requirement: DSH Web integration boundary
Frontend SHALL interact with DSH Web only through declared plugin APIs/routes. Direct access to DSH internals or DOM hacks outside plugin containers is FORBIDDEN.

#### Scenario: Data access
- **WHEN** frontend needs interview data
- **THEN** it MUST call declared backend-facing interfaces and MUST NOT call backend-sensitive operations directly.

### Requirement: State and data flow
Global state MUST be explicit and typed. Interview state SHALL be normalized, and sensitive fields MUST be redacted in UI unless explicitly required.

#### Scenario: Sensitive data exposure
- **WHEN** an interview record is rendered
- **THEN** sensitive fields SHALL be masked by default, with opt-in visibility controlled by backend-declared permissions.

### Requirement: Type and component rules
Frontend code MUST use TypeScript with no implicit any in new code. Components SHOULD be function components with hooks. Styles SHOULD use CSS Modules or Tailwind consistent with DSH Web.

#### Scenario: Review gate
- **WHEN** reviewing frontend PRs
- **THEN** reviewers MUST reject any new `any` usage without a documented exception in the file or change.
