## Purpose

Defines the overall plugin folder layout, build/test conventions, and repo-wide rules that all future backend and frontend work must follow.

## ADDED Requirements

### Requirement: Canonical plugin layout
The plugin repository SHALL use a fixed top-level structure:
- `backend/`: backend TypeScript source, tests, and package metadata
- `frontend/`: React TypeScript source, tests, and build config
- `shared/`: types/interfaces/events consumed by both sides
- `openspec/`: OpenSpec artifacts
- `Agent.md`: repo-level AI/agent constraints
- `README.md`: setup, build, test, and plugin registration notes

#### Scenario: New feature addition
- **WHEN** a new feature is added
- **THEN** implementation files MUST be placed under `backend/` or `frontend/`, shared types under `shared/`, and planning artifacts under `openspec/`.

#### Scenario: Path ambiguity
- **WHEN** a file path does not clearly belong to backend, frontend, or shared
- **THEN** it SHALL be resolved before implementation by choosing the domain with the most ownership, not by creating ad-hoc folders.

### Requirement: Repo-wide non-goals enforcement
The plugin SHALL NOT place backend business logic under `frontend/`, and SHALL NOT place UI-only logic under `backend/`.

#### Scenario: Validation review
- **WHEN** a PR changes cross-boundary code
- **THEN** review MUST reject misplaced logic and require migration to the correct side.

### Requirement: Conventional commits and agent traceability
Commit messages SHALL follow Conventional Commits. Planned changes SHALL be traceable to an OpenSpec change artifact.

#### Scenario: Commit review
- **WHEN** a commit is authored without a scope or conventional prefix
- **THEN** review SHOULD ask for rephrasing unless an exception is documented in `Agent.md`.
