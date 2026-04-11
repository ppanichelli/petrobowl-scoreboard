import React from 'react'
import './TeamSide.css'

export default function TeamSide({ side, shortName, fullName, countryCode, logoUrl, streak, isLeading, isTrailing }) {
  const isOnFire  = streak >= 5
  const isStreak  = streak >= 3 && !isOnFire
  return (
    <div className={[
      'team-side',
      `team-side--${side}`,
      isLeading  ? 'team-side--leading'  : '',
      isTrailing ? 'team-side--trailing' : '',
      isStreak   ? 'team-side--streak'   : '',
      isOnFire   ? 'team-side--onfire'   : '',
    ].filter(Boolean).join(' ')}>

      <div className="team-side__logo">
        <img
          src={logoUrl}
          alt={shortName}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      <div className="team-side__identity">
        <div className="team-side__namerow">
          <span className="team-side__short">{shortName}</span>
          <span className={`fi fi-${countryCode?.toLowerCase()} team-side__flag`} />
        </div>
        <div className="team-side__full">{fullName}</div>
      </div>

    </div>
  )
}
