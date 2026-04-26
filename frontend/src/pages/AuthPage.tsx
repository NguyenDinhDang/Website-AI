import { useState } from 'react'

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
      // Auto login
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

  return (
    <div style={styles.pageWrapper}>
      <style>{cssString}</style>

      {/* Left panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.brandMark}>
            <div style={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#1a56db"/>
                <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={styles.brandName}>LearnOS</span>
          </div>

          <div style={styles.heroText}>
            <h1 style={styles.heroHeading}>
              Nền tảng học tập<br />
              <span style={styles.heroAccent}>thông minh với AI</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Upload tài liệu, hỏi đáp AI, tạo quiz tự động và theo dõi tiến độ học tập trong một workspace tích hợp.
            </p>
          </div>

          <div style={styles.featureList}>
            {[
              { icon: '◈', label: 'Chat AI theo ngữ cảnh tài liệu' },
              { icon: '⚡', label: 'Tạo quiz trắc nghiệm tự động' },
              { icon: '◎', label: 'Tóm tắt tài liệu thông minh' },
              { icon: '↗', label: 'Theo dõi tiến độ học tập' },
            ].map((item) => (
              <div key={item.label} style={styles.featureItem}>
                <span style={styles.featureIcon}>{item.icon}</span>
                <span style={styles.featureLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.leftFooter}>
          <span style={styles.footerText}>Powered by Google Gemini</span>
          <div style={styles.footerDot} />
          <span style={styles.footerText}>FastAPI + React</span>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          {/* Tab switcher */}
          <div style={styles.tabBar}>
            {(['login', 'register'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setErrorMessage('') }}
                style={{
                  ...styles.tabButton,
                  ...(activeTab === tab ? styles.tabButtonActive : styles.tabButtonInactive),
                }}
              >
                {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            ))}
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>Chào mừng trở lại</h2>
                <p style={styles.formSubtitle}>Đăng nhập để tiếp tục học tập</p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  style={styles.input}
                  className="auth-input"
                />
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Mật khẩu</label>
                  <a href="#" style={styles.forgotLink}>Quên mật khẩu?</a>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={styles.input}
                  className="auth-input"
                />
              </div>

              {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

              <button
                type="submit"
                disabled={isLoading}
                style={styles.primaryButton}
                className="primary-btn"
              >
                {isLoading ? (
                  <span style={styles.loadingRow}>
                    <span className="spinner" />
                    Đang đăng nhập…
                  </span>
                ) : 'Đăng nhập'}
              </button>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>hoặc</span>
                <div style={styles.dividerLine} />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('register')}
                style={styles.secondaryButton}
                className="secondary-btn"
              >
                Tạo tài khoản mới
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>Tạo tài khoản</h2>
                <p style={styles.formSubtitle}>Bắt đầu hành trình học tập với AI</p>
              </div>

              <div style={styles.fieldRow}>
                <div style={{ ...styles.fieldGroup, flex: 1 }}>
                  <label style={styles.label}>Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    style={styles.input}
                    className="auth-input"
                  />
                </div>
                <div style={{ ...styles.fieldGroup, flex: 1 }}>
                  <label style={styles.label}>Username <span style={styles.required}>*</span></label>
                  <input
                    type="text"
                    placeholder="nguyen_a"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    style={styles.input}
                    className="auth-input"
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Địa chỉ Email <span style={styles.required}>*</span></label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={styles.input}
                  className="auth-input"
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Mật khẩu <span style={styles.required}>*</span></label>
                <input
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  style={styles.input}
                  className="auth-input"
                />
                <p style={styles.hint}>Ít nhất 8 ký tự, bao gồm chữ và số</p>
              </div>

              {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

              <button
                type="submit"
                disabled={isLoading}
                style={styles.primaryButton}
                className="primary-btn"
              >
                {isLoading ? (
                  <span style={styles.loadingRow}>
                    <span className="spinner" />
                    Đang tạo tài khoản…
                  </span>
                ) : 'Tạo tài khoản'}
              </button>

              <p style={styles.termsText}>
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <a href="#" style={styles.termsLink}>Điều khoản dịch vụ</a>
                {' '}và{' '}
                <a href="#" style={styles.termsLink}>Chính sách bảo mật</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const cssString = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-input:focus {
    outline: none;
    border-color: #1a56db !important;
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.12);
  }

  .primary-btn:hover:not(:disabled) {
    background: #1648c0 !important;
  }

  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .secondary-btn:hover {
    background: #f3f4f6 !important;
    border-color: #9ca3af !important;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .left-panel { display: none !important; }
  }
`

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: '#ffffff',
  },

  // Left panel
  leftPanel: {
    flex: '1',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '48px',
    minWidth: '420px',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  brandMark: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  brandName: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '18px',
    fontWeight: 500,
    color: '#ffffff',
    letterSpacing: '0.02em',
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  heroHeading: {
    fontSize: '36px',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  heroAccent: {
    color: '#60a5fa',
  },
  heroSubtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    lineHeight: 1.7,
    maxWidth: '380px',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  featureIcon: {
    fontSize: '14px',
    color: '#60a5fa',
    width: '20px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  featureLabel: {
    fontSize: '14px',
    color: '#cbd5e1',
  },
  leftFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  footerText: {
    fontSize: '12px',
    color: '#475569',
    fontFamily: "'JetBrains Mono', monospace",
  },
  footerDot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: '#475569',
  },

  // Right panel
  rightPanel: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
    background: '#f8fafc',
  },
  formCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '28px',
  },
  tabButton: {
    flex: 1,
    padding: '10px 0',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  tabButtonActive: {
    color: '#1a56db',
    borderBottom: '2px solid #1a56db',
    marginBottom: '-1px',
  },
  tabButtonInactive: {
    color: '#64748b',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '4px',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0f172a',
    letterSpacing: '-0.01em',
  },
  formSubtitle: {
    fontSize: '13px',
    color: '#64748b',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#1a56db',
    textDecoration: 'none',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#dc2626',
    fontFamily: "'JetBrains Mono', monospace",
  },
  primaryButton: {
    width: '100%',
    padding: '10px',
    background: '#1a56db',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  secondaryButton: {
    width: '100%',
    padding: '10px',
    background: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  termsText: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  termsLink: {
    color: '#1a56db',
    textDecoration: 'none',
  },
}