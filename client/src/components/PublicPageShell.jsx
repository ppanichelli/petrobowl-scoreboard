import React from 'react'
import './PublicPageShell.css'

/**
 * Shared page shell for Matches and Leaderboard.
 * Provides the two-logo header and the LACSS / sponsor footer.
 * Scoreboard has its own header (with stage label) and does not use this.
 */
export default function PublicPageShell({ children }) {
  return (
    <div className="pps">

      {/* Header: PetroBowl 2026 + The Regionals, no stage label */}
      <div className="pps__header">
        <img
          className="pps__header-logo pps__header-logo--primary"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
        <img
          className="pps__header-logo pps__header-logo--regionals"
          src="/assets/images/The-Regionals.png"
          alt="The Regionals"
        />
      </div>

      {/* Page content */}
      <div className="pps__content">
        {children}
      </div>

      {/* Footer: LACSS centred + YPF sponsor right */}
      <div className="pps__footer">
        <div className="pps__footer-left" />
        <div className="pps__footer-center">
          <img
            src="/assets/images/LACSS Logo.png"
            alt="SPE Latin America and Caribbean Student Symposium"
            className="pps__spe-logo"
          />
        </div>
        <div className="pps__footer-right">
          <span className="pps__sponsor-label">Sponsor</span>
          <img
            src="/assets/images/ypf-logo-white.png"
            alt="YPF"
            className="pps__ypf-logo"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      </div>

    </div>
  )
}
