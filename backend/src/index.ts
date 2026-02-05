import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import http from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'
import { connectDB } from './config/database'
import { Room } from './models/Room'
import { Question } from './models/Question'
import { Execution } from './models/Execution'

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

const INTERVIEWER_END_GRACE_MS = parseInt(process.env.INTERVIEWER_END_GRACE_MS || '15000', 10)
const roomEndTimers: Map<string, NodeJS.Timeout> = new Map()

async function endRoom(roomId: string) {
  io.to(roomId).emit('room-ended', { message: 'Interviewer has left the room. Redirecting to home...' })
  await Room.deleteOne({ roomId })
}

function scheduleEndRoom(roomId: string) {
  const prev = roomEndTimers.get(roomId)
  if (prev) clearTimeout(prev)
  const t = setTimeout(async () => {
    try {
      roomEndTimers.delete(roomId)
      const room = await Room.findOne({ roomId })
      if (!room) return
      const hasInterviewer = (room.participants || []).some((p: any) => p.role === 'Interviewer')
      if (hasInterviewer) return
      await endRoom(roomId)
    } catch (e) {
      // ignore
    }
  }, Math.max(0, INTERVIEWER_END_GRACE_MS || 0))
  roomEndTimers.set(roomId, t)
}

// Initialize database
connectDB()

// Seed database with initial data
import { seedDatabase } from './config/seed'
seedDatabase()

async function loadQuestions() {
  try {
    const questions = await Question.find({})
    return questions
  } catch (e) {
    console.error('Error loading questions:', e)
    return []
  }
}

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

