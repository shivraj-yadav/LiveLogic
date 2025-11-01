import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import http from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'

type Participant = { socketId: string; displayName: string; role: 'Interviewer' | 'Candidate' }

type Question = {
  _id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  sampleInput: string
  sampleOutput: string
}
type RoomState = {
  roomId: string
  participants: Participant[]
  language: 'cpp' | 'java' | 'python' | 'javascript'
  document: string
  input: string
  selectedQuestionId: string | null
}

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const PORT = process.env.PORT || 3000

const rooms = new Map<string, RoomState>()
let questions: Question[] = []

function loadQuestions() {
  try {
    const seedPath = path.join(__dirname, '..', 'seed', 'questions.json')
    const raw = fs.readFileSync(seedPath, 'utf-8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) questions = data as Question[]
  } catch (e) {
    questions = []
  }
}
loadQuestions()

function generateRoomId(len = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < len; i++) id += chars[(Math.random() * chars.length) | 0]
  return id
}

// Helmet minimal defaults
app.use(helmet())

// Strict CORS from env list
const allowList = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // allow same-origin and curl
    if (allowList.length === 0) return callback(null, true)
    if (allowList.includes(origin)) return callback(null, true)
    return callback(new Error('CORS not allowed'))
  },
  credentials: false,
}
app.use(cors(corsOptions))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/questions', (req, res) => {
  const { difficulty, tag, search } = req.query as Record<string, string>
  const limit = Math.max(0, Math.min(100, parseInt((req.query.limit as string) || '20', 10) || 20))
  const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10) || 0)

  let list = questions.slice()
  if (difficulty) {
    const d = difficulty.toLowerCase()
    list = list.filter((q) => q.difficulty.toLowerCase() === d)
  }
  if (tag) {
    const t = tag.toLowerCase()
    list = list.filter((q) => q.tags.some((x) => x.toLowerCase() === t))
  }
  if (search) {
    const s = search.toLowerCase()
    list = list.filter((q) => q.title.toLowerCase().includes(s) || q.description.toLowerCase().includes(s))
  }

  const total = list.length
  const items = list.slice(offset, offset + limit)
  res.json({ items, total })
})

app.get('/api/questions/:id', (req, res) => {
  const { id } = req.params
  const item = questions.find((q) => q._id === id)
  if (!item) return res.status(404).json({ error: 'NOT_FOUND' })
  res.json(item)
})

// Simple per-IP rate limit for /api/execute
type Hit = { ts: number }
const execHits: Map<string, Hit[]> = new Map()
const EXEC_WINDOW_MS = 60_000
const EXEC_LIMIT = 10

app.post('/api/execute', async (req, res) => {
  try {
    const { language, code, input } = req.body || {}
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const arr = execHits.get(ip) || []
    const fresh = arr.filter((h) => now - h.ts < EXEC_WINDOW_MS)
    if (fresh.length >= EXEC_LIMIT) return res.status(429).json({ error: 'RATE_LIMIT', message: 'Too many executions. Try again shortly.' })
    fresh.push({ ts: now })
    execHits.set(ip, fresh)
    const allowed: RoomState['language'][] = ['javascript', 'python', 'java', 'cpp']
    if (!allowed.includes(language)) return res.status(400).json({ error: 'INVALID_LANGUAGE', message: 'language must be one of javascript, python, java, cpp' })
    if (typeof code !== 'string' || code.length === 0) return res.status(400).json({ error: 'INVALID_CODE', message: 'code is required' })
    if (code.length > 200_000) return res.status(413).json({ error: 'CODE_TOO_LARGE', message: 'code exceeds 200KB limit' })
    const inp = typeof input === 'string' ? input : ''

    const provider = (process.env.EXEC_PROVIDER || '').toLowerCase()
    const lang = language as RoomState['language']

    // Judge0 mapping (commonly used IDs; your instance may vary)
    const judge0Ids: Record<RoomState['language'], number> = {
      javascript: 63, // Node.js
      python: 71, // Python 3
      java: 62, // Java (OpenJDK)
      cpp: 54, // C++ (GCC)
    }

    // JDoodle mapping
    const jdoodleLang: Record<RoomState['language'], { language: string; versionIndex: string }> = {
      javascript: { language: 'nodejs', versionIndex: '4' },
      python: { language: 'python3', versionIndex: '4' },
      java: { language: 'java', versionIndex: '4' },
      cpp: { language: 'cpp17', versionIndex: '0' },
    }

    const started = Date.now()

    if (provider === 'judge0') {
      const endpoint = process.env.EXEC_ENDPOINT || ''
      if (!endpoint) return res.status(501).json({ error: 'EXEC_ENDPOINT_REQUIRED' })
      const url = `${endpoint.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`

      const body = {
        source_code: code,
        language_id: judge0Ids[lang],
        stdin: inp,
        redirect_stderr_to_stdout: false,
      }

      const u = new URL(url)
      const isRapid = u.hostname.endsWith('rapidapi.com')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (isRapid) {
        const key = process.env.EXEC_API_KEY || ''
        if (!key) return res.status(501).json({ error: 'RAPIDAPI_KEY_REQUIRED' })
        headers['X-RapidAPI-Key'] = key
        headers['X-RapidAPI-Host'] = u.hostname
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return res.status(502).json({ error: 'PROVIDER_ERROR', detail: text })
      }
      const data: any = await r.json()
      const stdout = data.stdout || ''
      const stderr = data.stderr || data.compile_output || ''
      const timeSec = parseFloat(data.time || '0') || 0
      const timeMs = Math.round(timeSec * 1000)
      const status = data.status?.description || ''
      const memoryKb = data.memory ? parseInt(String(data.memory), 10) : undefined
      return res.json({ stdout, stderr, timeMs, status, memoryKb })
    }

    if (provider === 'jdoodle') {
      const endpoint = process.env.EXEC_ENDPOINT || 'https://api.jdoodle.com/v1/execute'
      const clientId = process.env.EXEC_API_KEY || process.env.JDOODLE_CLIENT_ID
      const clientSecret = process.env.EXEC_API_SECRET || process.env.JDOODLE_CLIENT_SECRET
      if (!clientId || !clientSecret) return res.status(501).json({ error: 'JD_CLIENT_CREDS_REQUIRED' })
      const map = jdoodleLang[lang]
      const body = {
        clientId,
        clientSecret,
        script: code,
        stdin: inp,
        language: map.language,
        versionIndex: map.versionIndex,
      }
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return res.status(502).json({ error: 'PROVIDER_ERROR', detail: text })
      }
      const data: any = await r.json()
      const stdout = data.output || ''
      const stderr = ''
      const timeMs = Date.now() - started
      return res.json({ stdout, stderr, timeMs })
    }

    // Fallback: not configured
    return res.status(501).json({ error: 'PROVIDER_NOT_CONFIGURED', hint: 'Set EXEC_PROVIDER=judge0 or jdoodle and EXEC_ENDPOINT/keys.' })
  } catch (e: any) {
    return res.status(500).json({ error: 'INTERNAL', detail: e?.message || 'unknown' })
  }
})

