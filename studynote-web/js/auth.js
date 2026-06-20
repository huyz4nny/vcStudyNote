// ===================================================
// StudyNote — LocalStorage Database + Auth System
// ===================================================

const SN_DB = {
  // ── Storage keys ──────────────────────────────────
  USERS_KEY:   'sn_users',
  SESSION_KEY: 'sn_session',
  DATA_KEY:    uid => `sn_data_${uid}`,

  // ── Users ─────────────────────────────────────────
  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || []; }
    catch { return []; }
  },
  saveUsers(users) { localStorage.setItem(this.USERS_KEY, JSON.stringify(users)); },

  findUser(username) {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  createUser(username, password, displayName, university) {
    const users = this.getUsers();
    if (this.findUser(username)) return { error: 'Tên đăng nhập đã tồn tại' };
    const uid = 'u' + Date.now();
    const user = { uid, username, password: this._hash(password), displayName, university, createdAt: new Date().toISOString() };
    users.push(user);
    this.saveUsers(users);
    this.seedData(uid, displayName);
    return { user };
  },

  // Simple hash (not cryptographic — for demo only)
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h.toString(16);
  },

  // ── Session ───────────────────────────────────────
  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },
  setSession(uid) { localStorage.setItem(this.SESSION_KEY, JSON.stringify({ uid, loginAt: Date.now() })); },
  clearSession() { localStorage.removeItem(this.SESSION_KEY); },

  // ── App Data ──────────────────────────────────────
  getData(uid) {
    try { return JSON.parse(localStorage.getItem(this.DATA_KEY(uid))); }
    catch { return null; }
  },
  saveData(uid, data) {
    try { localStorage.setItem(this.DATA_KEY(uid), JSON.stringify(data)); }
    catch (e) { console.error('Save failed:', e); }
  },

  // ── Seed data for new users ───────────────────────
  seedData(uid, displayName) {
    const today = new Date(); today.setHours(0,0,0,0);
    // Khóa ngày theo LỊCH ĐỊA PHƯƠNG (khớp với dateKey ở redesign.js). Dùng
    // toISOString() ở đây sẽ lệch ngày với múi giờ VN, khiến task seed "hôm nay"
    // rơi sang hôm qua.
    const dk = d => {
      const x = (d instanceof Date) ? d : new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    };
    const ad = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r.toISOString(); };

    const data = {
      subjects: [
        { id: 1, name: 'Cấu Trúc Dữ Liệu & Giải Thuật', code: 'CSD201', lecturer: 'Nguyễn Văn An', credits: 3, colorHex: '#6366f1', semester: 'SU2026', isActive: true, passThreshold: 5 },
        { id: 2, name: 'Dự Án Lập Trình Java', code: 'PRJ301', lecturer: 'Trần Thị Bình', credits: 3, colorHex: '#10b981', semester: 'SU2026', isActive: true, passThreshold: 5 },
        { id: 3, name: 'Cơ Sở Dữ Liệu', code: 'DBI202', lecturer: 'Lê Minh Cường', credits: 3, colorHex: '#f59e0b', semester: 'SU2026', isActive: true, passThreshold: 5 },
        { id: 4, name: 'Internet of Things', code: 'IOT102', lecturer: 'Phạm Thu Hà', credits: 3, colorHex: '#ec4899', semester: 'SU2026', isActive: true, passThreshold: 5 },
      ],
      notes: [
        { id: 1, subjectId: 1, title: 'Thuật toán QuickSort', content: 'QuickSort là thuật toán chia để trị.\nĐộ phức tạp trung bình: O(n log n)', tag: 'lý-thuyết', isPinned: true, createdAt: ad(today,-3), updatedAt: ad(today,-1) },
        { id: 2, subjectId: 1, title: 'Lưu ý thi cuối kỳ', content: 'Ôn: Linked List, Stack, Queue, BST, Graph BFS/DFS', tag: 'lưu-ý', isPinned: true, createdAt: ad(today,-5), updatedAt: ad(today,-2) },
        { id: 3, subjectId: 2, title: 'Mô hình MVC trong Java', content: 'Model - View - Controller pattern trong Spring Boot', tag: 'lý-thuyết', isPinned: false, createdAt: ad(today,-7), updatedAt: ad(today,-7) },
      ],
      assignments: [
        { id: 1, subjectId: 1, title: 'Lab 3 — Linked List', description: 'Cài đặt Singly và Doubly Linked List', deadline: ad(today,0), priority: 3, status: 0 },
        { id: 2, subjectId: 2, title: 'Project Report Java MVC', description: 'Báo cáo dự án 15 trang', deadline: ad(today,2), priority: 2, status: 1 },
        { id: 3, subjectId: 3, title: 'SQL Script — CSDL Bán hàng', description: 'Thiết kế CSDL quản lý bán hàng', deadline: ad(today,5), priority: 1, status: 0 },
        { id: 4, subjectId: 2, title: 'Code Review Spring Boot', description: 'Demo API endpoints với GV', deadline: ad(today,-1), priority: 2, status: 1 },
      ],
      gradeItems: [
        { id: 1, subjectId: 1, name: 'Chuyên cần', weight: 10, value: 9, condition: null },
        { id: 2, subjectId: 1, name: 'Lab (Thực hành)', weight: 30, value: 8, condition: '>5' },
        { id: 3, subjectId: 1, name: 'Giữa kỳ', weight: 20, value: 7.5, condition: null },
        { id: 4, subjectId: 1, name: 'Cuối kỳ', weight: 40, value: null, condition: '>4' },
        { id: 5, subjectId: 2, name: 'Chuyên cần', weight: 10, value: 10, condition: null },
        { id: 6, subjectId: 2, name: 'Bài tập lớn', weight: 40, value: 8.5, condition: null },
        { id: 7, subjectId: 2, name: 'Cuối kỳ', weight: 50, value: null, condition: '>4' },
      ],
      examReminders: [
        { id: 8, subjectId: 1, title: 'Kiểm tra 15 phút: QuickSort & độ phức tạp', examDate: dk(ad(today,1)), note: 'Mang máy tính, ôn phần đệ quy', createdAt: ad(today,-1) },
        { id: 9, subjectId: 3, title: 'Vấn đáp các loại JOIN', examDate: dk(ad(today,4)), note: '', createdAt: ad(today,-1) },
      ],
      checklistData: {
        [dk(ad(today,-1))]: [
          { id: 101, content: 'Ôn linked list CSD201', isDone: true, sortOrder: 0, subjectId: 1, completedAt: ad(today,-1) },
          { id: 102, content: 'Push code Java lên GitHub', isDone: true, sortOrder: 1, subjectId: 2, completedAt: ad(today,-1) },
          { id: 103, content: 'Đọc slide IoT chương 3', isDone: false, sortOrder: 2, subjectId: 4, completedAt: null },
        ],
        [dk(today)]: [
          { id: 201, content: 'Ôn QuickSort & MergeSort', isDone: true, sortOrder: 0, subjectId: 1, completedAt: new Date().toISOString() },
          { id: 202, content: 'Fix bug authenticate PRJ301', isDone: true, sortOrder: 1, subjectId: 2, completedAt: new Date().toISOString() },
          { id: 203, content: 'Nộp Lab 3 trên portal', isDone: false, sortOrder: 2, subjectId: 1, completedAt: null },
          { id: 204, content: 'Viết báo cáo PRJ301', isDone: false, sortOrder: 3, subjectId: 2, completedAt: null },
          { id: 205, content: 'Review SQL script DBI202', isDone: false, sortOrder: 4, subjectId: 3, completedAt: null },
        ]
      },
      streaks: {
        daily: {},
        currentStreak: 1,
        bestStreak: 3,
        allClearStreak: 0,
        bestAllClearStreak: 1,
        subjectStreaks: { 1: { current: 2, best: 5 }, 2: { current: 1, best: 3 }, 3: { current: 0, best: 2 }, 4: { current: 0, best: 1 } }
      },
      curriculumData: [],
      nextId: 1000
    };

    this.saveData(uid, data);
  }
};

