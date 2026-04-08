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

  const handlePin = async (e) => {
    e.preventDefault()
    const data = await login(pin)
    if (!data) return setError('Invalid PIN. Please try again.')
    if (data.isFirstLogin) setStep('profile')
    else navigate('/p')
  }

  const handleProfile = async (e) => {
    e.preventDefault()
    await fetch('/api/participant/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName || null, country_code: country || null }),
    })
    navigate('/p')
  }

  return (
    <div className="p-login">
      <div className="p-login__card">
        <img src="/assets/petrobowl-logo.png" alt="PetroBowl" className="p-login__logo" />

        {step === 'pin' && (
          <>
            <h1>Enter Your PIN</h1>
            <p>Your 6-digit PIN code was provided at check-in.</p>
            <form onSubmit={handlePin}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="p-login__pin-input"
                required
              />
              {error && <p className="p-login__error">{error}</p>}
              <button type="submit">Enter</button>
            </form>
          </>
        )}

        {step === 'profile' && (
          <>
            <h1>Welcome!</h1>
            <p>Optionally add your name and country before you start prospecting.</p>
            <form onSubmit={handleProfile}>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={50}
              />
              <select value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select country (optional)</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <button type="submit">Continue</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
