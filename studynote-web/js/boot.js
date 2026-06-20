// ===================================================
// StudyNote — Boot / Bridge Layer
// Nạp dữ liệu từ API rồi inject vào redesign.js
// ===================================================

// Override AppData để dùng dữ liệu đã tải từ API
// redesign.js gọi AppData.subjects(), AppData.notes(),... đồng bộ
// => ta pre-load dữ liệu vào đây trước khi app khởi động

const _apiStore = {
  subjects: [],
  notes: [],
  assignments: [],
  gradeItems: [],
  examReminders: [],
  checklistData: {},
  streaks: { daily: {}, currentStreak: 0, bestStreak: 0 },
  curriculumData: [],
  userSemesters: [],
  nextId: 9000,
  activeSemester: ''
};

// Ghi đè AppData để redirect sang _apiStore
// (redesign.js dùng AppData.subjects(), AppData.notes()... đồng bộ)
const AppData = {
  _cache: _apiStore,

  get() { return this._cache; },
  save() {
    // Chỉ lưu preferences (không phải data — data đã lưu ở server)
    try {
      const prefs = {
        activeSemester: this._cache.activeSemester,
        userSemesters: this._cache.userSemesters,
        sn_last_page: localStorage.getItem('sn_last_page')
      };
      localStorage.setItem('sn_prefs', JSON.stringify(prefs));
    } catch (e) { console.warn('Could not save prefs:', e); }
  },
  reload() { return this._cache; },

  subjects()      { return this._cache.subjects; },
  notes()         { return this._cache.notes; },
  assignments()   { return this._cache.assignments; },
  gradeItems()    { return this._cache.gradeItems || (this._cache.gradeItems = []); },
  examReminders() { return this._cache.examReminders || (this._cache.examReminders = []); },
  checklist()     { return this._cache.checklistData || (this._cache.checklistData = {}); },
  streaks()       { return this._cache.streaks; },
  curriculum()    { return this._cache.curriculumData || (this._cache.curriculumData = []); },
  semesters()     { return this._cache.userSemesters || (this._cache.userSemesters = []); },
  nextId()        { return ++this._cache.nextId; },
};

// Override SN_DB (cũ) để không bị lỗi khi redesign.js gọi SN_DB.findUser('demo')
const SN_DB = {
  findUser() { return null; },  // không còn dùng
  createUser() { return {}; },  // không còn dùng
};

// ── Boot sequence ──────────────────────────────────────────────────────────
async function bootApp() {
  // 1. Kiểm tra đã đăng nhập chưa
  if (!ApiClient.isLoggedIn()) {
    showAuthScreenBoot();
    return;
  }

  // 2. Pre-load dữ liệu từ API song song
  try {
    showLoadingOverlay(true);
    const [subjects, notes, assignments, checklist] = await Promise.all([
      ApiClient.getSubjects(),
      ApiClient.getNotes(),
      ApiClient.getAssignments(),
      ApiClient.getChecklist()
    ]);

    // Inject vào store
    _apiStore.subjects     = subjects || [];
    _apiStore.notes        = notes || [];
    _apiStore.assignments  = mapAssignments(assignments || []);

    // Chuyển checklist response thành dạng { 'YYYY-MM-DD': [...items] }
    if (checklist) {
      const key = checklist.date;
      _apiStore.checklistData[key] = checklist.items || [];
    }

    // Restore preferences từ localStorage
    try {
      const prefs = JSON.parse(localStorage.getItem('sn_prefs') || '{}');
      if (prefs.activeSemester !== undefined) _apiStore.activeSemester = prefs.activeSemester;
      if (prefs.userSemesters) _apiStore.userSemesters = prefs.userSemesters;
    } catch (e) {}

    // 3. Cập nhật AuthManager.currentUser từ API info
    const userInfo = ApiClient.getUserInfo();
    AuthManager.currentUser = userInfo;

    showLoadingOverlay(false);

    // 4. Gọi showApp() của redesign.js
    showApp();

    // 5. Patch các hàm CRUD của redesign.js sang dùng API
    patchCrudFunctions();

  } catch (err) {
    showLoadingOverlay(false);
    console.error('Boot error:', err);
    // Token hết hạn hoặc server down → về màn đăng nhập
    ApiClient.logout();
    showAuthScreenBoot();
  }
}

