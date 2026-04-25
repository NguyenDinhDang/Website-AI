/* ================================================================
   app.js — AI Learning Workspace
   Sections:
     1. Config & State
     2. Auth (login, register, logout)
     3. API helpers
     4. File Upload (real backend)
     5. Chat / AI (real backend)
     6. Tools (quiz, summary, notes — real backend)
     7. Session Timer
     8. Utilities
================================================================ */

'use strict';

// ================================================================
// 1. CONFIG & STATE
// ================================================================
const API_BASE = 'http://localhost:8000/api/v1';

const state = {
  files:         [],   // { id, name, ext, size, backendId }
  questionCount: 0,
  thinking:      false,
  user:          null, // { id, email, username, full_name }
  activeDocId:   null, // backendId of selected document for context
};

// ================================================================
// 2. AUTH
// ================================================================

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('formLogin').style.display    = isLogin ? 'flex' : 'none';
  document.getElementById('formRegister').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('btnLogin');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Vui lòng nhập email và mật khẩu.'; return; }

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập…';

  try {
    const data = await apiPost('/auth/login', { email, password }, false);
    localStorage.setItem('access_token',  data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await loadCurrentUser();
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Đăng nhập thất bại.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

async function doRegister() {
  const email     = document.getElementById('regEmail').value.trim();
  const username  = document.getElementById('regUsername').value.trim();
  const full_name = document.getElementById('regFullName').value.trim();
  const password  = document.getElementById('regPassword').value;
  const errEl     = document.getElementById('registerError');
  const btn       = document.getElementById('btnRegister');

  errEl.textContent = '';
  if (!email || !username || !password) { errEl.textContent = 'Vui lòng điền đầy đủ thông tin.'; return; }

  btn.disabled = true;
  btn.textContent = 'Đang tạo tài khoản…';

  try {
    await apiPost('/auth/register', { email, username, full_name, password }, false);
    const data = await apiPost('/auth/login', { email, password }, false);
    localStorage.setItem('access_token',  data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await loadCurrentUser();
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Đăng ký thất bại.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tạo tài khoản';
  }
}

function doLogout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  state.user      = null;
  state.files     = [];
  state.activeDocId = null;
  document.getElementById('appShell').style.display   = 'none';
  document.getElementById('authOverlay').style.display = 'flex';
}

async function loadCurrentUser() {
  state.user = await apiGet('/auth/me');
  document.getElementById('topbarUser').textContent = `[ ${state.user.username} ]`;
}

async function showApp() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('appShell').style.display    = 'flex';
  await loadDocumentList();
  await loadChatHistory();
}

(async function init() {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      await loadCurrentUser();
      await showApp();
      return;
    } catch { /* fall through */ }
  }
  document.getElementById('authOverlay').style.display = 'flex';
})();

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const overlay = document.getElementById('authOverlay');
  if (!overlay || overlay.style.display === 'none') return;
  const loginVisible = document.getElementById('formLogin').style.display !== 'none';
  if (loginVisible) doLogin(); else doRegister();
});

// ================================================================
// 3. API HELPERS
// ================================================================

function getToken() { return localStorage.getItem('access_token') || ''; }

async function apiFetch(path, options = {}, auth = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = 'Bearer ' + getToken();
      const res2 = await fetch(API_BASE + path, { ...options, headers });
      if (!res2.ok) await throwApiError(res2);
      return res2.status === 204 ? null : res2.json();
    }
    doLogout();
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!res.ok) await throwApiError(res);
  return res.status === 204 ? null : res.json();
}

async function throwApiError(res) {
  let msg = `Lỗi ${res.status}`;
  try { const body = await res.json(); msg = body.detail || body.message || msg; } catch { /**/ }
  throw new Error(msg);
}

async function tryRefreshToken() {
  const rt = localStorage.getItem('refresh_token');
  if (!rt) return false;
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token',  data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return true;
  } catch { return false; }
}

