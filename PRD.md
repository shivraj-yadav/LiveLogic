# CodeSync — Real-Time Collaborative Code Interview Platform (No Login Required)

## 1. Summary
CodeSync is a lightweight, no-auth real-time collaborative coding platform tailored for technical interviews. It enables an interviewer to create a room and share the room ID with candidates who can join instantly with a display name. The platform features a synchronized code editor, question bank browser, and cloud-based code execution.

## 2. Goals and Non-Goals
- **Goals**
- Enable frictionless interviews without authentication.
- Provide real-time collaborative editing with low latency.
- Offer a curated question bank with filters and instant broadcasting of selected questions.
- Support multi-language code execution via external API (JDoodle/Judge0).
- Provide simple role handling (Interviewer, Candidate) based on join order.

- **Non-Goals**
- Persistent user accounts or profiles.
- Advanced permissions (beyond basic interviewer controls).
- Complex version control/diffing beyond basic history snapshot (optional, later phase).
- In-browser debugging (breakpoints, step-through) for executed code.

## 3. Personas and Roles
- **Interviewer**
- Creates a room, selects questions, can run/stop code execution, can reset the editor.
- First user in a room becomes the interviewer.

- **Candidate**
- Joins using roomId and a display name, collaborates in editor, can run code (configurable).

- **Observer (Optional, future)**
- Read-only participant for panel interviews.

## 4. High-Level User Flows
- **Home**
- Create Room: generates unique `roomId`, navigates to Room.
- Join Room: enter `roomId` and `name`, navigate to Room.

- **Room**
- Assign Role: first in = Interviewer; subsequent = Candidate.
- Editor: real-time code sync across participants.
- Question Panel: interviewer picks a question; all see it instantly.
- I/O Panel: input textarea, run button, output console.
- Utilities: copy room ID, leave room, reset editor (interviewer only), language/theme switch.

## 5. System Overview / Architecture
- **Frontend**: React + Vite (or Next.js), Monaco Editor (or CodeMirror), Socket.io client, TailwindCSS/UI lib.
- **Backend**: Node.js + Express, Socket.io server.
- **DB**: MongoDB (Atlas/local) for question bank; Redis (optional) for socket presence and rate-limits.
- **Code Execution**: JDoodle or Judge0 SaaS API.
- **Hosting**: Any (Render/Heroku/Vercel + managed Mongo). WebSockets supported.

## 6. Functional Requirements
- **Room Management**
- Create room with unique `roomId` (UUID v4 or nanoid).
- Join room by `roomId` + `displayName`.
- Broadcast participant list on join/leave.
- Role assignment (first joiner = Interviewer, else Candidate).

- **Editor**
- Real-time code synchronization (low latency, conflict-safe).
- Language selection: C++, Java, Python, JavaScript.
- Editor settings: theme (light/dark), font size, tab size.
- Reset document (interviewer-only action, broadcasted).

- **Code Execution**
- Input textarea per room, per language.
- Execute code via external API; show stdout/stderr/time/memory.
- Prevent abuse with rate limits and execution quotas.

- **Question Bank**
- REST API to list/filter questions.
- Sidebar to browse; selecting a question broadcasts to room.
- Show title, description, difficulty, tags, sample I/O.

- **Copy/Share**
- Copy room ID.
- Optional: Copy invite link (deep link with roomId).

## 7. Non-Functional Requirements
- **Performance**
- Editor keystroke propagation p95 < 150 ms within region.
- Room capacity: target 6 concurrent participants; soft cap at 10.

- **Reliability**
- Auto-reconnect to Socket.io. Preserve last doc state client-side.

- **Security**
- No PII storage beyond display names.
- Basic room-level shared secret (roomId). Optional simple room lock/passcode (phase 2).
- Rate limiting for execution and API calls.

- **Privacy & Compliance**
- No long-term logs of code contents by default; in-memory or short-lived cache.

