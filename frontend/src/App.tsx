import { useState } from 'react'
import { AuthPage } from './pages/AuthPage'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('access_token') // giữ session khi reload
  )

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />
  }

  // Workspace sẽ render ở đây — bước tiếp theo
  return (
    <div className="min-h-screen bg-[#111114] text-white flex items-center justify-center font-mono">
      <p className="text-[#00d4aa]">✓ Đăng nhập thành công — Workspace coming soon</p>
    </div>
  )
}