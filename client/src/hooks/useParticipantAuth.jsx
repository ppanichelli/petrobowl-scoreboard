import React, { createContext, useContext, useState, useEffect } from 'react'

const ParticipantAuthContext = createContext(null)

export function ParticipantAuthProvider({ children }) {
  const [isParticipant, setIsParticipant] = useState(false)
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/participant/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.pin) { setIsParticipant(true); setParticipant(data) } })
      .finally(() => setLoading(false))
  }, [])

  const login = async (pin) => {
    const r = await fetch('/api/participant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (r.ok) {
      const data = await r.json()
      setIsParticipant(true)
      setParticipant(data.participant)
      return data
    }
    return null
  }

  const logout = async () => {
    await fetch('/api/participant/logout', { method: 'POST' })
    setIsParticipant(false)
    setParticipant(null)
  }

  const refreshParticipant = async () => {
    const r = await fetch('/api/participant/me')
    if (r.ok) setParticipant(await r.json())
  }

  return (
    <ParticipantAuthContext.Provider value={{ isParticipant, participant, loading, login, logout, refreshParticipant }}>
      {children}
    </ParticipantAuthContext.Provider>
  )
}

export function useParticipantAuth() {
  return useContext(ParticipantAuthContext)
}
