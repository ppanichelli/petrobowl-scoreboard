import React, { useState, useEffect, useRef } from 'react'
import PublicPageShell from '../components/PublicPageShell'
import { useSocket } from '../hooks/useSocket'
import './Draw.css'

function computeGroups(totalTeams) {
  const G = totalTeams < 20 ? 4 : 5
  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, G)
  const base = Math.floor(totalTeams / G)
  const extra = totalTeams % G
  return letters.map((letter, i) => ({ letter, size: i < extra ? base + 1 : base }))
}

export default function Draw() {
  const [totalTeams,   setTotalTeams]   = useState(20)
  const [assignments,  setAssignments]  = useState({})
  const [teams,        setTeams]        = useState({})   // id → team
  const [revealed,     setRevealed]     = useState({})   // slot → true when just filled

  const prevAssignmentsRef = useRef({})
  const socket = useSocket('join_draw', 'leave_draw')

  useEffect(() => {
    fetch('/api/draw').then(r => r.json()).then(data => {
      setTotalTeams(data.total_teams)
      setAssignments(data.assignments)
      prevAssignmentsRef.current = data.assignments
    })
    fetch('/api/teams').then(r => r.json()).then(list => {
      const map = {}
      list.forEach(t => { map[t.id] = t })
      setTeams(map)
    })
  }, [])

  useEffect(() => {
    if (!socket) return
    function onDrawUpdated(data) {
      const prev = prevAssignmentsRef.current
      const next = data.assignments
      const newlyFilled = {}
      Object.keys(next).forEach(slot => {
        if (!prev[slot] && next[slot]) newlyFilled[slot] = true
      })
      if (Object.keys(newlyFilled).length) {
        setRevealed(r => ({ ...r, ...newlyFilled }))
        setTimeout(() => {
          setRevealed(r => {
            const copy = { ...r }
            Object.keys(newlyFilled).forEach(s => delete copy[s])
            return copy
          })
        }, 800)
      }
      prevAssignmentsRef.current = next
      setTotalTeams(data.total_teams)
      setAssignments(next)
    }
    socket.on('draw:updated', onDrawUpdated)
    return () => socket.off('draw:updated', onDrawUpdated)
  }, [socket])

  const groups = computeGroups(totalTeams)

  return (
    <PublicPageShell>
      <div className="draw-page">
        <div className="draw-page__header">
          <img
            src="/assets/images/PETROBOWL 2026 LOGO.png"
            alt="Petrobowl 2026"
            className="draw-page__header-logo"
          />
          <h1 className="draw-page__title">Group Draw</h1>
          <img
            src="/assets/images/PETROBOWL CHAMPIONSHIP.png"
            alt="Petrobowl Championship"
            className="draw-page__header-logo"
          />
        </div>

        <div className="draw-page__grid" style={{ '--group-count': groups.length }}>
          {groups.map(({ letter, size }) => (
            <div key={letter} className="draw-group">
              <div className="draw-group__header">Group {letter}</div>
              <div className="draw-group__body">
                {Array.from({ length: size }, (_, i) => {
                  const slot = `${letter}${i + 1}`
                  const teamId = assignments[slot]
                  const team = teamId ? teams[teamId] : null
                  const isNew = revealed[slot]
                  return (
                    <div key={slot} className={`draw-slot${team ? ' draw-slot--filled' : ''}${isNew ? ' draw-slot--reveal' : ''}`}>
                      {team ? (
                        <>
                          <img
                            src={team.logo_small_url}
                            alt={team.short_name}
                            className="draw-slot__logo"
                            onError={e => { e.target.style.display = 'none' }}
                          />
                          <span className="draw-slot__name">{team.short_name}</span>
                          <span className={`draw-slot__flag fi fi-${team.country_code?.toLowerCase()}`} />
                        </>
                      ) : (
                        <span className="draw-slot__empty">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <ol className="draw-rules">
          <li>One <strong>group head</strong> is selected per group by seeding order; its group is assigned randomly. Top 5 seeded teams are UFRJ, LUZ, UBA, ITBA, ADEKUS.</li>
          <li>Remaining teams are placed <strong>avoiding same-country groupings</strong> where possible, starting from the most-represented country towards the least. Order is: Brazil, Venezuela, Argentina, Ecuador, Peru, Bolivia, Guyana.</li>
        </ol>
      </div>
    </PublicPageShell>
  )
}
