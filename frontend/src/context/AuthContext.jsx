import React, { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    token: null,
    role: null,
    username: null
  })

  useEffect(() => {
    const token = localStorage.getItem('kiis_portal_token')
    const sessionStr = localStorage.getItem('kiis_portal_session')
    if (token && sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        setAuthState({
          token,
          role: session.role,
          username: session.name
        })
      } catch (e) {
        localStorage.removeItem('kiis_portal_token')
        localStorage.removeItem('kiis_portal_session')
      }
    }
  }, [])

  const login = (token, role, username) => {
    setAuthState({ token, role, username })
  }

  const logout = () => {
    localStorage.removeItem('kiis_portal_token')
    localStorage.removeItem('kiis_portal_session')
    setAuthState({ token: null, role: null, username: null })
  }

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
