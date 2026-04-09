import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import NextMatchBanner from '../components/NextMatchBanner'

export default function NextMatch() {
  const [match, setMatch] = useState(null)
  const socket = useSocket()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/matches/next').then(r => r.json()).then(setMatch)
  }, [])

  useEffect(() => {
    if (!socket || !match) return
    socket.emit('join_match', match.id)
    const onStarted = () => navigate('/')
    socket.on('match_started', onStarted)
    return () => socket.off('match_started', onStarted)
  }, [socket, match?.id, navigate])

  if (!match) return <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>No upcoming match.</div>
  return <NextMatchBanner match={match} />
}
