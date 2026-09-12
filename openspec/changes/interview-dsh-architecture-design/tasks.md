# Tasks: interview-dsh-architecture-design

## Task 1: Create repo-level folder structure
- Create `backend/`, `frontend/`, `shared/`
- Add placeholder README and root config files
- Update `Agent.md` references to new structure if needed
- **Scope**: infra

## Task 2: Backend scaffold
- Add backend TypeScript project config
- Add `backend/src/entrypoints/`, `backend/src/services/`, `backend/src/data/`, `backend/src/infra/`
- Add initial DSH runtime adapter stub in `backend/src/infra/dsh/`
- Add unit test setup for backend
- **Scope**: backend

## Task 3: Shared contracts
- Add shared TypeScript config and output path
- Create initial shared types for plugin configuration, API responses, and errors
- Add validation that frontend and backend reference shared types consistently
- **Scope**: backend, frontend

## Task 4: Frontend scaffold
- Add React TypeScript project config
- Add `frontend/src/features/`, `frontend/src/shared/`, `frontend/src/app/`
- Add initial routing shell and DSH Web integration stub
- Add unit test setup for frontend
- **Scope**: frontend

## Task 5: Encode repo constraints
- Add lint/type rules aligned with `Agent.md`
- Document plugin registration and reload flow in README
- Add OpenSpec validation reminders for future changes
- **Scope**: infra, backend, frontend
