import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent, MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface User {
  id: number;
  email: string;
  username: string;
  fullName: string;
}

interface Document {
  id: number;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface WorkspaceProps {
  onLogout: () => void;
}

const getAccessToken = () => localStorage.getItem('access_token') || '';

async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAccessToken()}`,
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || 'Server error occurred');
  return payload;
}

export function WorkspacePage({ onLogout }: WorkspaceProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [activeTool, setActiveTool] = useState<'summary' | 'quiz' | null>(null);
  const [toolResultContent, setToolResultContent] = useState('');
  const [isToolProcessing, setIsToolProcessing] = useState(false);
  
  const [learningProgress, setLearningProgress] = useState({ 
    totalDocuments: 0, 
    totalChats: 0, 
    totalQuizzes: 0, 
    accuracy: 0 
  });
  
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const chatScrollAnchorRef = useRef<HTMLDivElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const isDesktopView = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktopView) setIsSidebarVisible(true);
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (chatScrollAnchorRef.current) {
      chatScrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  async function initializeWorkspace() {
    try {
      const [userResponse, documentsResponse, progressResponse] = await Promise.all([
        fetchFromApi('/auth/me'),
        fetchFromApi('/documents/'),
        fetchFromApi('/progress/'),
      ]);
      
      setCurrentUser({
        id: userResponse.id,
        email: userResponse.email,
        username: userResponse.username,
        fullName: userResponse.full_name,
      });
      
      const mappedDocuments = (documentsResponse.items || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        fileType: doc.file_type,
        fileSize: doc.file_size,
      }));
      setDocuments(mappedDocuments);
      
      setLearningProgress({
        totalDocuments: progressResponse.total_documents,
        totalChats: progressResponse.total_chats,
        totalQuizzes: progressResponse.total_quizzes,
        accuracy: progressResponse.accuracy,
      });

      if (mappedDocuments.length > 0) {
        const initialDocumentId = mappedDocuments[0].id;
        setActiveDocumentId(initialDocumentId);
        await fetchChatHistory(initialDocumentId);
      }
    } catch (error) {
      console.error('Failed to initialize workspace data:', error);
    }
  }

  async function fetchChatHistory(documentId: number | null) {
    try {
      const endpoint = documentId ? `/ai/chat/history?document_id=${documentId}` : '/ai/chat/history';
      const historyResponse = await fetchFromApi(endpoint);
      const mappedMessages = historyResponse.items.map((messageItem: { role: string; content: string }) => ({
        role: messageItem.role === 'user' ? 'user' : 'assistant',
        content: messageItem.content,
      }));
      setChatMessages(mappedMessages);
    } catch (error) {
      setChatMessages([]);
    }
  }

  async function handleDocumentSelection(documentId: number) {
    setActiveDocumentId(documentId);
    setActiveTool(null);
    setToolResultContent('');
    
    if (window.innerWidth < 768) setIsSidebarVisible(false);
    await fetchChatHistory(documentId);
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setIsUploadingDocument(true);
    try {
      const uploadPayload = new FormData();
      uploadPayload.append('file', selectedFile);
      
      const uploadResponse = await fetch('/api/v1/documents/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
        body: uploadPayload,
      });
      
      const responseData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(responseData.detail || 'Upload failed');
      
      const newDocument: Document = {
        id: responseData.id,
        title: responseData.title,
        filename: responseData.filename,
        fileType: responseData.file_type,
        fileSize: responseData.file_size,
      };
      
      setDocuments(previousDocuments => [newDocument, ...previousDocuments]);
      setActiveDocumentId(newDocument.id);
      setChatMessages([]);
      setLearningProgress(previousProgress => ({
        ...previousProgress,
        totalDocuments: previousProgress.totalDocuments + 1,
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred during upload');
    } finally {
      setIsUploadingDocument(false);
      if (fileUploadInputRef.current) {
        fileUploadInputRef.current.value = '';
      }
    }
  }

  async function handleDocumentDeletion(documentId: number, event: MouseEvent) {
    event.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await fetchFromApi(`/documents/${documentId}`, { method: 'DELETE' });
      setDocuments(previousDocuments => previousDocuments.filter(doc => doc.id !== documentId));
      
      if (activeDocumentId === documentId) {
        const remainingDocuments = documents.filter(doc => doc.id !== documentId);
        const nextActiveId = remainingDocuments.length > 0 ? remainingDocuments[0].id : null;
        setActiveDocumentId(nextActiveId);
        setChatMessages([]);
      }
    } catch (error) {
      alert('Failed to delete the document. Please try again.');
    }
  }

  async function submitChatMessage() {
    const messageContent = chatInputValue.trim();
    if (!messageContent || isAssistantTyping) return;
    
    setChatInputValue('');
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = 'auto';
    }

    const newUserMessage: ChatMessage = { role: 'user', content: messageContent };
    setChatMessages(previousMessages => [...previousMessages, newUserMessage]);
    setIsAssistantTyping(true);

    try {
      const requestPayload: { message: string; document_id?: number } = { message: messageContent };
      if (activeDocumentId) {
        requestPayload.document_id = activeDocumentId;
      }
      
      const aiResponse = await fetchFromApi('/ai/chat', { 
        method: 'POST', 
        body: JSON.stringify(requestPayload) 
      });
      
      setChatMessages(previousMessages => [
        ...previousMessages, 
        { role: 'assistant', content: aiResponse.answer }
      ]);
      setLearningProgress(previousProgress => ({ 
        ...previousProgress, 
        totalChats: previousProgress.totalChats + 1 
      }));
    } catch (error) {
      setChatMessages(previousMessages => [
        ...previousMessages, 
        { role: 'assistant', content: 'An error occurred while generating the response. Please try again.' }
      ]);
    } finally {
      setIsAssistantTyping(false);
    }
  }

  async function requestDocumentSummary() {
    if (!activeDocumentId) return alert('Please select a document first.');
    
    setActiveTool('summary');
    setIsToolProcessing(true);
    setToolResultContent('');
    
    try {
      const summaryResponse = await fetchFromApi('/ai/summarize', { 
        method: 'POST', 
        body: JSON.stringify({ document_id: activeDocumentId }) 
      });
      setToolResultContent(summaryResponse.summary);
    } catch (error) {
      setToolResultContent('Failed to generate summary. Please try again later.');
    } finally {
      setIsToolProcessing(false);
    }
  }

  async function requestQuizGeneration() {
    if (!activeDocumentId) return alert('Please select a document first.');
    
    setActiveTool('quiz');
    setIsToolProcessing(true);
    setToolResultContent('');
    
    try {
      const quizResponse = await fetchFromApi('/ai/generate-quiz', { 
        method: 'POST', 
        body: JSON.stringify({ document_id: activeDocumentId, num_questions: 5 }) 
      });
      
      const formattedQuizContent = quizResponse.questions.map((quizItem: { question: string; options: string[]; explanation: string }, index: number) => {
        const optionsList = quizItem.options.map((optionText: string, optionIndex: number) => 
          `   ${String.fromCharCode(65 + optionIndex)}. ${optionText}`
        ).join('\n');
        return `**${index + 1}. ${quizItem.question}**\n${optionsList}\n\n*Explanation*: ${quizItem.explanation}`;
      }).join('\n\n');
      
      setToolResultContent(formattedQuizContent);
      setLearningProgress(previousProgress => ({ 
        ...previousProgress, 
        totalQuizzes: previousProgress.totalQuizzes + quizResponse.questions.length 
      }));
    } catch (error) {
      setToolResultContent('Failed to generate quiz. Please try again later.');
    } finally {
      setIsToolProcessing(false);
    }
  }

  function handleChatInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { 
      event.preventDefault(); 
      submitChatMessage(); 
    }
  }

  function handleChatInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setChatInputValue(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
  }

  const activeDocument = documents.find(doc => doc.id === activeDocumentId);
  const displayName = currentUser?.fullName || currentUser?.username || 'User';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const baseFontFamily = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  };

  const MarkdownComponents = {
    p: ({node, ...props}: any) => <p className="bg-white border border-[#d0d7de] rounded-xl p-5 mb-4 text-[14px] leading-[1.6] text-[#24292f] shadow-sm" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-semibold text-lg text-[#24292f] mt-8 mb-4 px-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-semibold text-[16px] text-[#24292f] mt-6 mb-3 px-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-medium text-[15px] text-[#24292f] mt-5 mb-3 px-2" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-4 space-y-2 px-2 text-[#24292f] text-[14px]" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-4 space-y-2 px-2 text-[#24292f] text-[14px]" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[1.6]" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-[#24292f]" {...props} />,
  };

  return (
    <div className="flex flex-col h-screen bg-[#f6f8fa] text-[#24292f]" style={baseFontFamily}>
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#d0d7de] bg-white z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="p-1.5 text-[#57606a] hover:text-[#24292f] rounded-lg hover:bg-[#f3f4f6] transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <div className="flex items-center gap-2 font-semibold text-[16px]">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#24292f"/>
              <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>LearnOS</span>
          </div>

          {activeDocument && (
            <div className="hidden md:flex items-center gap-2 text-sm text-[#57606a] ml-4 before:content-['/'] before:mr-2 before:text-[#d0d7de]">
              <span className="truncate max-w-[300px] font-medium" title={activeDocument.title}>
                {activeDocument.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-[#d0d7de] text-[#24292f] flex items-center justify-center font-medium text-xs">
              {initialLetter}
            </div>
            <span className="hidden sm:inline font-medium text-[#24292f]">{currentUser?.username || '...'}</span>
          </div>
          <button 
            onClick={onLogout}
            className="px-3 py-1.5 text-sm font-medium text-[#24292f] bg-white border border-[#d0d7de] rounded-xl hover:bg-[#f6f8fa] transition-colors shadow-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isSidebarVisible && (
          <aside className="w-[260px] flex flex-col border-r border-[#d0d7de] bg-[#f6f8fa] shrink-0">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-[#24292f]">Documents</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-[#d0d7de] text-[#24292f] rounded-full">
                  {documents.length}
                </span>
              </div>

              <div>
                <input
                  ref={fileUploadInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload document"
                />
                <button
                  onClick={() => fileUploadInputRef.current?.click()}
                  disabled={isUploadingDocument}
                  className="w-full py-2 px-3 text-sm font-medium text-white bg-[#2da44e] border border-transparent rounded-xl hover:bg-[#2c974b] transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {isUploadingDocument ? 'Uploading...' : 'Add document'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {documents.length === 0 ? (
                <div className="text-center py-8 px-4 text-sm text-[#57606a] bg-white border border-[#d0d7de] rounded-xl border-dashed">
                  No documents found.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {documents.map(doc => {
                    const isActive = doc.id === activeDocumentId;
                    return (
                      <li key={doc.id}>
                        <div
                          onClick={() => handleDocumentSelection(doc.id)}
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm transition-all ${
                            isActive ? 'bg-white border border-[#d0d7de] shadow-sm text-[#24292f] font-medium' : 'hover:bg-[#ebecf0] border border-transparent text-[#57606a]'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md border ${
                              isActive ? 'border-[#d0d7de] bg-[#f6f8fa] text-[#24292f]' : 'border-[#d0d7de] bg-white text-[#57606a]'
                            }`}>
                              {doc.fileType}
                            </span>
                            <span className="truncate">{doc.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDocumentDeletion(doc.id, e)}
                            className={`shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#d0d7de]`}
                            aria-label="Delete document"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-5 border-t border-[#d0d7de] bg-[#f6f8fa]">
              <h2 className="text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-4 px-1">
                Learning Stats
              </h2>
              <ul className="space-y-3 text-[14px] px-1">
                <li className="flex justify-between items-center">
                  <span className="text-[#57606a]">Documents</span>
                  <span className="font-semibold text-[#24292f] bg-[#e1e4e8] px-2 py-0.5 rounded-full text-xs">{learningProgress.totalDocuments}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[#57606a]">Conversations</span>
                  <span className="font-semibold text-[#24292f] bg-[#e1e4e8] px-2 py-0.5 rounded-full text-xs">{learningProgress.totalChats}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[#57606a]">Quizzes</span>
                  <span className="font-semibold text-[#24292f] bg-[#e1e4e8] px-2 py-0.5 rounded-full text-xs">{learningProgress.totalQuizzes}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[#57606a]">Accuracy</span>
                  <span className="font-semibold text-[#2da44e] bg-[#dcffe4] px-2 py-0.5 rounded-full text-xs">{learningProgress.accuracy}%</span>
                </li>
              </ul>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[#f6f8fa]">
          <div className="flex items-center justify-between px-8 py-5 border-b border-[#d0d7de] bg-white">
            <div>
              <h1 className="text-lg font-semibold text-[#24292f]">Assistant</h1>
              <p className="text-sm text-[#57606a] mt-1">
                {activeDocument ? `Analyzing: ${activeDocument.title}` : 'Select a document to begin'}
              </p>
            </div>
            {isAssistantTyping && (
              <span className="text-xs font-medium text-[#57606a] flex items-center gap-2 bg-[#f6f8fa] px-3 py-1.5 rounded-full border border-[#d0d7de]">
                <span className="w-2 h-2 bg-[#2da44e] rounded-full animate-pulse"></span>
                Processing...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col items-center">
            <div className="w-full max-w-[900px] space-y-8 leading-[1.6]">
            {chatMessages.length === 0 && (
              <div className="mx-auto mt-12 p-10 border border-[#d0d7de] rounded-2xl bg-white text-center shadow-sm max-w-2xl">
                <div className="w-14 h-14 mx-auto mb-5 bg-[#f6f8fa] border border-[#d0d7de] text-[#24292f] rounded-2xl flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#24292f] mb-3">Welcome, {displayName}</h2>
                <p className="text-[#57606a] text-[15px] max-w-md mx-auto">
                  {activeDocument
                    ? `Ask any questions about "${activeDocument.title}". The AI will analyze the content and provide detailed answers.`
                    : 'Upload a document from the sidebar to start your learning session.'}
                </p>
              </div>
            )}

            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm ${
                  msg.role === 'assistant' ? 'bg-[#2da44e] text-white' : 'bg-[#24292f] text-white'
                }`}>
                  {msg.role === 'assistant' ? 'AI' : initialLetter}
                </div>
                <div className={`flex-1 ${msg.role === 'user' ? 'max-w-[75%]' : 'w-full'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="w-full">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#d0d7de] rounded-xl p-5 text-[14px] leading-[1.6] text-[#24292f] shadow-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAssistantTyping && (
              <div className="flex gap-6">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#2da44e] shadow-sm text-white flex items-center justify-center text-xs font-semibold">
                  AI
                </div>
                <div className="px-5 py-4 border border-[#d0d7de] rounded-xl bg-white shadow-sm flex items-center gap-1.5 h-[54px]">
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={chatScrollAnchorRef} />
            </div>
          </div>

          <div className="px-8 py-6 bg-white border-t border-[#d0d7de] flex flex-col items-center">
            <div className="w-full max-w-[900px] relative flex flex-col gap-2">
              <div className="relative flex items-end w-full">
                <textarea
                  ref={chatTextareaRef}
                  value={chatInputValue}
                  onChange={handleChatInputChange}
                  onKeyDown={handleChatInputKeyDown}
                  placeholder={activeDocument ? `Ask a question about "${activeDocument.title}"...` : 'Type a message...'}
                  rows={1}
                  disabled={!activeDocument}
                  className="w-full max-h-32 p-4 pr-14 text-[15px] bg-[#f6f8fa] border border-[#d0d7de] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-50 transition-all shadow-sm"
                />
                <button
                  onClick={submitChatMessage}
                  disabled={isAssistantTyping || !chatInputValue.trim() || !activeDocument}
                  className="absolute right-2 bottom-2 p-2.5 text-white bg-[#2da44e] rounded-xl hover:bg-[#2c974b] disabled:opacity-50 disabled:hover:bg-[#2da44e] transition-colors shadow-sm"
                  aria-label="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.5 1.5l13 6.5-13 6.5v-4l9-2.5-9-2.5v-4z" />
                  </svg>
                </button>
              </div>
              <div className="text-center text-[12px] text-[#57606a]">
                AI assistant may provide inaccurate information. Verify before trusting.
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[280px] border-l border-[#d0d7de] bg-[#f6f8fa] flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-[#d0d7de] bg-white">
            <h2 className="text-sm font-semibold text-[#24292f]">Learning Tools</h2>
          </div>

          <div className="p-5 space-y-4">
            <button
              onClick={requestDocumentSummary}
              disabled={!activeDocumentId || isToolProcessing}
              className="w-full flex items-center gap-3 p-3 text-left text-[14px] font-medium text-[#24292f] bg-white border border-[#d0d7de] rounded-xl hover:bg-[#f9fafb] disabled:opacity-50 transition-colors shadow-sm"
            >
              <span className="text-[#0969da] bg-[#ddf4ff] p-1.5 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              Generate Summary
            </button>
            <button
              onClick={requestQuizGeneration}
              disabled={!activeDocumentId || isToolProcessing}
              className="w-full flex items-center gap-3 p-3 text-left text-[14px] font-medium text-[#24292f] bg-white border border-[#d0d7de] rounded-xl hover:bg-[#f9fafb] disabled:opacity-50 transition-colors shadow-sm"
            >
              <span className="text-[#2da44e] bg-[#dcffe4] p-1.5 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              Practice Quiz
            </button>
          </div>

          {activeTool && (
            <div className="flex-1 flex flex-col border-t border-[#d0d7de] overflow-hidden bg-[#f6f8fa]">
              <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#d0d7de]">
                <h3 className="text-sm font-semibold text-[#24292f]">
                  {activeTool === 'summary' ? 'Summary' : 'Quiz'}
                </h3>
                <button 
                  onClick={() => setActiveTool(null)}
                  className="p-1.5 text-[#57606a] hover:text-[#24292f] rounded-lg hover:bg-[#f3f4f6]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {isToolProcessing ? (
                  <div className="flex items-center gap-3 text-[#57606a] text-[14px] font-medium bg-white p-4 rounded-xl border border-[#d0d7de] shadow-sm">
                    <span className="w-4 h-4 border-2 border-[#d0d7de] border-t-[#2da44e] rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="w-full">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
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
  );
}
