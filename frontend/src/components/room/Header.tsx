import { ReactNode } from 'react'
import { Copy, LogOut } from 'lucide-react'

type Props = {
  roomId: string
  youName: string
  role?: string | null
  onCopy: () => void
  onLeave: () => void
  center?: ReactNode
  rightActions?: ReactNode
}

export function Header({ roomId, youName, role, onCopy, onLeave, center, rightActions }: Props) {
  return (
    <div className="h-14 flex items-center justify-between px-4 glass-panel bg-carbon-900/60">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-gray-300">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-200">Room</span>
            <span className="text-gray-300 font-mono">{roomId}</span>
          </span>
          <button onClick={onCopy} className="text-xs text-emerald-300 hover:text-emerald-200 px-2 py-1 rounded border border-white/10 hover:bg-white/5 inline-flex items-center gap-1"><Copy className="h-3 w-3" />Copy</button>
        </div>
        {center ? <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">{center}</div> : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-gray-300">You: {youName || 'Unknown'}</span>
        {role ? <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-200">{role}</span> : null}
        {rightActions}
        <button onClick={onLeave} className="px-3 py-1.5 text-xs rounded border border-white/10 bg-white/5 hover:bg-white/10 text-gray-100 inline-flex items-center gap-1"><LogOut className="h-3 w-3" />Leave</button>
      </div>
    </div>
  )
}
