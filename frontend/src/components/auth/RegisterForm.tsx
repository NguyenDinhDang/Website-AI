interface RegisterFormProps {
  onSubmit: (email: string, username: string, password: string, fullName: string) => void
  isLoading: boolean
  errorMessage: string
}

export function RegisterForm({ onSubmit, isLoading, errorMessage }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(email, username, password, fullName)
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-white">Tạo tài khoản</h2>

      <input
        type="text"
        placeholder="Họ và tên (tuỳ chọn)"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="bg-[#0d0d11] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00d4aa]"
      />
      <input
        type="text"
        placeholder="Username (a–z, 0–9, _)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="bg-[#0d0d11] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00d4aa]"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-[#0d0d11] border border-[#2a2a3a] rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#00d4aa]"
      />
      <input
        type="password"
        placeholder="Mật khẩu (≥ 8 ký tự)"
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
        className="bg-[#0d0d11] border border-[#00d4aa] text-[#00d4aa] font-bold py-2 rounded-md text-sm hover:bg-[#00d4aa] hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? 'Đang tạo tài khoản…' : 'Đăng ký nhanh'}
      </button>
    </div>
  )
}