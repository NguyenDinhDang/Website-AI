/* ================================================================
   app.js — AI Learning Workspace
   Sections:
     1. State
     2. File Upload
     3. Chat / AI
     4. Tools (quiz, summary, notes)
     5. Session Timer
     6. Utilities
================================================================ */

'use strict';

// ================================================================
// 1. STATE
// ================================================================
const state = {
  files:         [],   // { id, name, ext, size }
  questionCount: 0,    // how many questions asked
  thinking:      false // lock while AI is "thinking"
};

// ================================================================
// 2. FILE UPLOAD
// ================================================================

/** Open the hidden file input */
function triggerFileInput() {
  document.getElementById('fileInput').click();
}

/** Handle files chosen via input[type=file] */
document.getElementById('fileInput').addEventListener('change', function () {
  handleFiles(this.files);
  this.value = ''; // reset so same file can be re-added
});

/** Handle drag-and-drop */
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('click', triggerFileInput);

/** Core: receive a FileList, add to state, re-render */
function handleFiles(fileList) {
  const allowed = ['pdf', 'txt', 'docx', 'md'];

  Array.from(fileList).forEach((file) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(ext)) {
      showToast(`Định dạng .${ext} chưa được hỗ trợ`, 'warn');
      return;
    }

    // Avoid duplicate names in same session
    const duplicate = state.files.some((f) => f.name === file.name);
    if (duplicate) {
      showToast(`"${file.name}" đã tồn tại`, 'warn');
      return;
    }

    state.files.push({
      id:   Date.now() + Math.random(),
      name: file.name,
      ext,
      size: formatSize(file.size)
    });
  });

  renderFileList();
  updateStats();
}

/** Render the sidebar file list */
function renderFileList() {
  const list    = document.getElementById('fileList');
  const empty   = document.getElementById('emptyDocs');
  const counter = document.getElementById('docCount');

  counter.textContent = state.files.length;

  if (state.files.length === 0) {
    empty.style.display = 'block';
    // Remove all file items
    list.querySelectorAll('.file-item').forEach((el) => el.remove());
    return;
  }

  empty.style.display = 'none';

  // Rebuild from scratch (simple approach — fine for small lists)
  list.querySelectorAll('.file-item').forEach((el) => el.remove());

  state.files.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.dataset.id = file.id;

    item.innerHTML = `
      <span class="file-icon">${extIcon(file.ext)}</span>
      <span class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(trimName(file.name, 18))}</span>
      <span class="file-ext">${file.ext}</span>
      <button class="file-remove" title="Xoá" onclick="removeFile(${file.id})">✕</button>
    `;

    list.appendChild(item);
  });
}

/** Remove a file from state by id */
function removeFile(id) {
  state.files = state.files.filter((f) => f.id !== id);
  renderFileList();
  updateStats();
  showToast('Đã xoá tài liệu', 'info');
}

// ================================================================
// 3. CHAT / AI
// ================================================================

/** Send user message, show fake AI response */
function sendMessage() {
  if (state.thinking) return;

  const input = document.getElementById('chatInput');
  const text  = input.value.trim();

  if (!text) return;

  // Append user bubble
  appendMessage('user', text);
  input.value = '';
  autoResizeTextarea(input);

  state.questionCount++;
  updateStats();

  // Show thinking indicator
  const thinkingId = appendThinking();
  setStatus('busy');

  // Fake delay: 1.2 – 2s
  const delay = 1200 + Math.random() * 800;

  setTimeout(() => {
    removeThinking(thinkingId);
    appendMessage('ai', buildFakeResponse(text));
    setStatus('idle');
  }, delay);
}

