import React, { useState } from 'react'
import './Landing.css'

export default function Landing() {
  const [text, setText] = useState('Welcome to PetroBowl 2026')

  function handleClick() {
    const result = window.prompt('Announcement text:', text)
    if (result !== null) setText(result)
  }

  return (
    <div className="landing">
      <div className="landing__center">
        <div className="landing__center__logos">
        <img
          className="landing__championship-logo"
          src="/assets/images/PETROBOWL CHAMPIONSHIP.png"
          alt="PetroBowl 2026"
        />
        <img
          className="landing__pb-logo"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
        <img
          className="landing__buenos-aires"
          src="/assets/images/BUENOS AIRES.png"
          alt="PetroBowl 2026"
        />
        </div>

        <div
          className="landing__announcement"
          onClick={handleClick}
          title="Click to edit"
        >
          {text}
        </div>
      </div>

      <div className="landing__sponsors">
        <img
          src="/assets/images/LACSS Logo.png"
          alt="LACSS"
          className="landing__sponsor-logo"
        />
        <img
          src="/assets/images/ypf-logo-white.png"
          alt="YPF"
          className="landing__sponsor-logo"
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>
    </div>
  )
}
