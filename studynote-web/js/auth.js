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

  // FIX: Thêm updateUser() bị thiếu — được gọi bởi saveProfile() trong redesign.js
  // Phương thức này cập nhật thông tin cá nhân của user (tên, trường, avatar)
  updateUser(updates) {
    if (!this.currentUser) return;
    Object.assign(this.currentUser, updates);
    // Persist vào localStorage để giữ qua F5
    const stored = ApiClient.getUserInfo() || {};
    Object.assign(stored, updates);
    localStorage.setItem('sn_user_info', JSON.stringify(stored));
    // Sync lên server nếu đã đăng nhập (best-effort, không block UI)
    if (ApiClient.isLoggedIn()) {
      const prefs = { displayName: updates.displayName, university: updates.university, avatarData: updates.avatarData };
      ApiClient.updatePreferences(JSON.stringify(prefs)).catch(err =>
        console.warn('[AuthManager.updateUser] Failed to sync to server:', err)
      );
    }
  },

  uid() { return this.currentUser?.username; },
  displayName() { return this.currentUser?.displayName || this.currentUser?.username || 'Bạn'; }
};

// AppData has been moved to boot.js to provide synchronous access for redesign.js

// Helper: date string YYYY-MM-DD từ Date object
function toDateStr(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
