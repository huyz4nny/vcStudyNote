// ===================================================
// StudyNote — Auth System (API-powered)
// Thay thế localStorage bằng gọi Backend API thực
// ===================================================

// ── Auth Manager ────────────────────────────────────
const AuthManager = {
  currentUser: null,

  init() {
    if (ApiClient.isLoggedIn()) {
      this.currentUser = ApiClient.getUserInfo();
      return !!this.currentUser;
    }
    return false;
  },

  async login(username, password) {
    try {
      const data = await ApiClient.login(username, password);
      this.currentUser = { username: data.username, email: data.email, displayName: data.displayName };
      return { user: this.currentUser };
    } catch (err) {
      return { error: err.message || 'Đăng nhập thất bại' };
    }
  },

  async register(username, password, displayName, email) {
    if (!username || !password || !displayName) return { error: 'Vui lòng điền đầy đủ thông tin' };
    if (username.length < 3) return { error: 'Tên đăng nhập phải ≥ 3 ký tự' };
    if (password.length < 6) return { error: 'Mật khẩu phải ≥ 6 ký tự' };
    if (!email) return { error: 'Vui lòng nhập email' };

    try {
      await ApiClient.register(username, email, password, displayName);
      // Tự động login sau khi đăng ký
      return await this.login(username, password);
    } catch (err) {
      return { error: err.message || 'Đăng ký thất bại' };
    }
  },

  logout() {
    this.currentUser = null;
    ApiClient.logout();
  },

  uid() { return this.currentUser?.username; },
  displayName() { return this.currentUser?.displayName || this.currentUser?.username || 'Bạn'; }
};

// ── App Data (API-backed) ────────────────────────────
// Thay thế localStorage data layer bằng API calls
// Dữ liệu được cache trong memory trong phiên làm việc
const AppData = {
  _subjects: null,
  _notes: null,
  _assignments: null,
  _checklistCache: {}, // { 'YYYY-MM-DD': [...items] }

  // ── Subjects ────────────────────────────────────
  async subjects() {
    if (!this._subjects) {
      this._subjects = await ApiClient.getSubjects();
    }
    return this._subjects || [];
  },

  async refreshSubjects() {
    this._subjects = await ApiClient.getSubjects();
    return this._subjects;
  },

  // ── Notes ────────────────────────────────────────
  async notes(params = {}) {
    // Notes không cache toàn bộ vì có filter
    return (await ApiClient.getNotes(params)) || [];
  },

  // ── Assignments ───────────────────────────────────
  async assignments(params = {}) {
    return (await ApiClient.getAssignments(params)) || [];
  },

  // ── Checklist ─────────────────────────────────────
  async checklist(dateStr = null) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    if (!this._checklistCache[key]) {
      this._checklistCache[key] = await ApiClient.getChecklist(dateStr);
    }
    return this._checklistCache[key];
  },

  invalidateChecklist(dateStr = null) {
    if (dateStr) delete this._checklistCache[dateStr];
    else this._checklistCache = {};
  },

  // ── Toàn bộ reset cache khi logout ────────────────
  reset() {
    this._subjects = null;
    this._notes = null;
    this._assignments = null;
    this._checklistCache = {};
  }
};

// Helper: date string YYYY-MM-DD từ Date object
function toDateStr(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