function apiGet(path, auth = true)        { return apiFetch(path, { method: 'GET' }, auth); }
function apiPost(path, body, auth = true) { return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, auth); }
function apiDelete(path)                  { return apiFetch(path, { method: 'DELETE' }); }

// ================================================================
// 4. FILE UPLOAD
// ================================================================

function triggerFileInput() { document.getElementById('fileInput').click(); }

document.getElementById('fileInput').addEventListener('change', function () {
  handleFiles(this.files);
  this.value = '';
});

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
dropZone.addEventListener('click', triggerFileInput);

async function handleFiles(fileList) {
  const allowed = ['pdf', 'txt', 'docx', 'md'];

  for (const file of Array.from(fileList)) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { showToast(`Định dạng .${ext} chưa được hỗ trợ`, 'warn'); continue; }
    if (state.files.some((f) => f.name === file.name)) { showToast(`"${file.name}" đã tồn tại`, 'warn'); continue; }

    showToast(`Đang tải lên: ${file.name}`, 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(API_BASE + '/documents/', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        body:    formData,
      });

      if (res.status === 401) { doLogout(); return; }
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload thất bại'); }

      const doc = await res.json();
      state.files.push({ id: doc.id, backendId: doc.id, name: doc.filename, ext: doc.file_type, size: formatSize(doc.file_size) });

      // Auto-select first uploaded document
      if (!state.activeDocId) setActiveDoc(doc.id);

      renderFileList();
      updateStats();
      showToast(`✓ Đã tải lên: ${doc.filename}`, 'info');
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'error');
    }
  }
}

async function loadDocumentList() {
  try {
    const data = await apiGet('/documents/');
    state.files = data.items.map((doc) => ({
      id: doc.id, backendId: doc.id,
      name: doc.filename, ext: doc.file_type, size: formatSize(doc.file_size),
    }));
    if (state.files.length > 0 && !state.activeDocId) setActiveDoc(state.files[0].backendId);
    renderFileList();
    updateStats();
  } catch { /* non-critical */ }
}

function setActiveDoc(backendId) {
  state.activeDocId = backendId;
  renderFileList();
}

function renderFileList() {
  const list    = document.getElementById('fileList');
  const empty   = document.getElementById('emptyDocs');
  const counter = document.getElementById('docCount');

  counter.textContent = state.files.length;
  empty.style.display = state.files.length === 0 ? 'block' : 'none';
  list.querySelectorAll('.file-item').forEach((el) => el.remove());

  state.files.forEach((file) => {
    const isActive = file.backendId === state.activeDocId;
    const item = document.createElement('div');
    item.className = `file-item${isActive ? ' active' : ''}`;
    item.dataset.id = file.id;
    item.innerHTML = `
      <span class="file-icon">${extIcon(file.ext)}</span>
      <span class="file-name" title="${escapeHTML(file.name)}" onclick="setActiveDoc(${file.backendId})" style="cursor:pointer">${escapeHTML(trimName(file.name, 18))}</span>
      <span class="file-ext">${file.ext}</span>
      <button class="file-remove" title="Xoá" onclick="removeFile(${file.backendId})">✕</button>
    `;
    list.appendChild(item);
  });
}

async function removeFile(backendId) {
  try {
    await apiDelete(`/documents/${backendId}`);
    state.files = state.files.filter((f) => f.backendId !== backendId);
    if (state.activeDocId === backendId) {
      state.activeDocId = state.files.length > 0 ? state.files[0].backendId : null;
    }
    renderFileList();
    updateStats();
    showToast('Đã xoá tài liệu', 'info');
  } catch (err) {
    showToast(`Lỗi xoá: ${err.message}`, 'error');
  }
}

// ================================================================
// 5. CHAT / AI
// ================================================================

async function loadChatHistory() {
  try {
    const url = state.activeDocId ? `/ai/chat/history?document_id=${state.activeDocId}` : '/ai/chat/history';
    const data = await apiGet(url);
    if (!data || data.items.length === 0) return;

    const chatWin = document.getElementById('chatWindow');
    chatWin.innerHTML = ''; // clear welcome msg

    data.items.forEach((item) => {
      appendMessage(item.role === 'user' ? 'user' : 'ai', escapeHTML(item.content));
    });
    state.questionCount = data.items.filter(i => i.role === 'user').length;
    updateStats();
  } catch { /* non-critical */ }
}