// ── Auth Manager ────────────────────────────────────
const AuthManager = {
  currentUser: null,

  init() {
    const session = SN_DB.getSession();
    if (session) {
      const users = SN_DB.getUsers();
      this.currentUser = users.find(u => u.uid === session.uid) || null;
    }
    return !!this.currentUser;
  },

  login(username, password) {
    const user = SN_DB.findUser(username);
    if (!user) return { error: 'Tài khoản không tồn tại' };
    if (user.password !== SN_DB._hash(password)) return { error: 'Mật khẩu không đúng' };
    this.currentUser = user;
    SN_DB.setSession(user.uid);
    return { user };
  },

  register(username, password, displayName, university) {
    if (!username || !password || !displayName) return { error: 'Vui lòng điền đầy đủ thông tin' };
    if (username.length < 3) return { error: 'Tên đăng nhập phải ≥ 3 ký tự' };
    if (password.length < 6) return { error: 'Mật khẩu phải ≥ 6 ký tự' };
    const result = SN_DB.createUser(username, password, displayName, university);
    if (result.error) return result;
    this.currentUser = result.user;
    SN_DB.setSession(result.user.uid);
    return { user: result.user };
  },

  updateUser(updates) {
    if (!this.currentUser) return;
    Object.assign(this.currentUser, updates);
    const users = SN_DB.getUsers();
    const idx = users.findIndex(u => u.uid === this.currentUser.uid);
    if (idx !== -1) {
      users[idx] = this.currentUser;
      SN_DB.saveUsers(users);
    }
  },

  logout() {
    this.currentUser = null;
    SN_DB.clearSession();
  },

  uid() { return this.currentUser?.uid; }
};

// ── Data Access Layer ───────────────────────────────
// All app data read/written through these functions
const AppData = {
  _cache: null,

  get() {
    if (!this._cache) {
      this._cache = SN_DB.getData(AuthManager.uid());
    }
    return this._cache;
  },

  save() {
    if (this._cache) SN_DB.saveData(AuthManager.uid(), this._cache);
  },

  reload() { this._cache = null; return this.get(); },

  // Shorthand getters that also auto-save on modification
  subjects()     { return this.get().subjects; },
  notes()        { return this.get().notes; },
  assignments()  { return this.get().assignments; },
  gradeItems()   { return this.get().gradeItems || (this.get().gradeItems = []); },
  examReminders(){ return this.get().examReminders || (this.get().examReminders = []); },
  checklist()    { return this.get().checklistData || (this.get().checklistData = {}); },
  streaks()      { return this.get().streaks; },
  curriculum()   { return this.get().curriculumData || (this.get().curriculumData = []); },
  semesters()    { return this.get().userSemesters || (this.get().userSemesters = []); },
  nextId()       { return ++this.get().nextId; },
};
