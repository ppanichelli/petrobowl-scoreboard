import React from 'react'
import { useNavigate } from 'react-router-dom'
import './MatchResult.css'

export default function MatchResult({ match, onClose }) {
  const isDraw  = match.is_draw
  const winner  = isDraw ? null : (match.winner_id === match.team_a_id ? match.team_a_short : match.team_b_short)
  const navigate = useNavigate()

  return (
    <div className="match-result">
      <div className="match-result__overlay">
        {isDraw
          ? <span className="match-result__text match-result__text--draw">DRAW</span>
          : <span className="match-result__text match-result__text--win">{winner} WINS!</span>
        }
        <div className="match-result__actions">
          <button className="match-result__next-btn" onClick={() => navigate('/next')}>
            Next Match →
          </button>
          <button className="match-result__close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