async function sendMessage() {
  if (state.thinking) return;

  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;

  appendMessage('user', escapeHTML(text));
  input.value = '';
  autoResizeTextarea(input);

  state.questionCount++;
  updateStats();

  const thinkingId = appendThinking();
  setStatus('busy');

  try {
    const body = { message: text };
    if (state.activeDocId) body.document_id = state.activeDocId;

    const data = await apiPost('/ai/chat', body);
    removeThinking(thinkingId);
    appendMessage('ai', escapeHTML(data.answer));
  } catch (err) {
    removeThinking(thinkingId);
    appendMessage('ai', `⚠ Lỗi: ${escapeHTML(err.message)}`);
  } finally {
    setStatus('idle');
  }
}

function appendMessage(role, html) {
  const chatWin = document.getElementById('chatWindow');
  const msg = document.createElement('div');
  msg.className = role === 'user' ? 'msg msg-user' : 'msg msg-ai';
  msg.innerHTML = `<span class="msg-icon">${role === 'user' ? '›' : '◈'}</span><div class="msg-body">${html}</div>`;
  chatWin.appendChild(msg);
  scrollChatToBottom();
}

function appendThinking() {
  const id = 'think-' + Date.now();
  const chatWin = document.getElementById('chatWindow');
  const msg = document.createElement('div');
  msg.className = 'msg msg-ai msg-thinking';
  msg.id = id;
  msg.innerHTML = `<span class="msg-icon">◈</span><div class="msg-body">Thinking<span class="dots"><span></span><span></span><span></span></span></div>`;
  chatWin.appendChild(msg);
  scrollChatToBottom();
  state.thinking = true;
  document.getElementById('btnAsk').disabled = true;
  return id;
}

function removeThinking(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  state.thinking = false;
  document.getElementById('btnAsk').disabled = false;
}

function clearChat() {
  document.getElementById('chatWindow').innerHTML = `
    <div class="msg msg-ai">
      <span class="msg-icon">◈</span>
      <div class="msg-body">Chat đã được xoá hiển thị. Đặt câu hỏi mới để tiếp tục!</div>
    </div>`;
  state.questionCount = 0;
  updateStats();
}

document.getElementById('chatInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

document.getElementById('chatInput').addEventListener('input', function () {
  autoResizeTextarea(this);
});

// ================================================================
// 6. TOOLS
// ================================================================

async function runTool(key) {
  const output = document.getElementById('toolOutput');
  const title  = document.getElementById('toolOutputTitle');
  const body   = document.getElementById('toolOutputBody');

  const titleMap = { quiz: '⚡ Bài tập', summary: '◎ Tóm tắt', notes: '✎ Ghi chú' };
  title.textContent = titleMap[key] || key;
  body.innerHTML    = '<span style="color:#555">Đang xử lý…</span>';
  output.style.display = 'block';
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    if (key === 'summary') {
      if (!state.activeDocId) { body.textContent = 'Chưa chọn tài liệu để tóm tắt.'; return; }
      const data = await apiPost('/ai/summarize', { document_id: state.activeDocId });
      body.textContent = data.summary;

    } else if (key === 'quiz') {
      if (!state.activeDocId) { body.textContent = 'Chưa có tài liệu. Hãy upload và chọn tài liệu trước.'; return; }
      const data = await apiPost('/ai/generate-quiz', { document_id: state.activeDocId, num_questions: 5 });
      body.innerHTML = renderQuiz(data.questions);

    } else if (key === 'notes') {
      const ts = new Date().toLocaleTimeString('vi-VN');
      const active = state.files.find(f => f.backendId === state.activeDocId);
      const docLine = active ? `  · ${active.name} (đang chọn)` : '  (chưa chọn tài liệu)';
      const others = state.files.filter(f => f.backendId !== state.activeDocId).map(f => `  · ${f.name}`).join('\n');
      body.textContent = `Ghi chú — ${ts}\n─────────────────────\nTài liệu:\n${docLine}${others ? '\n' + others : ''}\n\nTODO:\n  [ ] Đọc lại phần chính\n  [ ] Làm bài tập\n  [ ] Ôn tập trước kỳ thi`;
    }
  } catch (err) {
    body.textContent = `⚠ Lỗi: ${err.message}`;
  }
}

