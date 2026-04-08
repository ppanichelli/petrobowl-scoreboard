import React from 'react'
import './NextMatchBanner.css'

export default function NextMatchBanner({ match }) {
  return (
    <div className="next-banner">
      <div className="next-banner__label">Coming Up Next</div>
      <div className="next-banner__stage">{formatStage(match.stage)}</div>
      <div className="next-banner__teams">
        <div className="next-banner__team">
          <span className={`fi fi-${match.team_a_cc?.toLowerCase()}`} />
          <img src={match.team_a_logo} alt={match.team_a_short} onError={e => e.target.style.display='none'} />
          <span>{match.team_a_short}</span>
          <small>{match.team_a_full}</small>
        </div>
        <div className="next-banner__vs">VS</div>
        <div className="next-banner__team">
          <span className={`fi fi-${match.team_b_cc?.toLowerCase()}`} />
          <img src={match.team_b_logo} alt={match.team_b_short} onError={e => e.target.style.display='none'} />
          <span>{match.team_b_short}</span>
          <small>{match.team_b_full}</small>
        </div>
      </div>
    </div>
  )
}

function formatStage(stage) {
  const map = { group:'Group Stage', quarterfinal:'Quarterfinal', semifinal:'Semifinal', third_place:'Third Place', final:'Grand Final', tiebreaker:'Tiebreaker' }
  return map[stage] || stage
}
