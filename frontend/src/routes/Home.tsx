import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Github, Linkedin, Plus, LogIn, Users, Code, Zap, Shield, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'

export default function Home() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')

  const onGenerate = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
      console.log('Generating new room...')
      const res = await axios.post(`${base}/api/rooms`)
      const { roomId } = res.data || {}
      console.log('Generated room:', roomId)
      if (roomId) setJoinRoomId(roomId)
    } catch (error) {
      console.error('Failed to generate room:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate Room ID. Ensure server is running.',
        variant: 'destructive'
      })
    }
  }

  const [errors, setErrors] = useState<{ name?: string; room?: string }>({})

  const onCreate = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your display name',
        variant: 'destructive'
      })
      return
    }
    sessionStorage.setItem('displayName', displayName.trim())
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
      const res = await axios.post(`${base}/api/rooms`)
      const { roomId } = res.data || {}
      if (!roomId) throw new Error('Invalid response')
      navigate(`/room/${roomId}`)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create room. Ensure server is running.',
        variant: 'destructive'
      })
    }
  }

  const onJoin = async () => {
    const errs: { name?: string; room?: string } = {}
    if (!displayName.trim()) errs.name = 'Enter your display name'
    if (!joinRoomId.trim()) errs.room = 'Enter a valid Room ID'
    setErrors(errs)
    if (Object.keys(errs).length) return
    sessionStorage.setItem('displayName', displayName.trim())
    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
      const roomId = joinRoomId.trim()
      console.log(`Attempting to join room: ${roomId}`)
      const res = await axios.post(`${base}/api/rooms/${roomId}/validate`)
      console.log('Validation response:', res.data)
      if (res.data?.exists) {
        console.log('Room exists, navigating...')
        navigate(`/room/${roomId}`)
      } else {
        console.log('Room does not exist')
        toast({
          title: 'Room Not Found',
          description: 'Ask interviewer for a valid Room ID.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast({
        title: 'Validation Error',
        description: 'Validation failed. Ensure server is running.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-pill px-3 py-1 text-[11px] uppercase tracking-widest bg-white/5 border border-white/10 text-gray-300 mb-4">
              <span>Realtime Code Interview</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight hero-gradient-text">LiveLogic</h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-300">Peer with candidates in a shared editor, pick problems, and run code together. Minimal setup, powerful collaboration.</p>
          </motion.div>
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }} className="glass-panel rounded-lg p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-gray-100">Join a Room</h2>
            </div>
            <div className="space-y-2">
              
              <Input placeholder="Room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} invalid={errors.room ? true : undefined} />
              {errors.room && <div className="text-red-400 text-xs px-1">{errors.room}</div>}
              <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onJoin() }} invalid={errors.name ? true : undefined} />
              {errors.name && <div className="text-red-400 text-xs px-1">{errors.name}</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button size="lg" onClick={onJoin} className="inline-flex items-center justify-center"><LogIn className="mr-2 h-4 w-4" />Join Room</Button>
              <Button size="lg" variant="secondary" onClick={onGenerate} className="inline-flex items-center justify-center"><Zap className="mr-2 h-4 w-4" />Generate ID</Button>
            </div>
            <div className="mt-3 text-[12px] text-gray-400">Use Generate ID if your interviewer asked you to host.</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }} className="glass-panel rounded-lg p-6 md:p-7 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'linear-gradient(120deg, rgba(34,197,94,0.1), transparent 30%, rgba(52,211,153,0.08))' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-100">Host an Interview</h2>
              </div>
              <p className="text-sm text-gray-300 mb-4">Create a fresh room and invite candidates. Manage questions, languages, and runs in one place.</p>
              <Button size="lg" onClick={onCreate} className="inline-flex items-center"><Plus className="mr-2 h-4 w-4" />Create New Room</Button>
              <div className="mt-3 text-[12px] text-gray-400">You'll get a shareable Room ID instantly.</div>
            </div>
          </motion.div>
        </div>

        <div className="mt-14 flex items-center justify-center gap-5 text-sm text-gray-400">
          <a href="https://github.com/shivraj-yadav" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gray-200"><Github className="h-4 w-4" />GitHub</a>
          <span className="opacity-40">•</span>
          <a href="https://www.linkedin.com/in/shivraj-yadav" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gray-200"><Linkedin className="h-4 w-4" />LinkedIn</a>
          <span className="opacity-40">•</span>
          <span className="text-gray-500">Built by Shivraj Yadav</span>
        </div>
      </div>
    </div>
  )
}
