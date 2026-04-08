import React from 'react'
import './TeamSide.css'

export default function TeamSide({ side, shortName, fullName, countryCode, logoUrl, streak }) {
  return (
    <div className={`team-side team-side--${side}`}>
      <div className="team-side__flag">
        <span className={`fi fi-${countryCode?.toLowerCase()}`} />
      </div>
      <div className="team-side__logo">
        <img src={logoUrl} alt={shortName} onError={e => { e.target.style.display = 'none' }} />
      </div>
      <div className="team-side__name">
        <span className="team-side__short">{shortName}</span>
        <span className="team-side__full">{fullName}</span>
      </div>
    </div>
  )
}
