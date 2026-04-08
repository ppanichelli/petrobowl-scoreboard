import React from 'react'
import './QuestionTrack.css'

/**
 * Renders one row of question outcome dots for a team.
 * team: 'a' | 'b'
 */
export default function QuestionTrack({ team, total, actions }) {
  const dots = buildDots(team, total, actions)

  return (
    <div className={`q-track q-track--${team}`}>
      {dots.map((d, i) => (
        <span key={i} className={`q-dot q-dot--${d}`} title={`Q${i + 1}: ${d}`} />
      ))}
    </div>
  )
}

function buildDots(team, total, actions) {
  // Build per-question outcome for this team
  // States: 'empty' | 'correct' | 'incorrect' | 'skip'
  const dots = Array(total).fill('empty')
  let questionIdx = 0
  let pendingRebuttal = false // which team gets the rebuttal

  for (const a of actions) {
    if (questionIdx >= total) break

    if (a.action_type === 'correct_a') {
      if (team === 'a') dots[questionIdx] = 'correct'
      else dots[questionIdx] = 'empty' // b had no chance
      questionIdx++
      pendingRebuttal = false
    } else if (a.action_type === 'correct_b') {
      if (team === 'b') dots[questionIdx] = 'correct'
      else dots[questionIdx] = 'empty'
      questionIdx++
      pendingRebuttal = false
    } else if (a.action_type === 'skip') {
      dots[questionIdx] = 'skip'
      questionIdx++
      pendingRebuttal = false
    } else if (a.action_type === 'incorrect_a') {
      if (team === 'a') dots[questionIdx] = 'incorrect'
      if (!pendingRebuttal) {
        pendingRebuttal = true
      } else {
        // b also missed
        questionIdx++
        pendingRebuttal = false
      }
    } else if (a.action_type === 'incorrect_b') {
      if (team === 'b') dots[questionIdx] = 'incorrect'
      if (!pendingRebuttal) {
        pendingRebuttal = true
      } else {
        // a also missed
        questionIdx++
        pendingRebuttal = false
      }
    }
  }

  return dots
}
