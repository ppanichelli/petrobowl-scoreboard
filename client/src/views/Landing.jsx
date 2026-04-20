import React, { useEffect, useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import './Landing.css'

export default function Landing() {
  const [nextMatch, setNextMatch] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const socket = useSocket()

  useEffect(() => {
    fetch('/api/matches/next', { cache: 'no-store' })
      .then(r => r.json())
      .then(m => { setNextMatch(m); setLoaded(true) })
  }, [])

  useEffect(() => {
    if (!socket) return
    // Clear next match line once it goes live
    const onStarted = () => setNextMatch(null)
    // Refetch if a new match is set up
    const onReconnect = () => {
      fetch('/api/matches/next', { cache: 'no-store' }).then(r => r.json()).then(setNextMatch)
    }
    socket.on('match_started', onStarted)
    socket.on('connect', onReconnect)
    return () => {
      socket.off('match_started', onStarted)
      socket.off('connect', onReconnect)
    }
  }, [socket])

  return (
    <div className="landing">
      <div className="landing__center">
        <div className="landing__center__logos">
        <img
          className="landing__championship-logo"
          src="/assets/images/PETROBOWL CHAMPIONSHIP.png"
          alt="PetroBowl 2026"
        />
        <img
          className="landing__pb-logo"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
        <img
          className="landing__buenos-aires"
          src="/assets/images/BUENOS AIRES.png"
          alt="PetroBowl 2026"
        />
        </div>

        {loaded && nextMatch && (
          <div className="landing__next">
            <span className="landing__next-label">Next Match</span>
            <span className="landing__next-matchup">
              {nextMatch.team_a_short}
              <span className="landing__next-vs">vs</span>
              {nextMatch.team_b_short}
            </span>
          </div>
        )}
      </div>

      <div className="landing__sponsors">
        <img
          src="/assets/images/LACSS Logo.png"
          alt="LACSS"
          className="landing__sponsor-logo"
        />
        <img
          src="/assets/images/ypf-logo-white.png"
          alt="YPF"
          className="landing__sponsor-logo"
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>
    </div>
  )
}
