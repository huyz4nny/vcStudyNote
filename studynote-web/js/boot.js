// ===================================================
// StudyNote — Boot / Bridge Layer
// Nạp dữ liệu từ API rồi inject vào redesign.js
// ===================================================

// ── CHẶN Live Server auto-reload ──────────────────────────────────────────
// Live Server dùng WebSocket để gửi lệnh reload khi file thay đổi.
// Khi API ghi vào database (.db), Live Server phát hiện thay đổi và reload trang,
// gây ra vòng lặp F5 liên tục. Ta chặn điều này bằng cách:
// 1. Khi đang thực hiện thao tác API (import, save...), tạm chặn reload
// 2. Sau khi thao tác xong, cho phép reload lại bình thường
(function blockLiveServerReload() {
  // Flag to temporarily block reloads during API operations
  window._blockReload = false;
  
  // FIX: Object.defineProperty(location,'reload') crash với TypeError trong Chrome
  // vì location.reload là non-configurable property → đây là root cause màn hình đen!
  // (khi lỗi này xảy ra, toàn bộ boot.js dừng parse, không có AppData, bootApp)
  try {
    const _origReload = location.reload.bind(location);
    Object.defineProperty(location, 'reload', {
      value: function() {
        if (window._blockReload) {
          console.log('[StudyNote] Blocked Live Server reload during API operation');
          return;
        }
        return _origReload();
      },
      writable: true,
      configurable: true
    });
  } catch (e) {
    // Fallback: nếu không thể override location.reload, dùng cách chặn qua WebSocket
    console.warn('[StudyNote] Cannot override location.reload, using fallback block.');
  }
})();

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
  _lastPrefsJson: null,
  _saveTimer: null,

  get() { return this._cache || {}; },
  save() {
    // Debounce: batch rapid successive save() calls into one API write
    // This prevents Live Server from detecting multiple rapid DB changes
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._doSave(), 500);
  },
  _doSave() {
    // FIX: Guard against _cache being null/reset after logout
    if (!this._cache) return;
    const prefs = {
      curriculumData: _apiStore.curriculumData,
      semesters: _apiStore.userSemesters,
      activeSemester: window.activeSemester,
      lastPage: window.currentPage
    };
    
    const json = JSON.stringify(prefs);
    if (this._lastPrefsJson === json) return; // Tránh gọi API liên tục nếu dữ liệu không đổi
    this._lastPrefsJson = json;

    if (ApiClient.isLoggedIn()) {
      ApiClient.updatePreferences(json).catch(err => console.error("Failed to save prefs", err));
    } else {
      localStorage.setItem('sn_prefs', json);
    }
  },

  reload() { return this._cache || {}; },

  // FIX: Null-safe accessors — trả về mảng rỗng thay vì crash khi _cache bị null sau logout
  subjects()     { return (this._cache && this._cache.subjects)     || []; },
  notes()        { return (this._cache && this._cache.notes)        || []; },
  assignments()  { return (this._cache && this._cache.assignments)  || []; },
  gradeItems()   {
    if (!this._cache) return [];
    return this._cache.gradeItems || (this._cache.gradeItems = []);
  },
  examReminders() {
    if (!this._cache) return [];
    return this._cache.examReminders || (this._cache.examReminders = []);
  },
  checklist() {
    if (!this._cache) return {};
    return this._cache.checklistData || (this._cache.checklistData = {});
  },
  streaks() {
    return (this._cache && this._cache.streaks)
      || { daily: {}, currentStreak: 0, bestStreak: 0 };
  },
  curriculum() {
    if (!this._cache) return [];
    return this._cache.curriculumData || (this._cache.curriculumData = []);
  },
  semesters() {
    if (!this._cache) return [];
    return this._cache.userSemesters || (this._cache.userSemesters = []);
  },
  nextId() { if (!this._cache) return 9000; return ++this._cache.nextId; },
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
    const [subjects, notes, assignments, checklist, currData, prefsRes] = await Promise.all([
      ApiClient.getSubjects(),
      ApiClient.getNotes(),
      ApiClient.getAssignments(),
      ApiClient.getChecklist(),
      ApiClient.getCurriculum(),
      ApiClient.getPreferences()
    ]);

    // Inject vào store
    _apiStore.subjects = subjects || [];
    _apiStore.notes = notes || [];
    _apiStore.assignments = mapAssignments(assignments || []);

    // Load curriculum from API
    _apiStore.curriculumData = currData || [];

    // Extract GradeItems from Subjects (since Subjects API includes them)
    let allGrades = [];
    _apiStore.subjects.forEach(s => {
      if (s.gradeItems) {
        allGrades.push(...s.gradeItems);
      }
    });
    _apiStore.gradeItems = allGrades;

    // Load preferences from API
    const pJson = prefsRes && prefsRes.preferencesJson;
    if (pJson) {
      try {
        const prefs = JSON.parse(pJson);
        if (prefs.semesters) _apiStore.userSemesters = prefs.semesters;
        if (prefs.activeSemester) window.activeSemester = prefs.activeSemester;
        if (prefs.lastPage && window.currentPage === 'dashboard') {
          window.currentPage = prefs.lastPage;
        }
      } catch (e) { }
    } else {
      // Fallback to local storage if API preferences are empty
      const local = localStorage.getItem('sn_prefs');
      if (local) {
        try {
          const p = JSON.parse(local);
          if (p.semesters) _apiStore.userSemesters = p.semesters;
          if (p.activeSemester) window.activeSemester = p.activeSemester;
        } catch (e) { }
      }
    }

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
      if (prefs.curriculumData) _apiStore.curriculumData = prefs.curriculumData;
      if (prefs.gradeItems) _apiStore.gradeItems = prefs.gradeItems;
    } catch (e) { }

    // 3. Cập nhật AuthManager.currentUser từ API info
    const userInfo = ApiClient.getUserInfo();
    AuthManager.currentUser = userInfo;

    showLoadingOverlay(false);

    // Mẹo: Lưu trạng thái JSON hiện tại để showApp() không vô tình trigger API update
    AppData._lastPrefsJson = JSON.stringify({
      curriculumData: _apiStore.curriculumData,
      semesters: _apiStore.userSemesters,
      activeSemester: window.activeSemester,
      lastPage: window.currentPage
    });

    // 4. Gọi showApp() của redesign.js
    showApp();

    // 5. Patch các hàm CRUD của redesign.js sang dùng API
    patchCrudFunctions();

  } catch (err) {
    showLoadingOverlay(false);
    console.error('Boot error:', err);
    // Server down hoặc lỗi mạng → hiển thị màn hình đăng nhập hoặc thông báo
    // ApiClient.logout(); // <-- XÓA DÒNG NÀY ĐỂ KHÔNG BỊ OUT KHI F5 MÀ SERVER LỖI
    showAuthScreenBoot();
    const errorMsg = document.getElementById('loginError');
    if (errorMsg) {
      errorMsg.textContent = err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau!';
      errorMsg.style.color = 'var(--red, #ef4444)';
    }
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
          animation:spin 4.5s linear infinite;
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
window.doLogin = function (e) {
  e.preventDefault();
  const err = document.getElementById('loginError');
  err.textContent = '';

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

window.doRegister = function (e) {
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
  window.saveSubject = async function (e) {
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
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.deleteSubject = async function (id) {
    if (!await uiConfirm({ title: 'Xóa môn học', message: 'Xóa môn này? Ghi chú và bài tập liên quan cũng sẽ bị xóa.', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteSubject(id);
      _apiStore.subjects = _apiStore.subjects.filter(s => s.id !== id);
      _apiStore.notes = _apiStore.notes.filter(n => n.subjectId !== id);
      _apiStore.assignments = _apiStore.assignments.filter(a => a.subjectId !== id);
      renderSubjectPage(); renderSidebarSubjects(); renderDashboard(); populateFilters();
          toast('Đã xóa môn học');
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  // ── NOTES ─────────────────────────────────────────────────────────────────
  window.toggleDsbType = function (id) {
    const type = document.querySelector(`input[name="dsb_type_${id}"]:checked`).value;
    document.getElementById(`dsb_curr_${id}`).style.display = type === 'curriculum' ? 'block' : 'none';
    document.getElementById(`dsb_man_${id}`).style.display = type === 'manual' ? 'grid' : 'none';
  };

  // ── DYNAMIC REPEATER SUBJECT ADDITION ──────────────────────────────────
  window.saveDynamicSubjects = async function () {
    const semesterCode = document.getElementById('dynamicSubjectSemester').value;
    const blocks = document.querySelectorAll('.dyn-subject-block');
    const curriculum = AppData.curriculum() || [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    let addedCount = 0;
    let hasError = false;
    let reqs = [];
    
    blocks.forEach(block => {
      const id = block.id.replace('dsb-', '');
      const type = document.querySelector(`input[name="dsb_type_${id}"]:checked`).value;
      
      if (type === 'curriculum') {
        const code = document.getElementById(`dsb_curr_select_${id}`).value;
        if (code) {
          const c = curriculum.find(x => x.code === code);
          if (c) {
            reqs.push({
              name: c.name, code: c.code, lecturer: '',
              credits: c.credits || 3, semester: semesterCode,
              colorHex: colors[addedCount % colors.length],
              passThresh: 5, isActive: true
            });
            addedCount++;
          }
        }
      } else {
        const name = document.getElementById(`dsb_man_name_${id}`).value.trim();
        const code = document.getElementById(`dsb_man_code_${id}`).value.trim();
        const credits = +document.getElementById(`dsb_man_credits_${id}`).value || 3;
        
        if (name) {
          reqs.push({
            name: name, code: code, lecturer: '',
            credits: credits, semester: semesterCode,
            colorHex: colors[addedCount % colors.length],
            passThresh: 5, isActive: true
          });
          addedCount++;
        } else {
          if (code) hasError = true;
        }
      }
    });
    
    if (hasError) toast('Một số môn bị bỏ qua do thiếu Tên môn.', 'warn');
    
    if (addedCount > 0) {
      try {
        for (const r of reqs) {
          const created = await ApiClient.createSubject(r);
          _apiStore.subjects.push(created);
        }
        if (typeof programRefreshAll === 'function') programRefreshAll();
        closeModal('dynamicSubjectModal');
        toast(`Đã thêm ${addedCount} môn học vào kỳ ${semesterCode}`, 'success');
      } catch (err) { toast('❌ ' + err.message, true); }
    } else if (!hasError) {
      toast('Chưa có môn nào được thêm', 'warn');
    }
  };

  // ── GRADE MODULE ──────────────────────────────────────────────────────────
  if (window.GradeModule) {
    window.GradeModule.saveGradeItem = async function(e) {
      e.preventDefault();
      const subjectId = +document.getElementById('giSubjectId').value;
      const existingId = document.getElementById('giId').value;
      const raw = document.getElementById('giValue').value;
      const body = {
        subjectId,
        category:       document.getElementById('giCategory').value.trim(),
        name:           document.getElementById('giName').value.trim(),
        weight:         +document.getElementById('giWeight').value,
        value:          raw === '' ? null : +raw,
        condition:      document.getElementById('giCondition').value.trim() || null
      };
      if (!body.name || !body.weight || !body.category) return;

      try {
        if (existingId) {
          await ApiClient.updateGradeItem(+existingId, body);
          const g = _apiStore.gradeItems.find(x => x.id === +existingId);
          if (g) Object.assign(g, body);
          toast('Cập nhật cột điểm thành công');
        } else {
          const created = await ApiClient.createGradeItem(body);
          _apiStore.gradeItems.push(created);
          toast('Thêm cột điểm thành công');
        }
        closeModal('gradeItemModal');
        this.render(subjectId);
      } catch (err) { toast('❌ ' + err.message, true); }
    };

    window.GradeModule.deleteItem = async function(id) {
      const idx = _apiStore.gradeItems.findIndex(g => g.id === id);
      if (idx < 0) return;
      const subjectId = _apiStore.gradeItems[idx].subjectId;
      try {
        await ApiClient.deleteGradeItem(id);
        _apiStore.gradeItems.splice(idx, 1);
        this.render(subjectId);
        toast('Đã xóa cột điểm');
      } catch (err) { toast('❌ ' + err.message, true); }
    };

    window.GradeModule.updateThreshold = async function(subjectId) {
      const val = parseFloat(document.getElementById('gradePassThreshold').value);
      const sub = _apiStore.subjects.find(s => s.id === subjectId);
      if (sub && !isNaN(val)) {
        const p = Math.min(10, Math.max(0, val));
        try {
          await ApiClient.updateSubject(subjectId, { ...sub, passThreshold: p });
          sub.passThreshold = p;
          this.render(subjectId);
        } catch (err) { toast('❌ ' + err.message, true); }
      }
    };

    window.GradeModule.setStatusOverride = async function(subjId, value) {
      const sub = _apiStore.subjects.find(s => s.id === subjId);
      if (!sub) return;
      try {
        let override = (value === 'PASS' || value === 'FAIL') ? value : null;
        await ApiClient.updateSubject(subjId, { ...sub, statusOverride: override });
        sub.statusOverride = override;
        renderGradesPage();
        if (typeof renderDashboard === 'function') renderDashboard();
        toast(value === 'PASS' ? `Đã đặt ${sub.code} → Qua môn`
            : value === 'FAIL' ? `Đã đặt ${sub.code} → Trượt môn`
            : `Đã trả ${sub.code} về tính tự động`);
      } catch (err) { toast('❌ ' + err.message, true); }
    };
    
    window.GradeModule.doImport = async function() {
      const text = document.getElementById('fapGradeText').value;
      if (!text.trim()) { uiAlert('Vui lòng nhập bảng khung điểm.'); return; }
      const subjectId = +document.getElementById('gradeSubjectId').value;
      
      const lines = text.split('\n');
      let reqs = [];
      let currentCategory = 'Other';
      
      for (let line of lines) {
        let parts = line.split('\t');
        if (parts.length < 3) parts = line.split(/\s{2,}/);
        parts = parts.map(s => s.trim());
        
        let low = (parts[0] || '').toLowerCase();
        if (!low) {
          if (parts.length >= 3) low = parts[1].toLowerCase();
          else continue;
        }
        
        if (low.startsWith('grade category') || low.startsWith('total') || low.startsWith('course total') || low.startsWith('status')) continue;
        
        if (parts.length >= 3) {
          let cat = parts[0];
          let name = parts[1];
          let weightStr = parts[2];
          
          if (cat) currentCategory = cat;
          else cat = currentCategory;
          
          let weightMatch = weightStr.match(/([\d.]+)/);
          if (weightMatch) {
            reqs.push({
              subjectId: subjectId,
              category: cat,
              name: name,
              weight: parseFloat(weightMatch[1]),
              value: null,
              condition: ''
            });
          }
        }
      }
      
      if (reqs.length === 0) {
        uiAlert('Không tìm thấy cột điểm hợp lệ nào. Vui lòng copy đúng bảng (có các cột bằng Tab).');
        return;
      }
      
      const existing = _apiStore.gradeItems.filter(g => g.subjectId === subjectId);
      if (existing.length > 0) {
        const ok = await uiConfirm({
          title: 'Ghi đè Khung điểm',
          message: 'Môn này đã có sẵn các cột điểm. Bạn có muốn Xoá sạch (Ghi đè) để Import khung mới không?\n\n(Chọn "Xác nhận" để xoá toàn bộ cột điểm cũ, "Huỷ" để huỷ thao tác)',
          danger: true
        });
        if (!ok) return;
      }
      
      try {
        await ApiClient.syncGrades(subjectId, reqs);
        // Refresh local cache by fetching subject again
        const subj = await ApiClient.get(`/subjects/${subjectId}`);
        if (subj && subj.gradeItems) {
          _apiStore.gradeItems = _apiStore.gradeItems.filter(g => g.subjectId !== subjectId).concat(subj.gradeItems);
        }
        closeModal('fapGradeImportModal');
        toast(`Đã import thành công ${reqs.length} cột điểm!`);
        this.render(subjectId);
      } catch (err) { toast('❌ ' + err.message, true); }
    };
  }

  window.saveNote = async function (e) {
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
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.togglePin = async function (id) {
    try {
      const res = await ApiClient.togglePin(id);
      const n = _apiStore.notes.find(x => x.id === id);
      if (n) n.isPinned = res.isPinned;
      filterNotes();
      toast(res.isPinned ? 'Đã ghim' : 'Đã bỏ ghim');
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.deleteNote = async function (id) {
    if (!await uiConfirm({ title: 'Xóa ghi chú', message: 'Xóa ghi chú này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteNote(id);
      _apiStore.notes = _apiStore.notes.filter(n => n.id !== id);
      filterNotes(); renderDashboard(); toast('Đã xóa ghi chú');
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  // ── ASSIGNMENTS ───────────────────────────────────────────────────────────
  window.saveAssignment = async function (e) {
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
      // FIX: đúng ID là 'assignmentModal', không phải 'assignModal'
      closeModal('assignmentModal'); filterAssignments(); renderDashboard();
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.cycleStatus = async function (id) {
    const a = _apiStore.assignments.find(x => x.id === id);
    if (!a) return;
    const newStatus = (a.status + 1) % 3;
    try {
      await ApiClient.patchAssignmentStatus(id, newStatus);
      a.status = newStatus;
      filterAssignments(); renderDashboard();
      toast(`Trạng thái: ${STATUS_LABELS[newStatus]}`);
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.deleteAssignment = async function (id) {
    if (!await uiConfirm({ title: 'Xóa bài tập', message: 'Xóa bài tập này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    try {
      await ApiClient.deleteAssignment(id);
      _apiStore.assignments = _apiStore.assignments.filter(a => a.id !== id);
      filterAssignments(); renderDashboard(); toast('Đã xóa bài tập');
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  // ── CHECKLIST ─────────────────────────────────────────────────────────────
  // Checklist dùng dateKey format => ta cần sync với API
  // Reload checklist từ API khi đổi ngày
  const _origRenderChecklistPage = window.renderChecklistPage;

  window.addTask = async function () {
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
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.toggleTask = async function (id) {
    try {
      await ApiClient.toggleChecklistItem(id);
      const dateStr = toDateStr(checklistDate || new Date());
      const items = _apiStore.checklistData[dateStr] || [];
      const task = items.find(t => t.id === id);
      if (task) task.isDone = !task.isDone;
      renderChecklistPage(); renderDashboard();
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.deleteTask = async function (id) {
    try {
      await ApiClient.deleteChecklistItem(id);
      const dateStr = toDateStr(checklistDate || new Date());
      const items = _apiStore.checklistData[dateStr] || [];
      const idx = items.findIndex(t => t.id === id);
      if (idx !== -1) items.splice(idx, 1);
      renderChecklistPage(); renderDashboard();
    } catch (err) { toast('❌ ' + err.message, true); }
  };

  window.copyYesterday = async function () {
    try {
      const res = await ApiClient.copyYesterdayChecklist();
      const dateStr = toDateStr(new Date());
      _apiStore.checklistData[dateStr] = res.items || [];
      renderChecklistPage(); renderDashboard();
      toast(`Đã copy task từ hôm qua!`);
    } catch (err) { toast(err.message, true); }
  };

  // Khi đổi ngày checklist, fetch từ API
  const _origChangeDay = window.changeChecklistDay;
  window.changeChecklistDay = async function (delta) {
    if (typeof checklistDate !== 'undefined') {
      checklistDate = addDays(checklistDate, delta);
    }
    const dateStr = toDateStr(checklistDate || new Date());
    if (!_apiStore.checklistData[dateStr]) {
      try {
        const res = await ApiClient.getChecklist(dateStr);
        _apiStore.checklistData[dateStr] = res?.items || [];
      } catch (e) {
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
AuthManager.init = function () {
  // Chỉ trả về false để redesign.js gọi showAuthScreen thay vì showApp
  // bootApp() sẽ tự gọi showApp() sau khi load xong data
  return false;
};

// Chạy boot sau khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  // Đợi redesign.js init xong (init sidebar, theme, nav) nhưng không gọi showApp
  setTimeout(() => bootApp(), 50);
});