## 8. Data Model (MongoDB)
- **Question**
```json
{
  "_id": "ObjectId",
  "title": "String",
  "description": "String",
  "difficulty": "Easy|Medium|Hard",
  "tags": ["String"],
  "sampleInput": "String",
  "sampleOutput": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- **Room (Transient, In-Memory/Redis; optional if persistence needed)**
```json
{
  "roomId": "String",
  "participants": [
    { "socketId": "String", "displayName": "String", "role": "Interviewer|Candidate" }
  ],
  "language": "cpp|java|python|javascript",
  "document": "String",
  "input": "String",
  "selectedQuestionId": "ObjectId|null",
  "updatedAt": "Date"
}
```

## 9. REST API Design
- **Create Room**
- POST `/api/rooms`
- Response: `{ roomId }`

- **Join Room (handshake via WS, but optional REST for preflight)**
- POST `/api/rooms/:roomId/validate`
- Response: `{ exists: boolean }`

- **Questions**
- GET `/api/questions`
- Query: `difficulty?=easy|medium|hard`, `tag?=string`, `search?=string`, `limit?`, `offset?`
- Response: `{ items: Question[], total: number }`

- GET `/api/questions/:id`
- Response: `Question`

- (Optional Admin endpoint for seeding) POST `/api/questions` (protected by admin key)

- **Execute Code**
- POST `/api/execute`
- Body: `{ language, source, stdin }`
- Response: `{ stdout, stderr, time, memory, exitCode }`

## 10. WebSocket Events (Socket.io)
Namespace: `/`
Room: `roomId`

- **Connection/Presence**
- `join-room` -> payload: `{ roomId, displayName }` -> ack: `{ role, participants, language, document, input, selectedQuestionId }`
- `leave-room` -> payload: `{ roomId }`
- `participants-updated` -> broadcast: `{ participants }`

- **Editor Sync**
- `code-change` -> payload: `{ roomId, version, delta|fullText }` -> broadcast to room
- `language-change` -> payload: `{ roomId, language }`
- `reset-document` (interviewer-only) -> payload: `{ roomId }`

- **Question Selection**
- `set-question` -> payload: `{ roomId, questionId }` -> broadcast `{ question }`

- **Execution**
- `run-code` -> payload: `{ roomId, language, source, stdin }` -> server triggers REST to executor
- `execution-result` -> broadcast: `{ stdout, stderr, time, memory, exitCode }`

- **System**
- `error` -> `{ message, code? }`

Notes:
- Use optimistic updates where feasible; include simple `version` or timestamp to avoid stale overwrites.

## 11. Editor Synchronization Strategy
- MVP: Eventual consistency with last-writer-wins using full-text or operational deltas (Monaco model changes) throttled/debounced.
- Phase 2: Move to CRDT (e.g., Yjs + y-websocket) for robust multi-cursor and conflict handling.

## 12. Client UI/UX
- **Home Page**
- Card: Create Room
- Card/Form: Join Room (roomId, displayName)
- Copyable roomId link after creation

- **Room Layout**
- Left Sidebar: Question list with filters (difficulty, tags, search)
- Center: Monaco editor, language selector, run button, input/output panel tabs
- Right Top: Participants list (role badges)
- Top Bar: RoomId (copy), Theme toggle, Leave button

- **Accessibility**
- Keyboard shortcuts: run (Ctrl/Cmd+Enter), focus switches
- High-contrast theme support

## 13. Code Execution Integration
- **Provider**: Judge0 (preferred) or JDoodle
- Request mapping based on selected language to provider language IDs.
- Timeouts (e.g., 3–5s) and memory limits.
- Rate limiting per IP/room.
- API key stored server-side; never exposed to client.

## 14. Security & Abuse Prevention
- Input validation and sanitization on all APIs.
- Execution sandbox via provider; no user-supplied network access.
- Basic per-IP and per-room throttle for `run-code`, `code-change` bursts.
- CORS restricted to app origins.

## 15. Telemetry & Logging
- Minimal: page views, room created/joined, code run counts, question selection.
- Error logs with correlation IDs. No code bodies stored in logs by default.

## 16. Error Handling & Empty States
- Friendly messages for invalid roomId, disconnected socket, API failures.
- Clear output panes for timeouts/runtime errors.

## 17. Acceptance Criteria (MVP)
- Create and join room without login.
- First joiner is interviewer; others are candidates.
- Real-time editor sync across 2+ participants under 150ms p95 in-region.
- Question list fetch and filter; selection broadcasts instantly.
- Code execution works for 4 languages; outputs displayed.
- Rate limiting prevents spam (configurable thresholds).

## 18. Phased Roadmap
- **Phase 1 (MVP)**
- Room create/join, basic roles
- Monaco editor sync (debounced full-text/deltas)
- Question bank API + sidebar
- Judge0 execution integration
- Basic rate limiting and error handling

- **Phase 2**
- CRDT-based sync (Yjs), multi-cursor
- Room lock/passcode, read-only observers
- Persisted session transcript (optional)
- Invite links and deep linking improvements

- **Phase 3**
- Playback/timelines, annotation
- Rich interview tools (notes, scoring)
- Expanded language/tooling support

## 19. Open Questions & Assumptions
- **Assumptions**
- No authentication is required; security relies on obscurity of `roomId`.
- First user becomes interviewer deterministically; reconnect preserves role.
- Execution API quotas are within free/paid plan limits.

- **Open Questions**
- Should candidates be allowed to run code or only interviewer? (Config toggle.)
- Need room passcode toggle in MVP?
- Persist questions locally or seed from a JSON file on boot?

## 20. Risks & Mitigations
- **Abuse of execution API**: add rate limits, captcha for suspicious behavior.
- **Sync conflicts**: adopt CRDT in Phase 2; throttle events in MVP.
- **Room ID guessing**: use sufficiently long IDs; optional passcode.
- **Provider outages**: fallback between Judge0/JDoodle or degrade gracefully.

## 21. Out of Scope (MVP)
- User accounts, SSO, or billing.
- Video/voice calling.
- Detailed code versioning and diffs.

---
Document owner: You
Last updated: Initial draft
