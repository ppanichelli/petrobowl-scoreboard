import React, { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../hooks/useSocket'
import './BracketAdmin.css'

const SEED_SLOTS = [
  { key: 'seed_1a', label: 'Seed 1A', pair: '(vs 2C → QF1)' },
  { key: 'seed_2c', label: 'Seed 2C', pair: '(vs 1A → QF1)' },
  { key: 'seed_1b', label: 'Seed 1B', pair: '(vs 2D → QF2)' },
  { key: 'seed_2d', label: 'Seed 2D', pair: '(vs 1B → QF2)' },
  { key: 'seed_1c', label: 'Seed 1C', pair: '(vs 2A → QF3)' },
  { key: 'seed_2a', label: 'Seed 2A', pair: '(vs 1C → QF3)' },
  { key: 'seed_1d', label: 'Seed 1D', pair: '(vs 2B → QF4)' },
  { key: 'seed_2b', label: 'Seed 2B', pair: '(vs 1D → QF4)' },
]

const SLOT_INFO = {
  QF1:  { label: 'QF 1',        stage: 'Quarter Final'   },
  QF2:  { label: 'QF 2',        stage: 'Quarter Final'   },
  QF3:  { label: 'QF 3',        stage: 'Quarter Final'   },
  QF4:  { label: 'QF 4',        stage: 'Quarter Final'   },
  WBS1: { label: 'WB Semi 1',   stage: 'Semi Final'      },
  WBS2: { label: 'WB Semi 2',   stage: 'Semi Final'      },
  LBS1: { label: 'LB Semi 1',   stage: 'Loser Bracket'   },
  LBS2: { label: 'LB Semi 2',   stage: 'Loser Bracket'   },
  GF:   { label: 'Grand Final', stage: 'Final'           },
  '3P': { label: '3rd Place',   stage: '3rd / 4th Place' },
  LBF:  { label: '5th Place',   stage: '5th / 6th Place' },
}

export default function BracketAdmin() {
  const [teams, setTeams]       = useState([])
  const [bracket, setBracket]   = useState({ slots: {}, matches: [] })
  const [error, setError]       = useState(null)
  const [busy, setBusy]         = useState(false)
  const socket = useSocket('join_bracket', 'leave_bracket')

  const load = useCallback(() => {
    fetch('/api/bracket').then(r => r.json()).then(setBracket).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/teams').then(r => r.json()).then(setTeams).catch(() => {})
    load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    const handler = state => setBracket(state)
    socket.on('bracket:updated', handler)
    return () => socket.off('bracket:updated', handler)
  }, [socket])

  const assignedTeamIds = Object.values(bracket.slots)
    .filter(Boolean)
    .map(s => s.team_id)

  const allSlotsAssigned = SEED_SLOTS.every(s => bracket.slots[s.key]?.team_id)
  const matchBySlot = {}
  for (const m of bracket.matches || []) matchBySlot[m.bracket_slot] = m

  const qfsExist = !!matchBySlot['QF1']

  async function assign(slot, teamId) {
    setError(null)
    if (!teamId) {
      await fetch(`/api/admin/bracket/assign/${slot}`, { method: 'DELETE' })
    } else {
      await fetch('/api/admin/bracket/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, team_id: teamId }),
      })
    }
  }

  async function generate() {
    setBusy(true)
    setError(null)
    const r = await fetch('/api/admin/bracket/generate', { method: 'POST' })
    const data = await r.json()
    if (!r.ok) setError(data.error || 'Failed to generate')
    setBusy(false)
  }

  async function reset() {
    if (!window.confirm('Reset bracket? This will clear all seed assignments and delete setup-only bracket matches.')) return
    setBusy(true)
    setError(null)
    const r = await fetch('/api/admin/bracket/reset', { method: 'DELETE' })
    const data = await r.json()
    if (!r.ok) setError(data.error || 'Failed to reset')
    setBusy(false)
  }

  return (
    <div className="ba">
      <div className="ba-header">
        <h2 className="ba-title">Tournament Bracket</h2>
        <button className="btn-secondary btn-sm" onClick={reset} disabled={busy}>Reset Bracket</button>
      </div>

      {error && <div className="ba-error">{error}</div>}

      {/* ── Section 1: Seed Assignment ───────────────────────────────────── */}
      <section className="ba-section">
        <div className="ba-section__head">
          <h3 className="ba-section__title">Step 1 — Assign Seeds</h3>
          <button
            className="btn-primary"
            onClick={generate}
            disabled={busy || !allSlotsAssigned || qfsExist}
            title={qfsExist ? 'Quarter-finals already generated' : !allSlotsAssigned ? 'Assign all 8 seeds first' : ''}
          >
            {qfsExist ? 'Quarter-Finals Generated ✓' : 'Generate Quarter-Finals'}
          </button>
        </div>

        <div className="ba-seeds">
          {[0, 1, 2, 3].map(i => {
            const slotA = SEED_SLOTS[i * 2]
            const slotB = SEED_SLOTS[i * 2 + 1]
            return (
              <div key={i} className="ba-qf-pair">
                <div className="ba-qf-label">QF {i + 1}</div>
                <SeedSelect
                  slot={slotA}
                  value={bracket.slots[slotA.key]?.team_id || ''}
                  teams={teams}
                  assignedIds={assignedTeamIds}
                  disabled={qfsExist}
                  onChange={teamId => assign(slotA.key, teamId)}
                />
                <span className="ba-vs">vs</span>
                <SeedSelect
                  slot={slotB}
                  value={bracket.slots[slotB.key]?.team_id || ''}
                  teams={teams}
                  assignedIds={assignedTeamIds}
                  disabled={qfsExist}
                  onChange={teamId => assign(slotB.key, teamId)}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Section 2: Bracket Status ────────────────────────────────────── */}
      <section className="ba-section">
        <h3 className="ba-section__title">Step 2 — Bracket Progress</h3>

        <div className="ba-progress">
          <div className="ba-progress__group">
            <div className="ba-progress__group-label">WINNER BRACKET</div>
            {['QF1','QF2','QF3','QF4','WBS1','WBS2','GF','3P'].map(slot => (
              <MatchRow key={slot} slot={slot} match={matchBySlot[slot]} />
            ))}
          </div>
          <div className="ba-progress__group">
            <div className="ba-progress__group-label">LOSER BRACKET</div>
            {['LBS1','LBS2','LBF'].map(slot => (
              <MatchRow key={slot} slot={slot} match={matchBySlot[slot]} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function SeedSelect({ slot, value, teams, assignedIds, disabled, onChange }) {
  return (
    <div className="ba-seed">
      <div className="ba-seed__label">
        <strong>{slot.label}</strong>
        <span className="ba-seed__pair">{slot.pair}</span>
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="ba-seed__select"
      >
        <option value="">— unassigned —</option>
        {teams.map(t => (
          <option
            key={t.id}
            value={t.id}
            disabled={assignedIds.includes(t.id) && t.id !== value}
          >
            {t.short_name} — {t.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}

function MatchRow({ slot, match }) {
  const info = SLOT_INFO[slot] || { label: slot, stage: '' }

  if (!match) {
    return (
      <div className="ba-mrow ba-mrow--pending">
        <span className="ba-mrow__slot">{info.label}</span>
        <span className="ba-mrow__stage">{info.stage}</span>
        <span className="ba-mrow__teams">—</span>
        <span className="badge badge--setup">not created</span>
      </div>
    )
  }

  const scoreStr = match.status !== 'setup'
    ? `${match.score_a} – ${match.score_b}`
    : ''

  return (
    <div className={`ba-mrow ba-mrow--${match.status}`}>
      <span className="ba-mrow__slot">{info.label}</span>
      <span className="ba-mrow__stage">{info.stage}</span>
      <span className="ba-mrow__teams">
        {match.team_a_short} <span className="ba-mrow__score">{scoreStr}</span> {match.team_b_short}
      </span>
      <span className={`badge badge--${match.status}`}>{match.status}</span>
      {match.winner_id && (
        <span className="ba-mrow__winner">
          ✓ {match.winner_id === match.team_a_id ? match.team_a_short : match.team_b_short}
        </span>
      )}
    </div>
  )
}
