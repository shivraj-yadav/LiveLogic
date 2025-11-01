# CodeSync – Module-by-Module Development Plan

This plan translates PRD.md into buildable modules, with scope, deliverables, dependencies, and acceptance criteria. Optimized for a fast MVP first, then enhancements.

## 0. Tech Stack Baseline
- **Frontend**: React + Vite, TypeScript, TailwindCSS, Monaco Editor, Socket.io client, Axios.
- **Backend**: Node.js, Express, TypeScript, Socket.io server, zod (validation), axios (to Judge0/JDoodle), rate-limiter-flexible.
- **DB**: MongoDB (Mongoose). Seed via JSON.
- **Infra**: Env vars with dotenv. CORS locked to app origins. Optional Redis later.
- **Testing**: Vitest/Jest (unit), Playwright/Cypress (E2E), supertest (API).

---
## 1. Project Scaffolding & DevOps
- **Scope**
- Repo structure, toolchain, scripts, lint/format, env management.

- **Tasks**
- Initialize frontend (Vite), backend (Express + TS) workspaces.
- Shared types package (optional) for socket/event payloads.
- Configure ESLint, Prettier, Husky + lint-staged.
- .env.example for client/server.

- **Deliverables**
- `apps/web`, `apps/server`, root README, CI lint/test.

- **Acceptance**
- Install, dev, and build scripts work locally. CI runs lint/tests.

---
## 2. Backend: Room & WebSocket Core (MVP)
- **Scope**
- Room lifecycle, roles, participants, presence, and editor sync.

- **Tasks**
- `POST /api/rooms` generate `roomId` (nanoid/uuid).
- Socket namespace `/`: events `join-room`, `leave-room`, `participants-updated`.
- Role logic: first joiner = Interviewer; reconnect preserves role.
- In-memory room store: {roomId, participants, language, document, input, selectedQuestionId}.
- `code-change`, `language-change`, `reset-document` events (debounced/size-checked).

- **Deliverables**
- Typed socket events and payload validators (zod).
- Graceful reconnect + initial room state snapshot on join ack.

- **Acceptance**
- 2+ clients see real-time code changes with p95 < 150ms locally.
- Participants list updates on join/leave.

- **Dependencies**: Module 1.

---
## 3. Backend: Question Bank API
- **Scope**
- Read-only question catalog with filters.

- **Tasks**
- Mongoose `Question` model.
- GET `/api/questions` with `difficulty, tag, search, limit, offset`.
- GET `/api/questions/:id`.
- Seed script from `seed/questions.json`.
- Basic index on `difficulty` and `tags`.

- **Deliverables**
- REST endpoints with validation and pagination.

- **Acceptance**
- Fetch all/filtered questions; response matches schema in PRD.

- **Dependencies**: Module 1.

---
## 4. Backend: Code Execution Service
- **Scope**
- Proxy to Judge0/JDoodle with server-side API key.

- **Tasks**
- POST `/api/execute` `{ language, source, stdin }` -> provider.
- Language map (cpp/java/python/javascript -> provider IDs).
- Timeouts, memory limit, and error normalization.
- Rate limiting per IP and per room.

- **Deliverables**
- Standard response `{ stdout, stderr, time, memory, exitCode }`.

- **Acceptance**
- Runs sample solutions in 4 languages and returns outputs/errors.

- **Dependencies**: Module 1.

---
## 5. Frontend: Home & Navigation
- **Scope**
- Landing with Create/Join flows, copyable roomId/link.

- **Tasks**
- Form: Join by `roomId` + `displayName`.
- Action: Create Room -> call `/api/rooms`, navigate to `/room/:roomId`.
- Copy to clipboard helpers.

- **Deliverables**
- Responsive home page, validation messages.

- **Acceptance**
- Can create and join a room successfully. Deep link to `/room/:roomId` works.

- **Dependencies**: Modules 1, 2.

---
## 6. Frontend: Room Shell & Presence
- **Scope**
- Room container with top bar, participants list, layout grid.

- **Tasks**
- Connect Socket.io with reconnect/backoff.
- Show participants with role badges, copy roomId, leave.
- Theme toggle (light/dark).

- **Deliverables**
- Stable connection UX with offline/reconnect banners.

- **Acceptance**
- Accurate participant list, role labels; copy/share works.

- **Dependencies**: Modules 2, 5.

---
## 7. Frontend: Monaco Editor & Sync
- **Scope**
- Real-time collaborative editor with language selector.

- **Tasks**
- Monaco integration with TS types; model per room.
- Debounced outbound `code-change`; apply inbound changes safely.
- Language selector -> `language-change` event.
- Reset document (interviewer-only control).