app.post('/api/rooms', (_req, res) => {
  const roomId = generateRoomId(10)
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      participants: [],
      language: 'javascript',
      document: '',
      input: '',
      selectedQuestionId: null,
    })
  }
  res.json({ roomId })
})

app.post('/api/rooms/:roomId/validate', (req, res) => {
  const { roomId } = req.params
  res.json({ exists: rooms.has(roomId) })
})

app.get('/api/rooms/:roomId/validate', (req, res) => {
  const { roomId } = req.params
  res.json({ exists: rooms.has(roomId) })
})

io.on('connection', (socket) => {
  socket.on('join-room', (payload: { roomId: string; displayName: string }, ack?: Function) => {
    const { roomId, displayName } = payload || ({} as any)
    let room = rooms.get(roomId)
    if (!room) {
      // Create room on the fly to avoid UX issues during dev restarts
      room = {
        roomId,
        participants: [],
        language: 'javascript',
        document: '',
        input: '',
        selectedQuestionId: null,
      }
      rooms.set(roomId, room)
    }

    // Ensure this socket isn't already counted in any room
    for (const [, r] of rooms) {
      const idx = r.participants.findIndex((p) => p.socketId === socket.id)
      if (idx !== -1) r.participants.splice(idx, 1)
    }

    socket.join(roomId)
    const hasInterviewer = room.participants.some((p) => p.role === 'Interviewer')
    let role: Participant['role'] = !hasInterviewer ? 'Interviewer' : 'Candidate'

    const existingIdx = room.participants.findIndex((p) => p.socketId === socket.id)
    if (existingIdx !== -1) {
      room.participants[existingIdx].displayName = displayName
      room.participants[existingIdx].role = role
    } else {
      const participant: Participant = { socketId: socket.id, displayName, role }
      room.participants.push(participant)
    }

    const snapshot = {
      role,
      participants: room.participants,
      language: room.language,
      document: room.document,
      input: room.input,
      selectedQuestionId: room.selectedQuestionId,
    }
    ack?.(snapshot)
    io.to(roomId).emit('participants-updated', { participants: room.participants })
  })

  const leaveFromAll = () => {
    for (const [roomId, room] of rooms) {
      const idx = room.participants.findIndex((p) => p.socketId === socket.id)
      if (idx !== -1) {
        room.participants.splice(idx, 1)
        io.to(roomId).emit('participants-updated', { participants: room.participants })
        if (room.participants.length === 0) rooms.delete(roomId)
      }
    }
  }

  socket.on('leave-room', ({ roomId }: { roomId: string }) => {
    socket.leave(roomId)
    const room = rooms.get(roomId)
    if (room) {
      const idx = room.participants.findIndex((p) => p.socketId === socket.id)
      if (idx !== -1) room.participants.splice(idx, 1)
      io.to(roomId).emit('participants-updated', { participants: room.participants })
      if (room.participants.length === 0) rooms.delete(roomId)
    }
  })

  socket.on('disconnect', () => {
    leaveFromAll()
  })

  socket.on('code-change', (payload: { roomId: string; version?: number; text?: string }) => {
    const { roomId, text } = payload || ({} as any)
    const room = rooms.get(roomId)
    if (!room || typeof text !== 'string') return
    room.document = text
    socket.to(roomId).emit('code-change', { text })
  })

  socket.on('language-change', (payload: { roomId: string; language: RoomState['language'] }) => {
    const { roomId, language } = payload || ({} as any)
    const room = rooms.get(roomId)
    if (!room) return
    room.language = language
    io.to(roomId).emit('language-change', { language })
  })

  socket.on('reset-document', (payload: { roomId: string }) => {
    const { roomId } = payload || ({} as any)
    const room = rooms.get(roomId)
    if (!room) return
    room.document = ''
    io.to(roomId).emit('code-change', { text: '' })
  })

  socket.on('set-question', (payload: { roomId: string; questionId: string }) => {
    const { roomId, questionId } = payload || ({} as any)
    const room = rooms.get(roomId)
    if (!room) return
    const q = questions.find((x) => x._id === questionId)
    if (!q) return
    room.selectedQuestionId = questionId
    io.to(roomId).emit('set-question', { question: q })
  })

  // Execute code for the whole room and broadcast result
  socket.on(
    'run-execute',
    async (payload: { roomId: string; language: RoomState['language']; code: string; input?: string }) => {
      try {
        const { roomId, language, code, input } = payload || ({} as any)
        const room = rooms.get(roomId)
        if (!room) return
        const by = room.participants.find((p) => p.socketId === socket.id)
        const allowed: RoomState['language'][] = ['javascript', 'python', 'java', 'cpp']
        if (!allowed.includes(language)) return
        if (typeof code !== 'string' || code.length === 0 || code.length > 200_000) return
        const inp = typeof input === 'string' ? input : ''

        const provider = (process.env.EXEC_PROVIDER || '').toLowerCase()
        const judge0Ids: Record<RoomState['language'], number> = {
          javascript: 63,
          python: 71,
          java: 62,
          cpp: 54,
        }
        const jdoodleLang: Record<RoomState['language'], { language: string; versionIndex: string }> = {
          javascript: { language: 'nodejs', versionIndex: '4' },
          python: { language: 'python3', versionIndex: '4' },
          java: { language: 'java', versionIndex: '4' },
          cpp: { language: 'cpp17', versionIndex: '0' },
        }

        const started = Date.now()
        if (provider === 'judge0') {
          const endpoint = process.env.EXEC_ENDPOINT || ''
          if (!endpoint) return
          const url = `${endpoint.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`
          const body = { source_code: code, language_id: judge0Ids[language], stdin: inp, redirect_stderr_to_stdout: false }
          const u = new URL(url)
          const isRapid = u.hostname.endsWith('rapidapi.com')
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (isRapid) {
            const key = process.env.EXEC_API_KEY || ''
            if (!key) return
            headers['X-RapidAPI-Key'] = key
            headers['X-RapidAPI-Host'] = u.hostname
          }
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 15000)
          const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }).finally(() =>
            clearTimeout(timeout)
          )
          if (!r.ok) {
            const text = await r.text().catch(() => '')
            io.to(roomId).emit('execution-result', { error: 'PROVIDER_ERROR', detail: text, by, input: inp })
            return
          }
          const data: any = await r.json()
          const stdout = data.stdout || ''
          const stderr = data.stderr || data.compile_output || ''
          const timeSec = parseFloat(data.time || '0') || 0
          const timeMs = Math.round(timeSec * 1000)
          const status = data.status?.description || ''
          const memoryKb = data.memory ? parseInt(String(data.memory), 10) : undefined
          io.to(roomId).emit('execution-result', { stdout, stderr, timeMs, status, memoryKb, by, input: inp })
          return
        }

        if (provider === 'jdoodle') {
          const endpoint = process.env.EXEC_ENDPOINT || 'https://api.jdoodle.com/v1/execute'
          const clientId = process.env.EXEC_API_KEY || process.env.JDOODLE_CLIENT_ID
          const clientSecret = process.env.EXEC_API_SECRET || process.env.JDOODLE_CLIENT_SECRET
          if (!clientId || !clientSecret) return
          const map = jdoodleLang[language]
          const body = { clientId, clientSecret, script: code, stdin: inp, language: map.language, versionIndex: map.versionIndex }
          const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          if (!r.ok) {
            const text = await r.text().catch(() => '')
            io.to(roomId).emit('execution-result', { error: 'PROVIDER_ERROR', detail: text, by, input: inp })
            return
          }
          const data: any = await r.json()
          const stdout = data.output || ''
          const stderr = ''
          const timeMs = Date.now() - started
          io.to(roomId).emit('execution-result', { stdout, stderr, timeMs, by, input: inp })
          return
        }

        io.to(roomId).emit('execution-result', { error: 'PROVIDER_NOT_CONFIGURED', by, input: inp })
      } catch (e: any) {
        const { roomId, input } = (payload || {}) as any
        io.to(roomId).emit('execution-result', { error: 'INTERNAL', detail: e?.message || 'unknown', input })
      }
    }
  )
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
