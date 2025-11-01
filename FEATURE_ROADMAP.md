# LiveLogic – Product Roadmap and Feature Suggestions

## Product Vision
- Build the most seamless, real‑time code interview experience with shared execution, structured interview flows, and analytics.
- Prioritize speed, clarity, and trust: zero‑friction joining, crystal‑clear UI, deterministic results, and auditability.

## Priorities
- Short term (1–4 weeks): UX polish, reliability, core interview tools, and quality signals.
- Mid term (1–2 quarters): Proctoring, recordings, question bank management, org workflows.
- Long term: Assessments at scale, AI‑assisted reviewing, integrations, enterprise controls.

## Quick Wins (Low Effort, High Impact)
- Toasts for events: code run, question selected, language changed.
- Tooltips on icon buttons: Copy ID, Run, Reset, Leave, Select Question.
- Bottom status bar: live dot, last run metrics (status/time/memory), language, and room latency.
- “Copy examples” in problem panel populates Testcase.
- Run history panel (local per tab) with timestamp and who ran it.
- Persistent editor layout and theme preferences (localStorage).
- Shareable link button with prefilled Room ID.

## Core Interview Experience
- Structured interview timeline: start, pick questions, markers, end with summary.
- Run history & diffs: snapshot (code, stdin/stdout/stderr, duration, who).
- Notes & tags: interviewer‑only notes and tags per candidate/run.
- Reactions: non‑intrusive emoji reactions on code/output.

## Question Bank & Management
- Picker enhancements: difficulty, tags, company, frequency, time complexity.
- Curated lists for common interview types (DSA, system, frontend).
- Pin recent/favorites; bulk import JSON.
- Inline question editing; drafts and validation of sample IO.
- Versioning with history and rollback.

## Collaboration & Presence
- Avatars, typing indicators, caret colors, cursor labels.
- Hand‑raise and spotlight flows.
- Inline comments with resolve state.

## Execution & Sandbox
- Multi‑file execution (virtual FS) with small explorer.
- Pre‑run checks: lint/compile before provider call.
- Resource guardrails UI (time/memory) surfaced in Result.
- Cache previous submissions per room+language.

## Proctoring & Integrity (Optional)
- Identity verification (selfie + name match).
- Screen change monitoring (privacy‑aware).
- Recording of session events/code snapshots.

## Scoring & Feedback
- Rubrics per role and seniority.
- Auto signals (advisory): tests passed, velocity, iterations, constraint adherence.
- Auto summary for recruiter handoff.

## Analytics & Audit
- Room analytics (time, runs, languages, errors vs success).
- Question analytics (popularity, solve time, pass rate).
- Audit log of events and timestamps.

## Integrations
- Calendar links (Google Calendar invites).
- ATS export (Lever/Greenhouse webhooks).
- GitHub Gist export for code and logs.

## Security & Compliance
- Secure, time‑bound room tokens; role‑based permissions.
- CORS allowlists and rate limits; per‑room quotas.
- PII minimization and data retention controls.

## Performance & Reliability
- WebSocket reconnection UX with optimistic presence.
- Patch‑based code sync; debounce to reduce bandwidth.
- Lazy‑load Monaco and heavy UI (picker sheet).
- Observability: structured logs and metrics (p99 run time, error rates).

## Theming & Accessibility
- Theme switcher (dark default, light optional) with persistence.
- Font size controls; dyslexia‑friendly option.
- WCAG AA contrast; aria labels; tab order sanity; skip links.
- i18n extraction; RTL readiness.

## Monetization (Optional)
- Free: limited rooms/day, capped runs, community bank.
- Pro: unlimited rooms, private questions, run history, exports, recordings.
- Team: multi‑seat, org bank, analytics, SSO.

## Engineering Notes
- UI: shadcn/ui + Radix + Tailwind tokens; Framer Motion micro‑interactions.
- State: central socket hook (useRoomSocket); local UI per panel; server‑ack reconciliation.
- Data: Rooms, Participants, Questions, Runs, Notes, Rubrics, Events.
- Testing: unit, integration (Supertest), E2E (two clients with Playwright).
- DevOps: CI for lint/test/build; WebSocket‑ready host; CORS hardening.

## Suggested Backlog (Ordered)
1) Toasts + tooltips + status bar + run history.
2) Question filters + "Copy examples" + skeleton loader.
3) Presence: avatars + typing indicators + cursor labels.
4) Notes & rubrics; interviewer private notes.
5) Export/sharing: code + run log; summary export.
6) Analytics: room metrics dashboard.

## Maintenance
- Storybook for primitives and panels.
- Lighthouse pass (PWA optional).
- Bundle analyzer and budget.
- Error pages: 404/Room not found; execute rate‑limit UX.