function renderQuiz(questions) {
  if (!questions || questions.length === 0) return 'Không tạo được câu hỏi.';

  return questions.map((q, qi) => {
    const opts = q.options.map((opt, oi) => `
      <label class="quiz-option">
        <input type="radio" name="q${qi}" value="${oi}" />
        ${escapeHTML(opt)}
      </label>
    `).join('');

    // Store quiz data as data attributes for grade API
    const qData = escapeHTML(JSON.stringify(q));
    return `
      <div class="quiz-question" data-qi="${qi}" data-q='${qData}'>
        <p class="quiz-q-text">${qi + 1}. ${escapeHTML(q.question)}</p>
        <div class="quiz-options">${opts}</div>
        <p class="quiz-explanation" id="exp-${qi}" style="display:none;font-size:12px;margin-top:6px"></p>
        <button class="btn btn-ghost btn-sm" onclick="checkAnswer(${qi}, ${q.correct_index}, ${JSON.stringify(escapeHTML(q.explanation || ''))})">
          Kiểm tra
        </button>
      </div>
    `;
  }).join('<hr style="border-color:#2a2a3a;margin:12px 0">');
}

function checkAnswer(qi, correctIndex, explanation) {
  const selected = document.querySelector(`input[name="q${qi}"]:checked`);
  const expEl    = document.getElementById(`exp-${qi}`);
  if (!selected) {
    expEl.style.display = 'block';
    expEl.style.color   = '#e8c547';
    expEl.textContent   = 'Hãy chọn một đáp án.';
    return;
  }

  const isCorrect = parseInt(selected.value) === correctIndex;
  expEl.style.display = 'block';
  expEl.style.color   = isCorrect ? '#00d4aa' : '#ff5c72';
  expEl.textContent   = (isCorrect ? '✓ Đúng! ' : '✗ Sai. ') + explanation;
}

function closeToolOutput() {
  document.getElementById('toolOutput').style.display = 'none';
}

// ================================================================
// 7. SESSION TIMER
// ================================================================
let sessionSeconds = 0;
setInterval(() => {
  sessionSeconds++;
  document.getElementById('statTime').textContent = formatTime(sessionSeconds);
}, 1000);

// ================================================================
// 8. UTILITIES
// ================================================================

function setStatus(mode) {
  const el = document.getElementById('statusIndicator');
  if (mode === 'busy') { el.textContent = '● thinking...'; el.classList.add('busy'); }
  else                  { el.textContent = '● idle';        el.classList.remove('busy'); }
}

function updateStats() {
  document.getElementById('statDocs').textContent      = state.files.length;
  document.getElementById('statQuestions').textContent = state.questionCount;
  document.getElementById('docCount').textContent      = state.files.length;
}

function scrollChatToBottom() {
  const el = document.getElementById('chatWindow');
  el.scrollTop = el.scrollHeight;
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function extIcon(ext) {
  return { pdf: '📄', txt: '📝', docx: '📘', md: '📋' }[ext] || '📄';
}

function trimName(name, maxLen) {
  return name.length <= maxLen ? name : name.slice(0, maxLen - 1) + '…';
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function escapeHTML(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const colors = { info: '#00d4aa', warn: '#e8c547', error: '#ff5c72' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:#1f1f26;border:1px solid ${colors[type]};
    color:${colors[type]};padding:8px 16px;border-radius:6px;
    font-size:12px;font-family:Consolas,monospace;
    z-index:9999;animation:fadeIn .2s ease;
    box-shadow:0 4px 16px rgba(0,0,0,.4);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
