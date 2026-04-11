import React, { useEffect, useRef, useState } from 'react'
import './QuestionTrack.css'

/**
 * Renders one row of question outcome dots for a team.
 * team: 'a' | 'b'
 */
export default function QuestionTrack({ team, label, total, actions }) {
  const dots = buildDots(team, total, actions)
  const prevDotsRef = useRef(null)
  const [freshIndices, setFreshIndices] = useState(new Set())

  useEffect(() => {
    const prev = prevDotsRef.current
    const current = [...dots]

    if (prev !== null) {
      const fresh = new Set()
      current.forEach((d, i) => {
        if (prev[i] === 'empty' && d !== 'empty') fresh.add(i)
      })
      if (fresh.size > 0) {
        setFreshIndices(fresh)
        const t = setTimeout(() => setFreshIndices(new Set()), 750)
        prevDotsRef.current = current
        return () => clearTimeout(t)
      }
    }

    prevDotsRef.current = current
  }, [actions]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`q-track q-track--${team}`}>
      {label && <span className="q-track__label">{label}</span>}
      <div className="q-track__dots">
        {dots.map((d, i) => (
          <span
            key={`${i}-${d}`}
            className={`q-dot q-dot--${d}${freshIndices.has(i) ? ' q-dot--fresh' : ''}`}
            style={{ '--i': i }}
            title={`Q${i + 1}: ${d}`}
          />
        ))}
      </div>
    </div>
  )
}

function buildDots(team, total, actions) {
  // Build per-question outcome for both teams independently, then return the requested team's array.
  // States: 'empty' | 'correct' | 'incorrect' | 'skip'
  const dotsA = Array(total).fill('empty')
  const dotsB = Array(total).fill('empty')
  let questionIdx = 0
  // null = neither team has answered this question yet
  // 'a'  = team A answered incorrectly first (B gets rebuttal)
  // 'b'  = team B answered incorrectly first (A gets rebuttal)
  let pendingRebuttal = null

  for (const a of actions) {
    if (questionIdx >= total) break

    if (a.action_type === 'correct_a') {
      dotsA[questionIdx] = 'correct'
      // dotsB keeps whatever it had (empty, or incorrect if they answered first)
      questionIdx++
      pendingRebuttal = null
    } else if (a.action_type === 'correct_b') {
      dotsB[questionIdx] = 'correct'
      // dotsA keeps whatever it had
      questionIdx++
      pendingRebuttal = null
    } else if (a.action_type === 'skip') {
      if (pendingRebuttal === 'a') {
        // A already answered wrong; B passes on rebuttal
        dotsB[questionIdx] = 'skip'
      } else if (pendingRebuttal === 'b') {
        // B already answered wrong; A passes on rebuttal
        dotsA[questionIdx] = 'skip'
      } else {
        // Neither had answered; both skip
        dotsA[questionIdx] = 'skip'
        dotsB[questionIdx] = 'skip'
      }
      questionIdx++
      pendingRebuttal = null
    } else if (a.action_type === 'incorrect_a') {
      dotsA[questionIdx] = 'incorrect'
      if (pendingRebuttal === 'b') {
        // B already answered wrong too → question done
        questionIdx++
        pendingRebuttal = null
      } else {
        pendingRebuttal = 'a'
      }
    } else if (a.action_type === 'incorrect_b') {
      dotsB[questionIdx] = 'incorrect'
      if (pendingRebuttal === 'a') {
        // A already answered wrong too → question done
        questionIdx++
        pendingRebuttal = null
      } else {
        pendingRebuttal = 'b'
      }
    }
  }

  return team === 'a' ? dotsA : dotsB
}
