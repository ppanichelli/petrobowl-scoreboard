import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useSocket } from '../hooks/useSocket'
import './AdminConsole.css'
import './DrawAdmin.css'

function computeGroups(totalTeams) {
  const G = totalTeams < 20 ? 4 : 5
  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, G)
  const base = Math.floor(totalTeams / G)
  const extra = totalTeams % G
  return letters.map((letter, i) => ({ letter, size: i < extra ? base + 1 : base }))
}

export default function DrawAdmin() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const socket   = useSocket()

  const [totalTeams,  setTotalTeams]  = useState(20)
  const [assignments, setAssignments] = useState({})
  const [teams,       setTeams]       = useState([])
  const [message,     setMessage]     = useState('')
  const [busy,        setBusy]        = useState(false)

  useEffect(() => {
    fetch('/api/draw').then(r => r.json()).then(data => {
      setTotalTeams(data.total_teams)
      setAssignments(data.assignments)
    })
    fetch('/api/admin/teams').then(r => r.json()).then(setTeams)
  }, [])

  useEffect(() => {
    if (!socket) return
    function onDrawUpdated(data) {
      setTotalTeams(data.total_teams)
      setAssignments(data.assignments)
    }
    socket.on('draw:updated', onDrawUpdated)
    return () => socket.off('draw:updated', onDrawUpdated)
  }, [socket])

  function toast(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  async function handleTotalTeamsChange(e) {
    const val = parseInt(e.target.value, 10)
    if (!val) return
    const assigned = Object.keys(assignments).length
    if (assigned > 0 && !window.confirm(`Changing team count will clear all ${assigned} current assignments. Continue?`)) return
    const r = await fetch('/api/admin/draw/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_teams: val }),
    })
    if (r.ok) toast('Team count updated — draw reset')
    else toast('Error updating team count')
  }

  async function handleAssign(slot, teamId) {
    if (!teamId) {
      await fetch(`/api/admin/draw/assign/${slot}`, { method: 'DELETE' })
    } else {
      await fetch('/api/admin/draw/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, team_id: teamId }),
      })
    }
  }

  async function handleGenerate(force = false) {
    setBusy(true)
    const r = await fetch('/api/admin/draw/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })
    const data = await r.json()
    setBusy(false)
    if (r.status === 409) {
      if (window.confirm(`${data.match_count} group stage matches already exist. Clear all and regenerate?`))
        handleGenerate(true)
      return
    }
    if (!r.ok) { toast(data.error || 'Failed to generate'); return }
    toast(`${data.match_count} group stage matches generated!`)
  }

  async function handleReset() {
    const assigned = Object.keys(assignments).length
    if (assigned === 0) return
    if (!window.confirm(`Clear all ${assigned} assignments?`)) return
    const r = await fetch('/api/admin/draw/reset', { method: 'POST' })
    if (r.ok) toast('Draw cleared')
  }

  const groups = computeGroups(totalTeams)
  const assignedTeamIds = new Set(Object.values(assignments).filter(Boolean))
  const allFilled = groups.every(({ letter, size }) =>
    Array.from({ length: size }, (_, i) => `${letter}${i + 1}`).every(slot => !!assignments[slot])
  )

  return (
    <div className="draw-admin">
      <header className="admin-console__header">
        <h4>PETROBOWL ADMIN</h4>
        <nav>
          <button onClick={() => navigate('/timekeeper')}>Console</button>
          <button className="active">Draw</button>
          <button onClick={() => navigate('/timekeeper/bracket')}>Brackets</button>
        </nav>
        <div className="draw-admin__controls">
          <label className="draw-admin__label">
            Total teams
            <select
              className="draw-admin__select"
              value={totalTeams}
              onChange={handleTotalTeamsChange}
            >
              {Array.from({ length: 25 }, (_, i) => i + 4).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="draw-admin__btn-generate"
            onClick={() => handleGenerate()}
            disabled={!allFilled || busy}
          >
            {busy ? 'Generating…' : 'Generate Games'}
          </button>
          <button className="draw-admin__btn-reset" onClick={handleReset}>
            Reset Draw
          </button>
        </div>
        <button className="admin-console__logout" onClick={() => logout().then(() => navigate('/'))}>Logout</button>
      </header>

      {message && <div className="draw-admin__toast">{message}</div>}

      <div className="draw-admin__grid" style={{ '--group-count': groups.length }}>
        {groups.map(({ letter, size }) => (
          <div key={letter} className="draw-admin__group">
            <div className="draw-admin__group-header">
              Group {letter} <span className="draw-admin__group-count">({size} teams)</span>
            </div>
            <div className="draw-admin__group-body">
              {Array.from({ length: size }, (_, i) => {
                const slot = `${letter}${i + 1}`
                const teamId = assignments[slot] || ''
                const team = teams.find(t => t.id === teamId)
                return (
                  <div key={slot} className="draw-admin__slot">
                    <span className="draw-admin__slot-num">{i + 1}</span>
                    {team && (
                      <img
                        src={team.logo_small_url}
                        alt={team.short_name}
                        className="draw-admin__slot-logo"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )}
                    {team && <span className={`draw-admin__slot-flag fi fi-${team.country_code?.toLowerCase()}`} />}
                    <select
                      className="draw-admin__slot-select"
                      value={teamId}
                      onChange={e => handleAssign(slot, e.target.value)}
                    >
                      <option value="">— select team —</option>
                      {teams.map(t => (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={assignedTeamIds.has(t.id) && t.id !== teamId}
                        >
                          {t.short_name} ({t.country})
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
