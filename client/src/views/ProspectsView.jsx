import React, { useEffect, useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import './ProspectsView.css'

export default function ProspectsView() {
  const [matches, setMatches] = useState([])
  const socket = useSocket()

  useEffect(() => {
    fetch('/api/matches/open').then(r => r.json()).then(setMatches)
  }, [])

  useEffect(() => {
    if (!socket || matches.length === 0) return
    // Join odds rooms
    matches.forEach(m => socket.emit('join_odds', m.id))
    // Update odds in real time
    const onOdds = ({ match_id, oddsA, oddsB, votes_a, votes_b }) => {
      setMatches(prev => prev.map(m => {
        if (m.id !== match_id) return m
        return {
          ...m,
          odds_a: oddsA,
          odds_b: oddsB,
          votes_a: votes_a ?? m.votes_a,
          votes_b: votes_b ?? m.votes_b,
        }
      }))
    }
    socket.on('odds_update', onOdds)
    return () => socket.off('odds_update', onOdds)
  }, [socket, matches.length])

  if (matches.length === 0) {
    return (
      <div className="prospects-idle">
        <img src="/assets/petrobowl-logo.png" alt="PetroBowl" />
        <p>No open matches for prospecting right now.</p>
      </div>
    )
  }

  return (
    <div className="prospects-view">
      <div className="prospects-view__header">
        <img src="/assets/petrobowl-logo.png" alt="PetroBowl" className="prospects-view__logo" />
        <h1>Prospects</h1>
      </div>

      <div className="prospects-cards">
        {matches.map(m => {
          const totalVotes = (m.votes_a || 0) + (m.votes_b || 0)
          const pctA = totalVotes === 0 ? 50 : Math.round((m.votes_a / totalVotes) * 100)
          const pctB = 100 - pctA
          return (
            <div key={m.id} className="prospects-card">
              <div className="prospects-card__stage">{formatStage(m.stage)}</div>

              <div className="prospects-card__teams">
                <div className="prospects-card__team">
                  <span className={`fi fi-${m.team_a_cc?.toLowerCase()}`} />
                  <span className="prospects-card__name">{m.team_a_short}</span>
                  <span className="prospects-card__odds">{m.odds_a != null ? `${m.odds_a}×` : '—'}</span>
                </div>
                <span className="prospects-card__vs">VS</span>
                <div className="prospects-card__team prospects-card__team--b">
                  <span className="prospects-card__odds">{m.odds_b != null ? `${m.odds_b}×` : '—'}</span>
                  <span className="prospects-card__name">{m.team_b_short}</span>
                  <span className={`fi fi-${m.team_b_cc?.toLowerCase()}`} />
                </div>
              </div>

              <div className="prospects-card__bar-labels">
                <span>{pctA}% ({m.votes_a || 0} votes)</span>
                <span>{pctB}% ({m.votes_b || 0} votes)</span>
              </div>
              <div className="prospects-card__bar">
                <div className="prospects-card__bar-a" style={{ width: `${pctA}%` }} />
                <div className="prospects-card__bar-b" style={{ width: `${pctB}%` }} />
              </div>

              <div className="prospects-card__total">{totalVotes} prospect{totalVotes !== 1 ? 's' : ''} placed</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatStage(s) {
  const m = { group: 'Group Stage', quarterfinal: 'Quarterfinal', semifinal: 'Semifinal', third_place: 'Third Place', final: 'Grand Final', tiebreaker: 'Tiebreaker' }
  return m[s] || s
}
