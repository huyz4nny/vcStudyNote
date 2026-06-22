// ===================================================
// StudyNote — API Client
// Lớp kết nối Frontend ↔ Backend ASP.NET Core API
// ===================================================

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : (window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/api').replace('//', '/');

const ApiClient = {
  // ── Token management ─────────────────────────────
  _getToken() { return localStorage.getItem('sn_jwt_token'); },
  _setToken(t) { localStorage.setItem('sn_jwt_token', t); },
  _clearToken() { localStorage.removeItem('sn_jwt_token'); },

  isLoggedIn() { return !!this._getToken(); },

  // ── Core fetch wrapper ───────────────────────────
  async _fetch(path, options = {}) {
    const token = this._getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    // Block Live Server reload during write operations (they change DB files)
    const isWrite = options.method && options.method !== 'GET';
    if (isWrite) window._blockReload = true;

    // FIX: Thêm AbortController timeout 10 giây.
    // Khi API server không chạy, fetch() trử nên pending mãi mãi và loading overlay
    // không bao giờ ẩn → gây ra màn hình đen. Timeout 10s buộc promise reject sớm.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (isWrite) setTimeout(() => { window._blockReload = false; }, 2000);
      // Biến AbortError thành thông báo rõ ràng hơn
      if (err.name === 'AbortError') {
        throw new Error('Không thể kết nối đến máy chủ (hết thời gian chờ). Vui lòng kiểm tra máy chủ và thử lại.');
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (res.status === 204) {
      if (isWrite) setTimeout(() => { window._blockReload = false; }, 2000);
      return null;
    }
    if (res.status === 401) {
      if (isWrite) setTimeout(() => { window._blockReload = false; }, 2000);
      const errText = await res.text();
      let errMsg = 'Phiên đăng nhập không hợp lệ (401 Unauthorized). Vui lòng tải lại trang.';
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) errMsg = errJson.message;
      } catch (e) {}

      if (!path.includes('/auth/login')) {
        this._clearToken();
      }
      throw new Error(errMsg);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (isWrite) setTimeout(() => { window._blockReload = false; }, 2000);
      const msg = data?.message || data?.errors || 'Lỗi không xác định';
      throw new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    }
    // Release reload block after a delay to let DB file settle
    if (isWrite) setTimeout(() => { window._blockReload = false; }, 2000);
    return data;
  },

  get(path)         { return this._fetch(path, { method: 'GET' }); },
  post(path, body)  { return this._fetch(path, { method: 'POST',  body: JSON.stringify(body) }); },
  put(path, body)   { return this._fetch(path, { method: 'PUT',   body: JSON.stringify(body) }); },
  patch(path, body) { return this._fetch(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  del(path)         { return this._fetch(path, { method: 'DELETE' }); },

  // ── Curriculum ───────────────────────────────────
  getCurriculum() { return this.get('/curriculum'); },
  syncCurriculum(curriculumArray) { return this.post('/curriculum/sync', curriculumArray); },

  // ── Transcript Sync ──────────────────────────────────────────
  // NOTE: syncTranscript is defined below in the Subjects section (line ~125).
  // Do NOT add a second definition here — it would silently shadow the first one.

  // ── Preferences ──────────────────────────────────
  getPreferences() { return this.get('/auth/preferences'); },
  updatePreferences(prefsJson) { return this.post('/auth/preferences', { preferencesJson: prefsJson }); },

  // ── Auth ─────────────────────────────────────────
  async register(username, email, password, displayName) {
    const data = await this.post('/auth/register', { username, email, password, displayName });
    return data;
  },

  async login(username, password) {
    const data = await this.post('/auth/login', { username, password });
    const token = data?.token || data?.Token;
    if (token) {
      this._setToken(token);
      // Lưu info user vào localStorage để dùng ngay (không cần fetch lại)
      localStorage.setItem('sn_user_info', JSON.stringify({
        username: data.username || data.Username || username,
        email: data.email || data.Email || "",
        displayName: data.displayName || data.DisplayName || username
      }));
    }
    return data;
  },

  logout() {
    this._clearToken();
    localStorage.removeItem('sn_user_info');
  },

  getUserInfo() {
    try { return JSON.parse(localStorage.getItem('sn_user_info')); }
    catch { return null; }
  },

  // ── Subjects ─────────────────────────────────────
  getSubjects()       { return this.get('/subjects'); },
  createSubject(body) { return this.post('/subjects', body); },
  updateSubject(id, body) { return this.put(`/subjects/${id}`, body); },
  deleteSubject(id)   { return this.del(`/subjects/${id}`); },
  syncTranscript(body) { return this.post('/subjects/sync-transcript', body); },

  // ── Grades ───────────────────────────────────────
  createGradeItem(body)       { return this.post('/grades', body); },
  updateGradeItem(id, body)   { return this.put(`/grades/${id}`, body); },
  deleteGradeItem(id)         { return this.del(`/grades/${id}`); },
  syncGrades(subjectId, body) { return this.post(`/grades/sync/${subjectId}`, body); },

  // ── Notes ────────────────────────────────────────
  getNotes(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/notes${q ? '?' + q : ''}`);
  },
  createNote(body)       { return this.post('/notes', body); },
  updateNote(id, body)   { return this.put(`/notes/${id}`, body); },
  togglePin(id)          { return this.patch(`/notes/${id}/pin`); },
  deleteNote(id)         { return this.del(`/notes/${id}`); },

  // ── Assignments ───────────────────────────────────
  getAssignments(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/assignments${q ? '?' + q : ''}`);
  },
  getUpcoming(count = 5)         { return this.get(`/assignments/upcoming?count=${count}`); },
  createAssignment(body)         { return this.post('/assignments', body); },
  updateAssignment(id, body)     { return this.put(`/assignments/${id}`, body); },
  patchAssignmentStatus(id, status) { return this.patch(`/assignments/${id}/status`, { status }); },
  deleteAssignment(id)           { return this.del(`/assignments/${id}`); },

  // ── Checklist ─────────────────────────────────────
  getChecklist(date = null) {
    return this.get(`/checklist${date ? '?date=' + date : ''}`);
  },
  getTodayStats()             { return this.get('/checklist/today-stats'); },
  addChecklistItem(content, date = null) {
    return this.post('/checklist/items', { content, date });
  },
  toggleChecklistItem(id)    { return this.patch(`/checklist/items/${id}/toggle`); },
  updateChecklistItem(id, content) { return this.put(`/checklist/items/${id}`, { content, date: null }); },
  deleteChecklistItem(id)    { return this.del(`/checklist/items/${id}`); },
  reorderChecklist(itemIds)  { return this.post('/checklist/reorder', { itemIds }); },
  copyYesterdayChecklist()   { return this.post('/checklist/copy-yesterday'); },
};
