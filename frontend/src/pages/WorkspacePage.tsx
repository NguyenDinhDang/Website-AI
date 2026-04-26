import { useState, useRef, useEffect } from 'react'

interface UserResponse {
  id: number
  email: string
  username: string
  full_name: string
}

interface Document {
  id: number
  title: string
  filename: string
  file_type: string
  file_size: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface WorkspaceProps {
  onLogout: () => void
}

function getToken() { return localStorage.getItem('access_token') || '' }

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Lỗi server')
  return data
}

export function WorkspacePage({ onLogout }: WorkspaceProps) {
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocId, setActiveDocId] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeToolPanel, setActiveToolPanel] = useState<'summary' | 'quiz' | null>(null)
  const [toolContent, setToolContent] = useState('')
  const [isToolLoading, setIsToolLoading] = useState(false)
  const [progress, setProgress] = useState({ total_documents: 0, total_chats: 0, total_quizzes: 0, accuracy: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function loadInitialData() {
    try {
      const [user, docs, prog] = await Promise.all([
        apiFetch('/auth/me'),
        apiFetch('/documents/'),
        apiFetch('/progress/'),
      ])
      setCurrentUser(user)
      setDocuments(docs.items || [])
      setProgress(prog)
      if (docs.items?.length > 0) {
        setActiveDocId(docs.items[0].id)
        loadChatHistory(docs.items[0].id)
      }
    } catch (err) {
      console.error('Failed to load initial data', err)
    }
  }

  async function loadChatHistory(docId: number | null) {
    try {
      const url = docId ? `/ai/chat/history?document_id=${docId}` : '/ai/chat/history'
      const data = await apiFetch(url)
      setChatMessages(data.items.map((item: { role: string; content: string }) => ({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: item.content,
      })))
    } catch { setChatMessages([]) }
  }

  async function handleSelectDoc(docId: number) {
    setActiveDocId(docId)
    setActiveToolPanel(null)
    setToolContent('')
    await loadChatHistory(docId)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/v1/documents/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
      })
      const doc = await response.json()
      if (!response.ok) throw new Error(doc.detail)
      setDocuments(prev => [doc, ...prev])
      setActiveDocId(doc.id)
      setChatMessages([])
      setProgress(prev => ({ ...prev, total_documents: prev.total_documents + 1 }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDoc(docId: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Xoá tài liệu này?')) return
    try {
      await apiFetch(`/documents/${docId}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (activeDocId === docId) {
        const remaining = documents.filter(d => d.id !== docId)
        setActiveDocId(remaining[0]?.id ?? null)
        setChatMessages([])
      }
    } catch (err) {
      alert('Không thể xoá tài liệu')
    }
  }

  async function handleSendMessage() {
    const message = chatInput.trim()
    if (!message || isAiLoading) return
    setChatInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMessage: ChatMessage = { role: 'user', content: message }
    setChatMessages(prev => [...prev, userMessage])
    setIsAiLoading(true)

    try {
      const body: { message: string; document_id?: number } = { message }
      if (activeDocId) body.document_id = activeDocId
      const data = await apiFetch('/ai/chat', { method: 'POST', body: JSON.stringify(body) })
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      setProgress(prev => ({ ...prev, total_chats: prev.total_chats + 1 }))
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠ Có lỗi xảy ra. Vui lòng thử lại.' }])
    } finally {
      setIsAiLoading(false)
    }
  }

  async function handleSummarize() {
    if (!activeDocId) return alert('Chọn tài liệu trước')
    setActiveToolPanel('summary')
    setIsToolLoading(true)
    setToolContent('')
    try {
      const data = await apiFetch('/ai/summarize', { method: 'POST', body: JSON.stringify({ document_id: activeDocId }) })
      setToolContent(data.summary)
    } catch { setToolContent('Không thể tạo tóm tắt. Thử lại sau.') }
    finally { setIsToolLoading(false) }
  }

  async function handleGenerateQuiz() {
    if (!activeDocId) return alert('Chọn tài liệu trước')
    setActiveToolPanel('quiz')
    setIsToolLoading(true)
    setToolContent('')
    try {
      const data = await apiFetch('/ai/generate-quiz', { method: 'POST', body: JSON.stringify({ document_id: activeDocId, num_questions: 5 }) })
      const formatted = data.questions.map((q: { question: string; options: string[]; explanation: string }, i: number) =>
        `${i + 1}. ${q.question}\n${q.options.map((opt: string, j: number) => `   ${String.fromCharCode(65 + j)}. ${opt}`).join('\n')}\n→ ${q.explanation}`
      ).join('\n\n')
      setToolContent(formatted)
      setProgress(prev => ({ ...prev, total_quizzes: prev.total_quizzes + data.questions.length }))
    } catch { setToolContent('Không thể tạo quiz. Thử lại sau.') }
    finally { setIsToolLoading(false) }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const activeDoc = documents.find(d => d.id === activeDocId)

  return (
    <div style={ws.shell}>
      <style>{workspaceCss}</style>

      {/* Top bar */}
      <header style={ws.topbar}>
        <div style={ws.topbarLeft}>
          <button onClick={() => setSidebarOpen(s => !s)} style={ws.iconBtn} className="icon-btn" title="Toggle sidebar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
              <rect y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
          <div style={ws.topbarBrand}>
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#1a56db"/>
              <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={ws.brandLabel}>LearnOS</span>
          </div>
          {activeDoc && (
            <div style={ws.breadcrumb}>
              <span style={ws.breadcrumbSep}>/</span>
              <span style={ws.breadcrumbItem}>{activeDoc.title}</span>
            </div>
          )}
        </div>

        <div style={ws.topbarRight}>
          <div style={ws.userBadge}>
            <div style={ws.avatar}>{currentUser?.username?.[0]?.toUpperCase() ?? 'U'}</div>
            <span style={ws.username}>{currentUser?.username ?? '...'}</span>
          </div>
          <button onClick={onLogout} style={ws.logoutBtn} className="logout-btn">
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <div style={ws.workspace}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={ws.sidebar}>
            <div style={ws.sidebarHeader}>
              <span style={ws.sidebarTitle}>Tài liệu</span>
              <span style={ws.docBadge}>{documents.length}</span>
            </div>

            {/* Upload */}
            <div style={ws.uploadZone}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={ws.uploadBtn}
                className="upload-btn"
              >
                {isUploading ? (
                  <><span className="spinner-dark" /> Đang tải lên…</>
                ) : (
                  <><span style={ws.plusIcon}>+</span> Thêm tài liệu</>
                )}
              </button>
              <p style={ws.uploadHint}>PDF · TXT · DOCX · MD</p>
            </div>

            {/* Document list */}
            <div style={ws.docList}>
              {documents.length === 0 ? (
                <div style={ws.emptyState}>
                  <p style={ws.emptyText}>Chưa có tài liệu nào.</p>
                  <p style={ws.emptyHint}>Upload file để bắt đầu.</p>
                </div>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    style={{
                      ...ws.docItem,
                      ...(doc.id === activeDocId ? ws.docItemActive : {}),
                    }}
                    className={`doc-item ${doc.id === activeDocId ? 'active' : ''}`}
                  >
                    <span style={{
                      ...ws.docTypeBadge,
                      ...(doc.id === activeDocId ? ws.docTypeBadgeActive : {}),
                    }}>
                      {doc.file_type.toUpperCase()}
                    </span>
                    <span style={ws.docName}>{doc.title.length > 22 ? doc.title.slice(0, 22) + '…' : doc.title}</span>
                    <button
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      style={ws.deleteBtn}
                      className="delete-btn"
                      title="Xoá"
                    >✕</button>
                  </div>
                ))
              )}
            </div>

            {/* Stats */}
            <div style={ws.statsBlock}>
              <p style={ws.statsTitle}>Thống kê</p>
              {[
                { label: 'Tài liệu', value: progress.total_documents },
                { label: 'Lượt chat', value: progress.total_chats },
                { label: 'Quiz', value: progress.total_quizzes },
                { label: 'Độ chính xác', value: `${progress.accuracy}%` },
              ].map(stat => (
                <div key={stat.label} style={ws.statRow}>
                  <span style={ws.statLabel}>{stat.label}</span>
                  <span style={ws.statValue}>{stat.value}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Chat panel */}
        <main style={ws.chatPanel}>
          <div style={ws.chatHeader}>
            <div>
              <p style={ws.chatTitle}>AI Assistant</p>
              <p style={ws.chatContext}>
                {activeDoc ? `Đang hỏi theo: ${activeDoc.title}` : 'Không có tài liệu được chọn'}
              </p>
            </div>
            {isAiLoading && (
              <div style={ws.thinkingBadge}>
                <span className="spinner-blue" />
                <span style={ws.thinkingText}>Đang suy nghĩ…</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={ws.chatWindow}>
            {chatMessages.length === 0 && (
              <div style={ws.welcomeCard}>
                <div style={ws.welcomeIcon}>◈</div>
                <p style={ws.welcomeTitle}>Bắt đầu cuộc trò chuyện</p>
                <p style={ws.welcomeText}>
                  {activeDoc
                    ? `Đặt câu hỏi về "${activeDoc.title}" để AI hỗ trợ bạn học tập.`
                    : 'Chọn hoặc upload tài liệu bên trái, sau đó đặt câu hỏi.'}
                </p>
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div key={idx} style={msg.role === 'user' ? ws.msgRowUser : ws.msgRowAi}>
                {msg.role === 'assistant' && (
                  <div style={ws.aiBubbleIcon}>AI</div>
                )}
                <div style={msg.role === 'user' ? ws.msgBubbleUser : ws.msgBubbleAi}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div style={ws.userBubbleIcon}>
                    {currentUser?.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </div>
            ))}

            {isAiLoading && (
              <div style={ws.msgRowAi}>
                <div style={ws.aiBubbleIcon}>AI</div>
                <div style={ws.msgBubbleAi}>
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={ws.chatInputBar}>
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={handleTextareaInput}
              onKeyDown={handleTextareaKeyDown}
              placeholder={activeDoc ? `Hỏi về "${activeDoc.title}"…` : 'Nhập câu hỏi…'}
              rows={1}
              style={ws.chatTextarea}
              className="chat-textarea"
            />
            <button
              onClick={handleSendMessage}
              disabled={isAiLoading || !chatInput.trim()}
              style={ws.sendBtn}
              className="send-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2L5.5 8L2 14L14 8Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </main>

        {/* Right tools panel */}
        <aside style={ws.rightPanel}>
          <div style={ws.rightHeader}>
            <span style={ws.rightTitle}>Công cụ AI</span>
          </div>

          <div style={ws.toolButtons}>
            <button
              onClick={handleSummarize}
              disabled={!activeDocId || isToolLoading}
              style={ws.toolBtn}
              className="tool-btn"
            >
              <span style={ws.toolBtnIcon}>◎</span>
              <span>Tóm tắt tài liệu</span>
            </button>
            <button
              onClick={handleGenerateQuiz}
              disabled={!activeDocId || isToolLoading}
              style={ws.toolBtn}
              className="tool-btn"
            >
              <span style={ws.toolBtnIcon}>⚡</span>
              <span>Tạo quiz</span>
            </button>
          </div>

          {/* Tool output */}
          {activeToolPanel && (
            <div style={ws.toolOutput}>
              <div style={ws.toolOutputHeader}>
                <span style={ws.toolOutputTitle}>
                  {activeToolPanel === 'summary' ? '◎ Tóm tắt' : '⚡ Quiz'}
                </span>
                <button onClick={() => setActiveToolPanel(null)} style={ws.closeBtn} className="close-btn">✕</button>
              </div>
              <div style={ws.toolOutputBody}>
                {isToolLoading ? (
                  <div style={ws.toolLoading}>
                    <span className="spinner-blue" />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Đang tạo nội dung…</span>
                  </div>
                ) : (
                  <pre style={ws.toolOutputText}>{toolContent}</pre>
                )}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div style={ws.shortcutBox}>
            <p style={ws.shortcutTitle}>Phím tắt</p>
            <div style={ws.shortcutRow}>
              <kbd style={ws.kbd}>Enter</kbd>
              <span style={ws.shortcutLabel}>Gửi câu hỏi</span>
            </div>
            <div style={ws.shortcutRow}>
              <kbd style={ws.kbd}>Shift+Enter</kbd>
              <span style={ws.shortcutLabel}>Xuống dòng</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

const workspaceCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }

  .icon-btn:hover { background: #f1f5f9 !important; }
  .logout-btn:hover { background: #f1f5f9 !important; color: #dc2626 !important; }
  .upload-btn:hover:not(:disabled) { background: #eff6ff !important; border-color: #1a56db !important; color: #1a56db !important; }
  .doc-item:hover { background: #f8fafc !important; }
  .doc-item.active { background: #eff6ff !important; border-left: 2px solid #1a56db !important; }
  .delete-btn { opacity: 0; transition: opacity 0.15s; }
  .doc-item:hover .delete-btn { opacity: 1 !important; }
  .delete-btn:hover { color: #dc2626 !important; }
  .tool-btn:hover:not(:disabled) { background: #eff6ff !important; border-color: #1a56db !important; color: #1a56db !important; }
  .tool-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .close-btn:hover { background: #f1f5f9 !important; }
  .chat-textarea:focus { outline: none; border-color: #1a56db !important; box-shadow: 0 0 0 3px rgba(26,86,219,0.1) !important; }
  .send-btn:hover:not(:disabled) { background: #1648c0 !important; }
  .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  .spinner-dark {
    display: inline-block; width: 12px; height: 12px;
    border: 2px solid #d1d5db; border-top-color: #1a56db;
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  .spinner-blue {
    display: inline-block; width: 12px; height: 12px;
    border: 2px solid #bfdbfe; border-top-color: #1a56db;
    border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .typing-dots { display: inline-flex; gap: 4px; align-items: center; padding: 2px 0; }
  .typing-dots span {
    display: inline-block; width: 6px; height: 6px;
    border-radius: 50%; background: #94a3b8;
    animation: typingBounce 1.2s infinite;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-4px); opacity: 1; }
  }
`

const ws: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: '#f8fafc', color: '#0f172a',
  },

  // Topbar
  topbar: {
    height: '52px', background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px', flexShrink: 0,
    zIndex: 10,
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  iconBtn: {
    width: '32px', height: '32px', borderRadius: '6px',
    border: 'none', background: 'transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b', transition: 'background 0.15s',
  },
  topbarBrand: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' },
  brandLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px', fontWeight: 500, color: '#0f172a',
  },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px' },
  breadcrumbSep: { color: '#cbd5e1', fontSize: '14px' },
  breadcrumbItem: { fontSize: '13px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: '#1a56db', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 600,
  },
  username: { fontSize: '13px', color: '#374151', fontWeight: 500 },
  logoutBtn: {
    fontSize: '13px', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: '6px',
    padding: '5px 12px', background: 'white',
    cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: "'Inter', sans-serif",
  },

  // Layout
  workspace: { display: 'flex', flex: 1, overflow: 'hidden' },

  // Sidebar
  sidebar: {
    width: '240px', minWidth: '240px',
    background: '#ffffff', borderRight: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
  },
  sidebarTitle: { fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' },
  docBadge: {
    background: '#eff6ff', color: '#1a56db',
    border: '1px solid #bfdbfe', borderRadius: '10px',
    padding: '1px 8px', fontSize: '11px', fontWeight: 500,
  },
  uploadZone: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9' },
  uploadBtn: {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', color: '#374151', fontWeight: 500,
    transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
  },
  plusIcon: { fontSize: '16px', lineHeight: 1, color: '#1a56db', fontWeight: 400 },
  uploadHint: { fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" },
  docList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  emptyState: { padding: '20px 16px', textAlign: 'center' },
  emptyText: { fontSize: '13px', color: '#64748b', marginBottom: '4px' },
  emptyHint: { fontSize: '12px', color: '#9ca3af' },
  docItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 14px', cursor: 'pointer',
    borderLeft: '2px solid transparent',
    transition: 'all 0.12s',
  },
  docItemActive: { background: '#eff6ff', borderLeftColor: '#1a56db' },
  docTypeBadge: {
    fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em',
    background: '#f1f5f9', color: '#64748b',
    borderRadius: '4px', padding: '2px 5px', flexShrink: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
  docTypeBadgeActive: { background: '#bfdbfe', color: '#1d4ed8' },
  docName: { flex: 1, fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#9ca3af', fontSize: '12px', padding: '0 2px',
    flexShrink: 0, transition: 'color 0.15s',
  },
  statsBlock: {
    borderTop: '1px solid #f1f5f9', padding: '14px 16px',
    marginTop: 'auto',
  },
  statsTitle: { fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  statLabel: { fontSize: '12px', color: '#64748b' },
  statValue: { fontSize: '13px', fontWeight: 600, color: '#1a56db', fontFamily: "'JetBrains Mono', monospace" },

  // Chat
  chatPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: '#f8fafc',
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', background: '#ffffff',
    borderBottom: '1px solid #e2e8f0', flexShrink: 0,
  },
  chatTitle: { fontSize: '14px', fontWeight: 600, color: '#0f172a' },
  chatContext: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  thinkingBadge: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: '20px', padding: '5px 12px',
  },
  thinkingText: { fontSize: '12px', color: '#1a56db' },
  chatWindow: { flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  welcomeCard: {
    margin: 'auto', textAlign: 'center', maxWidth: '360px',
    padding: '40px 32px',
  },
  welcomeIcon: { fontSize: '32px', color: '#1a56db', marginBottom: '16px' },
  welcomeTitle: { fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' },
  welcomeText: { fontSize: '14px', color: '#64748b', lineHeight: 1.6 },
  msgRowUser: { display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'flex-start' },
  msgRowAi: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  aiBubbleIcon: {
    width: '28px', height: '28px', borderRadius: '8px',
    background: '#1a56db', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: 700, flexShrink: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
  userBubbleIcon: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: '#0f172a', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 600, flexShrink: 0,
  },
  msgBubbleAi: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: '4px 12px 12px 12px',
    padding: '10px 14px', fontSize: '14px', lineHeight: 1.65,
    color: '#0f172a', maxWidth: '80%',
  },
  msgBubbleUser: {
    background: '#1a56db', color: 'white',
    borderRadius: '12px 4px 12px 12px',
    padding: '10px 14px', fontSize: '14px', lineHeight: 1.65, maxWidth: '80%',
  },
  chatInputBar: {
    display: 'flex', gap: '10px', padding: '12px 20px',
    background: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0,
  },
  chatTextarea: {
    flex: 1, padding: '9px 14px', fontSize: '14px', color: '#0f172a',
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
    resize: 'none', outline: 'none', lineHeight: 1.5,
    fontFamily: "'Inter', sans-serif", maxHeight: '120px', overflowY: 'auto',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  sendBtn: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: '#1a56db', color: 'white', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, alignSelf: 'flex-end', transition: 'background 0.15s',
  },

  // Right panel
  rightPanel: {
    width: '220px', minWidth: '220px',
    background: '#ffffff', borderLeft: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  rightHeader: {
    padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
  },
  rightTitle: { fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' },
  toolButtons: { padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: '8px' },
  toolBtn: {
    width: '100%', padding: '9px 12px', fontSize: '13px',
    background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    color: '#374151', fontWeight: 500, textAlign: 'left',
    transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
  },
  toolBtnIcon: { color: '#1a56db', fontSize: '14px', width: '16px', textAlign: 'center' },
  toolOutput: {
    margin: '12px', border: '1px solid #e2e8f0', borderRadius: '10px',
    overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column',
  },
  toolOutputHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  toolOutputTitle: { fontSize: '11px', fontWeight: 600, color: '#1a56db', fontFamily: "'JetBrains Mono', monospace" },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#9ca3af', fontSize: '12px', padding: '2px 6px', borderRadius: '4px',
    transition: 'background 0.15s',
  },
  toolOutputBody: { padding: '12px', overflowY: 'auto', flex: 1 },
  toolOutputText: {
    fontSize: '12px', color: '#374151', lineHeight: 1.7,
    whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif",
    margin: 0,
  },
  toolLoading: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' },
  shortcutBox: { padding: '14px 16px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' },
  shortcutTitle: { fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' },
  shortcutRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
  kbd: {
    background: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: '4px', padding: '1px 6px',
    fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#374151',
  },
  shortcutLabel: { fontSize: '12px', color: '#94a3b8' },
}