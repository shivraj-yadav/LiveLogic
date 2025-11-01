# LiveLogic – Real‑Time Collaborative Code Interview Platform

LiveLogic is a polished, developer‑first platform for conducting real‑time coding interviews. It features a shared Monaco editor, synchronized execution (Judge0/JDoodle), role‑aware UI, a question picker, and a modern dark theme built with Tailwind + shadcn/ui.

https://live-logic.vercel.app

---

## ✨ Highlights
- Shared Monaco editor with Socket.io sync
- Run once, see everywhere: broadcast stdout/stderr, status, time, memory, and the testcase input
- Question picker with difficulty filters and examples
- Role‑aware room header with copy/leave, presence indicator, and participant list
- Dark, accessible UI with design tokens, glass panels, and micro‑interactions
- Built with React 18, Vite, TypeScript, Tailwind, shadcn/ui, Lucide Icons, and Framer Motion

---

## 🧱 Tech Stack
- Frontend: React 18 + Vite + TypeScript
- Styling: Tailwind CSS + shadcn/ui + Radix + Lucide
- Editor: @monaco-editor/react
- Realtime: Socket.io‑client
- Backend: Node.js + Express + Socket.io
- Execution providers: Judge0 (RapidAPI) or JDoodle

Monorepo layout:
```
apps/
  web/     # Vite React app (frontend)
  server/  # Express + Socket.io (backend)
```

---

## 🚀 Getting Started (Local)
1) Clone and install
```
# repo root
npm i --workspaces=false # or run npm i inside each app
```

2) Backend
```
cd apps/server
cp .env.example .env  # fill values (see env section)
npm run dev          # http://localhost:3000
```

3) Frontend
```
cd ../web
cp .env.example .env # or create .env with VITE_* (see env section)
npm run dev          # http://localhost:5173
```

Open two browser tabs, create a room in one, join in the other, and run code with a testcase.

---

## 🔧 Environment Variables

Backend (apps/server/.env):
```
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173

EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=<your_rapidapi_key>
# JDoodle alternative
# JDOODLE_CLIENT_ID=
# JDOODLE_CLIENT_SECRET=
```

Frontend (apps/web/.env):
```
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Production (Option A recommended):
- Server on Render (stable websockets)
- Web on Vercel

Frontend (apps/web/.env.production or Vercel env):
```
VITE_API_BASE_URL=https://<your-render-service>
VITE_SOCKET_URL=https://<your-render-service>
```

Server (Render env):
```
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://<your-vercel-app>.vercel.app
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=<your_rapidapi_key>
```

---

## 🧭 Development Overview
- Design tokens: apps/web/src/theme/tokens.ts
- Tailwind config: apps/web/tailwind.config.cjs
- UI primitives: apps/web/src/components/ui/* (shadcn)
- Room page: apps/web/src/routes/Room.tsx
- Home page: apps/web/src/routes/Home.tsx
- Server entry: apps/server/src/index.ts

Key socket events:
- `join-room`, `leave-room`, `participants-updated`
- `code-change`, `language-change`, `reset-document`
- `set-question`
- `run-execute` → emits `execution-result` with stdout/stderr + testcase input

---

## 🛫 Deploy (Free)
- Detailed docs included:
  - DEPLOY_OPTION_A.md (Render server + Vercel web, recommended)
  - DEPLOY_VERCEL.md (alternatives and caveats)

TL;DR
- Render (apps/server): Root=apps/server, Build=`npm ci && npm run build`, Start=`npm run start`
- Vercel (apps/web): Root=apps/web, Build=`npm run build`, Output=`dist`
- Env:
  - Vercel: `VITE_API_BASE_URL` and `VITE_SOCKET_URL` → Render URL
  - Render: `CORS_ORIGINS` includes your Vercel domain

---

## 🧪 Testing Ideas
- Unit: socket helpers, language mapping, input validation
- Integration: /api/execute with mocked provider
- E2E: two browsers join, type, run, and see the same result

---

## 🗺️ Roadmap
See FEATURE_ROADMAP.md for a prioritized backlog: toasts, tooltips, run history, presence, notes/rubrics, exports, and analytics.

---

## 🙌 Credits
- Built by Shivraj Yadav
- Icons: Lucide
- UI: shadcn/ui + Radix
- Editor: Monaco

---

## License
MIT
