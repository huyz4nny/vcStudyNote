// ===================================================
// StudyNote — API Client
// Lớp kết nối Frontend ↔ Backend ASP.NET Core API
// ===================================================

const API_BASE = 'http://localhost:5000/api';

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

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (res.status === 204) return null; // No Content
    if (res.status === 401) {
      this._clearToken();
      window.location.reload();
      return;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.message || data?.errors || 'Lỗi không xác định';
      throw new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    }
    return data;
  },

  get(path)         { return this._fetch(path, { method: 'GET' }); },
  post(path, body)  { return this._fetch(path, { method: 'POST',  body: JSON.stringify(body) }); },
  put(path, body)   { return this._fetch(path, { method: 'PUT',   body: JSON.stringify(body) }); },
  patch(path, body) { return this._fetch(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  del(path)         { return this._fetch(path, { method: 'DELETE' }); },

  // ── Auth ─────────────────────────────────────────
  async register(username, email, password, displayName) {
    const data = await this.post('/auth/register', { username, email, password, displayName });
    return data;
  },

  async login(username, password) {
    const data = await this.post('/auth/login', { username, password });
    if (data?.token) {
      this._setToken(data.token);
      // Lưu info user vào localStorage để dùng ngay (không cần fetch lại)
      localStorage.setItem('sn_user_info', JSON.stringify({
        username: data.username,
        email: data.email,
        displayName: data.displayName
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