app.get('/api/questions', async (req, res) => {
  try {
    console.log('Fetching questions with query:', req.query)
    const { difficulty, tag, search } = req.query as Record<string, string>
    const limit = Math.max(0, Math.min(100, parseInt((req.query.limit as string) || '20', 10) || 20))
    const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10) || 0)

    let query: any = {}
    if (difficulty) {
      query.difficulty = new RegExp(`^${difficulty}$`, 'i')
    }
    if (tag) {
      query.tags = { $in: [new RegExp(tag, 'i')] }
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    console.log('MongoDB query:', query)
    const total = await Question.countDocuments(query)
    const items = await Question.find(query).skip(offset).limit(limit)
    console.log(`Found ${items.length} questions, total: ${total}`)
    
    res.json({ items, total })
  } catch (error) {
    console.error('Error fetching questions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const item = await Question.findOne({ questionId: id })
    if (!item) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
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

app.post('/api/rooms', async (_req, res) => {
  try {
    let roomId: string
    let attempts = 0
    const maxAttempts = 10
    
    do {
      roomId = generateRoomId(10)
      const existingRoom = await Room.findOne({ roomId })
      if (!existingRoom) {
        // Create new room in database
        await Room.create({
          roomId,
          participants: [],
          language: 'javascript',
          document: '',
          input: '',
          selectedQuestionId: null,
        })
        console.log(`Created new room: ${roomId}`)
        res.json({ roomId })
        return
      }
      attempts++
    } while (attempts < maxAttempts)
    
    res.status(500).json({ error: 'Failed to generate unique room ID' })
  } catch (error) {
    console.error('Error creating room:', error)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

app.post('/api/rooms/:roomId/validate', async (req, res) => {
  try {
    const { roomId } = req.params
    console.log(`Validating room: ${roomId}`)
    const exists = await Room.findOne({ roomId })
    console.log(`Room exists: ${!!exists}`)
    res.json({ exists: !!exists })
  } catch (error) {
    console.error('Error validating room:', error)
    res.status(500).json({ error: 'Validation failed' })
  }
})

// Debug endpoint to list all rooms (remove in production)
app.get('/api/rooms/debug', async (_req, res) => {
  try {
    const rooms = await Room.find({}, { roomId: 1, participants: 1, _id: 0 })
    console.log('All rooms:', rooms)
    res.json({ rooms })
  } catch (error) {
    console.error('Error listing rooms:', error)
    res.status(500).json({ error: 'Failed to list rooms' })
  }
})

app.get('/api/rooms/:roomId/validate', async (req, res) => {
  try {
    const { roomId } = req.params
    const exists = await Room.findOne({ roomId })
    res.json({ exists: !!exists })
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' })
  }
})

io.on('connection', (socket) => {
  socket.on('join-room', async (payload: { roomId: string; displayName: string }, ack?: Function) => {
    try {
      const { roomId, displayName } = payload || ({} as any)
      // Idempotent room creation (refresh/rejoin safe) + race-safe.
      // Using an atomic upsert avoids E11000 duplicate key errors on roomId.
      let room = null as any
      try {
        room = await Room.findOneAndUpdate(
          { roomId },
          {
            $setOnInsert: {
              roomId,
              participants: [],
              language: 'javascript',
              document: '',
              input: '',
              selectedQuestionId: null,
            },
          },
          { new: true, upsert: true }
        )
      } catch (e: any) {
        // In very rare concurrent upsert races Mongo can still throw E11000.
        // If that happens, just read the already-created room.
        if (e?.code === 11000) {
          room = await Room.findOne({ roomId })
        } else {
          throw e
        }
      }

      if (!room) {
        ack?.({ error: 'Failed to join room' })
        return
      }

      // Cleanup: remove participants whose socket is no longer connected
      // This prevents duplicate names/ghost users after refreshes or transient disconnects.
      const staleSocketIds = (room.participants || [])
        .map((p: any) => p?.socketId)
        .filter((sid: any) => typeof sid === 'string' && sid.length > 0)
        .filter((sid: string) => sid !== socket.id)
        .filter((sid: string) => !io.sockets.sockets.has(sid))

      if (staleSocketIds.length > 0) {
        await Room.updateOne(
          { roomId },
          { $pull: { participants: { socketId: { $in: staleSocketIds } } } }
        )
        room = await Room.findOne({ roomId })
      }

      // Remove this socket from any existing rooms
      await Room.updateMany(
        { 'participants.socketId': socket.id },
        { $pull: { participants: { socketId: socket.id } } }
      )

      socket.join(roomId)
      const hasInterviewer = (room?.participants || []).some((p: any) => p.role === 'Interviewer')
      let role: 'Interviewer' | 'Candidate' = !hasInterviewer ? 'Interviewer' : 'Candidate'

      // Update room with new participant
      const existingParticipant = room.participants.find((p: any) => p.socketId === socket.id)
      if (existingParticipant) {
        await Room.updateOne(
          { roomId, 'participants.socketId': socket.id },
          { 
            $set: { 
              'participants.$.displayName': displayName,
              'participants.$.role': role
            }
          }
        )
      } else {
        await Room.updateOne(
          { roomId },
          { 
            $push: { 
              participants: { 
                socketId: socket.id, 
                displayName, 
                role 
              } 
            } 
          }
        )
      }

      // Get updated room
      room = await Room.findOne({ roomId })

      if ((room?.participants || []).some((p: any) => p.role === 'Interviewer')) {
        const t = roomEndTimers.get(roomId)
        if (t) {
          clearTimeout(t)
          roomEndTimers.delete(roomId)
        }
      }
      
      // Enforce: only one Interviewer per room (handle join race conditions)
      if (room?.participants && room.participants.length > 0) {
        const interviewers = room.participants.filter((p: any) => p.role === 'Interviewer')
        if (interviewers.length > 1) {
          const keep = interviewers[0]?.socketId
          const toDowngrade = interviewers
            .map((p: any) => p.socketId)
            .filter((sid: any) => typeof sid === 'string' && sid.length > 0)
            .filter((sid: string) => sid !== keep)

          for (const sid of toDowngrade) {
            await Room.updateOne(
              { roomId, 'participants.socketId': sid },
              { $set: { 'participants.$.role': 'Candidate' } }
            )
          }

          // If the current socket was downgraded, reflect it in the ack role.
          if (role === 'Interviewer' && keep && socket.id !== keep) {
            role = 'Candidate'
          }

          room = await Room.findOne({ roomId })
        }
      }
      
      const snapshot = {
        role,
        participants: room?.participants || [],
        language: room?.language || 'javascript',
        document: room?.document || '',
        input: room?.input || '',
        selectedQuestionId: room?.selectedQuestionId || null,
      }
      ack?.(snapshot)
      io.to(roomId).emit('participants-updated', { participants: room?.participants || [] })
    } catch (error) {
      console.error('Error joining room:', error)
      ack?.({ error: 'Failed to join room' })
    }
  })

  const leaveFromAll = async () => {
    try {
      // Find all rooms this socket was in before removing
      const roomsWithSocket = await Room.find({ 'participants.socketId': socket.id })

      // Remove this socket from all rooms
      await Room.updateMany(
        { 'participants.socketId': socket.id },
        { $pull: { participants: { socketId: socket.id } } }
      )

      for (const room of roomsWithSocket) {
        const leavingParticipant = room.participants.find((p: any) => p.socketId === socket.id)

        const updatedRoom = await Room.findOne({ roomId: room.roomId })
        io.to(room.roomId).emit('participants-updated', { participants: updatedRoom?.participants || [] })

        if (leavingParticipant?.role === 'Interviewer') {
          scheduleEndRoom(room.roomId)
        }

        if ((updatedRoom?.participants || []).length === 0) {
          await Room.deleteOne({ roomId: room.roomId })
        }
      }
    } catch (error) {
      console.error('Error leaving rooms:', error)
    }
  }

  socket.on('leave-room', async ({ roomId, endRoom: endNow }: { roomId: string; endRoom?: boolean }) => {
    try {
      socket.leave(roomId)
      const room = await Room.findOne({ roomId })
      if (!room) return

      const leavingParticipant = room.participants.find((p: any) => p.socketId === socket.id)

      await Room.updateOne(
        { roomId },
        { $pull: { participants: { socketId: socket.id } } }
      )

      const updatedRoom = await Room.findOne({ roomId })
      io.to(roomId).emit('participants-updated', { participants: updatedRoom?.participants || [] })

      if (leavingParticipant?.role === 'Interviewer') {
        if (endNow) {
          await endRoom(roomId)
        } else {
          scheduleEndRoom(roomId)
        }
      }

      if ((updatedRoom?.participants || []).length === 0) {
        await Room.deleteOne({ roomId })
      }
    } catch (error) {
      console.error('Error leaving room:', error)
    }
  })

  socket.on('disconnect', () => {
    leaveFromAll()
  })

  socket.on('code-change', async (payload: { roomId: string; version?: number; text?: string }) => {
    try {
      const { roomId, text } = payload || ({} as any)
      if (typeof text !== 'string') return
      
      await Room.updateOne(
        { roomId },
        { 
          $set: { 
            document: text,
            lastUpdated: new Date()
          }
        }
      )
      
      socket.to(roomId).emit('code-change', { text })
    } catch (error) {
      console.error('Error updating code:', error)
    }
  })

  socket.on('language-change', async (payload: { roomId: string; language: 'cpp' | 'java' | 'python' | 'javascript' }) => {
    try {
      const { roomId, language } = payload || ({} as any)
      
      await Room.updateOne(
        { roomId },
        { 
          $set: { 
            language,
            lastUpdated: new Date()
          }
        }
      )
      
      io.to(roomId).emit('language-change', { language })
    } catch (error) {
      console.error('Error updating language:', error)
    }
  })

  socket.on('reset-document', async (payload: { roomId: string }) => {
    try {
      const { roomId } = payload || ({} as any)
      
      await Room.updateOne(
        { roomId },
        { 
          $set: { 
            document: '',
            lastUpdated: new Date()
          }
        }
      )
      
      io.to(roomId).emit('code-change', { text: '' })
    } catch (error) {
      console.error('Error resetting document:', error)
    }
  })

  socket.on('set-question', async (payload: { roomId: string; questionId: string }) => {
    try {
      const { roomId, questionId } = payload || ({} as any)
      
      const q = await Question.findOne({ questionId })
      if (!q) return
      
      await Room.updateOne(
        { roomId },
        { 
          $set: { 
            selectedQuestionId: questionId,
            lastUpdated: new Date()
          }
        }
      )
      
      io.to(roomId).emit('set-question', { question: q })
    } catch (error) {
      console.error('Error setting question:', error)
    }
  })

  // Execute code for the whole room and broadcast result
  socket.on(
    'run-execute',
    async (payload: { roomId: string; language: 'javascript' | 'python' | 'java' | 'cpp'; code: string; input?: string }) => {
      try {
        const { roomId, language, code, input } = payload || ({} as any)
        const room = await Room.findOne({ roomId })
        if (!room) return
        const by = room.participants.find((p: any) => p.socketId === socket.id)
        const allowed: ('javascript' | 'python' | 'java' | 'cpp')[] = ['javascript', 'python', 'java', 'cpp']
        if (!allowed.includes(language)) return
        if (typeof code !== 'string' || code.length === 0 || code.length > 200_000) return
        const inp = typeof input === 'string' ? input : ''

        const provider = (process.env.EXEC_PROVIDER || '').toLowerCase()
        const judge0Ids: Record<'javascript' | 'python' | 'java' | 'cpp', number> = {
          javascript: 63,
          python: 71,
          java: 62,
          cpp: 54,
        }
        const jdoodleLang: Record<'javascript' | 'python' | 'java' | 'cpp', { language: string; versionIndex: string }> = {
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
