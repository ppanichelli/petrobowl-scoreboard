import React from 'react'
import ProspectBar from './ProspectBar'
import './NextMatchBanner.css'

export default function NextMatchBanner({ match }) {
  return (
    <div className="next-banner">

      {/* Event logos + stage */}
      <div className="next-banner__top">
        <div className="next-banner__event-logos">
          <img
            className="next-banner__pb-logo"
            src="/assets/images/PETROBOWL 2026 LOGO.png"
            alt="PetroBowl 2026"
          />
          <img
            className="next-banner__reg-logo"
            src="/assets/images/PETROBOWL CHAMPIONSHIP.png"
            alt="The Regionals"
          />
        </div>
        <span className="next-banner__stage">{formatStage(match.stage)}</span>
      </div>

      {/* Matchup: identity | logo | VS | logo | identity */}
      <div className="next-banner__matchup">

        {/* Team A identity */}
        <div className="next-banner__identity next-banner__identity--a">
          <span className="next-banner__short">{match.team_a_short}</span>
          <span className={`fi fi-${match.team_a_cc?.toLowerCase()} next-banner__flag`} />
          <small className="next-banner__full">{match.team_a_full}</small>
        </div>

        {/* Team A logo */}
        <div className="next-banner__logo">
          <img src={match.team_a_logo} alt={match.team_a_short} onError={e => e.target.style.display='none'} />
        </div>

        {/* VS divider */}
        <div className="next-banner__vs">
          <span className="next-banner__vs-line" />
          <span className="next-banner__vs-text">VS</span>
          <span className="next-banner__vs-line" />
        </div>

        {/* Team B logo */}
        <div className="next-banner__logo">
          <img src={match.team_b_logo} alt={match.team_b_short} onError={e => e.target.style.display='none'} />
        </div>

        {/* Team B identity */}
        <div className="next-banner__identity next-banner__identity--b">
          <span className="next-banner__short">{match.team_b_short}</span>
          <span className={`fi fi-${match.team_b_cc?.toLowerCase()} next-banner__flag`} />
          <small className="next-banner__full">{match.team_b_full}</small>
        </div>

      </div>

      {/* Community prediction */}
      <div className="next-banner__prospects">
        <ProspectBar
          variant="prematch"
          oddsA={match.odds_a}
          oddsB={match.odds_b}
          prospectsA={match.votes_a}
          prospectsB={match.votes_b}
          teamAShort={match.team_a_short}
          teamBShort={match.team_b_short}
        />
      </div>

      {/* Footer */}
      <div className="next-banner__footer">
        <div className="next-banner__footer-left" />
        <div className="next-banner__footer-center">
          <img
            src="/assets/images/LACSS Logo.png"
            alt="SPE Latin America and Caribbean Student Symposium"
            className="next-banner__spe-logo"
          />
          <div className="next-banner__footer-right">
            <span className="next-banner__sponsor-label">Sponsor</span>
            <img
              src="/assets/images/ypf-logo-white.png"
              alt="YPF"
              className="next-banner__ypf-logo"
              onError={e => e.target.style.display='none'}
            />
          </div>
        </div>
        <div className="next-banner__footer-right-placeholder" />
      </div>

    </div>
  )
}

function formatStage(stage) {
  const map = {
    group:       'Group Stage',
    quarterfinal:'Quarterfinal',
    semifinal:   'Semifinal',
    third_place: 'Third Place',
    final:       'Grand Final',
    tiebreaker:  'Tiebreaker',
  }
  return map[stage] || stage
}