- **Deliverables**
- Smooth typing, minimal cursor jumps, basic conflict avoidance.

- **Acceptance**
- Two tabs edit concurrently with low latency; language toggles update editor mode.

- **Dependencies**: Modules 2, 6.

---
## 8. Frontend: Question Sidebar
- **Scope**
- Browse and select questions; broadcast selection.

- **Tasks**
- Fetch GET `/api/questions` with filters and search.
- List view with difficulty chips and tags.
- `set-question` socket event; render selected question content.

- **Deliverables**
- Filterable panel; detail view shows title/description/sample I/O.

- **Acceptance**
- Interviwer selects; all see instantly. Filters work client-side + server-side.

- **Dependencies**: Modules 3, 6.

---
## 9. Frontend: I/O Panel & Execution
- **Scope**
- Textarea for input, console for output, run button.

- **Tasks**
- Bind to room `input` state; share via socket or local-only (MVP shared).
- POST `/api/execute` with current language/source/stdin.
- Broadcast `execution-result` to participants.
- Keyboard shortcut Ctrl/Cmd+Enter.

- **Deliverables**
- Normalized output view (stdout/stderr/time/memory/exit).

- **Acceptance**
- Sample programs run correctly across 4 languages; rate limits respected.

- **Dependencies**: Modules 4, 7.

---
## 10. Security, Limits, and Stability
- **Scope**
- Minimum protections per PRD.

- **Tasks**
- CORS strict origins, helmet basics.
- Input validation (zod) on all endpoints and socket payloads.
- Rate limits: `execute`, socket burst limits for `code-change`.
- Env secret handling; no API keys in client.

- **Deliverables**
- Throttling/limits with clear error messages.

- **Acceptance**
- Flooding editor/events is curtailed; execution abuse blocked.

- **Dependencies**: Modules 2–4.

---
## 11. Testing & QA
- **Scope**
- Unit, integration, E2E happy paths.

- **Tasks**
- Server unit tests: room store, validators, API controllers.
- Client component tests: Home, Room shell, Editor sync logic mock.
- E2E: two-browser session typing sync; question selection; run code.

- **Deliverables**
- Test scripts and CI jobs with artifacts.

- **Acceptance**
- Green tests for MVP scenarios; manual checklist for cross-browser.

---
## 12. Packaging & Deployment
- **Scope**
- Deploy to a host supporting WebSockets.

- **Tasks**
- Dockerfiles or platform configs (Render/Heroku/Fly.io). Vercel for static if sockets proxied.
- Env config for provider API keys and Mongo.
- Health checks and basic logs.

- **Deliverables**
- One-click deploy scripts and environment documentation.

- **Acceptance**
- Public URL supports create/join, real-time editing, question list, and execution.

---
## 13. Phase 2 Enhancements (Post-MVP)
- CRDT sync (Yjs) with multi-cursor and awareness.
- Room passcode/lock; read-only observers.
- Session transcript export; playback.
- Provider fallback (Judge0 <-> JDoodle) and resilience.
- Redis for presence and rate-limit storage across instances.

---
## Milestones & Order of Work
1) Scaffolding & DevOps (1)
2) Frontend Home & Navigation (5)
3) Backend Room & WebSocket Core (2)
4) Frontend Room Shell & Presence (6)
5) Frontend Monaco Editor & Sync (7)
6) Backend Question Bank API (3)
7) Frontend Question Sidebar (8)
8) Backend Code Execution Service (4)
9) Frontend I/O Panel & Execution (9)
10) Security & Limits (10)
11) Testing & QA (11)
12) Packaging & Deployment (12)

---
### UI-first workflow note
- Build the UI surface first, then implement just enough backend to power that UI, and iterate to the next UI module. This ensures every step is testable through the UI and keeps feedback loops short.
## Environment Variables
- Server
- `PORT`, `MONGO_URI`, `EXEC_PROVIDER` (judge0|jdoodle), `EXEC_API_KEY`, `EXEC_ENDPOINT`, `RATE_LIMIT_*`, `CORS_ORIGINS`.
- Client
- `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.

---
## Acceptance Checklist (MVP)
- Create/join without login; first joiner is interviewer.
- Real-time editor sync < 150ms p95 in-region for 2+ clients.
- Question list fetch + filter; selection broadcasts instantly.
- Code execution for C++, Java, Python, JS with visible stdout/stderr/time/memory.
- Basic rate limits and clear error states.
- Works on modern Chrome/Edge/Firefox.