/** Build a fake AI response based on the question */
function buildFakeResponse(question) {
  const hasDoc = state.files.length > 0;
  const docRef = hasDoc
    ? `Dựa trên ${state.files.length} tài liệu đã upload, `
    : 'Dựa trên kiến thức của tôi, ';

  const templates = [
    `${docRef}câu trả lời cho "${escapeHTML(question)}" là: đây là một chủ đề thú vị. Hãy tiếp tục đặt câu hỏi để tìm hiểu sâu hơn.`,
    `${docRef}tôi tìm thấy thông tin liên quan đến "${escapeHTML(question)}". Nội dung tài liệu đề cập đến các khái niệm cốt lõi mà bạn cần nắm vững.`,
    `${docRef}để trả lời "${escapeHTML(question)}", cần hiểu rõ bối cảnh. Hãy xem lại các phần quan trọng trong tài liệu bạn đã cung cấp.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/** Append a message bubble to the chat window */
function appendMessage(role, text) {
  const window_el = document.getElementById('chatWindow');

  const msg = document.createElement('div');
  msg.className = role === 'user' ? 'msg msg-user' : 'msg msg-ai';

  msg.innerHTML = `
    <span class="msg-icon">${role === 'user' ? '›' : '◈'}</span>
    <div class="msg-body">${text}</div>
  `;

  window_el.appendChild(msg);
  scrollChatToBottom();
}

/** Append animated "thinking..." indicator, return unique id */
function appendThinking() {
  const id     = 'think-' + Date.now();
  const chatWin = document.getElementById('chatWindow');

  const msg = document.createElement('div');
  msg.className = 'msg msg-ai msg-thinking';
  msg.id = id;
  msg.innerHTML = `
    <span class="msg-icon">◈</span>
    <div class="msg-body">
      Thinking<span class="dots"><span></span><span></span><span></span></span>
    </div>
  `;

  chatWin.appendChild(msg);
  scrollChatToBottom();
  state.thinking = true;
  document.getElementById('btnAsk').disabled = true;
  return id;
}

/** Remove thinking indicator by id */
function removeThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  state.thinking = false;
  document.getElementById('btnAsk').disabled = false;
}

/** Clear all messages and reset to welcome */
function clearChat() {
  const chatWin = document.getElementById('chatWindow');
  chatWin.innerHTML = `
    <div class="msg msg-ai">
      <span class="msg-icon">◈</span>
      <div class="msg-body">Chat đã được xoá. Đặt câu hỏi mới để tiếp tục!</div>
    </div>
  `;
  state.questionCount = 0;
  updateStats();
}

// Enter to send, Shift+Enter for newline
document.getElementById('chatInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea as user types
document.getElementById('chatInput').addEventListener('input', function () {
  autoResizeTextarea(this);
});

// ================================================================
// 4. TOOLS
// ================================================================

/** Map tool key → config */
const TOOLS = {
  quiz: {
    title: '⚡ Bài tập',
    generate(files) {
      if (files.length === 0) {
        return 'Chưa có tài liệu. Hãy upload tài liệu trước khi tạo bài tập.\n';
      }
      return `Bài tập từ tài liệu "${files[0].name}":\n\n`
        + `Câu 1: Khái niệm chính trong tài liệu là gì?\n`
        + `  A. Lựa chọn A\n`
        + `  B. Lựa chọn B ✓\n`
        + `  C. Lựa chọn C\n\n`
        + `Câu 2: Ứng dụng thực tiễn của chủ đề này là?\n`
        + `  A. Lựa chọn A ✓\n`
        + `  B. Lựa chọn B\n`
        + `  C. Lựa chọn C`;
    }
  },
  summary: {
    title: '◎ Tóm tắt',
    generate(files) {
      if (files.length === 0) {
        return 'Chưa có tài liệu để tóm tắt.\n';
      }
      const names = files.map((f) => `• ${f.name}`).join('\n');
      return `Tóm tắt ${files.length} tài liệu:\n\n${names}\n\n`
        + `Nội dung chính:\n`
        + `— Phần 1: Giới thiệu và bối cảnh tổng quan.\n`
        + `— Phần 2: Các khái niệm và định nghĩa cốt lõi.\n`
        + `— Phần 3: Ứng dụng và ví dụ minh hoạ.\n`
        + `— Kết luận: Tổng hợp điểm quan trọng cần nhớ.`;
    }
  },
  notes: {
    title: '✎ Ghi chú',
    generate(files) {
      const ts = new Date().toLocaleTimeString('vi-VN');
      return `Ghi chú — ${ts}\n`
        + `─────────────────────\n`
        + (files.length > 0
          ? `Tài liệu đang học:\n${files.map((f) => `  · ${f.name}`).join('\n')}\n\n`
          : '')
        + `TODO:\n`
        + `  [ ] Đọc lại phần chính\n`
        + `  [ ] Làm bài tập\n`
        + `  [ ] Ôn tập trước kỳ thi`;
    }
  }
};

/** Run a tool and display output in the right panel */
function runTool(key) {
  const tool   = TOOLS[key];
  const output = document.getElementById('toolOutput');
  const title  = document.getElementById('toolOutputTitle');
  const body   = document.getElementById('toolOutputBody');

  title.textContent = tool.title;
  body.textContent  = tool.generate(state.files);
  output.style.display = 'block';

  // Scroll right panel to show output
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Close the tool output panel */
function closeToolOutput() {
  document.getElementById('toolOutput').style.display = 'none';
}

// ================================================================
// 5. SESSION TIMER
// ================================================================
let sessionSeconds = 0;

setInterval(() => {
  sessionSeconds++;
  document.getElementById('statTime').textContent = formatTime(sessionSeconds);
}, 1000);

// ================================================================
// 6. UTILITIES
// ================================================================

/** Update topbar status indicator */
function setStatus(mode) {
  const el = document.getElementById('statusIndicator');
  if (mode === 'busy') {
    el.textContent = '● thinking...';
    el.classList.add('busy');
  } else {
    el.textContent = '● idle';
    el.classList.remove('busy');
  }
}

/** Update right-panel stat counters */
function updateStats() {
  document.getElementById('statDocs').textContent      = state.files.length;
  document.getElementById('statQuestions').textContent = state.questionCount;
  document.getElementById('docCount').textContent      = state.files.length;
}

/** Scroll chat window to the bottom */
function scrollChatToBottom() {
  const el = document.getElementById('chatWindow');
  el.scrollTop = el.scrollHeight;
}

/** Auto-resize textarea to content (max ~120px enforced via CSS) */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/** Get an icon character for a given file extension */
function extIcon(ext) {
  const map = { pdf: '📄', txt: '📝', docx: '📘', md: '📋' };
  return map[ext] || '📄';
}

/** Trim a filename to maxLen characters */
function trimName(name, maxLen) {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + '…';
}

/** Format bytes to human-readable size */
function formatSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Format seconds to MM:SS */
function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

/** Escape HTML to prevent XSS */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Minimal toast notification (appended to body, auto-removes) */
function showToast(message, type = 'info') {
  const colors = { info: '#00d4aa', warn: '#e8c547', error: '#ff5c72' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: #1f1f26; border: 1px solid ${colors[type]};
    color: ${colors[type]}; padding: 8px 16px; border-radius: 6px;
    font-size: 12px; font-family: Consolas, monospace;
    z-index: 9999; animation: fadeIn .2s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}