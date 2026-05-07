import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParticipantAuth } from '../hooks/useParticipantAuth'
import { useSocket } from '../hooks/useSocket'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import './ParticipantApp.css'

const SNAP_H = 52

function PullIndicator({ pullDistance, isRefreshing }) {
  const triggered = pullDistance >= 64
  const height = isRefreshing ? SNAP_H : pullDistance
  const withTransition = !isRefreshing && pullDistance === 0
  return (
    <div
      className="ptr-indicator"
      style={{
        height,
        transition: withTransition ? 'height 0.22s ease' : 'none',
      }}
      aria-hidden="true"
    >
      <span
        className={`ptr-indicator__icon${isRefreshing ? ' ptr-indicator__icon--spin' : ''}`}
        style={{ transform: !isRefreshing && triggered ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        {isRefreshing ? '◌' : '↓'}
      </span>
    </div>
  )
}

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function ParticipantApp() {
  const { participant, logout } = useParticipantAuth()
  const navigate = useNavigate()
  const socket = useSocket()

  const [tab, setTab]           = useState('home')
  const [matches, setMatches]   = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [history, setHistory]   = useState([])
  const [notification, setNotification] = useState(null)
  const [me, setMe]             = useState(participant)
  const [pendingPicks, setPendingPicks] = useState({})
  const [savedNotif, setSavedNotif]     = useState(null)
  const [prospectError, setProspectError] = useState(null)

  const homePTR      = usePullToRefresh(loadAll)
  const rankingsPTR  = usePullToRefresh(loadLeaderboard)
  const historyPTR   = usePullToRefresh(loadHistory)

  // Scroll-to-me on leaderboard
  const meRowRef   = useRef(null)
  const lbListRef  = useRef(null)

  useEffect(() => { loadAll() }, [])

  // Auto-scroll to current user's row when leaderboard becomes visible
  useEffect(() => {
    if (tab === 'leaderboard' && meRowRef.current) {
      setTimeout(() => {
        meRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
    }
  }, [tab, leaderboard.length])

  useEffect(() => {
    if (!socket) return
    socket.on('notifications', (data) => {
      if (data.type === 'new_batch') {
        setNotification('New matches are available for prospecting!')
        loadMatches()
      }
    })
    socket.on('leaderboard', () => loadLeaderboard())
    socket.on('odds_update', ({ match_id, oddsA, oddsB }) => {
      setMatches(prev => prev.map(m =>
        m.id === match_id ? { ...m, odds_a: oddsA, odds_b: oddsB } : m
      ))
    })
    return () => {
      socket.off('notifications')
      socket.off('leaderboard')
      socket.off('odds_update')
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
    if (r.ok) {
      const data = await r.json()
      setMatches(data)
      if (socket) data.filter(m => m.status === 'setup').forEach(m => socket.emit('join_odds', m.id))
    }
  }

  async function loadLeaderboard() {
    const r = await fetch('/api/participant/leaderboard')
    if (r.ok) setLeaderboard(await r.json())
  }

  async function loadHistory() {
    const r = await fetch('/api/participant/prospects')
    if (r.ok) setHistory(await r.json())
  }

  async function saveProspect(matchId) {
    const teamId = pendingPicks[matchId]
    if (!teamId) return
    const r = await fetch('/api/participant/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, team_id: teamId }),
    })
    if (r.ok) {
      setPendingPicks(p => { const n = {...p}; delete n[matchId]; return n })
      setSavedNotif(matchId)
      setTimeout(() => setSavedNotif(null), 2500)
      loadMatches()
    } else {
      const err = await r.json().catch(() => ({}))
      const msg = r.status === 401
        ? 'You must be logged in to place a prospect.'
        : (err.error || 'Could not save — the match may have already started.')
      setProspectError({ matchId, msg })
      setTimeout(() => setProspectError(null), 3000)
    }
  }

  return (
    <div className="p-app">

      {notification && (
        <div className="p-app__notification" onClick={() => setNotification(null)}>
          {notification} <span className="p-app__notif-close">✕</span>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="p-app__header">
        <img
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
          className="p-app__header-logo"
        />
        <div className="p-app__user">
          {me?.country_code && (
            <span className={`fi fi-${me.country_code.toLowerCase()} p-app__user-flag`} />
          )}
          <span className="p-app__user-name">{me?.display_name || me?.pin}</span>
        </div>
      </header>

      {/* ── HOME ──────────────────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div className="p-tab" ref={homePTR.ref}>
          <PullIndicator pullDistance={homePTR.pullDistance} isRefreshing={homePTR.isRefreshing} />

          {/* Stats strip */}
          <div className="p-home__stats">
            <div className="p-stat">
              <div className="p-stat__value">{Number(me?.total_points ?? 0).toFixed(1)}</div>
              <div className="p-stat__label">Points</div>
            </div>
            <div className="p-stat p-stat--rank">
              <div className="p-stat__value">#{me?.rank ?? '—'}</div>
              <div className="p-stat__label">Rank</div>
            </div>
          </div>

          {/* Section heading */}
          <div className="p-section-header">
            <h2 className="p-section-title">Upcoming Matches</h2>
            <span className="p-section-subtitle">Make your prospects</span>
          </div>

          {matches.length === 0 && (
            <p className="p-empty">No upcoming matches right now.</p>
          )}

          {matches.map(m => (
            <div key={m.id} className={`p-match-card${m.status === 'live' ? ' p-match-card--live' : ''}`}>
              <div className="p-match-card__stage">
                {m.status === 'live' && <span className="p-match-card__live-dot" />}
                {formatStage(m.stage)}
              </div>

              <div className="p-match-card__teams">
                <div className="p-match-card__team">
                  <span className={`fi fi-${m.team_a_cc?.toLowerCase()}`} />
                  <span className="p-match-card__name">{m.team_a_short}</span>
                </div>
                <div className="p-match-card__center">
                  <span className="p-match-card__odds">{m.odds_a != null ? `${Number(m.odds_a).toFixed(1)}×` : '—'}</span>
                  <span className="p-match-card__vs">VS</span>
                  <span className="p-match-card__odds">{m.odds_b != null ? `${Number(m.odds_b).toFixed(1)}×` : '—'}</span>
                </div>
                <div className="p-match-card__team p-match-card__team--b">
                  <span className="p-match-card__name">{m.team_b_short}</span>
                  <span className={`fi fi-${m.team_b_cc?.toLowerCase()}`} />
                </div>
              </div>

              {m.status === 'setup' && m.prospecting_open && (
                <>
                  <div className="p-match-card__buttons">
                    <button
                      className={`p-prospect-btn${(pendingPicks[m.id] ?? m.my_prospect) === m.team_a_id ? ' p-prospect-btn--active' : ''}`}
                      onClick={() => setPendingPicks(p => ({ ...p, [m.id]: m.team_a_id }))}
                    >{m.team_a_short}</button>
                    <button
                      className={`p-prospect-btn${(pendingPicks[m.id] ?? m.my_prospect) === m.team_b_id ? ' p-prospect-btn--active' : ''}`}
                      onClick={() => setPendingPicks(p => ({ ...p, [m.id]: m.team_b_id }))}
                    >{m.team_b_short}</button>
                  </div>
                  {pendingPicks[m.id] && (
                    <button className="p-save-btn" onClick={() => saveProspect(m.id)}>
                      Save Prospect
                    </button>
                  )}
                  {prospectError?.matchId === m.id && (
                    <div className="p-feedback p-feedback--error">{prospectError.msg}</div>
                  )}
                  {savedNotif === m.id && (
                    <div className="p-feedback p-feedback--success">Prospect saved</div>
                  )}
                </>
              )}

              {!m.prospecting_open && (
                <>
                  <div className="p-match-card__buttons">
                    <button
                      className={`p-prospect-btn p-prospect-btn--locked${m.my_prospect === m.team_a_id ? ' p-prospect-btn--picked' : ''}`}
                      disabled
                    >{m.team_a_short}{m.my_prospect === m.team_a_id ? ' ✓' : ''}</button>
                    <button
                      className={`p-prospect-btn p-prospect-btn--locked${m.my_prospect === m.team_b_id ? ' p-prospect-btn--picked' : ''}`}
                      disabled
                    >{m.team_b_short}{m.my_prospect === m.team_b_id ? ' ✓' : ''}</button>
                  </div>
                  <div className="p-match-card__locked">Prospects locked</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── LEADERBOARD ───────────────────────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <div className="p-tab" ref={rankingsPTR.ref}>
          <PullIndicator pullDistance={rankingsPTR.pullDistance} isRefreshing={rankingsPTR.isRefreshing} />
          <div className="p-section-header">
            <h2 className="p-section-title">Leaderboard</h2>
            <span className="p-section-subtitle">{leaderboard.length} participants</span>
          </div>

          <ol className="p-lb__list" ref={lbListRef}>
            {leaderboard.map((row, i) => (
              <li
                key={row.pin}
                ref={row.isMe ? meRowRef : null}
                className={[
                  'p-lb__row',
                  row.rank <= 3 ? `p-lb__row--top${row.rank}` : '',
                  row.isMe    ? 'p-lb__row--me' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--row-i': i }}
              >
                <span className="p-lb__rank">
                  {RANK_MEDALS[row.rank] ?? row.rank}
                </span>
                <span className="p-lb__flag">
                  {row.country_code && (
                    <span className={`fi fi-${row.country_code.toLowerCase()}`} />
                  )}
                </span>
                <span className="p-lb__name">{row.display_name || '—'}</span>
                <span className="p-lb__pts">{Number(row.total_points).toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="p-tab" ref={historyPTR.ref}>
          <PullIndicator pullDistance={historyPTR.pullDistance} isRefreshing={historyPTR.isRefreshing} />
          <div className="p-section-header">
            <h2 className="p-section-title">My Prospects</h2>
          </div>
          {history.length === 0 && (
            <p className="p-empty">No prospects placed yet.</p>
          )}
          {history.map(p => (
            <div key={p.id} className={`p-history-item p-history-item--${outcomeClass(p)}`}>
              <div className="p-history-item__header">
                <span className="p-history-item__match">{p.team_a_short} vs {p.team_b_short}</span>
                <span className="p-history-item__stage">{formatStage(p.stage)}</span>
              </div>
              <div className="p-history-item__footer">
                <span className="p-history-item__pick">Picked: {p.prospected_team_id}</span>
                <span className="p-history-item__result">
                  {p.payout === null
                    ? 'Pending'
                    : p.payout === 0
                      ? (p.match_status === 'finished' && !p.is_draw ? '✗ Wrong' : '— Draw')
                      : `+${Number(p.payout).toFixed(1)} pts`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <nav className="p-app__nav">
        <button
          className={`p-nav-btn${tab === 'home' ? ' p-nav-btn--active' : ''}`}
          onClick={() => setTab('home')}
        >
          <span className="p-nav-btn__icon">⬡</span>
          <span className="p-nav-btn__label">Home</span>
        </button>
        <button
          className={`p-nav-btn${tab === 'leaderboard' ? ' p-nav-btn--active' : ''}`}
          onClick={() => { setTab('leaderboard'); loadLeaderboard() }}
        >
          <span className="p-nav-btn__icon">◈</span>
          <span className="p-nav-btn__label">Rankings</span>
        </button>
        <button
          className={`p-nav-btn${tab === 'history' ? ' p-nav-btn--active' : ''}`}
          onClick={() => { setTab('history'); loadHistory() }}
        >
          <span className="p-nav-btn__icon">◎</span>
          <span className="p-nav-btn__label">My Prospects</span>
        </button>
        <button className="p-nav-btn p-nav-btn--logout" onClick={() => logout().then(() => navigate('/'))}>
          <span className="p-nav-btn__icon">⏻</span>
          <span className="p-nav-btn__label">Exit</span>
        </button>
      </nav>

    </div>
  )
}

function formatStage(s) {
  const m = {
    group: 'Group Stage', quarterfinal: 'Quarterfinal', semifinal: 'Semifinal',
    third_place: 'Third Place', final: 'Grand Final', tiebreaker: 'Tiebreaker',
  }
  return m[s] || s
}

function outcomeClass(p) {
  if (p.payout === null) return 'pending'
  if (p.payout > 0)     return 'win'
  if (p.is_draw)        return 'void'
  return 'loss'
}
