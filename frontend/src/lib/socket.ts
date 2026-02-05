import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    const url = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:3000'
    socket = io(url, { autoConnect: false, transports: ['websocket', 'polling'] })
  }
  return socket
}
