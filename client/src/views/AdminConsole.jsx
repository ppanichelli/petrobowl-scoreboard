import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useSocket } from '../hooks/useSocket'
import './AdminConsole.css'

const STAGES = ['group','quarterfinal','semifinal','third_place','final','tiebreaker']

export default function AdminConsole() {
  const { logout } = useAdminAuth()
  const socket = useSocket()

  const [tab, setTab]           = useState('matches')   // 'matches' | 'live' | 'settings'
  const [matches, setMatches]   = useState([])
  const [teams, setTeams]       = useState([])
  const [liveMatch, setLiveMatch] = useState(null)
  const [liveActions, setLiveActions] = useState([])
  const [message, setMessage]   = useState('')

  // Batch form state
  const [batchRows, setBatchRows] = useState([
    { team_a_id: '', team_b_id: '', stage: 'group', total_questions: 15 }
  ])

  // DB reset state
  const [resetInput, setResetInput] = useState('')

  useEffect(() => {
    loadMatches()
    fetch('/api/matches/live').then(r => r.json()).then(data => {
      if (data) { setLiveMatch(data.match); setLiveActions(data.actions); setTab('live') }
    })
    fetch('/api/admin/matches').then(r => r.json()).then(() => {})
    // Load teams for dropdowns
    fetch('/api/matches/history').then(() => {})
    // Fetch teams from DB directly via a simple public endpoint trick
    fetchTeams()
  }, [])

  async function fetchTeams() {
    // We don't have a dedicated /api/teams endpoint yet — derive from existing matches
    // Fall back: hard-code the 3 seeded teams for now, or we add a quick endpoint
    const r = await fetch('/api/admin/teams').catch(() => null)
    if (r && r.ok) setTeams(await r.json())
  }

  async function loadMatches() {
    const r = await fetch('/api/admin/matches')
    if (r.ok) {
      const data = await r.json()
      setMatches(data)
      if (socket) data.filter(m => m.status === 'setup').forEach(m => socket.emit('join_odds', m.id))
    }
  }

  const notify = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  // ── Socket: live updates ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !liveMatch) return
    socket.emit('join_match', liveMatch.id)
    const onScore = ({ match: m, actions: a }) => { setLiveMatch(m); setLiveActions(a) }
    const onFinished = (m) => { setLiveMatch(m); loadMatches() }
    socket.on('score_update', onScore)
    socket.on('match_finished', onFinished)
    return () => { socket.off('score_update', onScore); socket.off('match_finished', onFinished) }
  }, [socket, liveMatch?.id])

  // ── Socket: odds updates for matches table ────────────────────────────────
  useEffect(() => {
    if (!socket) return
    // Re-join odds rooms now that socket is ready
    matches.filter(m => m.status === 'setup').forEach(m => socket.emit('join_odds', m.id))
    const onOdds = ({ match_id, oddsA, oddsB, votes_a, votes_b }) => {
      setMatches(prev => prev.map(m =>
        m.id === match_id ? { ...m, odds_a: oddsA, odds_b: oddsB, votes_a: votes_a ?? m.votes_a, votes_b: votes_b ?? m.votes_b } : m
      ))
    }
    socket.on('odds_update', onOdds)
    return () => socket.off('odds_update', onOdds)
  }, [socket, matches.length])

  // ── Batch submit ──────────────────────────────────────────────────────────
  async function submitBatch() {
    const r = await fetch('/api/admin/matches/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: batchRows }),
    })
    if (r.ok) { notify('Batch loaded!'); loadMatches() }
    else { const e = await r.json(); notify('Error: ' + e.error) }
  }

  // ── Delete match ──────────────────────────────────────────────────────────
  async function deleteMatch(id) {
    if (!confirm('Delete this match and all its prospects?')) return
    const r = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE' })
    if (r.ok) { notify('Match deleted'); loadMatches() }
    else { const e = await r.json(); notify('Error: ' + e.error) }
  }

  // ── Start match ───────────────────────────────────────────────────────────
  async function startMatch(id) {
    const r = await fetch(`/api/admin/matches/${id}/start`, { method: 'POST' })
    if (r.ok) {
      const m = await r.json()
      setLiveMatch(m)
      setLiveActions([])
      setTab('live')
      loadMatches()
      notify('Match started!')
    } else { const e = await r.json(); notify('Error: ' + e.error) }
  }

  // ── Scoring actions ───────────────────────────────────────────────────────
  async function doAction(action_type) {
    const r = await fetch(`/api/admin/matches/${liveMatch.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type }),
    })
    if (r.ok) { const d = await r.json(); setLiveMatch(d.match); setLiveActions(d.actions) }
    else { const e = await r.json(); notify('Error: ' + e.error) }
  }

  async function doUndo() {
    const r = await fetch(`/api/admin/matches/${liveMatch.id}/undo`, { method: 'POST' })
    if (r.ok) { const d = await r.json(); setLiveMatch(d.match); setLiveActions(d.actions) }
  }

  async function doReset() {
    if (!confirm('Reset scores to 0-0?')) return
    const r = await fetch(`/api/admin/matches/${liveMatch.id}/reset`, { method: 'POST' })
    if (r.ok) { const d = await r.json(); setLiveMatch(d.match); setLiveActions(d.actions) }
  }

  async function doFinish() {
    if (!confirm('End this match?')) return
    const r = await fetch(`/api/admin/matches/${liveMatch.id}/finish`, { method: 'POST' })
    if (r.ok) {
      const m = await r.json()
      setLiveMatch(m)
      notify(m.is_draw ? 'Match ended in a draw' : `Winner: ${m.winner_id}`)
      loadMatches()
    }
  }

  async function doTiebreaker() {
    const r = await fetch(`/api/admin/matches/${liveMatch.id}/tiebreaker`, { method: 'POST' })
    if (r.ok) { const m = await r.json(); await startMatch(m.id) }
    else { const e = await r.json(); notify('Error: ' + e.error) }
  }

  async function doDbReset() {
    if (resetInput !== 'RESET') return notify('Type RESET to confirm')
    if (!confirm('This will delete ALL matches, prospects, and participants. Are you sure?')) return
    const r = await fetch('/api/admin/database/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESET' }),
    })
    if (r.ok) { notify('Database reset complete'); setResetInput(''); loadMatches() }
  }

  return (
    <div className="admin-console">
      <header className="admin-console__header">
        <h4>PETROBOWL ADMIN</h4>
        <nav>
          <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>Matches</button>
          <button className={tab === 'live'    ? 'active' : ''} onClick={() => setTab('live')}>Live Scoring</button>
          <button className={tab === 'settings'? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
        </nav>
        <button className="admin-console__logout" onClick={logout}>Logout</button>
      </header>

      {message && <div className="admin-console__toast">{message}</div>}

      {/* ── MATCHES TAB ──────────────────────────────────────────────────── */}
      {tab === 'matches' && (
        <div className="admin-tab">
          <h2>Load Match Batch</h2>
          <div className="batch-form">
            {batchRows.map((row, i) => (
              <div key={i} className="batch-row">
                <select value={row.team_a_id} onChange={e => updateRow(i,'team_a_id',e.target.value)}>
                  <option value="">Team A…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.short_name}</option>)}
                </select>
                <span>vs</span>
                <select value={row.team_b_id} onChange={e => updateRow(i,'team_b_id',e.target.value)}>
                  <option value="">Team B…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.short_name}</option>)}
                </select>
                <select value={row.stage} onChange={e => updateRow(i,'stage',e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="number" min="1" max="30" value={row.total_questions}
                  onChange={e => updateRow(i,'total_questions',parseInt(e.target.value))} />
                <button onClick={() => removeRow(i)}>✕</button>
              </div>
            ))}
            <button className="btn-secondary" onClick={addRow}>+ Add Match</button>
            <button className="btn-primary" onClick={submitBatch}>Save Batch</button>
          </div>

          <h2>All Matches</h2>
          <table className="matches-table">
            <thead>
              <tr><th>Stage</th><th>Teams</th><th>Status</th><th>Score</th><th>Votes A</th><th>Votes B</th><th>Odds A</th><th>Odds B</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id} className={`match-row match-row--${m.status}`}>
                  <td>{m.stage}</td>
                  <td>{m.team_a_short} vs {m.team_b_short}</td>
                  <td><span className={`badge badge--${m.status}`}>{m.status}</span></td>
                  <td>{m.score_a} – {m.score_b}</td>
                  <td>{m.votes_a ?? 0}</td>
                  <td>{m.votes_b ?? 0}</td>
                  <td>{m.odds_a != null ? `${Number(m.odds_a).toFixed(1)}×` : '—'}</td>
                  <td>{m.odds_b != null ? `${Number(m.odds_b).toFixed(1)}×` : '—'}</td>
                  <td>
                    {m.status === 'setup' && (
                      <>
                        <button className="btn-primary btn-sm" onClick={() => startMatch(m.id)}>▶ Start</button>
                        <button className="btn-danger btn-sm" onClick={() => deleteMatch(m.id)}>✕</button>
                      </>
                    )}
                    {m.status === 'live' && (
                      <button className="btn-secondary btn-sm" onClick={() => { setLiveMatch(m); setTab('live') }}>Go to Live</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LIVE SCORING TAB ─────────────────────────────────────────────── */}
      {tab === 'live' && (
        <div className="admin-tab">
          {/* Case 1: match finished in a draw → show tiebreaker prompt */}
          {liveMatch?.status === 'finished' && liveMatch.is_draw ? (
            <div className="tiebreaker-panel">
              <div className="live-score" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                <span className="live-score__team">{liveMatch.team_a_short}</span>
                <span className="live-score__a">{liveMatch.score_a}</span>
                <span className="live-score__sep">-</span>
                <span className="live-score__b">{liveMatch.score_b}</span>
                <span className="live-score__team">{liveMatch.team_b_short}</span>
              </div>
              <p>Match ended in a draw!</p>
              <button className="btn-primary" onClick={doTiebreaker}>Start Tiebreaker</button>
            </div>
          ) : liveMatch?.status === 'live' ? (
          /* Case 2: match is live → show scoring UI */
            <>
              <div className="live-header">
                <div className="live-score">
                  <span className="live-score__team">{liveMatch.team_a_short}</span>
                  <span className="live-score__a">{liveMatch.score_a}</span>
                  <span className="live-score__sep">-</span>
                  <span className="live-score__b">{liveMatch.score_b}</span>
                  <span className="live-score__team">{liveMatch.team_b_short}</span>
                </div>
                <div className="live-progress">
                  Q {computeCurrentQuestion(liveActions)} / {liveMatch.total_questions}
                </div>
              </div>

              {(() => {
                const rebuttal = computeRebuttalState(liveActions)
                const teamALocked = rebuttal === 'a'
                const teamBLocked = rebuttal === 'b'
                return (
                  <div className="scoring-grid">
                    <div className="scoring-col">
                      <button className="btn-correct" onClick={() => doAction('correct_a')} disabled={teamALocked}>✅ Correct {liveMatch.team_a_short}</button>
                      <button className="btn-incorrect" onClick={() => doAction('incorrect_a')} disabled={teamALocked}>❌ Incorrect {liveMatch.team_a_short}</button>
                    </div>
                    <div className="scoring-col scoring-col--mid">
                      <button className="btn-skip" onClick={() => doAction('skip')}>⏭ Skip</button>
                      <button className="btn-undo" onClick={doUndo}>↩ Undo</button>
                    </div>
                    <div className="scoring-col">
                      <button className="btn-correct" onClick={() => doAction('correct_b')} disabled={teamBLocked}>✅ Correct {liveMatch.team_b_short}</button>
                      <button className="btn-incorrect" onClick={() => doAction('incorrect_b')} disabled={teamBLocked}>❌ Incorrect {liveMatch.team_b_short}</button>
                    </div>
                  </div>
                )
              })()}

              <div className="live-controls">
                <button className="btn-danger" onClick={doReset}>🔄 Full Reset</button>
                <button className="btn-primary" onClick={doFinish}>🏁 End Match</button>
              </div>

              <div className="action-log">
                <h3>Action Log</h3>
                <div className="action-log__list">
                  {[...liveActions].reverse().map(a => (
                    <div key={a.id} className={`action-entry action-entry--${a.action_type}`}>
                      Q{a.question_number}: {a.action_type}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
          /* Case 3: no live match */
            <p className="admin-tab__empty">No match is currently live. Start one from the Matches tab.</p>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="admin-tab">
          <h2>Database Reset</h2>
          <p className="danger-warning">
            This will permanently delete all matches, actions, prospects, leaderboard snapshots, and participants.
            Teams and admin accounts are preserved.
          </p>
          <div className="reset-form">
            <input
              type="text"
              placeholder='Type "RESET" to confirm'
              value={resetInput}
              onChange={e => setResetInput(e.target.value)}
            />
            <button className="btn-danger" onClick={doDbReset} disabled={resetInput !== 'RESET'}>
              Reset Database
            </button>
          </div>
        </div>
      )}
    </div>
  )

  function computeCurrentQuestion(actions) {
    let q = 0, pending = null
    for (const a of actions) {
      if (a.action_type === 'correct_a' || a.action_type === 'correct_b' || a.action_type === 'skip') {
        q++; pending = null
      } else if (a.action_type === 'incorrect_a') {
        if (pending === 'b') { q++; pending = null }
        else if (!pending)   { pending = 'a' }
      } else if (a.action_type === 'incorrect_b') {
        if (pending === 'a') { q++; pending = null }
        else if (!pending)   { pending = 'b' }
      }
    }
    return q + 1
  }

  // Returns which team is locked for the current question:
  // 'a' → A already answered incorrectly, B has rebuttal (A locked)
  // 'b' → B already answered incorrectly, A has rebuttal (B locked)
  // null → fresh question, both teams free to answer
  function computeRebuttalState(actions) {
    let pending = null
    for (const a of actions) {
      if (a.action_type === 'correct_a' || a.action_type === 'correct_b' || a.action_type === 'skip') {
        pending = null
      } else if (a.action_type === 'incorrect_a') {
        if (pending === 'b') pending = null      // both missed → question over, reset
        else if (!pending)   pending = 'a'       // A missed first → B gets rebuttal, A locked
      } else if (a.action_type === 'incorrect_b') {
        if (pending === 'a') pending = null      // both missed → question over, reset
        else if (!pending)   pending = 'b'       // B missed first → A gets rebuttal, B locked
      }
    }
    return pending
  }

  function addRow() {
    setBatchRows(r => [...r, { team_a_id: '', team_b_id: '', stage: 'group', total_questions: 15 }])
  }
  function removeRow(i) {
    setBatchRows(r => r.filter((_, idx) => idx !== i))
  }
  function updateRow(i, key, value) {
    setBatchRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: value } : row))
  }
}
