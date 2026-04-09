import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'
import './AdminLogin.css'

export default function AdminLogin() {
  const { login } = useAdminAuth()
  const navigate   = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) navigate('/timekeeper')
    else setError('Invalid username or password')
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <img src="/assets/petrobowl-logo.png" alt="PetroBowl" className="admin-login__logo" />
        <h1>Admin Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="admin-login__error">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}
