import { useState } from 'react'
import '../styles/AuthPage.css'

type ActiveTab = 'login' | 'register'

interface AuthPageProps {
  onAuthSuccess: () => void
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regFullName, setRegFullName] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Đăng nhập thất bại')
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      onAuthSuccess()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, username: regUsername, password: regPassword, full_name: regFullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Đăng ký thất bại')
      // Auto login after register
      const loginRes = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.detail || 'Đăng nhập thất bại')
      localStorage.setItem('access_token', loginData.access_token)
      localStorage.setItem('refresh_token', loginData.refresh_token)
      onAuthSuccess()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Đăng ký thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  function preventDefaultLink(e: React.MouseEvent) {
    e.preventDefault()
  }

  return (
    <main className="auth-page">
      {/* Left panel Hero */}
      <aside className="auth-panel-hero">
        <div className="hero-content">
          <div className="brand-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="var(--primary)"/>
              <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="brand-name">LearnOS</span>
          </div>

          <div className="hero-text">
            <h1 className="hero-heading">
              Nền tảng học tập<br />
              <span className="hero-accent">thông minh với AI</span>
            </h1>
            <p className="hero-subtitle">
              Upload tài liệu, hỏi đáp AI, tạo quiz tự động và theo dõi tiến độ học tập trong một workspace tích hợp.
            </p>
          </div>

          <div className="feature-list">
            {[
              { id: '1', icon: '.', label: 'Chat AI theo ngữ cảnh tài liệu' },
              { id: '2', icon: '.', label: 'Tạo quiz trắc nghiệm tự động' },
              { id: '3', icon: '.', label: 'Tóm tắt tài liệu thông minh' },
              { id: '4', icon: '.', label: 'Theo dõi tiến độ học tập' },
            ].map((item) => (
              <div key={item.id} className="feature-item">
                <span className="feature-icon" aria-hidden="true">{item.icon}</span>
                <span className="feature-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-footer">
          <span className="footer-text">Powered by Google Gemini</span>
          <div className="footer-dot" />
          <span className="footer-text">FastAPI + React</span>
        </div>
      </aside>

      {/* Right panel - Auth form */}
      <section className="auth-panel-form">
        <div className="card auth-card">
          {/* Tab switcher */}
          <div className="tab-bar">
            {(['login', 'register'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setErrorMessage('') }}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                aria-pressed={activeTab === tab}
              >
                {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            ))}
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form" noValidate>
              <div className="form-header">
                <h2 className="form-title">Chào mừng trở lại</h2>
                <p className="form-subtitle">Đăng nhập để tiếp tục học tập</p>
              </div>

              <div className="field-group">
                <label className="label-text" htmlFor="loginEmail">Địa chỉ Email</label>
                <input
                  id="loginEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="input-base"
                />
              </div>

              <div className="field-group">
                <div className="label-row">
                  <label className="label-text" htmlFor="loginPassword">Mật khẩu</label>
                  <a href="#" onClick={preventDefaultLink} className="forgot-link">Quên mật khẩu?</a>
                </div>
                <input
                  id="loginPassword"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="input-base"
                />
              </div>

              {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}

              <button
                type="submit"
                disabled={isLoading || !loginEmail || !loginPassword}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'var(--space-2)' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Đang đăng nhập…
                  </>
                ) : 'Đăng nhập'}
              </button>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">hoặc</span>
                <div className="divider-line" />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Tạo tài khoản mới
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form" noValidate>
              <div className="form-header">
                <h2 className="form-title">Tạo tài khoản</h2>
                <p className="form-subtitle">Bắt đầu hành trình học tập với AI</p>
              </div>

              <div className="field-row">
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="label-text" htmlFor="regFullName">Họ và tên</label>
                  <input
                    id="regFullName"
                    type="text"
                    placeholder="Developer AI"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="input-base"
                  />
                </div>
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="label-text" htmlFor="regUsername">Username <span className="required-mark">*</span></label>
                  <input
                    id="regUsername"
                    type="text"
                    placeholder="nguyen_a"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    className="input-base"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="label-text" htmlFor="regEmail">Địa chỉ Email <span className="required-mark">*</span></label>
                <input
                  id="regEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  className="input-base"
                />
              </div>

              <div className="field-group">
                <label className="label-text" htmlFor="regPassword">Mật khẩu <span className="required-mark">*</span></label>
                <input
                  id="regPassword"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  className="input-base"
                />
                <p className="input-hint">Ít nhất 8 ký tự, bao gồm chữ và số</p>
              </div>

              {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}

              <button
                type="submit"
                disabled={isLoading || !regEmail || !regUsername || !regPassword || regPassword.length < 8}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'var(--space-2)' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Đang tạo tài khoản…
                  </>
                ) : 'Tạo tài khoản'}
              </button>

              <p className="terms-text">
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <a href="#" onClick={preventDefaultLink} className="terms-link">Điều khoản dịch vụ</a>
                {' '}và{' '}
                <a href="#" onClick={preventDefaultLink} className="terms-link">Chính sách bảo mật</a>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}