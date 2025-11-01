# Deploy LiveLogic (Option A): Server on Render, Web on Vercel (Free)

This guide is a copy‑paste, step‑by‑step path to deploy the backend to Render (stable WebSockets) and the frontend to Vercel. Estimated time: 15–25 minutes.

## Prerequisites
- GitHub account
- RapidAPI Judge0 key (or your preferred execution provider)
- Node 18+ locally for first run

---
## 1) Prepare the repository
1. Ensure the app runs locally
   - Server: `cd apps/server && npm i && npm run dev`
   - Web: `cd apps/web && npm i && npm run dev`
   - Confirm: Home loads, you can create/join room, run code.
2. Create a GitHub repo
   - Initialize local git if not already: `git init`
   - Add and commit: `git add . && git commit -m "Initial deploy setup"`
   - Create repo on GitHub (private or public)
   - Add remote and push:
     - `git branch -M main`
     - `git remote add origin https://github.com/<you>/<repo>.git`
     - `git push -u origin main`

---
## 2) Deploy the server to Render (Free Web Service)
1. Sign in: https://render.com
2. New → Web Service → Connect repo
3. Service settings
   - Name: livelogic-server
   - Root directory: `apps/server`
   - Environment: Node
   - Region: choose closest
   - Build Command: `npm ci`
   - Start Command: `npm run start`
   - Auto-Deploy: Yes
4. Environment variables (Render → your service → Settings → Environment)
   - `PORT=3000`
   - `EXEC_PROVIDER=judge0`
   - `EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com`
   - `EXEC_API_KEY=<your_rapidapi_key>`
   - `CORS_ORIGINS=https://<your-vercel-project>.vercel.app,http://localhost:5173`
5. Deploy and wait for “Live” state
6. Copy your server URL, e.g. `https://livelogic-server.onrender.com`

Notes
- If using a custom domain for Render, add it after initial deploy.
- If you get CORS errors later, return and update `CORS_ORIGINS` accordingly.

---
## 3) Configure the web app for production
1. In your repo, create `apps/web/.env.production`:
```
VITE_API_BASE_URL=https://livelogic-server.onrender.com
VITE_SOCKET_URL=https://livelogic-server.onrender.com
```
2. Commit and push:
```
cd apps/web
git add .env.production
git commit -m "Web prod env"
git push
```

---
## 4) Deploy the web to Vercel (Free)
1. Sign in: https://vercel.com
2. New Project → Import GitHub repo
3. Configure project
   - Root directory: `apps/web`
   - Framework preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Environment Variables (Vercel → Project → Settings → Environment Variables)
   - `VITE_API_BASE_URL=https://livelogic-server.onrender.com`
   - `VITE_SOCKET_URL=https://livelogic-server.onrender.com`
5. Deploy and wait for success
6. Open the Vercel domain: `https://<project>.vercel.app`

---
## 5) Verify the deployment end‑to‑end
1. Open two browsers (or one normal + one incognito)
2. Go to your Vercel URL in both
3. Create a room in one tab; join from the other
4. Type code in the editor; confirm real‑time sync
5. Enter Testcase input and click Run; confirm both tabs receive the same Result including who ran and the testcase used
6. Select a question; confirm it updates for everyone

---
## 6) Post‑deploy checks
- If you see CORS error on join/run:
  - Add the exact Vercel domain to `CORS_ORIGINS` in Render and redeploy
- If sockets don’t connect:
  - Ensure `VITE_SOCKET_URL` is the Render URL and Render service type is Web Service (not Background/Static)
- If /api/execute returns 500:
  - Verify `EXEC_*` env, language mapping, and provider health
- Rate limits:
  - You added per‑IP rate limiting; if you hit limits during testing, wait 1 minute

---
## 7) Optional – Custom domains
- Vercel: add a custom domain and set it as Production
- Render: add custom domain, copy DNS records
- Update server `CORS_ORIGINS` to include the custom domain

---
## 8) Maintenance & CI
- Enable Vercel Preview Deploys for PRs (apps/web)
- Render auto‑deploy from GitHub for main branch (apps/server)
- Add a README Deploy section linking to this document

---
## 9) Rollback strategy
- Vercel keeps previous deployments: promote a previous build if necessary
- Render allows redeploy from a previous commit

---
## 10) Security tips
- Do not commit API keys; use env variables
- Limit CORS to only your production domain(s)
- Rotate RapidAPI keys if suspicious activity occurs

---
If you want, I can perform a dry‑run deploy with placeholder envs and verify each step with screenshots.
