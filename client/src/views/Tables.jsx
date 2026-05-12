import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicPageShell from '../components/PublicPageShell'
import './AllMatches.css'
import './Tables.css'

export default function Tables() {
  const [groups, setGroups]           = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [autoRotate, setAutoRotate]   = useState(false)
  const intervalRef                   = useRef(null)

  useEffect(() => {
    fetch('/api/tables').then(r => r.json()).then(data => {
      setGroups(data)
      if (data.length > 0) setActiveGroup(data[0].group)
    })
  }, [])

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (!autoRotate || groups.length === 0) return
    intervalRef.current = setInterval(() => {
      setActiveGroup(prev => {
        const idx = groups.findIndex(g => g.group === prev)
        return groups[(idx + 1) % groups.length].group
      })
    }, 10000)
    return () => clearInterval(intervalRef.current)
  }, [autoRotate, groups])

  const current = groups.find(g => g.group === activeGroup)

  return (
    <PublicPageShell>
      <div className="all-matches">

        {/* Header: title + group pills + auto toggle + logo */}
        <div className="all-matches__header">
          <h1 className="all-matches__title">
            {activeGroup ? `Group ${activeGroup}` : 'Group Stage'}
          </h1>
          <div className="all-matches__filters">
            {groups.map(g => (
              <button
                key={g.group}
                className={`am-filter${activeGroup === g.group ? ' am-filter--active' : ''}`}
                onClick={() => setActiveGroup(g.group)}
              >
                Group {g.group}
              </button>
            ))}
            <button
              className={`am-filter gt-auto-toggle${autoRotate ? ' am-filter--active gt-auto-toggle--on' : ''}`}
              onClick={() => setAutoRotate(a => !a)}
              title="Auto-rotate groups every 10 s"
            >
              {autoRotate ? 'Autoplay ●' : 'Autoplay'}
            </button>
          </div>
          <img
            className="am-header__logo"
            src="/assets/images/PETROBOWL 2026 LOGO.png"
            alt="PetroBowl 2026"
          />
        </div>

        {groups.length === 0 && (
          <p className="all-matches__empty">No group stage data yet.</p>
        )}

        {current && (
          <>
            {/* ── Standings table ─────────────────────────────────────────── */}
            <section className="all-matches__section">
              <table className="gt-table">
                <thead>
                  <tr>
                    <th className="gt-th gt-th--pos gt-col--hide-mobile">#</th>
                    <th className="gt-th gt-th--team">Team</th>
                    <th className="gt-th gt-th--num" title="Matches Played">MP</th>
                    <th className="gt-th gt-th--num" title="Points">Pts</th>
                    <th className="gt-th gt-th--num" title="Points scored">+</th>
                    <th className="gt-th gt-th--num" title="Points against">−</th>
                    <th className="gt-th gt-th--num" title="Net points">+/−</th>
                  </tr>
                </thead>
                <tbody>
                  {current.standings.map((row, i) => (
                    <tr key={row.team_id} className={`gt-row${i === 0 ? ' gt-row--leader' : ''}`}>
                      <td className="gt-td gt-td--pos gt-col--hide-mobile">{i + 1}</td>
                      <td className="gt-td gt-td--team">
                        <img src={row.logo_small_url} alt={row.short_name} className="gt-logo"
                          onError={e => { e.target.style.display = 'none' }} />
                        <span className="gt-name">{row.short_name}</span>
                      </td>
                      <td className="gt-td gt-td--num">{row.mp}</td>
                      <td className="gt-td gt-td--num gt-td--pts">{row.pts}</td>
                      <td className="gt-td gt-td--num">{row.plus}</td>
                      <td className="gt-td gt-td--num">{row.minus}</td>
                      <td className="gt-td gt-td--num gt-td--net">
                        {row.net > 0 ? `+${row.net}` : row.net}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ── Match cards ─────────────────────────────────────────────── */}
            {current.matches.length > 0 && (
              <section className="all-matches__section">
                <h2 className="all-matches__heading">Matches</h2>
                <div className="all-matches__grid">
                  {current.matches.map((m, i) => (
                    <GroupMatchCard key={m.id} m={m} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </PublicPageShell>
  )
}

function TeamLogo({ src, alt }) {
  if (!src) return null
  return (
    <img className="am-card__logo" src={src} alt={alt}
      onError={e => { e.target.style.display = 'none' }} />
  )
}

function GroupMatchCard({ m, index }) {
  const isFinished = m.status === 'finished'
  const isLive     = m.status === 'live'
  const isDraw     = m.is_draw
  const winnerA    = isFinished && !isDraw && m.winner_id === m.team_a_id
  const winnerB    = isFinished && !isDraw && m.winner_id === m.team_b_id

  const card = (
    <div
      className={`am-card${isFinished ? ' am-card--finished' : isLive ? ' am-card--live' : ''}`}
      style={{ '--card-i': index }}
    >
      <div className="am-card__stage">
        {isLive && <span className="am-card__live-dot" />}
        Group Stage
      </div>

      <div className="am-card__row">
        <div className={`am-card__team${winnerA ? ' am-card__team--winner' : winnerB ? ' am-card__team--loser' : ''}`}>
          <TeamLogo src={m.team_a_logo_small} alt={m.team_a_short} />
          <span className="am-card__name">{m.team_a_short}</span>
          <span className={`am-card__flag fi fi-${m.team_a_cc?.toLowerCase()}`} />
        </div>

        <div className="am-card__center">
          {isFinished || isLive ? (
            <>
              <span className={`am-card__score${winnerA ? ' am-card__score--winner' : winnerB ? ' am-card__score--loser' : ''}`}>
                {m.score_a}
              </span>
              <span className="am-card__vs">{isDraw ? 'DRAW' : '–'}</span>
              <span className={`am-card__score${winnerB ? ' am-card__score--winner' : winnerA ? ' am-card__score--loser' : ''}`}>
                {m.score_b}
              </span>
            </>
          ) : (
            <span className="am-card__vs">VS</span>
          )}
        </div>

        <div className={`am-card__team am-card__team--b${winnerB ? ' am-card__team--winner' : winnerA ? ' am-card__team--loser' : ''}`}>
          <span className={`am-card__flag fi fi-${m.team_b_cc?.toLowerCase()}`} />
          <span className="am-card__name">{m.team_b_short}</span>
          <TeamLogo src={m.team_b_logo_small} alt={m.team_b_short} />
        </div>
      </div>
    </div>
  )
  return isFinished
    ? <Link to={`/match/${m.id}`} className="am-card-link">{card}</Link>
    : card
}
