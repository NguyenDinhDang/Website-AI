import { useState } from 'react'
interface LoginFormProps {
  onSubmit: (email: string, password: string) => void
  isLoading: boolean
  errorMessage: string
}

export function LoginForm({ onSubmit, isLoading, errorMessage }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(email, password)
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-white">Đăng nhập</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-[#0d0d11] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00d4aa]"
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-[#0d0d11] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00d4aa]"
      />

      {errorMessage && (
        <p className="text-[#ff5c72] text-xs font-mono">{errorMessage}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="bg-[#00d4aa] text-black font-bold py-2 rounded-md text-sm hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </div>
  )
}