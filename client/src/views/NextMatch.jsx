import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import NextMatchBanner from '../components/NextMatchBanner'

export default function NextMatch() {
  const [match, setMatch] = useState(null)
  const socket = useSocket()
  const navigate = useNavigate()

  // Fetch current match data (includes live vote counts from the server)
  function syncMatch() {
    fetch('/api/matches/next', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data) setMatch(data) })
  }

  // Initial load + re-fetch on reconnect
  useEffect(() => {
    syncMatch()

    if (!socket) return
    const onConnect = () => syncMatch()
    socket.on('connect', onConnect)
    return () => socket.off('connect', onConnect)
  }, [socket]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate away when the match goes live
  useEffect(() => {
    if (!socket) return
    const onStarted = () => navigate('/')
    socket.on('match_started', onStarted)
    return () => socket.off('match_started', onStarted)
  }, [socket, navigate])

  // Join odds room and register live-update listener once match ID is known.
  // Mirrors the pattern used in ProspectsView so the server's join_odds snapshot
  // is always received after the listener is in place.
  useEffect(() => {
    if (!socket || !match?.id) return

    socket.emit('join_match', match.id)
    socket.emit('join_odds', match.id)

    const onOdds = ({ match_id, oddsA, oddsB, votes_a, votes_b }) => {
      setMatch(prev => {
        if (!prev || prev.id !== match_id) return prev
        return { ...prev, odds_a: oddsA, odds_b: oddsB, votes_a, votes_b }
      })
    }
    socket.on('odds_update', onOdds)
    return () => socket.off('odds_update', onOdds)
  }, [socket, match?.id])

  if (!match) {
    return <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>No upcoming match.</div>
  }
  return <NextMatchBanner match={match} />
}
