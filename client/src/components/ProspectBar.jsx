import React from 'react'
import './ProspectBar.css'

export default function ProspectBar({ oddsA, oddsB, prospectsA, prospectsB, teamAShort, teamBShort }) {
  const total = (prospectsA || 0) + (prospectsB || 0)
  const pctA  = total === 0 ? 50 : Math.round((prospectsA / total) * 100)
  const pctB  = 100 - pctA

  return (
    <div className="prospect-bar">
      <div className="prospect-bar__labels">
        <span className="prospect-bar__label prospect-bar__label--a">
          {teamAShort} <strong>{oddsA}×</strong>
        </span>
        <span className="prospect-bar__title">Prospects</span>
        <span className="prospect-bar__label prospect-bar__label--b">
          <strong>{oddsB}×</strong> {teamBShort}
        </span>
      </div>
      <div className="prospect-bar__track">
        <div className="prospect-bar__fill prospect-bar__fill--a" style={{ width: `${pctA}%` }} />
        <div className="prospect-bar__fill prospect-bar__fill--b" style={{ width: `${pctB}%` }} />
      </div>
      <div className="prospect-bar__pct">
        <span>{pctA}%</span>
        <span>{pctB}%</span>
      </div>
    </div>
  )
}
