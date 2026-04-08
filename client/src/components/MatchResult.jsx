import React from 'react'
import './MatchResult.css'

export default function MatchResult({ match }) {
  const isDraw  = match.is_draw
  const winner  = isDraw ? null : (match.winner_id === match.team_a_id ? match.team_a_short : match.team_b_short)

  return (
    <div className="match-result">
      <div className="match-result__overlay">
        {isDraw
          ? <span className="match-result__text match-result__text--draw">DRAW</span>
          : <span className="match-result__text match-result__text--win">{winner} WINS!</span>
        }
      </div>
    </div>
  )
}
