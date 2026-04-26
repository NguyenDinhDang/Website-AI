import { useState, useEffect } from 'react'
import { AuthPage } from './pages/AuthPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { ErrorBoundary } from './components/ErrorBoundary'

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
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="spinner" style={{ color: 'var(--primary)', width: '32px', height: '32px', borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
          <p style={{ color: 'var(--text-muted)' }}>Đang tải…</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {!isAuthenticated ? (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      ) : (
        <WorkspacePage onLogout={handleLogout} />
      )}
    </ErrorBoundary>
  )
}