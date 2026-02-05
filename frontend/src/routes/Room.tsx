import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getSocket } from '../lib/socket'
import axios from 'axios'
import Editor from '@monaco-editor/react'
import { Header } from '../components/room/Header'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { Copy, Play, RotateCcw, Users, Code, Terminal, CheckCircle, AlertCircle } from 'lucide-react'

type Participant = { socketId: string; displayName: string; role: 'Interviewer' | 'Candidate' }

export default function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const initialName = (
    typeof window !== 'undefined' ? sessionStorage.getItem('displayName') || '' : ''
  ).trim()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [role, setRole] = useState<'Interviewer' | 'Candidate' | ''>('')
  const roleRef = useRef<'Interviewer' | 'Candidate' | ''>('')
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp'>('javascript')
  const [questions, setQuestions] = useState<any[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null)
  const [qDifficulty, setQDifficulty] = useState<string>('')
  const [qSearch, setQSearch] = useState<string>('')
  const socket = useMemo(() => getSocket(), [])
  const joinedRef = useRef(false)
  const nameRef = useRef(initialName)
  const sendTimerRef = useRef<number | null>(null)
  const [activeTab, setActiveTab] = useState<'Testcase' | 'Result'>('Testcase')
  const [testcase, setTestcase] = useState<string>('')
  const [result, setResult] = useState<string>('')
  const [consoleHeight, setConsoleHeight] = useState<number>(180)
  const dragRef = useRef(false)
  const [showPicker, setShowPicker] = useState<boolean>(false)
  const [running, setRunning] = useState<boolean>(false)
  const [lastMeta, setLastMeta] = useState<{ timeMs?: number; memoryKb?: number; status?: string }>({})
  const { toast } = useToast()

  const normalizeParticipants = (items: Participant[]): Participant[] => {
    const map = new Map<string, Participant>()
    for (const p of items || []) {
      const key = `${p.displayName || 'Guest'}-${p.role}`
      map.set(key, p)
    }
    return Array.from(map.values())
  }

  useEffect(() => {
    if (!roomId || !nameRef.current) return
    if (joinedRef.current) return
    joinedRef.current = true

    if (!socket.connected) socket.connect()

    socket.emit(
      'join-room',
      { roomId, displayName: nameRef.current },
      (ack: any) => {
        if (ack?.error) {
          toast({
            title: 'Room Not Found',
            description: 'The room you are trying to join does not exist.',
            variant: 'destructive'
          })
          navigate('/')
          return
        }
        setRole(ack.role)
        roleRef.current = ack.role
        setParticipants(normalizeParticipants(ack.participants || []))
        if (typeof ack.document === 'string') setCode(ack.document)
        if (ack.language) setLanguage(ack.language)
        if (ack.selectedQuestionId) {
          const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
          axios
            .get(`${base}/api/questions/${ack.selectedQuestionId}`)
            .then((r) => setSelectedQuestion(r.data))
            .catch(() => {})
        }
      }
    )

    const onUpdated = (payload: { participants: Participant[] }) => {
      setParticipants(normalizeParticipants(payload.participants || []))
    }
    socket.on('participants-updated', onUpdated)

    const onCode = (payload: { text?: string }) => {
      if (typeof payload?.text === 'string') setCode(payload.text)
    }
    socket.on('code-change', onCode)

    const onLang = (payload: { language: typeof language }) => {
      if (payload?.language) {
        setLanguage(payload.language)
        toast({ title: 'Language changed', description: payload.language })
      }
    }
    socket.on('language-change', onLang)

    const onSetQ = (payload: { question: any }) => {
      console.log('Received question:', payload.question)
      setSelectedQuestion(payload.question || null)
      if (payload?.question?.title) toast({ title: 'Question selected', description: payload.question.title })
    }
    socket.on('set-question', onSetQ)

    const onRoomEnded = (payload: { message: string }) => {
      toast({ 
        title: 'Room Ended', 
        description: payload.message,
        variant: 'destructive'
      })
      navigate('/')
    }
    socket.on('room-ended', onRoomEnded)

    const beforeUnload = () => {
      socket.emit('leave-room', { roomId, endRoom: roleRef.current === 'Interviewer' })
    }
    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      socket.emit('leave-room', { roomId, endRoom: roleRef.current === 'Interviewer' })
      joinedRef.current = false
      socket.off('participants-updated', onUpdated)
      socket.off('code-change', onCode)
      socket.off('language-change', onLang)
      socket.off('set-question', onSetQ)
      socket.off('room-ended', onRoomEnded)
      // keep socket open to allow quick rejoin navigation within app
    }
  }, [roomId, socket, navigate])

  const copyId = async () => {
    if (!roomId) return
    try {
      await navigator.clipboard.writeText(roomId)
      toast({
        title: 'Copied!',
        description: 'Room ID copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy Room ID',
        variant: 'destructive'
      })
    }
  }

  const leave = () => {
    if (roomId) {
      socket.emit('leave-room', { roomId, endRoom: roleRef.current === 'Interviewer' })
    }
    navigate('/')
  }

  const onCodeChange = (value?: string) => {
    const text = value ?? ''
    setCode(text)
    if (!roomId) return
    if (sendTimerRef.current) window.clearTimeout(sendTimerRef.current)
    sendTimerRef.current = window.setTimeout(() => {
      socket.emit('code-change', { roomId, text })
    }, 120)
  }

  const onLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as typeof language
    setLanguage(lang)
    if (!roomId) return
    socket.emit('language-change', { roomId, language: lang })
  }

  const resetDoc = () => {
    if (!roomId) return
    socket.emit('reset-document', { roomId })
  }

  const runCode = () => {
    if (!roomId) return
    setRunning(true)
    setActiveTab('Result')
    socket.emit('run-execute', { roomId, language, code, input: testcase })
  }

  // simple drag-to-resize for bottom console (right panel)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setConsoleHeight((h) => Math.max(100, Math.min(400, h + (e.movementY || 0))))
    }
    const onUp = () => {
      dragRef.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Listen for shared execution results
  useEffect(() => {
    const handler = (payload: { stdout?: string; stderr?: string; timeMs?: number; status?: string; memoryKb?: number; error?: string; detail?: string; input?: string; by?: { displayName: string; role: string } }) => {
      const { stdout, stderr, timeMs, status, memoryKb, error, detail, input, by } = payload || ({} as any)
      if (error) {
        setResult(`Error: ${error}${detail ? `\n${detail}` : ''}`)
        setRunning(false)
        setActiveTab('Result')
        setLastMeta({ timeMs, memoryKb, status })
        return
      }
      const lines = [
        by?.displayName ? `run by: ${by.displayName} (${by.role})` : '',
        stdout ? `stdout:\n${stdout}` : '',
        stderr ? `stderr:\n${stderr}` : '',
        typeof input === 'string' && input.length ? `testcase (stdin):\n${input}` : '',
        typeof status === 'string' && status ? `status: ${status}` : '',
        typeof timeMs === 'number' ? `time: ${timeMs} ms` : '',
        typeof memoryKb === 'number' ? `memory: ${memoryKb} KB` : '',
      ].filter(Boolean)
      setResult(lines.join('\n\n') || 'No output')
      setRunning(false)
      setActiveTab('Result')
      setLastMeta({ timeMs, memoryKb, status })
      if (by?.displayName) {
        toast({ title: 'Run executed', description: `${by.displayName} (${by.role})` })
      }
    }
    socket.on('execution-result', handler)
    return () => {
      socket.off('execution-result', handler)
    }
  }, [socket])

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
        const params: Record<string, string> = {}
        if (qDifficulty) params.difficulty = qDifficulty
        if (qSearch) params.search = qSearch
        const res = await axios.get(`${base}/api/questions`, { params })
        setQuestions(res.data?.items || [])
      } catch (e) {
        setQuestions([])
      }
    }
    fetchQuestions()
  }, [qDifficulty, qSearch])

  const chooseQuestion = (id: string) => {
    if (!roomId) return
    socket.emit('set-question', { roomId, questionId: id })
  }

  return (
    <div className={role === 'Candidate' ? 'min-h-screen bg-carbon-800 text-gray-100' : 'min-h-screen bg-carbon-800 text-gray-100'}>
      {role === 'Candidate' ? (
        <div className="h-screen w-full flex flex-col">
          <Header
            roomId={roomId!}
            youName={nameRef.current || 'Unknown'}
            role={role}
            onCopy={copyId}
            onLeave={leave}
            center={<div className="flex items-center gap-2 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span>{participants.length} online</span></div>}
          />
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="border-r border-[#1f2a33] overflow-auto p-5">
              {selectedQuestion ? (
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold mb-3">{selectedQuestion.title}</h2>
                  <div className="text-sm leading-6 text-gray-200 whitespace-pre-wrap">{selectedQuestion.description}</div>
                  <div className="mt-4 text-xs text-gray-300">Examples</div>
                  <pre className="mt-1 bg-[#0c141a] rounded p-3 text-xs overflow-auto border border-[#1f2a33]">Input: {selectedQuestion.sampleInput}\nOutput: {selectedQuestion.sampleOutput}</pre>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">Waiting for interviewer to select a problem…</div>
              )}
            </div>
            <div className="overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-carbon-400 bg-carbon-700/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">Language</span>
                  <select className="bg-carbon-800 border border-carbon-400 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" value={language} onChange={onLanguageChange}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <Button onClick={runCode} disabled={running} size="sm" className="inline-flex items-center gap-1">{running ? <Terminal className="h-3 w-3 animate-pulse" /> : <Play className="h-3 w-3" />}{running ? 'Running…' : 'Run'}</Button>
              </div>
              <div className="flex-1">
                <Editor height="100%" language={language === 'cpp' ? 'cpp' : language} theme="vs-dark" value={code} onChange={onCodeChange} options={{ fontSize: 14, minimap: { enabled: false } }} />
              </div>
              <div className="h-1 cursor-row-resize bg-carbon-400" onMouseDown={() => (dragRef.current = true)} />
              <div className="border-t border-carbon-400">
                <div className="flex items-center px-2 gap-1">
                  {(['Testcase', 'Result'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-2 text-xs rounded-t-md ${activeTab === t ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ height: consoleHeight }} className="p-2 overflow-auto">
                  {activeTab === 'Testcase' ? (
                    <textarea className="w-full h-full bg-carbon-800 border border-carbon-400 rounded-md p-2 text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" value={testcase} onChange={(e) => setTestcase(e.target.value)} placeholder="Enter custom input here" />
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap text-gray-200">{result || 'Results will appear here after execution.'}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen w-full flex flex-col">
          <Header
            roomId={roomId!}
            youName={nameRef.current || 'Unknown'}
            role={role}
            onCopy={copyId}
            onLeave={leave}
            rightActions={
              <button onClick={() => setShowPicker((v: boolean) => !v)} className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs">Select Question</button>
            }
            center={<div className="flex items-center gap-2 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span>{participants.length} online</span></div>}
          />
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 relative">
            <div className="border-r border-[#1f2a33] overflow-auto p-5">
              {selectedQuestion ? (
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold mb-3">{selectedQuestion.title}</h2>
                  <div className="text-sm leading-6 text-gray-200 whitespace-pre-wrap">{selectedQuestion.description}</div>
                  <div className="mt-4 text-xs text-gray-300">Examples</div>
                  <pre className="mt-1 bg-[#0c141a] rounded p-3 text-xs overflow-auto border border-[#1f2a33]">Input: {selectedQuestion.sampleInput}\nOutput: {selectedQuestion.sampleOutput}</pre>
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-gray-300">Participants</h3>
                    </div>
                    <ul className="space-y-2">
                      {participants.map((p) => (
                        <li key={p.socketId} className="flex items-center justify-between text-sm bg-[#0c141a] border border-[#1f2a33] rounded px-2 py-1">
                          <span className="truncate text-gray-200">{p.displayName || 'Guest'}</span>
                          <span className="ml-2 inline-block px-2 py-0.5 rounded bg-[#1f2a33] text-gray-300">{p.role}</span>
                        </li>
                      ))}
                      {participants.length === 0 && <li className="text-sm text-gray-500">No participants</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">Use Select Question to pick a problem…</div>
              )}
            </div>
            <div className="overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-carbon-400 bg-carbon-700/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">Language</span>
                  <select className="bg-carbon-800 border border-carbon-400 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" value={language} onChange={onLanguageChange}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={runCode} disabled={running} size="sm" className="inline-flex items-center gap-1">{running ? <Terminal className="h-3 w-3 animate-pulse" /> : <Play className="h-3 w-3" />}{running ? 'Running…' : 'Run'}</Button>
                  <Button onClick={resetDoc} size="sm" variant="ghost" className="inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" />Reset</Button>
                </div>
              </div>
              <div className="flex-1">
                <Editor height="100%" language={language === 'cpp' ? 'cpp' : language} theme="vs-dark" value={code} onChange={onCodeChange} options={{ fontSize: 14, minimap: { enabled: false } }} />
              </div>
              <div className="h-1 cursor-row-resize bg-[#1f2a33]" onMouseDown={() => (dragRef.current = true)} />
              <div className="border-t border-[#1f2a33]">
                <div className="flex items-center px-2">
                  {(['Testcase', 'Result'] as const).map((t) => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 text-xs ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400'}`}>{t}</button>
                  ))}
                </div>
                <div style={{ height: consoleHeight }} className="p-2 overflow-auto">
                  {activeTab === 'Testcase' ? (
                    <textarea className="w-full h-full bg-[#0f181f] border border-[#1f2a33] rounded p-2 text-xs text-gray-200 font-mono" value={testcase} onChange={(e) => setTestcase(e.target.value)} placeholder="Enter custom input here" />
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap text-gray-200">{result || 'Results will appear here after execution.'}</pre>
                  )}
                </div>
              </div>
            </div>

            {showPicker && (
              <div className="absolute inset-0 bg-black/50 flex">
                <div className="w-full max-w-md h-full bg-[#0f181f] border-r border-[#1f2a33] p-4 overflow-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Select Question</h3>
                    <button onClick={() => setShowPicker(false)} className="text-xs text-gray-300">Close</button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <select className="bg-[#0f181f] border border-[#1f2a33] rounded px-2 py-1 text-xs w-1/2" value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
                      <option value="">All</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <input className="bg-[#0f181f] border border-[#1f2a33] rounded px-2 py-1 text-xs w-1/2" placeholder="Search" value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
                  </div>
                  <ul className="space-y-2">
                    {questions.map((q) => (
                      <li key={q.questionId} className="border border-[#1f2a33] rounded p-2 text-sm flex items-center justify-between">
                        <span className="truncate pr-2 text-gray-200">{q.title}</span>
                        <button onClick={() => { chooseQuestion(q.questionId); setShowPicker(false) }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Select</button>
                      </li>
                    ))}
                    {questions.length === 0 && <li className="text-sm text-gray-500">No questions</li>}
                  </ul>
                </div>
                <div className="flex-1" onClick={() => setShowPicker(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
