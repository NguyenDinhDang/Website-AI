import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/WorkspacePage.css'

interface User {
  id: number
  email: string
  username: string
  fullName: string
}

interface Document {
  id: number
  title: string
  filename: string
  fileType: string
  fileSize: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface WorkspaceProps {
  onLogout: () => void
}

const getAccessToken = () => localStorage.getItem('access_token') || '' }

async function fetchFromApi(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAccessToken()}`,
      ...(options.headers || {}),
    },
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || 'Lỗi từ server')
  return data
}

export function WorkspacePage({ onLogout }: WorkspaceProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocumentumentumentId, setActiveDocumentId] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInputValue, setChatInputValue] = useState('')
  const [isAssistantTyping, setIsAssistantTyping] = useState(false)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [activeTool, setActiveTool] = useState<'summary' | 'quiz' | null>(null)
  const [toolResultContent, setToolResultContent] = useState('')
  const [isToolProcessing, setIsToolProcessing] = useState(false)
  const [learningProgress, setLearningProgress] = useState({ totalDocuments: 0, totalChats: 0, totalQuizzes: 0, accuracy: 0 })
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)

  const chatScrollAnchorRef = useRef<HTMLDivElement>(null)
  const fileUploadInputRef = useRef<HTMLInputElement>(null)
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Media query to default sidebar to open on desktop
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) setIsSidebarVisible(true);
    
    loadInitialData()
  }, [])

  useEffect(() => {
    chatScrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function loadInitialData() {
    try {
      const [user, docs, prog] = await Promise.all([
        fetchFromApi('/auth/me'),
        fetchFromApi('/documents/'),
        fetchFromApi('/learningProgress/'),
      ])
      setCurrentUser(user)
      setDocuments(docs.items || [])
      setLearningProgress(prog)
      if (docs.items?.length > 0) {
        setActiveDocumentId(docs.items[0].id)
        loadChatHistory(docs.items[0].id)
      }
    } catch (err) {
      console.error('Failed to load initial data', err)
      // Throw to error boundary if needed, but for now just console error
    }
  }

  async function loadChatHistory(docId: number | null) {
    try {
      const url = docId ? `/ai/chat/history?document_id=${docId}` : '/ai/chat/history'
      const data = await fetchFromApi(url)
      setChatMessages(data.items.map((item: { role: string; content: string }) => ({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: item.content,
      })))
    } catch { setChatMessages([]) }
  }

  async function handleDocumentSelection(docId: number) {
    setActiveDocumentId(docId)
    setActiveTool(null)
    setToolResultContent('')
    if (window.innerWidth < 768) setIsSidebarVisible(false); // auto close on mobile
    await loadChatHistory(docId)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingDocument(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/v1/documents/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
        body: formData,
      })
      const doc = await response.json()
      if (!response.ok) throw new Error(doc.detail)
      setDocuments(prev => [doc, ...prev])
      setActiveDocumentId(doc.id)
      setChatMessages([])
      setLearningProgress(prev => ({ ...prev, totalDocuments: prev.totalDocuments + 1 }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setIsUploadingDocument(false)
      if (fileUploadInputRef.current) fileUploadInputRef.current.value = ''
    }
  }

  async function handleDeleteDoc(docId: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Xoá tài liệu này?')) return
    try {
      await fetchFromApi(`/documents/${docId}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (activeDocumentumentumentId === docId) {
        const remaining = documents.filter(d => d.id !== docId)
        setActiveDocumentId(remaining[0]?.id ?? null)
        setChatMessages([])
      }
    } catch (err) {
      alert('Không thể xoá tài liệu')
    }
  }

  async function handleSendMessage() {
    const message = chatInputValue.trim()
    if (!message || isAssistantTyping) return
    setChatInputValue('')
    if (chatTextareaRef.current) chatTextareaRef.current.style.height = 'auto'

    const userMessage: ChatMessage = { role: 'user', content: message }
    setChatMessages(prev => [...prev, userMessage])
    setIsAssistantTyping(true)

    try {
      const body: { message: string; document_id?: number } = { message }
      if (activeDocumentumentumentId) body.document_id = activeDocumentumentumentId
      const data = await fetchFromApi('/ai/chat', { method: 'POST', body: JSON.stringify(body) })
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      setLearningProgress(prev => ({ ...prev, totalChats: prev.totalChats + 1 }))
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠ Có lỗi xảy ra. Vui lòng thử lại.' }])
    } finally {
      setIsAssistantTyping(false)
    }
  }

  async function handleSummarize() {
    if (!activeDocumentumentumentId) return alert('Chọn tài liệu trước')
    setActiveTool('summary')
    setIsToolProcessing(true)
    setToolResultContent('')
    try {
      const data = await fetchFromApi('/ai/summarize', { method: 'POST', body: JSON.stringify({ document_id: activeDocumentumentumentId }) })
      setToolResultContent(data.summary)
    } catch { setToolResultContent('Không thể tạo tóm tắt. Thử lại sau.') }
    finally { setIsToolProcessing(false) }
  }

  async function handleGenerateQuiz() {
    if (!activeDocumentumentumentId) return alert('Chọn tài liệu trước')
    setActiveTool('quiz')
    setIsToolProcessing(true)
    setToolResultContent('')
    try {
      const data = await fetchFromApi('/ai/generate-quiz', { method: 'POST', body: JSON.stringify({ document_id: activeDocumentumentumentId, num_questions: 5 }) })
      const formatted = data.questions.map((q: { question: string; options: string[]; explanation: string }, i: number) =>
        `${i + 1}. ${q.question}\n${q.options.map((opt: string, j: number) => `   ${String.fromCharCode(65 + j)}. ${opt}`).join('\n')}\n→ ${q.explanation}`
      ).join('\n\n')
      setToolResultContent(formatted)
      setLearningProgress(prev => ({ ...prev, totalQuizzes: prev.totalQuizzes + data.questions.length }))
    } catch { setToolResultContent('Không thể tạo quiz. Thử lại sau.') }
    finally { setIsToolProcessing(false) }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const activeDocumentument = documents.find(d => d.id === activeDocumentumentumentId)

  return (
    <div className="workspace-layout">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <button onClick={() => setIsSidebarVisible(s => !s)} className="btn btn-icon" title="Toggle sidebar" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className="brand-container">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="var(--primary)"/>
              <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="brand-label">LearnOS</span>
          </div>

          {activeDocumentument && (
            <div className="breadcrumb">
              <span className="breadcrumb-item" title={activeDocumentument.title}>{activeDocumentument.title}</span>
            </div>
          )}
        </div>

        <div className="topbar-right">
          <div className="user-badge">
            <div className="avatar">{currentUser?.username?.[0]?.toUpperCase() ?? 'U'}</div>
            <span className="username">{currentUser?.username ?? '...'}</span>
          </div>
          <button onClick={onLogout} className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-3)' }}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main workspace layer */}
      <div className="workspace-body">
        
        {/* Sidebar Panel */}
        <aside className={`sidebar ${isSidebarVisible ? '' : 'hidden'}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">Tài liệu của bạn</span>
            <span className="badge badge-blue">{documents.length}</span>
          </div>

          <div className="upload-zone">
            <input
              ref={fileUploadInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={handleUpload}
              style={{ display: 'none' }}
              aria-label="Upload document"
            />
            <button
              onClick={() => fileUploadInputRef.current?.click()}
              disabled={isUploadingDocument}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isUploadingDocument ? (
                <><span className="spinner" style={{ color: 'var(--text-muted)' }} /> Đang xử lý…</>
              ) : (
                <>+ Thêm tài liệu mới</>
              )}
            </button>
            <p className="upload-hint">PDF, TXT, DOCX, MD</p>
          </div>

          <div className="doc-list">
            {documents.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">Chưa có tài liệu nào.</p>
                <p className="upload-hint">Upload file để bắt đầu.</p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentSelection(doc.id)}
                  className={`doc-item ${doc.id === activeDocumentumentumentId ? 'active' : ''}`}
                >
                  <span className={`badge ${doc.id === activeDocumentumentumentId ? 'badge-blue' : 'badge-gray'}`}>
                    {doc.fileType.toUpperCase()}
                  </span>
                  <span className="doc-name">{doc.title}</span>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="delete-btn"
                    title="Xoá tài liệu"
                    aria-label="Delete document"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="stats-block">
            <div className="sidebar-title" style={{ marginBottom: 'var(--space-2)' }}>Thống kê học tập</div>
            {[
              { label: 'Tài liệu', value: learningProgress.totalDocuments },
              { label: 'Lượt chat', value: learningProgress.totalChats },
              { label: 'Bài quiz', value: learningProgress.totalQuizzes },
              { label: 'Độ chính xác', value: `${learningProgress.accuracy}%` },
            ].map(stat => (
              <div key={stat.label} className="stat-row">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Central Chat Panel */}
        <main className="chat-main">
          <div className="chat-header">
            <div>
              <p className="chat-title">Trợ lý AI</p>
              <p className="chat-context">
                {activeDocumentument ? `Đang tư vấn dựa trên: ${activeDocumentument.title}` : 'Vui lòng chọn tài liệu để bắt đầu'}
              </p>
            </div>
            {isAssistantTyping && (
              <div className="badge badge-blue" style={{ fontSize: '11px', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)' }}>
                <span className="spinner" style={{ width: 10, height: 10, marginRight: 6 }} /> Đang phân tích...
              </div>
            )}
          </div>

          <div className="chat-window">
            {chatMessages.length === 0 && (
              <div className="card welcome-card">
                <div className="welcome-icon">◈</div>
                <h3 className="welcome-title">Xin chào, {currentUser?.fullName || currentUser?.username}</h3>
                <p className="welcome-text">
                  {activeDocumentument
                    ? `Bạn có thể đặt bất kỳ câu hỏi nào liên quan đến nội dung tài liệu "${activeDocumentument.title}". Tôi sẽ tìm kiếm và trả lời.`
                    : 'Tải lên một tài liệu ở cột bên trái và chọn nó để bắt đầu trải nghiệm học tập cùng AI.'}
                </p>
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`msg-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="avatar" style={{ borderRadius: 'var(--radius-lg)' }}>AI</div>
                )}
                <div className={`bubble ${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="avatar" style={{ background: 'var(--text-main)' }}>
                    {currentUser?.username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </div>
            ))}

            {isAssistantTyping && (
              <div className="msg-row assistant">
                <div className="avatar" style={{ borderRadius: 'var(--radius-lg)' }}>AI</div>
                <div className="bubble ai">
                  <span className="typing-dots"><span /><span /><span /></span>
                </div>
              </div>
            )}
            <div ref={chatScrollAnchorRef} />
          </div>

          <div className="chat-input-bar">
            <textarea
              ref={chatTextareaRef}
              value={chatInputValue}
              onChange={handleTextareaInput}
              onKeyDown={handleTextareaKeyDown}
              placeholder={activeDocumentument ? `Hỏi về "${activeDocumentument.title}"…` : 'Nhập câu hỏi…'}
              rows={1}
              className="input-base chat-textarea"
              disabled={!activeDocumentument}
            />
            <button
              onClick={handleSendMessage}
              disabled={isAssistantTyping || !chatInputValue.trim() || !activeDocumentument}
              className="btn btn-primary"
              style={{ width: 44, height: 44, padding: 0, borderRadius: 'var(--radius-xl)' }}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="white">
                <path d="M14 8L2 2L5.5 8L2 14L14 8Z" />
              </svg>
            </button>
          </div>
        </main>

        {/* Right Tools Panel */}
        <aside className="tool-panel">
          <div className="sidebar-header">
            <span className="sidebar-title">Công cụ AI Học Tập</span>
          </div>

          <div className="tool-actions">
            <button
              onClick={handleSummarize}
              disabled={!activeDocumentumentumentId || isToolProcessing}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: 'var(--space-2) var(--space-3)' }}
            >
              <span style={{ color: 'var(--primary)' }}>◎</span> Tóm tắt tài liệu
            </button>
            <button
              onClick={handleGenerateQuiz}
              disabled={!activeDocumentumentumentId || isToolProcessing}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: 'var(--space-2) var(--space-3)' }}
            >
              <span style={{ color: 'var(--primary)' }}>⚡</span> Tạo bài tập (Quiz)
            </button>
          </div>

          {activeTool && (
            <div className="card tool-output">
              <div className="tool-output-head">
                <span className="sidebar-title" style={{ color: 'var(--primary)' }}>
                  {activeTool === 'summary' ? '◎ BẢN TÓM TẮT' : '⚡ BÀI TẬP QUIZ'}
                </span>
                <button onClick={() => setActiveTool(null)} className="btn btn-icon" style={{ width: 24, height: 24 }}>✕</button>
              </div>
              <div className="tool-output-body">
                {isToolProcessing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="spinner" style={{ color: 'var(--primary)', width: 14, height: 14 }} />
                    Đang AI đang phân tích…
                  </div>
                ) : (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {toolResultContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  )
}