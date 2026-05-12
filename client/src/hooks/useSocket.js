import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

let _socket = null

function getSocket() {
  if (!_socket) {
    _socket = io({ autoConnect: true })
  }
  return _socket
}

/**
 * Returns the shared socket instance.
 * Optionally joins a room on mount and leaves on unmount.
 */
export function useSocket(joinEvent, leaveEvent, roomId) {
  const socket = getSocket()
  const roomRef = useRef(roomId)
  roomRef.current = roomId

  useEffect(() => {
    if (!joinEvent) return
    socket.emit(joinEvent, roomRef.current)
    return () => {
      if (leaveEvent) socket.emit(leaveEvent, roomRef.current)
    }
  }, [joinEvent, leaveEvent, roomId])

  return socket
}
