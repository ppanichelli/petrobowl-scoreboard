import React from 'react'
import './ProspectBar.css'

/**
 * ProspectBar — community prediction meter.
 *
 * variant="prematch"  Live odds, prospecting still open. Shown in NextMatchBanner.
 * variant="live"      Frozen odds, locked at match start. Shown in live scoreboard.
 */
export default function ProspectBar({
  oddsA,
  oddsB,
  prospectsA,
  prospectsB,
  teamAShort,
  teamBShort,
  variant = 'live',
}) {
  const total = (prospectsA || 0) + (prospectsB || 0)
  const isPrematch = variant === 'prematch'

  if (total === 0) {
    if (!isPrematch) return null
    // Pre-match zero state: show the section so it appears ready for prospects
    return (
      <div className="prospect-bar prospect-bar--prematch prospect-bar--empty">
        <div className="prospect-bar__header">
          <span className="prospect-bar__title">Community Prediction</span>
          <span className="prospect-bar__status"><span className="prospect-bar__dot" />Prospecting Open</span>
        </div>
        <div className="prospect-bar__track-wrap">
          <div className="prospect-bar__track prospect-bar__track--empty" />
        </div>
        <div className="prospect-bar__empty-hint">No prospects placed yet</div>
      </div>
    )
  }

  const pctA = Math.round((prospectsA / total) * 100)
  const pctB = 100 - pctA

  return (
    <div className={`prospect-bar prospect-bar--${variant}`}>

      <div className="prospect-bar__header">
        <span className="prospect-bar__title">Community Prediction</span>
        {isPrematch
          ? <span className="prospect-bar__status"><span className="prospect-bar__dot" />Prospecting Open</span>
          : <span className="prospect-bar__status prospect-bar__status--locked">Locked at Kickoff</span>
        }
      </div>

      {/* Tug-of-war track */}
      <div className="prospect-bar__track-wrap">
        <div className="prospect-bar__track">
          <div
            className="prospect-bar__fill prospect-bar__fill--a"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="prospect-bar__fill prospect-bar__fill--b"
            style={{ width: `${pctB}%` }}
          />
        </div>
        {/* Needle — moves to the split point */}
        <div className="prospect-bar__needle" style={{ left: `${pctA}%` }} />
      </div>

      {/* Stats row: percentage + odds for each side */}
      <div className="prospect-bar__stats">
        <div className="prospect-bar__stat prospect-bar__stat--a">
          <span className="prospect-bar__pct">{pctA}<span className="prospect-bar__pct-sign">%</span></span>
          <span className="prospect-bar__odds">{Number(oddsA).toFixed(1)}<span className="prospect-bar__mult">×</span></span>
        </div>

        <div className="prospect-bar__divider">
          <span className="prospect-bar__count">{total} prospects</span>
        </div>

        <div className="prospect-bar__stat prospect-bar__stat--b">
          <span className="prospect-bar__pct">{pctB}<span className="prospect-bar__pct-sign">%</span></span>
          <span className="prospect-bar__odds">{Number(oddsB).toFixed(1)}<span className="prospect-bar__mult">×</span></span>
        </div>
      </div>

    </div>
  )
}
