import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, MouseEvent } from 'react';
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
        return `${index + 1}. ${quizItem.question}\n${optionsList}\n\n**Explanation**: ${quizItem.explanation}`;
      }).join('\n\n---\n\n');
      
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

  return (
    <div className="flex flex-col h-screen bg-white text-[#24292f]" style={baseFontFamily}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="p-1 text-[#57606a] hover:text-[#24292f] rounded-md hover:bg-[#ebecf0] transition-colors"
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
              <rect width="28" height="28" rx="6" fill="#24292f"/>
              <path d="M8 20L14 8L20 20M10.5 15.5H17.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>LearnOS</span>
          </div>

          {activeDocument && (
            <div className="hidden md:flex items-center gap-2 text-sm text-[#57606a] ml-4 before:content-['/'] before:mr-2 before:text-[#d0d7de]">
              <span className="truncate max-w-[300px]" title={activeDocument.title}>
                {activeDocument.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-[#d0d7de] text-[#24292f] flex items-center justify-center font-medium text-xs">
              {initialLetter}
            </div>
            <span className="hidden sm:inline font-medium text-[#24292f]">{currentUser?.username || '...'}</span>
          </div>
          <button 
            onClick={onLogout}
            className="px-3 py-1 text-sm font-medium text-[#24292f] bg-[#f6f8fa] border border-[#d0d7de] rounded-md hover:bg-[#f3f4f6] transition-colors shadow-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {isSidebarVisible && (
          <aside className="w-72 flex flex-col border-r border-[#d0d7de] bg-[#f6f8fa] shrink-0">
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#24292f]">Documents</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-[#ddf4ff] text-[#0969da] rounded-full">
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
                  className="w-full py-1.5 px-3 text-sm font-medium text-[#24292f] bg-white border border-[#d0d7de] rounded-md hover:bg-[#f3f4f6] transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isUploadingDocument ? 'Uploading...' : 'Add document'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {documents.length === 0 ? (
                <div className="text-center py-8 px-4 text-sm text-[#57606a]">
                  No documents found. Upload a file to get started.
                </div>
              ) : (
                <ul className="space-y-1">
                  {documents.map(doc => {
                    const isActive = doc.id === activeDocumentId;
                    return (
                      <li key={doc.id}>
                        <div
                          onClick={() => handleDocumentSelection(doc.id)}
                          className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                            isActive ? 'bg-[#ddf4ff] text-[#0969da]' : 'hover:bg-[#ebecf0] text-[#24292f]'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase rounded border ${
                              isActive ? 'border-[#54aeff] text-[#0969da]' : 'border-[#d0d7de] text-[#57606a]'
                            }`}>
                              {doc.fileType}
                            </span>
                            <span className="truncate">{doc.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDocumentDeletion(doc.id, e)}
                            className={`shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                              isActive ? 'hover:bg-[#b6e3ff]' : 'hover:bg-[#d0d7de]'
                            }`}
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

            <div className="p-4 border-t border-[#d0d7de]">
              <h2 className="text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-3">
                Learning Stats
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-[#57606a]">Documents</span>
                  <span className="font-medium text-[#24292f]">{learningProgress.totalDocuments}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#57606a]">Conversations</span>
                  <span className="font-medium text-[#24292f]">{learningProgress.totalChats}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#57606a]">Quizzes Taken</span>
                  <span className="font-medium text-[#24292f]">{learningProgress.totalQuizzes}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#57606a]">Accuracy</span>
                  <span className="font-medium text-[#24292f]">{learningProgress.accuracy}%</span>
                </li>
              </ul>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#d0d7de]">
            <div>
              <h1 className="text-lg font-semibold text-[#24292f]">Assistant</h1>
              <p className="text-sm text-[#57606a] mt-0.5">
                {activeDocument ? `Analyzing: ${activeDocument.title}` : 'Select a document to begin'}
              </p>
            </div>
            {isAssistantTyping && (
              <span className="text-xs font-medium text-[#57606a] flex items-center gap-2">
                Processing...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatMessages.length === 0 && (
              <div className="max-w-2xl mx-auto mt-12 p-8 border border-[#d0d7de] rounded-md bg-[#f6f8fa] text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-[#24292f] text-white rounded-lg flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#24292f] mb-2">Welcome, {displayName}</h2>
                <p className="text-[#57606a] leading-relaxed">
                  {activeDocument
                    ? `Ask any questions about "${activeDocument.title}". The assistant will analyze the content and provide detailed answers.`
                    : 'Upload a document from the sidebar to start your learning session.'}
                </p>
              </div>
            )}

            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  msg.role === 'assistant' ? 'bg-[#24292f] text-white rounded-md' : 'bg-[#d0d7de] text-[#24292f]'
                }`}>
                  {msg.role === 'assistant' ? 'AI' : initialLetter}
                </div>
                <div className={`flex-1 text-[15px] leading-relaxed px-4 py-3 rounded-md border ${
                  msg.role === 'assistant' 
                    ? 'bg-white border-[#d0d7de] text-[#24292f]' 
                    : 'bg-[#f6f8fa] border-[#d0d7de] text-[#24292f]'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-[#0969da]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            {isAssistantTyping && (
              <div className="flex gap-4 max-w-4xl mx-auto">
                <div className="shrink-0 w-8 h-8 rounded-md bg-[#24292f] text-white flex items-center justify-center text-xs font-medium">
                  AI
                </div>
                <div className="px-4 py-3 border border-[#d0d7de] rounded-md bg-white flex items-center">
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-pulse mr-1" />
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-pulse mr-1" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 bg-[#d0d7de] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatScrollAnchorRef} />
          </div>

          <div className="p-4 bg-white border-t border-[#d0d7de]">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2">
              <textarea
                ref={chatTextareaRef}
                value={chatInputValue}
                onChange={handleChatInputChange}
                onKeyDown={handleChatInputKeyDown}
                placeholder={activeDocument ? `Ask a question about "${activeDocument.title}"...` : 'Type a message...'}
                rows={1}
                disabled={!activeDocument}
                className="flex-1 max-h-32 p-3 pr-12 text-[15px] bg-[#f6f8fa] border border-[#d0d7de] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-50 disabled:bg-[#f6f8fa]"
              />
              <button
                onClick={submitChatMessage}
                disabled={isAssistantTyping || !chatInputValue.trim() || !activeDocument}
                className="absolute right-2 bottom-2 p-2 text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] disabled:opacity-50 disabled:hover:bg-[#2da44e] transition-colors"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1.5l13 6.5-13 6.5v-4l9-2.5-9-2.5v-4z" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-2 text-xs text-[#57606a]">
              AI assistant may provide inaccurate information. Verify before trusting.
            </div>
          </div>
        </main>

        <aside className="w-80 border-l border-[#d0d7de] bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#d0d7de] bg-[#f6f8fa]">
            <h2 className="text-sm font-semibold text-[#24292f]">Learning Tools</h2>
          </div>

          <div className="p-4 space-y-3">
            <button
              onClick={requestDocumentSummary}
              disabled={!activeDocumentId || isToolProcessing}
              className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium text-[#24292f] border border-[#d0d7de] rounded-md hover:bg-[#f6f8fa] disabled:opacity-50 transition-colors shadow-sm"
            >
              <span className="text-[#0969da]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              Generate Summary
            </button>
            <button
              onClick={requestQuizGeneration}
              disabled={!activeDocumentId || isToolProcessing}
              className="w-full flex items-center gap-3 p-3 text-left text-sm font-medium text-[#24292f] border border-[#d0d7de] rounded-md hover:bg-[#f6f8fa] disabled:opacity-50 transition-colors shadow-sm"
            >
              <span className="text-[#2da44e]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              Generate Practice Quiz
            </button>
          </div>

          {activeTool && (
            <div className="flex-1 flex flex-col border-t border-[#d0d7de] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
                <h3 className="text-sm font-semibold text-[#24292f]">
                  {activeTool === 'summary' ? 'Document Summary' : 'Practice Quiz'}
                </h3>
                <button 
                  onClick={() => setActiveTool(null)}
                  className="p-1 text-[#57606a] hover:text-[#24292f] rounded-md hover:bg-[#ebecf0]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-[14px]">
                {isToolProcessing ? (
                  <div className="flex items-center gap-2 text-[#57606a] text-sm">
                    <span className="w-3 h-3 border-2 border-[#d0d7de] border-t-[#24292f] rounded-full animate-spin" />
                    Processing request...
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-[#24292f]">
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
  );
}