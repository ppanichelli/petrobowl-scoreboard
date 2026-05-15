import React from 'react'
import './TeamSide.css'

export default function TeamSide({ side, shortName, fullName, countryCode, logoUrl, streak, isLeading, isTrailing }) {
  const isFromAnotherPlanet = streak >= 11
  const isUnstoppable       = streak >= 8  && !isFromAnotherPlanet
  const isOnFire            = streak >= 5  && !isUnstoppable && !isFromAnotherPlanet
  const isStreak            = streak >= 3  && !isOnFire && !isUnstoppable && !isFromAnotherPlanet
  return (
    <div className={[
      'team-side',
      `team-side--${side}`,
      isLeading           ? 'team-side--leading'      : '',
      isTrailing          ? 'team-side--trailing'     : '',
      isStreak            ? 'team-side--streak'       : '',
      isOnFire            ? 'team-side--onfire'       : '',
      isUnstoppable       ? 'team-side--unstoppable'  : '',
      isFromAnotherPlanet ? 'team-side--planet'       : '',
    ].filter(Boolean).join(' ')}>

      <div className="team-side__logo">
        <img
          src={logoUrl}
          alt={shortName}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {isOnFire && <>
        <span className="team-side__embers team-side__embers--1" />
        <span className="team-side__embers team-side__embers--2" />
        <span className="team-side__embers team-side__embers--3" />
        <span className="team-side__embers team-side__embers--4" />
        <span className="team-side__embers team-side__embers--5" />
      </>}

      {isUnstoppable && <>
        <span className="team-side__sparks team-side__sparks--1" />
        <span className="team-side__sparks team-side__sparks--2" />
        <span className="team-side__sparks team-side__sparks--3" />
        <span className="team-side__sparks team-side__sparks--4" />
        <span className="team-side__sparks team-side__sparks--5" />
      </>}

      {isFromAnotherPlanet && <>
        <span className="team-side__orb team-side__orb--1" />
        <span className="team-side__orb team-side__orb--2" />
        <span className="team-side__orb team-side__orb--3" />
      </>}

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
