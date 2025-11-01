# Deploy LiveLogic to Vercel (Free Tier)

This guide walks you through deploying the monorepo (apps/web + apps/server) to Vercel’s free tier with Socket.io.

Notes
- apps/web: Vite + React + shadcn/ui (static site)
- apps/server: Node + Express + Socket.io (serverless functions are not ideal for WebSockets). We’ll deploy as a Vercel "Server" (Node server) using the Vercel Node Runtime via `vercel.json` and `api/index.ts` wrapper, or alternatively host the server on Render/Fly/railway (recommended for persistent websockets) and point the web app to it.
- Recommended: Host server on Render (free) and host web on Vercel. Steps for both options are provided.

## Option A (Recommended): Web on Vercel, Server on Render (Free)
This gives reliable WebSocket support and keeps Vercel for the static site.

### 1) Prepare environment
Create `.env` files:
- apps/server/.env
```
PORT=3000
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=<your_rapidapi_key>
CORS_ORIGINS=https://<your-vercel-domain>.vercel.app,http://localhost:5173
```
- apps/web/.env
```
VITE_API_BASE_URL=https://<your-render-server-domain>
VITE_SOCKET_URL=https://<your-render-server-domain>
```

### 2) Deploy server to Render
- Push repo to GitHub.
- Sign up at https://render.com (free tier).
- New > Web Service > Connect your repo.
  - Root directory: `apps/server`
  - Runtime: Node
  - Build Command: `npm ci`
  - Start Command: `npm run start` (ensure your server uses PORT env)
  - Region: closest to you
- Set environment variables from apps/server/.env.
- Deploy. Copy the Render URL, e.g. `https://livelogic-server.onrender.com`.

### 3) Deploy web to Vercel
- Sign up at https://vercel.com (free tier).
- New Project > Import from GitHub.
  - Root directory: `apps/web`
  - Framework Preset: Vite
  - Build & Output Settings:
    - Build Command: `npm run build`
    - Output Directory: `dist`
- Environment Variables:
  - `VITE_API_BASE_URL=https://<your-render-server-domain>`
  - `VITE_SOCKET_URL=https://<your-render-server-domain>`
- Deploy.

You’re live: https://<your-web>.vercel.app and sockets/API come from Render.

## Option B: Both on Vercel (Advanced)
Vercel’s serverless functions are not ideal for long-lived WebSockets. If you still want to try:

### 1) Create a Vercel Node Server (Edge not supported for Socket.io)
- In the repo root, add `vercel.json`:
```
{
  "version": 2,
  "builds": [
    { "src": "apps/web/dist/**", "use": "@vercel/static" },
    { "src": "api/index.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/apps/web/dist/$1" }
  ]
}
```
- Create `api/index.ts` that imports your Express+Socket.io server. The Vercel Node runtime keeps a single long-lived instance per region/container, but cold starts may drop WebSockets on idle. Example minimal glue:
```
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createServer } from 'http'
import next from 'next' // not used here; placeholder if needed
import app from '../apps/server/src/index' // adjust export to provide express app

// If your server file starts its own .listen, refactor to export an express app
// and start httpServer here.

let server: any

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!server) {
    const httpServer = createServer(app)
    // attach socket.io to httpServer here
    // io = new Server(httpServer, { /* cors */ })
    // httpServer.listen(3000)
    server = httpServer
  }
  // Delegate to express via server.emit or export a bridge; implementation specific.
  res.status(501).send('Direct HTTP bridge not configured. Prefer Option A.')
}
```
- Because this is complex and brittle for WebSockets, Option A is strongly recommended.

## Local testing
- apps/server: `npm run dev` (ensure CORS_ORIGINS includes http://localhost:5173)
- apps/web: `npm run dev`

## Domains & CORS
- After both are deployed, set:
  - apps/server CORS_ORIGINS to include your Vercel domain and any custom domain.
  - Frontend env to point to the server domain.
- Redeploy server after env changes.

## Judge0 configuration
- If using RapidAPI, set EXEC_ENDPOINT to the RapidAPI host and EXEC_API_KEY.
- Timeout: ensure server’s provider timeout is ~15s to handle queueing.
- Rate limits: keep your per-IP limits; Vercel/Render IPs may be shared.

## Troubleshooting
- CORS errors:
  - Add your Vercel domain to CORS_ORIGINS and restart server.
- WebSockets disconnecting:
  - Prefer Option A; serverless cold starts drop sockets.
- 500 from /api/execute:
  - Check EXEC_* env vars; verify language mapping and stdin payload.
- Static site shows but sockets fail:
  - Check `VITE_SOCKET_URL` and that Render server allows websockets.

## Post-deploy checklist
- Confirm two browsers in the same room receive synced code and run results.
- Verify testcase input broadcast shows in Result.
- Validate question picker broadcasts and UI states.
- Set up a custom domain on Vercel (optional).

## Optional: CI/CD
- Enable Vercel Preview Deploys per PR for apps/web.
- Use Render’s auto-deploy from GitHub for server changes.

---
If you want, I can add a Render deployment guide with screenshots and refactor the server export to make Option B feasible later.
