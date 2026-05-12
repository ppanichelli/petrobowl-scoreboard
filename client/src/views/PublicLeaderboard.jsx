import React, { useEffect, useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import PublicPageShell from '../components/PublicPageShell'
import './PublicLeaderboard.css'

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function PublicLeaderboard() {
  const [rows, setRows] = useState([])
  const socket = useSocket()

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(r => setRows(r))
  }, [])

  useEffect(() => {
    if (!socket) return
    const onUpdate = () =>
      fetch('/api/leaderboard').then(r => r.json()).then(r => setRows(r))
    socket.on('leaderboard', onUpdate)
    return () => socket.off('leaderboard', onUpdate)
  }, [socket])

  return (
    <PublicPageShell>
    <div className="pub-lb">
      <div className="pub-lb__header">
        <h2 className="pub-lb__title">TOP PROSPECTORS</h2>
        <img
          className="pub-lb__header-logo"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
      </div>

      {rows.length === 0 ? (
        <p className="pub-lb__empty">No participants on the board yet.</p>
      ) : (
        <div className="pub-lb__list-wrapper">
          <img
            className="pub-lb__mascot"
            src="/assets/images/prospector.png"
            alt="Prospector mascot"
          />
          <ol className="pub-lb__list">
          {rows.map(r => (
            <li
              key={r.pin}
              className={`pub-lb__row${r.rank <= 3 ? ` pub-lb__row--top${r.rank}` : ''}`}
              style={{ '--row-i': r.rank - 1 }}
            >
              <span className="pub-lb__rank">
                {RANK_MEDALS[r.rank] ?? r.rank}
              </span>
              <span className="pub-lb__flag">
                {r.country_code && (
                  <span className={`fi fi-${r.country_code.toLowerCase()}`} />
                )}
              </span>
              <span className="pub-lb__name">{r.display_name || '—'}</span>
              <span className="pub-lb__pts">{Number(r.total_points).toFixed(1)}</span>
            </li>
          ))}
          </ol>
        </div>
      )}
    </div>
    </PublicPageShell>
  )
}
