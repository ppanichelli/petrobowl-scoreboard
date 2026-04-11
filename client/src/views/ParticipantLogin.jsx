import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParticipantAuth } from '../hooks/useParticipantAuth'
import './ParticipantLogin.css'

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' }, { code: 'BR', name: 'Brazil' },
  { code: 'BO', name: 'Bolivia' },   { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },  { code: 'EC', name: 'Ecuador' },
  { code: 'GY', name: 'Guyana' },    { code: 'MX', name: 'Mexico' },
  { code: 'PE', name: 'Peru' },      { code: 'TT', name: 'Trinidad & Tobago' },
  { code: 'UY', name: 'Uruguay' },   { code: 'VE', name: 'Venezuela' },
  { code: 'US', name: 'United States' },
]

export default function ParticipantLogin() {
  const { login } = useParticipantAuth()
  const navigate   = useNavigate()

  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [step, setStep]         = useState('pin')  // 'pin' | 'profile'
  const [displayName, setDisplayName] = useState('')
  const [country, setCountry]   = useState('')
  const [profileError, setProfileError] = useState('')

  const handlePin = async (e) => {
    e.preventDefault()
    const data = await login(pin)
    if (!data) return setError('Invalid PIN. Please try again.')
    if (data.isFirstLogin) setStep('profile')
    else navigate('/p')
  }

  const handleProfile = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) return setProfileError('Please enter your name.')
    if (!country) return setProfileError('Please select your country.')
    setProfileError('')
    await fetch('/api/participant/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName.trim(), country_code: country }),
    })
    navigate('/p')
  }

  return (
    <div className="p-login">

      {/* Header — same dual-logo pattern as Matches/Leaderboard */}
      <header className="p-login__header">
        <img
          className="p-login__header-logo p-login__header-logo--primary"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
        <img
          className="p-login__header-logo p-login__header-logo--regionals"
          src="/assets/images/The-Regionals.png"
          alt="The Regionals"
        />
      </header>

      {/* Form body */}
      <div className="p-login__body">

        {step === 'pin' && (
          <div className="p-login__form-wrap">
            <p className="p-login__eyebrow">Login to place your prospects</p>
            <h1 className="p-login__title">Enter Your PIN</h1>
            <p className="p-login__hint">Your 6-digit code was provided at check-in.</p>
            <form onSubmit={handlePin} className="p-login__form">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="p-login__pin-input"
                autoFocus
                required
              />
              {error && <p className="p-login__error">{error}</p>}
              <button type="submit" className="p-login__submit">Enter</button>
            </form>
          </div>
        )}

        {step === 'profile' && (
          <div className="p-login__form-wrap">
            <p className="p-login__eyebrow">Almost there</p>
            <h1 className="p-login__title">Set Up Profile</h1>
            <p className="p-login__hint">Enter your name and country to start prospecting.</p>
            <form onSubmit={handleProfile} className="p-login__form">
              <div className="p-login__field">
                <label className="p-login__label">Display Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  required
                />
                <p className="p-login__field-note">Your name cannot be changed later.</p>
              </div>
              <div className="p-login__field">
                <label className="p-login__label">Country</label>
                <select value={country} onChange={e => setCountry(e.target.value)} required>
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              {profileError && <p className="p-login__error">{profileError}</p>}
              <button type="submit" className="p-login__submit">Continue</button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
