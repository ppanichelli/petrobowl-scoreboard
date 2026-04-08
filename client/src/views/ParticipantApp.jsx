import React, { useState, useEffect } from 'react'
import { useParticipantAuth } from '../hooks/useParticipantAuth'
import { useSocket } from '../hooks/useSocket'
import './ParticipantApp.css'

export default function ParticipantApp() {
  const { participant, refreshParticipant, logout } = useParticipantAuth()
  const socket = useSocket()

  const [tab, setTab]           = useState('home')
  const [matches, setMatches]   = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [history, setHistory]   = useState([])
  const [notification, setNotification] = useState(null)
  const [me, setMe]             = useState(participant)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('notifications', (data) => {
      if (data.type === 'new_batch') {
        setNotification('New matches are available for prospecting!')
        loadMatches()
      }
    })
    socket.on('leaderboard', () => loadLeaderboard())
    return () => {
      socket.off('notifications')
      socket.off('leaderboard')
    }
  }, [socket])

  async function loadAll() {
    loadMatches()
    loadLeaderboard()
    loadHistory()
    const r = await fetch('/api/participant/me')
    if (r.ok) setMe(await r.json())
  }

  async function loadMatches() {
    const r = await fetch('/api/participant/matches')
    if (r.ok) setMatches(await r.json())
  }

  async function loadLeaderboard() {
    const r = await fetch('/api/participant/leaderboard')
    if (r.ok) setLeaderboard(await r.json())
  }

  async function loadHistory() {
    const r = await fetch('/api/participant/prospects')
    if (r.ok) setHistory(await r.json())
  }

  async function placeProsect(matchId, teamId) {
    const r = await fetch('/api/participant/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, team_id: teamId }),
    })
    if (r.ok) loadMatches()
  }

  return (
    <div className="p-app">
      {notification && (
        <div className="p-app__notification" onClick={() => setNotification(null)}>
          {notification} ✕
        </div>
      )}

      <header className="p-app__header">
        <img src="/assets/petrobowl-logo.png" alt="PetroBowl" className="p-app__logo" />
        <div className="p-app__user">
          <span>{me?.display_name || me?.pin}</span>
          {me?.country_code && <span className={`fi fi-${me.country_code.toLowerCase()}`} />}
        </div>
      </header>

      {/* ── HOME ──────────────────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div className="p-tab">
          <div className="p-home__stats">
            <div className="p-stat">
              <div className="p-stat__value">{me?.total_points ?? 0}</div>
              <div className="p-stat__label">Points</div>
            </div>
            <div className="p-stat">
              <div className="p-stat__value">#{me?.rank ?? '—'}</div>
              <div className="p-stat__label">Rank</div>
            </div>
          </div>

          <h2>Upcoming Matches</h2>
          {matches.length === 0 && <p className="p-empty">No upcoming matches right now.</p>}
          {matches.map(m => (
            <div key={m.id} className={`p-match-card ${m.status === 'live' ? 'p-match-card--live' : ''}`}>
              <div className="p-match-card__stage">{formatStage(m.stage)}</div>
              <div className="p-match-card__teams">
                <div className="p-match-card__team">
                  <span className={`fi fi-${m.team_a_cc?.toLowerCase()}`} />
                  <span>{m.team_a_short}</span>
                  <strong className="p-match-card__odds">{m.odds_a}×</strong>
                </div>
                <span className="p-match-card__vs">VS</span>
                <div className="p-match-card__team p-match-card__team--b">
                  <strong className="p-match-card__odds">{m.odds_b}×</strong>
                  <span>{m.team_b_short}</span>
                  <span className={`fi fi-${m.team_b_cc?.toLowerCase()}`} />
                </div>
              </div>

              {m.status === 'setup' && !m.prospecting_open === false && (
                <div className="p-match-card__buttons">
                  <button
                    className={`p-prospect-btn ${m.my_prospect === m.team_a_id ? 'active' : ''}`}
                    onClick={() => placeProsect(m.id, m.team_a_id)}
                  >
                    Prospect {m.team_a_short}
                  </button>
                  <button
                    className={`p-prospect-btn ${m.my_prospect === m.team_b_id ? 'active' : ''}`}
                    onClick={() => placeProsect(m.id, m.team_b_id)}
                  >
                    Prospect {m.team_b_short}
                  </button>
                </div>
              )}
              {!m.prospecting_open && (
                <div className="p-match-card__locked">Prospects Locked</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── LEADERBOARD ───────────────────────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <div className="p-tab">
          <h2>Leaderboard</h2>
          <table className="p-leaderboard">
            <thead>
              <tr><th>#</th><th>Name</th><th>Country</th><th>Points</th></tr>
            </thead>
            <tbody>
              {leaderboard.map(row => (
                <tr key={row.pin} className={row.isMe ? 'p-leaderboard__me' : ''}>
                  <td>{row.rank}</td>
                  <td>{row.display_name || row.pin}</td>
                  <td>{row.country_code && <span className={`fi fi-${row.country_code.toLowerCase()}`} />}</td>
                  <td>{row.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="p-tab">
          <h2>My Prospects</h2>
          {history.length === 0 && <p className="p-empty">No prospects placed yet.</p>}
          {history.map(p => (
            <div key={p.id} className={`p-history-item p-history-item--${outcomeClass(p)}`}>
              <div className="p-history-item__match">{p.team_a_short} vs {p.team_b_short}</div>
              <div className="p-history-item__pick">Picked: {p.prospected_team_id}</div>
              <div className="p-history-item__result">
                {p.payout === null
                  ? 'Pending'
                  : p.payout === 0
                    ? (p.match_status === 'finished' && !p.is_draw ? 'Wrong (0 pts)' : 'Void (draw)')
                    : `+${p.payout} pts`
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <nav className="p-app__nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Home</button>
        <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => { setTab('leaderboard'); loadLeaderboard() }}>Leaderboard</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => { setTab('history'); loadHistory() }}>My Bets</button>
        <button onClick={logout}>Logout</button>
      </nav>
    </div>
  )
}

function formatStage(s) {
  const m = { group:'Group Stage', quarterfinal:'Quarterfinal', semifinal:'Semifinal', third_place:'Third Place', final:'Grand Final', tiebreaker:'Tiebreaker' }
  return m[s] || s
}

function outcomeClass(p) {
  if (p.payout === null) return 'pending'
  if (p.payout > 0) return 'win'
  if (p.is_draw) return 'void'
  return 'loss'
}