// ── Show/hide loading overlay ──────────────────────────────────────────────
function showLoadingOverlay(show) {
  let overlay = document.getElementById('bootLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bootLoadingOverlay';
    overlay.innerHTML = `
      <div style="
        position:fixed;inset:0;background:var(--bg-1,#0f1117);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;gap:16px;font-family:inherit;
      ">
        <div style="
          width:40px;height:40px;border:3px solid rgba(255,255,255,.1);
          border-top-color:var(--em,#6366f1);border-radius:50%;
          animation:spin .8s linear infinite;
        "></div>
        <p style="color:var(--text-3,#9ca3af);font-size:.9rem;">Đang tải dữ liệu...</p>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = show ? '' : 'none';
}

// ── Auth screen helper ─────────────────────────────────────────────────────
function showAuthScreenBoot() {
  const authScreen = document.getElementById('authScreen');
  const appContainer = document.getElementById('appContainer');
  if (authScreen) { authScreen.removeAttribute('hidden'); authScreen.style.display = ''; }
  if (appContainer) appContainer.hidden = true;
  if (typeof switchAuthTab === 'function') switchAuthTab('login');
}

// ── Map API response format → redesign.js format ─────────────────────────
function mapAssignments(list) {
  return list.map(a => ({
    ...a,
    // deadline từ API là string ISO, redesign.js so sánh Date objects
    deadline: a.deadline ? a.deadline : null
  }));
}

// ── Async login/register (override redesign.js sync versions) ────────────
function doLogin(e) {
  e.preventDefault();
  const err = document.getElementById('loginError');
  err.textContent = 'Đang đăng nhập...';
  err.style.color = 'var(--text-3)';

  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  AuthManager.login(username, password).then(result => {
    if (result.error) {
      err.style.color = 'var(--red, #ef4444)';
      err.textContent = result.error;
      return;
    }
    err.textContent = '';
    // Reset store và tải lại dữ liệu
    _apiStore.subjects = [];
    _apiStore.notes = [];
    _apiStore.assignments = [];
    _apiStore.checklistData = {};
    bootApp();
  }).catch(ex => {
    err.style.color = 'var(--red, #ef4444)';
    err.textContent = ex.message || 'Lỗi kết nối đến server';
  });
}

function doRegister(e) {
  e.preventDefault();
  const err = document.getElementById('registerError');
  err.textContent = '';

  const p1 = document.getElementById('regPass').value;
  const p2 = document.getElementById('regPass2').value;
  if (p1 !== p2) { err.textContent = 'Mật khẩu xác nhận không khớp'; return; }

  const username = document.getElementById('regUser').value.trim();
  const displayName = document.getElementById('regDisplay').value.trim();
  const uni = document.getElementById('regUni')?.value?.trim() || '';
  // Dùng username@studynote.local làm email nếu không có field email
  const email = `${username}@studynote.local`;

  err.textContent = 'Đang đăng ký...';
  err.style.color = 'var(--text-3)';

  AuthManager.register(username, p1, displayName || uni, email).then(result => {
    if (result.error) {
      err.style.color = 'var(--red, #ef4444)';
      err.textContent = result.error;
      return;
    }
    err.textContent = '';
    bootApp();
  }).catch(ex => {
    err.style.color = 'var(--red, #ef4444)';
    err.textContent = ex.message || 'Lỗi kết nối đến server';
  });
}

// ── Patch CRUD functions sau khi showApp() chạy ───────────────────────────
// Các hàm này ghi đè hàm trong redesign.js để gọi API thay vì AppData.save()
function patchCrudFunctions() {

  // ── SUBJECTS ──────────────────────────────────────────────────────────────
  window.saveSubject = async function(e) {
    e.preventDefault();
    const body = {
      name: document.getElementById('sName').value.trim(),
      code: document.getElementById('sCode').value.trim(),
      lecturer: document.getElementById('sLecturer').value.trim(),
      credits: +document.getElementById('sCredits').value,
      semester: document.getElementById('sSemester').value.trim(),
      colorHex: document.getElementById('sColor').value,
      isActive: true
    };
    try {
      if (editSubjectId) {
        await ApiClient.updateSubject(editSubjectId, body);
        const idx = _apiStore.subjects.findIndex(s => s.id === editSubjectId);
        if (idx !== -1) Object.assign(_apiStore.subjects[idx], body);
        toast('Cập nhật môn học thành công');
      } else {
        const created = await ApiClient.createSubject(body);
        _apiStore.subjects.push(created);
        toast('Thêm môn học thành công');
      }
      closeModal('subjectModal');
      renderSubjectPage(); renderSidebarSubjects(); renderDashboard(); populateFilters();
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.deleteSubject = async function(id) {
    if (!await uiConfirm({ title: 'Xóa môn học', message: 'Xóa môn này? Ghi chú và bài tập liên quan cũng sẽ bị xóa.', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteSubject(id);
      _apiStore.subjects = _apiStore.subjects.filter(s => s.id !== id);
      _apiStore.notes = _apiStore.notes.filter(n => n.subjectId !== id);
      _apiStore.assignments = _apiStore.assignments.filter(a => a.subjectId !== id);
      renderSubjectPage(); renderSidebarSubjects(); renderDashboard(); populateFilters();
      toast('Đã xóa môn học');
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  // ── NOTES ─────────────────────────────────────────────────────────────────
  window.saveNote = async function(e) {
    e.preventDefault();
    const body = {
      subjectId: +document.getElementById('nSubject').value || 0,
      title: document.getElementById('nTitle').value.trim(),
      content: document.getElementById('nContent').value.trim(),
      tag: document.getElementById('nTag').value
    };
    try {
      if (editNoteId) {
        await ApiClient.updateNote(editNoteId, body);
        const n = _apiStore.notes.find(n => n.id === editNoteId);
        if (n) Object.assign(n, body);
        toast('Cập nhật ghi chú');
      } else {
        const created = await ApiClient.createNote(body);
        _apiStore.notes.push(created);
        toast('Thêm ghi chú thành công');
      }
      closeModal('noteModal'); filterNotes(); renderDashboard();
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.togglePin = async function(id) {
    try {
      const res = await ApiClient.togglePin(id);
      const n = _apiStore.notes.find(x => x.id === id);
      if (n) n.isPinned = res.isPinned;
      filterNotes();
      toast(res.isPinned ? 'Đã ghim' : 'Đã bỏ ghim');
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.deleteNote = async function(id) {
    if (!await uiConfirm({ title: 'Xóa ghi chú', message: 'Xóa ghi chú này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteNote(id);
      _apiStore.notes = _apiStore.notes.filter(n => n.id !== id);
      filterNotes(); renderDashboard(); toast('Đã xóa ghi chú');
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  // ── ASSIGNMENTS ───────────────────────────────────────────────────────────
  window.saveAssignment = async function(e) {
    if (e) e.preventDefault();
    const dlVal = document.getElementById('aDeadline')?.value;
    const body = {
      subjectId: +document.getElementById('aSubject').value || 0,
      title: document.getElementById('aTitle').value.trim(),
      description: document.getElementById('aDesc')?.value?.trim() || '',
      priority: +document.getElementById('aPriority').value,
      status: +document.getElementById('aStatus').value,
      deadline: dlVal ? new Date(dlVal).toISOString() : null
    };
    try {
      if (editAssignId) {
        await ApiClient.updateAssignment(editAssignId, body);
        const a = _apiStore.assignments.find(a => a.id === editAssignId);
        if (a) Object.assign(a, body);
        toast('Cập nhật bài tập');
      } else {
        const created = await ApiClient.createAssignment(body);
        _apiStore.assignments.push(created);
        toast('Thêm bài tập thành công');
      }
      closeModal('assignModal'); filterAssignments(); renderDashboard();
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.cycleStatus = async function(id) {
    const a = _apiStore.assignments.find(x => x.id === id);
    if (!a) return;
    const newStatus = (a.status + 1) % 3;
    try {
      await ApiClient.patchAssignmentStatus(id, newStatus);
      a.status = newStatus;
      filterAssignments(); renderDashboard();
      toast(`Trạng thái: ${STATUS_LABELS[newStatus]}`);
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.deleteAssignment = async function(id) {
    if (!await uiConfirm({ title: 'Xóa bài tập', message: 'Xóa bài tập này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteAssignment(id);
      _apiStore.assignments = _apiStore.assignments.filter(a => a.id !== id);
      filterAssignments(); renderDashboard(); toast('Đã xóa bài tập');
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  // ── CHECKLIST ─────────────────────────────────────────────────────────────
  // Checklist dùng dateKey format => ta cần sync với API
  // Reload checklist từ API khi đổi ngày
  const _origRenderChecklistPage = window.renderChecklistPage;

  window.addTask = async function() {
    const input = document.getElementById('newTaskInput');
    const content = input.value.trim();
    if (!content) return;
    const dateStr = toDateStr(checklistDate || new Date());
    try {
      const item = await ApiClient.addChecklistItem(content, dateStr);
      const key = dateStr;
      if (!_apiStore.checklistData[key]) _apiStore.checklistData[key] = [];
      _apiStore.checklistData[key].push(item);
      input.value = '';
      renderChecklistPage(); renderDashboard();
      toast('Đã thêm task!');
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.toggleTask = async function(id) {
    try {
      await ApiClient.toggleChecklistItem(id);
      const dateStr = toDateStr(checklistDate || new Date());
      const items = _apiStore.checklistData[dateStr] || [];
      const task = items.find(t => t.id === id);
      if (task) task.isDone = !task.isDone;
      renderChecklistPage(); renderDashboard();
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.deleteTask = async function(id) {
    try {
      await ApiClient.deleteChecklistItem(id);
      const dateStr = toDateStr(checklistDate || new Date());
      const items = _apiStore.checklistData[dateStr] || [];
      const idx = items.findIndex(t => t.id === id);
      if (idx !== -1) items.splice(idx, 1);
      renderChecklistPage(); renderDashboard();
    } catch(err) { toast('❌ ' + err.message, true); }
  };

  window.copyYesterday = async function() {
    try {
      const res = await ApiClient.copyYesterdayChecklist();
      const dateStr = toDateStr(new Date());
      _apiStore.checklistData[dateStr] = res.items || [];
      renderChecklistPage(); renderDashboard();
      toast(`Đã copy task từ hôm qua!`);
    } catch(err) { toast(err.message, true); }
  };

  // Khi đổi ngày checklist, fetch từ API
  const _origChangeDay = window.changeChecklistDay;
  window.changeChecklistDay = async function(delta) {
    if (typeof checklistDate !== 'undefined') {
      checklistDate = addDays(checklistDate, delta);
    }
    const dateStr = toDateStr(checklistDate || new Date());
    if (!_apiStore.checklistData[dateStr]) {
      try {
        const res = await ApiClient.getChecklist(dateStr);
        _apiStore.checklistData[dateStr] = res?.items || [];
      } catch(e) {
        _apiStore.checklistData[dateStr] = [];
      }
    }
    if (typeof renderChecklistPage === 'function') renderChecklistPage();
  };

  console.log('✅ StudyNote API patch applied — all CRUD operations now use backend');
}

// ── Intercept DOMContentLoaded (chạy thay vì redesign.js chạy showApp) ────
// redesign.js có DOMContentLoaded listener gọi showApp() nếu loggedIn
// => Ta cần boot trước, và block redesign.js không gọi showApp() sai lúc

// Overwrite AuthManager.init để không tự gọi showApp trong redesign.js
const _origInit = AuthManager.init;
AuthManager.init = function() {
  // Chỉ trả về false để redesign.js gọi showAuthScreen thay vì showApp
  // bootApp() sẽ tự gọi showApp() sau khi load xong data
  return false;
};

// Chạy boot sau khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  // Đợi redesign.js init xong (init sidebar, theme, nav) nhưng không gọi showApp
  setTimeout(() => bootApp(), 50);
});
