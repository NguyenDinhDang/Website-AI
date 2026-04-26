import { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { useAuth } from '../hooks/useAuth'

type ActiveTab = 'login' | 'register'

interface AuthPageProps {
  onAuthSuccess: () => void
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login')
  const { isLoading, errorMessage, login, register } = useAuth()

  async function handleLogin(email: string, password: string) {
    const isSuccess = await login(email, password)
    if (isSuccess) onAuthSuccess()
  }

  async function handleRegister(
    email: string, username: string, password: string, fullName: string
  ) {
    const isSuccess = await register(email, username, password, fullName)
    if (isSuccess) onAuthSuccess()
  }

  return (
    <div className="min-h-screen bg-[#111114] flex items-center justify-center p-6">
      <div className="bg-[#13131a] border border-[#2a2a3a] rounded-xl p-10 w-full max-w-md shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-6">
          <p className="font-mono text-xl text-[#00d4aa] tracking-widest">◈ LearnOS</p>
          <p className="text-xs text-gray-500 tracking-widest mt-1">AI Learning Workspace</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#2a2a3a] mb-6">
          {(['login', 'register'] as ActiveTab[]).map((tabName) => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`flex-1 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
                activeTab === tabName
                  ? 'text-[#00d4aa] border-[#00d4aa]'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tabName === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {/* Form */}
        {activeTab === 'login' ? (
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegister}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        )}
      </div>
    </div>
  )
}