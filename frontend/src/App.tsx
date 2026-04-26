import { useState, useEffect } from 'react'
import { AuthPage } from './pages/AuthPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      // Verify token is still valid
      fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
        .then(res => {
          if (res.ok) setIsAuthenticated(true)
          else {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setIsCheckingAuth(false))
    } else {
      setIsCheckingAuth(false)
    }
  }, [])

  function handleAuthSuccess() {
    setIsAuthenticated(true)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
  }

  if (isCheckingAuth) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #e2e8f0', borderTopColor: '#1a56db',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: '#64748b' }}>Đang tải…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  return <WorkspacePage onLogout={handleLogout} />
}