import React, { createContext, useContext, useState, useEffect } from 'react'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ok) setIsAdmin(true) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (r.ok) { setIsAdmin(true); return true }
    return false
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
