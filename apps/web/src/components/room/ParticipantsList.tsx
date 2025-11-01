type Participant = { socketId: string; displayName: string; role: 'Interviewer' | 'Candidate' }

type Props = {
  participants: Participant[]
}

export function ParticipantsList({ participants }: Props) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Participants</h3>
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
  )
}
