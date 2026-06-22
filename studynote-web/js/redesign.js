// ===================================================
// StudyNote — Main App Logic v2
// ===================================================

/* ─ APP STATE ─ */
let currentPage = 'dashboard';
let editSubjectId = null, editNoteId = null, editAssignId = null;
// Single source of truth for the active semester, shared across all script files
// (redesign.js, grades.js, ...). MUST live on `window` — a top-level `let` does
// NOT create a window property, which left the notes/assignment filters reading
// an always-undefined value and showing every subject regardless of semester.
window.activeSemester = '';
let checklistDate = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
// Local-date key "YYYY-MM-DD" (KHÔNG dùng toISOString vì nó theo UTC — với
// múi giờ VN (UTC+7) sẽ lệch sang ngày hôm trước, làm sai key checklist/streak).
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const PRIORITY_LABELS = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUS_LABELS = ['Chưa làm', 'Đang làm', 'Hoàn thành'];

/* ─ BOOT ─ */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize event listeners once
  initSidebar();
  initTheme();
  initNav();

});

/* ─ AUTH FLOW ─ */
function showAuthScreen() {
  document.getElementById('authScreen').removeAttribute('hidden');
  document.getElementById('authScreen').style.display = '';
  document.getElementById('appContainer').hidden = true;

  // Clear input fields and errors
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const loginError = document.getElementById('loginError');
  if (loginUser) loginUser.value = '';
  if (loginPass) loginPass.value = '';
  if (loginError) loginError.textContent = '';

  const regUser = document.getElementById('regUser');
  const regDisplay = document.getElementById('regDisplay');
  const regUni = document.getElementById('regUni');
  const regPass = document.getElementById('regPass');
  const regPass2 = document.getElementById('regPass2');
  const registerError = document.getElementById('registerError');
  if (regUser) regUser.value = '';
  if (regDisplay) regDisplay.value = '';
  if (regUni) regUni.value = '';
  if (regPass) regPass.value = '';
  if (regPass2) regPass2.value = '';
  if (registerError) registerError.textContent = '';

  // Switch back to login tab by default
  switchAuthTab('login');
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appContainer').hidden = false;

  const u = AuthManager.currentUser || {};
  const name = u.displayName || u.DisplayName || u.username || u.Username || 'Bạn';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarEl = document.getElementById('userAvatar');
  if (u.avatarData || u.AvatarData) {
    avatarEl.textContent = '';
    avatarEl.style.backgroundImage = `url(${u.avatarData || u.AvatarData})`;
    avatarEl.style.color = 'transparent';
  } else {
    avatarEl.textContent = initials;
    avatarEl.style.backgroundImage = 'none';
    avatarEl.style.color = 'var(--text-1)';
  }
  document.getElementById('userName').textContent = name;
  document.getElementById('userUni').textContent = u.university || u.University || '';

  // Restore the last selected semester (persisted per-user) so F5 doesn't reset it.
  const savedSem = AppData.get().activeSemester;
  const allSems = getSemesters();
  window.activeSemester = (savedSem === '' || (savedSem && allSems.includes(savedSem)))
    ? savedSem
    : getMostRecentSemester();
  ensureUserSemesters();
  populateGlobalSemesterDropdown();
  setGreeting();
  populateFilters();
  renderSidebarSubjects();
  renderDashboard();
  renderSubjectPage();
  renderNotesPage();
  renderAssignmentsPage();
  const lastPage = localStorage.getItem('sn_last_page') || 'dashboard';
  showPage(lastPage);
  StreakEngine.renderWidget();
}

function populateGlobalSemesterDropdown() {
  const sems = getSemesters();
  const select = document.getElementById('globalActiveSemester');
  if (!select) return;
  select.innerHTML = '<option value="">-- Tất cả --</option>' + sems.map(s => `<option value="${esc(s)}" ${s === activeSemester ? 'selected' : ''}>${esc(semesterLabel(s))}</option>`).join('');
}

// Persist the active semester on the per-user data so a refresh (F5) keeps it.
function persistActiveSemester() {
  const d = AppData.get();
  d.activeSemester = window.activeSemester;
  AppData.save();
}

// Single entry point used by every semester selector. Sets the value, persists it,
// keeps both semester dropdowns in sync, and refreshes all semester-dependent views.
function applyActiveSemester(v) {
  window.activeSemester = v;
  // Keep the program's "current semester" flag in sync (saved by persistActiveSemester).
  const program = AppData.semesters();
  if (program.length) program.forEach(s => s.isCurrent = (s.code === v));
  persistActiveSemester();

  const g = document.getElementById('globalActiveSemester'); if (g) g.value = v;
  const s = document.getElementById('semesterFilter'); if (s) s.value = v;
  const label = document.getElementById('subjectSemesterLabel');
  if (label) label.textContent = v ? `Kỳ ${semesterLabel(v)}` : 'Tất cả kỳ học';

  populateFilters();
  renderDashboard();
  renderSidebarSubjects();
  renderSubjectPage();
  renderNotesPage();
  renderAssignmentsPage();
  renderChecklistPage();
  if (typeof renderGradesPage === 'function') renderGradesPage();
}

window.setGlobalActiveSemester = function() {
  applyActiveSemester(document.getElementById('globalActiveSemester').value);
};

function switchAuthTab(tab) {
  document.getElementById('panelLogin').hidden = tab !== 'login';
  document.getElementById('panelRegister').hidden = tab !== 'register';
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab !== 'login');
  document.getElementById('tabLogin').setAttribute('aria-selected', tab === 'login');
  document.getElementById('tabRegister').setAttribute('aria-selected', tab !== 'login');
}

function togglePassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = `<i class="ph ph-eye${show ? '-slash' : ''}"></i>`;
}



async function doLogout() {
  if (!await uiConfirm({
    title: 'Đăng xuất',
    message: 'Bạn có chắc muốn đăng xuất khỏi StudyNote?',
    confirmText: 'Đăng xuất',
    icon: 'ph-sign-out'
  })) return;
  AuthManager.logout();
  // FIX: Reset cache về mảng rỗng thay vì null để tránh crash
  // nếu có code nào đó gọi AppData.subjects() sau khi logout.
  AppData._cache = {
    subjects: [], notes: [], assignments: [], gradeItems: [],
    examReminders: [], checklistData: {}, streaks: { daily: {}, currentStreak: 0, bestStreak: 0 },
    curriculumData: [], userSemesters: [], nextId: 9000, activeSemester: ''
  };
  showAuthScreen();
}

/* ─ GREETING ─ */
function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const u = AuthManager.currentUser;
  const name = (u?.displayName || u?.DisplayName || u?.username || u?.Username || 'Bạn').split(' ').pop();
  document.getElementById('greetMsg').textContent = `${g}, ${name}`;
  document.getElementById('dateStr').textContent = fmtDateLong(new Date());
}

/* ─ DATE FORMAT ─ */
function fmtDateLong(d) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDate(d) { if (!d) return '—'; const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; }
function fmtDateTime(d) { if (!d) return '—'; const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)} ${pad(x.getHours())}:${pad(x.getMinutes())}`; }
function fmtTime(d) { if (!d) return ''; const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; }
function pad(n) { return String(n).padStart(2, '0'); }

/* ─ NAV ─ */
function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); showPage(el.dataset.page); });
  });
}

function showPage(name) {
  currentPage = name;
  localStorage.setItem('sn_last_page', name);
  const titles = { dashboard: 'Tổng quan', subjects: 'Môn học', notes: 'Ghi chú', assignments: 'Bài tập', checklist: 'Hôm nay', grades: 'Bảng điểm', curriculum: 'Chương trình học', program: 'Chương trình của tôi' };
  document.getElementById('topbarHeading').textContent = titles[name] || name;
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  const pg = document.getElementById(`page-${name}`);
  // FIX: Null-check page element — invalid page names would crash without this
  if (!pg) { console.warn(`[StudyNote] showPage: page element "page-${name}" not found`); return; }
  pg.hidden = false;
  if (name === 'grades' && typeof renderGradesPage === 'function') {
    renderGradesPage();
  }
  if (name === 'curriculum' && typeof renderCurriculumPage === 'function') {
    renderCurriculumPage();
  }
  if (name === 'program' && typeof renderProgramPage === 'function') {
    renderProgramPage();
  }
  requestAnimationFrame(() => pg.classList.add('active'));
  document.querySelectorAll('.nav-item').forEach(l => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
  const nl = document.getElementById(`nav-${name}`);
  if (nl) { nl.classList.add('active'); nl.setAttribute('aria-current', 'page'); }
  // Collapse the expanded overlay after navigating on small screens
  if (window.innerWidth <= 900) setSidebarCollapsed(true, false);
}

/* ─ SIDEBAR ─ */
/* The StudyNote logo is the single toggle. Clicking it collapses the sidebar
   to a 60px icon rail and expands it again — same behaviour on every width. */
function setSidebarCollapsed(collapsed, persist) {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('sidebarToggleBtn');
  sb.classList.toggle('collapsed', collapsed);
  if (btn) {
    btn.setAttribute('aria-expanded', (!collapsed).toString());
    btn.setAttribute('aria-label', collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên');
  }
  if (persist) {
    try { localStorage.setItem('sn_sidebar_collapsed', collapsed ? '1' : '0'); } catch { }
  }
}

function initSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('sidebarToggleBtn');

  btn.addEventListener('click', () => {
    setSidebarCollapsed(!sb.classList.contains('collapsed'), true);
  });

  // Restore preference; default to collapsed on small screens
  let collapsed;
  try {
    const saved = localStorage.getItem('sn_sidebar_collapsed');
    collapsed = saved !== null ? saved === '1' : window.innerWidth <= 900;
  } catch { collapsed = window.innerWidth <= 900; }
  setSidebarCollapsed(collapsed, false);
}

function renderSidebarSubjects() {
  let list = AppData.subjects();
  if (activeSemester) list = list.filter(s => s.semester === activeSemester);

  document.getElementById('sidebarSubjectList').innerHTML = list.map(s => {
    const nc = AppData.notes().filter(n => n.subjectId === s.id).length;
    const ac = AppData.assignments().filter(a => a.subjectId === s.id).length;
    return `
    <li><button class="subject-quick-item" onclick="filterBySubject(${s.id})" title="${esc(s.code)} — ${esc(s.name)}">
      <span class="sq-code" style="--c:${s.colorHex}">${esc(s.code)}</span>
      <span class="sq-text">
        <span class="sq-name">${esc(s.name)}</span>
        <span class="sq-stats"><i class="ph ph-note-pencil"></i>${nc}<i class="ph ph-clipboard-text"></i>${ac}</span>
      </span>
    </button></li>`;
  }).join('');
}

function filterBySubject(id) {
  showPage('notes');
  document.getElementById('noteSubjectFilter').value = id;
  filterNotes();
}

/* ─ THEME ─ */
function initTheme() {
  const btn = document.getElementById('themeBtn');
  const saved = localStorage.getItem('sn_theme');
  if (saved === 'light') applyLight(btn);

  btn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    document.body.classList.toggle('light', isLight);
    if (isLight) { applyLight(btn); localStorage.setItem('sn_theme', 'light'); }
    else { applyDark(btn); localStorage.setItem('sn_theme', 'dark'); }
  });
}
function applyLight(btn) {
  document.documentElement.classList.add('light');
  document.body.classList.add('light');
  btn.innerHTML = '<i class="ph-fill ph-sun" aria-hidden="true"></i>';
  btn.setAttribute('aria-label', 'Đổi sang tối');
}
function applyDark(btn) {
  document.documentElement.classList.remove('light');
  document.body.classList.remove('light');
  btn.innerHTML = '<i class="ph-fill ph-moon" aria-hidden="true"></i>';
  btn.setAttribute('aria-label', 'Đổi sang sáng');
}

/* ─ DASHBOARD ─ */
function renderDashboard() {
  const todayKey = dateKey(today);
  const todayTasks = AppData.checklist()[todayKey] || [];
  const done = todayTasks.filter(t => t.isDone).length;
  const total = todayTasks.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  // Subjects belonging to the active semester (all subjects if none selected).
  // Notes/assignments are scoped to these so the dashboard matches the pages.
  const activeSubjIds = AppData.subjects()
    .filter(s => !activeSemester || s.semester === activeSemester)
    .map(s => s.id);
  const inSemester = item => !item.subjectId || activeSubjIds.includes(item.subjectId);

  const semesterAssignments = AppData.assignments().filter(inSemester);
  const semesterNotes = AppData.notes().filter(inSemester);
  const pending = semesterAssignments.filter(a => a.status !== 2).length;

  document.getElementById('stat-subj').textContent = activeSubjIds.length;
  document.getElementById('stat-notes').textContent = semesterNotes.length;
  document.getElementById('stat-assign').textContent = pending;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('dash-progress').style.width = pct + '%';
  document.getElementById('assignBadge').textContent = pending;
  document.getElementById('semesterTag').textContent = activeSemester || 'Tất cả';

  // Deadlines
  const sorted = semesterAssignments.filter(a => a.status !== 2 && a.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
  document.getElementById('deadlineList').innerHTML = sorted.length
    ? sorted.map(a => {
      const sub = AppData.subjects().find(s => s.id === a.subjectId);
      const { cls, label } = deadlineMeta(a.deadline);
      return `<li class="deadline-item">
          <div class="dl-dot" style="background:${sub?.colorHex || '#888'}"></div>
          <div class="dl-info"><div class="dl-name">${esc(a.title)}</div>
            <div class="dl-meta">${esc(sub?.code || '')} · ${PRIORITY_LABELS[a.priority]}</div></div>
          <span class="dl-time ${cls}">${label}</span>
        </li>`;
    }).join('')
    : '<li style="padding:20px;font-size:.8rem;color:var(--text-4);text-align:center">Không có deadline sắp tới</li>';

  // Mini checklist
  document.getElementById('dash-mini-progress').style.width = pct + '%';
  document.getElementById('dash-mini-label').textContent = `${done} / ${total}`;
  document.getElementById('miniTaskList').innerHTML = todayTasks.slice(0, 5).map(t => `
    <li class="mini-task-item ${t.isDone ? 'done' : ''}">
      <i class="ph-fill ${t.isDone ? 'ph-check-circle' : 'ph-circle'} mini-check-icon"></i>
      ${esc(t.content)}
    </li>`).join('') || '<li style="padding:16px 20px;font-size:.8rem;color:var(--text-4)">Chưa có task nào hôm nay</li>';

  // Subject progress
  const activeSubjects = AppData.subjects().filter(s => !activeSemester || s.semester === activeSemester);
  document.getElementById('subjectProgGrid').innerHTML = activeSubjects.map(s => {
    const sa = AppData.assignments().filter(a => a.subjectId === s.id);
    const sd = sa.filter(a => a.status === 2).length;
    const sp = sa.length ? Math.round(sd / sa.length * 100) : 0;
    return `<div class="spg-item">
      <div class="spg-header">
        <div class="spg-name"><div class="spg-dot" style="background:${s.colorHex}"></div>${esc(s.code)} · ${esc(s.name.split(' ').slice(0, 3).join(' '))}</div>
        <span class="spg-pct">${sp}%</span>
      </div>
      <div class="spg-bar"><div class="spg-fill" style="width:${sp}%;background:${s.colorHex}"></div></div>
    </div>`;
  }).join('');

  ExamModule.renderDashboardAlerts();
  StreakEngine.renderDashboardSection();
  StreakEngine.renderWidget();
}

function deadlineMeta(dl) {
  if (!dl) return { cls: 'ok', label: 'Không hạn' };
  // FIX: deadline từ API là ISO string đầy đủ (có giờ). Đừng nối thêm 'T00:00:00' —
  // việc đó làm hỏng định dạng ISO (e.g. "2026-06-15T10:00Z" + "T00:00:00" = invalid).
  const d = new Date(dl);
  const now = new Date(); now.setHours(0,0,0,0);
  if (isNaN(d.getTime())) return { cls: 'ok', label: 'Không hạn' };
  const diff = Math.round((d - now) / 86400000);
  
  if (diff < 0) return { cls: 'overdue', label: 'Quá hạn' };
  if (diff === 0) return { cls: 'near', label: 'Hôm nay' };
  if (diff === 1) return { cls: 'near', label: 'Ngày mai' };
  if (diff <= 3) return { cls: 'near', label: `Còn ${diff} ngày` };
  return { cls: 'ok', label: `Còn ${diff} ngày` };
}

/* ─ SEMESTER ─ */
// Distinct semester codes actually used by subjects (newest first).
function derivedSemesters() {
  return [...new Set(AppData.subjects().map(s => s.semester).filter(Boolean))].sort().reverse();
}

function getMostRecentSemester() {
  return derivedSemesters()[0] || '';
}

// Ordered list of semester codes: the user's "Chương trình của tôi" order first,
// then any subject semesters not yet registered. Falls back to derived if no program.
function getSemesters() {
  const program = AppData.semesters();
  const derived = derivedSemesters();
  if (!program.length) return derived;
  const ordered = [...program].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(s => s.code);
  derived.forEach(code => { if (!ordered.includes(code)) ordered.push(code); });
  return ordered;
}

// Display name for a semester code: the user's label if set, else the code itself.
function semesterLabel(code) {
  if (!code) return 'Tất cả';
  const s = AppData.semesters().find(x => x.code === code);
  return (s && s.label) ? s.label : code;
}

// Ensure the userSemesters store exists; backfill once from subjects + legacy aliases.
// Single source of truth for the semester LIST; subject→semester stays on subject.semester.
function ensureUserSemesters() {
  const data = AppData.get();
  if (!data.userSemesters) data.userSemesters = [];
  const program = data.userSemesters;
  const aliases = data.semesterAliases || {};
  // Register any subject semester not yet in the program (oldest first so the
  // list reads chronologically: smaller order = earlier semester).
  const chrono = derivedSemesters().reverse();
  chrono.forEach(code => {
    if (!program.some(s => s.code === code)) {
      program.push({ code, label: aliases[code] || '', order: program.length, isCurrent: false });
    }
  });
  // Guarantee exactly one current semester.
  if (program.length && !program.some(s => s.isCurrent)) {
    const want = window.activeSemester || getMostRecentSemester();
    const target = program.find(s => s.code === want) || program[0];
    if (target) target.isCurrent = true;
  }
  AppData.save();
}

function renderSemesterFilter() {
  const sems = getSemesters();
  const el = document.getElementById('semesterFilter');
  el.innerHTML = '<option value="">Tất cả kỳ</option>' + sems.map(s => `<option value="${esc(s)}" ${s === activeSemester ? 'selected' : ''}>${esc(semesterLabel(s))}</option>`).join('');
  document.getElementById('subjectSemesterLabel').textContent = activeSemester ? `Kỳ ${semesterLabel(activeSemester)}` : 'Tất cả kỳ học';
}

function onSemesterChange() {
  applyActiveSemester(document.getElementById('semesterFilter').value);
}

function openAddSemesterModal() { openModal('semesterModal'); }

function addNewSemester() {
  const code = document.getElementById('newSemesterCode').value.trim().toUpperCase();
  if (!code) return;
  
  const sems = AppData.semesters();
  if (!sems.find(s => s.code === code)) {
    sems.push({ code: code, label: '', order: sems.length, isCurrent: false });
    AppData.save();
  }

  window.activeSemester = code;
  persistActiveSemester();
  closeModal('semesterModal');
  
  // Just switching to a new semester — subjects will be added with this semester code
  if (typeof programRefreshAll === 'function') {
    programRefreshAll();
  } else {
    renderSemesterFilter();
  }
  
  toast(`Kỳ ${code} đã sẵn sàng — thêm môn học cho kỳ này`);
  if (typeof openMultiSubjectModal === 'function') {
    openMultiSubjectModal(code);
  }
}

/* ─ SUBJECTS ─ */
function renderSubjectPage() {
  renderSemesterFilter();
  const grid = document.getElementById('subjectsGrid');
  let list = AppData.subjects();
  if (activeSemester) list = list.filter(s => s.semester === activeSemester);

  if (!list.length) {
    grid.innerHTML = emptyState('ph ph-books', 'Chưa có môn học', 'Nhấn "Thêm môn" để bắt đầu');
    return;
  }
  grid.innerHTML = list.map(s => {
    const sn = AppData.notes().filter(n => n.subjectId === s.id).length;
    const sa = AppData.assignments().filter(a => a.subjectId === s.id);
    const sd = sa.filter(a => a.status === 2).length;
    const gi = AppData.gradeItems().filter(g => g.subjectId === s.id);
    const scored = gi.filter(g => g.value !== null);
    // Weighted total out of 10 — weight is a percentage, so divide by 100
    // (matches the calculation in grades.js). Previously /10 inflated GPA 10×.
    const ws = scored.reduce((sum, g) => sum + g.value * (g.weight / 100), 0);
    return `<div class="subject-card" role="listitem">
      <div class="sc-bar" style="background:${s.colorHex}"></div>
      <div class="sc-body">
        <div class="sc-top">
          <div class="sc-name">${esc(s.name)}</div>
          <div class="sc-code" style="background:${s.colorHex}18;color:${s.colorHex}">${esc(s.code)}</div>
        </div>
        <div class="sc-meta">
          <div class="sc-meta-row"><i class="ph ph-user"></i>${esc(s.lecturer || '—')}</div>
          <div class="sc-meta-row"><i class="${s.credits ? 'ph ph-certificate' : 'ph ph-calendar'}"></i>${s.credits ? `${s.credits} tín chỉ · ` : ''}${esc(s.semester)}</div>
          ${gi.length ? `<div class="sc-meta-row"><i class="ph ph-exam"></i>GPA hiện tại: <strong style="color:${s.colorHex}">${ws.toFixed(2)}/10</strong> (${scored.length}/${gi.length} mục)</div>` : ''}
        </div>
        <div class="sc-stats">
          <div class="sc-stat"><span class="sc-stat-val" style="color:${s.colorHex}">${sn}</span><span class="sc-stat-lbl">Ghi chú</span></div>
          <div class="sc-stat"><span class="sc-stat-val" style="color:${s.colorHex}">${sa.length}</span><span class="sc-stat-lbl">Bài tập</span></div>
          <div class="sc-stat"><span class="sc-stat-val" style="color:${s.colorHex}">${sd}/${sa.length}</span><span class="sc-stat-lbl">Xong</span></div>
          <div class="sc-actions" onclick="event.stopPropagation()">
            <button class="icon-btn" onclick="GradeModule.open(${s.id})" aria-label="Bảng điểm" title="Bảng điểm"><i class="ph ph-exam"></i></button>
            <button class="icon-btn" onclick="openSubjectEdit(${s.id})" aria-label="Sửa"><i class="ph ph-pencil"></i></button>
            <button class="icon-btn" onclick="deleteSubject(${s.id})" aria-label="Xóa" style="color:var(--red)"><i class="ph ph-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openSubjectEdit(id = null) {
  editSubjectId = id;
  document.getElementById('subjectModalTitle').textContent = id ? 'Sửa môn học' : 'Thêm môn học';
  const s = id ? AppData.subjects().find(x => x.id === id) : {};
  document.getElementById('sName').value = s.name || '';
  document.getElementById('sCode').value = s.code || '';
  document.getElementById('sLecturer').value = s.lecturer || '';
  document.getElementById('sCredits').value = s.credits || 3;
  document.getElementById('sSemester').value = s.semester || window.activeSemester || 'SU2026';
  document.getElementById('sColor').value = s.colorHex || '#10b981';
  document.getElementById('sPassThresh').value = s.passThreshold ?? 5;
  document.getElementById('sCountGPA').checked = s.isCountedInGPA !== false;
  document.getElementById('sStatusOverride').value = s.statusOverride || '';
  
  
  openModal('subjectModal');
}


function saveSubject(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('sName').value.trim(),
    code: document.getElementById('sCode').value.trim(),
    lecturer: document.getElementById('sLecturer').value.trim(),
    credits: +document.getElementById('sCredits').value,
    semester: document.getElementById('sSemester').value.trim(),
    colorHex: document.getElementById('sColor').value,
    passThreshold: +document.getElementById('sPassThresh').value,
    isCountedInGPA: document.getElementById('sCountGPA').checked,
    statusOverride: document.getElementById('sStatusOverride').value,
    isActive: true
  };
  if (editSubjectId) {
    Object.assign(AppData.subjects().find(s => s.id === editSubjectId), data);
    toast('Cập nhật môn học thành công');
  } else {
    AppData.subjects().push({ id: AppData.nextId(), ...data });
    toast('Thêm môn học thành công');
  }
  AppData.save();
  closeModal('subjectModal');
  renderSubjectPage(); renderSidebarSubjects(); renderDashboard(); populateFilters();
}

async function deleteSubject(id) {
  if (!await uiConfirm({
    title: 'Xóa môn học',
    message: 'Xóa môn này? Ghi chú, bài tập và bảng điểm liên quan cũng sẽ bị xóa.',
    confirmText: 'Xóa', danger: true, icon: 'ph-trash'
  })) return;
  const data = AppData.get();
  data.subjects = data.subjects.filter(s => s.id !== id);
  data.notes = data.notes.filter(n => n.subjectId !== id);
  data.assignments = data.assignments.filter(a => a.subjectId !== id);
  data.gradeItems = (data.gradeItems || []).filter(g => g.subjectId !== id);
  AppData.save();
  renderSubjectPage(); renderSidebarSubjects(); renderDashboard(); populateFilters();
  toast('Đã xóa môn học');
}

/* ─ FILTERS ─ */
function populateFilters() {
  let list = AppData.subjects();
  if (window.activeSemester) {
    list = list.filter(s => s.semester === window.activeSemester);
  }
  const opts = list.map(s => `<option value="${s.id}">${esc(s.code)} — ${esc(s.name)}</option>`).join('');
  ['noteSubjectFilter', 'assignSubjectFilter'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = `<option value="">Tất cả môn (Kỳ hiện tại)</option>${opts}`;
  });
  ['nSubject', 'aSubject'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = `<option value="">Chọn môn học</option>${opts}`;
  });
  // Task subject dropdown
  const tsel = document.getElementById('newTaskSubject');
  if (tsel) tsel.innerHTML = `<option value="">Không gán môn</option>${opts}`;
}

/* ─ NOTES ─ */
function renderNotesPage() { populateFilters(); filterNotes(); }

function filterNotes() {
  const sid = +document.getElementById('noteSubjectFilter').value || null;
  const tag = document.getElementById('noteTagFilter').value;
  const kw = document.getElementById('noteSearch').value.toLowerCase();
  
  // Get active subjects
  const activeSubjIds = AppData.subjects()
    .filter(s => !window.activeSemester || s.semester === window.activeSemester)
    .map(s => s.id);
    
  let list = [...AppData.notes()];
  // Filter out notes from other semesters unless specifically requested (which is not possible via dropdown anymore)
  // We keep notes with no subject assigned (subjectId=null) visible across all semesters
  list = list.filter(n => !n.subjectId || activeSubjIds.includes(n.subjectId));

  if (sid) list = list.filter(n => n.subjectId === sid);
  if (tag) list = list.filter(n => n.tag === tag);
  if (kw) list = list.filter(n => n.title.toLowerCase().includes(kw) || (n.content || '').toLowerCase().includes(kw));
  list.sort((a, b) => b.isPinned - a.isPinned || (new Date(b.updatedAt) - new Date(a.updatedAt)));

  const grid = document.getElementById('notesGrid');
  if (!list.length) { grid.innerHTML = emptyState('ph ph-note', 'Không tìm thấy ghi chú', 'Thử thay đổi bộ lọc'); return; }
  grid.innerHTML = list.map(n => {
    const sub = AppData.subjects().find(s => s.id === n.subjectId);
    return `<article class="note-card" role="listitem" onclick="openNoteDetail(${n.id})" tabindex="0" onkeydown="if(event.key==='Enter')openNoteDetail(${n.id})" aria-label="${esc(n.title)}">
      ${n.isPinned ? '<i class="ph-fill ph-push-pin note-pin-icon"></i>' : ''}
      <div class="note-chips">
        <span class="chip ${tagChipClass(n.tag)}">${tagLabel(n.tag)}</span>
        ${sub ? `<span class="chip chip-subject" style="background:${sub.colorHex}">${esc(sub.code)}</span>` : ''}
      </div>
      <div class="note-title">${esc(n.title)}</div>
      <div class="note-excerpt">${esc(n.content || 'Không có nội dung')}</div>
      <div class="note-footer">
        <span>${fmtDate(n.updatedAt)}</span>
        <div class="note-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" onclick="togglePin(${n.id})" aria-label="${n.isPinned ? 'Bỏ ghim' : 'Ghim'}"><i class="ph${n.isPinned ? '-fill' : ''} ph-push-pin" style="${n.isPinned ? 'color:var(--em)' : ''}"></i></button>
          <button class="icon-btn" onclick="openNoteEdit(${n.id})" aria-label="Sửa"><i class="ph ph-pencil"></i></button>
          <button class="icon-btn" onclick="deleteNote(${n.id})" aria-label="Xóa" style="color:var(--red)"><i class="ph ph-trash"></i></button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function openNoteEdit(id = null) {
  editNoteId = id;
  document.getElementById('noteModalTitle').textContent = id ? 'Sửa ghi chú' : 'Thêm ghi chú';
  const n = id ? AppData.notes().find(x => x.id === id) : {};
  document.getElementById('nTitle').value = n.title || '';
  document.getElementById('nContent').value = n.content || '';
  document.getElementById('nSubject').value = n.subjectId || '';
  document.getElementById('nTag').value = n.tag || 'lý-thuyết';
  openModal('noteModal');
}

function saveNote(e) {
  e.preventDefault();
  const data = { title: document.getElementById('nTitle').value.trim(), content: document.getElementById('nContent').value.trim(), subjectId: +document.getElementById('nSubject').value, tag: document.getElementById('nTag').value, updatedAt: new Date().toISOString() };
  if (editNoteId) { Object.assign(AppData.notes().find(n => n.id === editNoteId), data); toast('Cập nhật ghi chú'); }
  else { AppData.notes().push({ id: AppData.nextId(), isPinned: false, createdAt: new Date().toISOString(), ...data }); toast('Thêm ghi chú thành công'); }
  AppData.save(); closeModal('noteModal'); filterNotes(); renderDashboard();
}

function openNoteDetail(id) {
  const n = AppData.notes().find(x => x.id === id);
  const sub = AppData.subjects().find(s => s.id === n.subjectId);
  document.getElementById('noteDetailChips').innerHTML = `<span class="chip ${tagChipClass(n.tag)}">${tagLabel(n.tag)}</span>${sub ? `<span class="chip chip-subject" style="background:${sub.colorHex}">${esc(sub.code)}</span>` : ''}`;
  document.getElementById('noteDetailTitle').textContent = n.title;
  document.getElementById('noteDetailDate').textContent = `Cập nhật ${fmtDate(n.updatedAt)} · Tạo ${fmtDate(n.createdAt)}`;
  document.getElementById('noteDetailBody').textContent = n.content || 'Không có nội dung.';
  document.getElementById('ndEdit').onclick = () => { closeModal('noteDetailModal'); openNoteEdit(id); };
  document.getElementById('ndDelete').onclick = () => { closeModal('noteDetailModal'); deleteNote(id); };
  openModal('noteDetailModal');
}

function togglePin(id) {
  const n = AppData.notes().find(x => x.id === id); n.isPinned = !n.isPinned;
  AppData.save(); filterNotes(); toast(n.isPinned ? 'Đã ghim' : 'Đã bỏ ghim');
}

async function deleteNote(id) {
  if (!await uiConfirm({ title: 'Xóa ghi chú', message: 'Xóa ghi chú này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
  const n = AppData.notes(); n.splice(n.findIndex(x => x.id === id), 1);
  AppData.save(); filterNotes(); renderDashboard(); toast('Đã xóa ghi chú');
}

/* ─ ASSIGNMENTS ─ */
function renderAssignmentsPage() { populateFilters(); filterAssignments(); }

function filterAssignments() {
  const sid = +document.getElementById('assignSubjectFilter').value || null;
  const status = document.getElementById('assignStatusFilter').value;
  const pr = document.getElementById('assignPriorityFilter').value;
  const sort = document.getElementById('assignSortFilter').value;
  
  const activeSubjIds = AppData.subjects()
    .filter(s => !window.activeSemester || s.semester === window.activeSemester)
    .map(s => s.id);
    
  let list = [...AppData.assignments()];
  list = list.filter(a => !a.subjectId || activeSubjIds.includes(a.subjectId));
  
  if (sid) list = list.filter(a => a.subjectId === sid);
  if (status !== '') list = list.filter(a => a.status === +status);
  if (pr !== '') list = list.filter(a => a.priority === +pr);
  list.sort((a, b) => { const da = a.deadline ? new Date(a.deadline) : new Date(9999, 0); const db = b.deadline ? new Date(b.deadline) : new Date(9999, 0); return sort === 'asc' ? da - db : db - da; });

  const el = document.getElementById('assignmentsList');
  if (!list.length) { el.innerHTML = emptyState('ph ph-clipboard-text', 'Không có bài tập', 'Thêm bài tập mới'); return; }
  el.innerHTML = list.map(a => {
    const sub = AppData.subjects().find(s => s.id === a.subjectId);
    const isOverdue = a.deadline && (new Date(a.deadline) - new Date()) < 0;
    const isNear = a.deadline && (new Date(a.deadline) - new Date()) / 86400000 <= 2 && !isOverdue;
    return `<div class="assign-card" role="listitem">
      <div class="assign-priority-bar pr-${a.priority}"></div>
      <div class="assign-info">
        <div class="assign-title">${esc(a.title)}
          ${isOverdue ? '<span class="chip chip-luu-y">Quá hạn</span>' : isNear ? '<span class="chip chip-luu-y">Sắp hết hạn</span>' : ''}
        </div>
        <div class="assign-meta">
          ${sub ? `<span class="assign-meta-item" style="color:${sub.colorHex}"><i class="ph ph-books"></i>${esc(sub.code)}</span>` : ''}
          <span class="assign-meta-item"><i class="ph ph-calendar"></i>${fmtDateTime(a.deadline)}</span>
          <span class="assign-meta-item">${PRIORITY_LABELS[a.priority]}</span>
        </div>
      </div>
      <button class="status-btn s-${a.status}" onclick="cycleStatus(${a.id})">${STATUS_LABELS[a.status]}</button>
      <div class="assign-actions">
        <button class="icon-btn" onclick="openAssignEdit(${a.id})"><i class="ph ph-pencil"></i></button>
        <button class="icon-btn" onclick="deleteAssignment(${a.id})" style="color:var(--red)"><i class="ph ph-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function cycleStatus(id) {
  const a = AppData.assignments().find(x => x.id === id); a.status = (a.status + 1) % 3;
  AppData.save(); filterAssignments(); renderDashboard();
  toast(`Trạng thái: ${STATUS_LABELS[a.status]}`);
}

function openAssignEdit(id = null) {
  editAssignId = id;
  document.getElementById('assignModalTitle').textContent = id ? 'Sửa bài tập' : 'Thêm bài tập';
  const a = id ? AppData.assignments().find(x => x.id === id) : {};
  document.getElementById('aTitle').value = a.title || '';
  document.getElementById('aSubject').value = a.subjectId || '';
  document.getElementById('aPriority').value = a.priority ?? 1;
  document.getElementById('aStatus').value = a.status ?? 0;
  document.getElementById('aDesc').value = a.description || '';
  if (a.deadline) { const dl = new Date(a.deadline); dl.setMinutes(dl.getMinutes() - dl.getTimezoneOffset()); document.getElementById('aDeadline').value = dl.toISOString().slice(0, 16); }
  else document.getElementById('aDeadline').value = '';
  openModal('assignmentModal');
}

function saveAssignment(e) {
  e.preventDefault();
  const dlVal = document.getElementById('aDeadline').value;
  const data = { title: document.getElementById('aTitle').value.trim(), subjectId: +document.getElementById('aSubject').value, priority: +document.getElementById('aPriority').value, status: +document.getElementById('aStatus').value, description: document.getElementById('aDesc').value.trim(), deadline: dlVal ? new Date(dlVal).toISOString() : null };
  if (editAssignId) { Object.assign(AppData.assignments().find(a => a.id === editAssignId), data); toast('Cập nhật bài tập'); }
  else { AppData.assignments().push({ id: AppData.nextId(), ...data }); toast('Thêm bài tập thành công'); }
  AppData.save(); closeModal('assignmentModal'); filterAssignments(); renderDashboard();
  document.getElementById('assignBadge').textContent = AppData.assignments().filter(a => a.status !== 2).length;
}

async function deleteAssignment(id) {
  if (!await uiConfirm({ title: 'Xóa bài tập', message: 'Xóa bài tập này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
  const as = AppData.assignments(); as.splice(as.findIndex(a => a.id === id), 1);
  AppData.save(); filterAssignments(); renderDashboard(); toast('Đã xóa bài tập');
}

/* ─ CHECKLIST ─ */
function renderChecklistPage() {
  document.getElementById('checklistDateLabel').textContent = fmtDateLong(checklistDate);
  const isToday = dateKey(checklistDate) === dateKey(today);
  document.getElementById('todayBtn').style.opacity = isToday ? '.4' : '1';
  document.getElementById('todayBtn').disabled = isToday;

  const key = dateKey(checklistDate);
  const cl = AppData.checklist();
  if (!cl[key]) cl[key] = [];
  const items = [...cl[key]].sort((a, b) => a.sortOrder - b.sortOrder);

  const done = items.filter(t => t.isDone).length;
  const total = items.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  document.getElementById('checklistProgFill').style.width = pct + '%';
  document.getElementById('checklistProgLabel').textContent = `${done} / ${total} hoàn thành`;
  document.getElementById('checklistProgBar').setAttribute('aria-valuenow', pct);

  populateFilters(); // ensure subject dropdown for new tasks is fresh

  const ul = document.getElementById('taskList');
  if (!items.length) {
    ul.innerHTML = `<li style="padding:30px 20px;text-align:center;color:var(--text-4);font-size:.85rem">
      <i class="ph ph-tray" style="font-size:2rem;display:block;margin-bottom:10px;opacity:.5"></i>
      Chưa có task nào cho ngày này</li>`;
    return;
  }

  ul.innerHTML = items.map(t => {
    const sub = t.subjectId ? AppData.subjects().find(s => s.id === t.subjectId) : null;
    const completedRow = t.isDone && t.completedAt
      ? `<div class="task-completed-time"><i class="ph ph-clock" aria-hidden="true"></i> Hoàn thành lúc ${fmtTime(t.completedAt)}</div>`
      : '';
    return `<li class="task-item" data-id="${t.id}" draggable="true">
      <i class="ph ph-dots-six-vertical drag-grip" aria-hidden="true"></i>
      <button class="task-check ${t.isDone ? 'checked' : ''}" onclick="toggleTask(${t.id})" aria-label="${t.isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}" aria-pressed="${t.isDone}">
        ${t.isDone ? '<i class="ph ph-check"></i>' : ''}
      </button>
      <div class="task-content-wrap">
        <span class="task-label ${t.isDone ? 'done' : ''}">${esc(t.content)}</span>
        ${sub ? `<span class="task-subject-tag" style="background:${sub.colorHex}20;color:${sub.colorHex};border-color:${sub.colorHex}40">${esc(sub.code)}</span>` : ''}
        ${completedRow}
      </div>
      <button class="task-del-btn" onclick="deleteTask(${t.id})" aria-label="Xóa task"><i class="ph ph-x"></i></button>
    </li>`;
  }).join('');

  initDragDrop();
}

// Show the "streak lost" effect if the consecutive-day streak dropped
function checkStreakLoss(prevStreak) {
  const newStreak = AppData.streaks().currentStreak || 0;
  if (newStreak < prevStreak) StreakEngine.streakLost(prevStreak);
}

function toggleTask(id) {
  const key = dateKey(checklistDate);
  const t = AppData.checklist()[key].find(x => x.id === id);
  const prevLevel = StreakEngine.calcLevel(key);
  const prevStreak = AppData.streaks().currentStreak || 0;
  t.isDone = !t.isDone;
  t.completedAt = t.isDone ? new Date().toISOString() : null;
  AppData.save();

  const newLevel = StreakEngine.recalc(key);
  if (newLevel > prevLevel && t.isDone) StreakEngine.celebrate(newLevel);
  else checkStreakLoss(prevStreak);

  renderChecklistPage();
  renderDashboard();
}

function deleteTask(id) {
  const key = dateKey(checklistDate);
  const cl = AppData.checklist();
  const prevStreak = AppData.streaks().currentStreak || 0;
  cl[key].splice(cl[key].findIndex(t => t.id === id), 1);
  AppData.save(); StreakEngine.recalc(key); checkStreakLoss(prevStreak); renderChecklistPage(); renderDashboard();
}

function addTask() {
  const input = document.getElementById('newTaskInput');
  const content = input.value.trim();
  if (!content) return;
  const key = dateKey(checklistDate);
  const cl = AppData.checklist();
  if (!cl[key]) cl[key] = [];
  const maxOrder = cl[key].reduce((m, t) => Math.max(m, t.sortOrder), -1);
  const subjectId = +document.getElementById('newTaskSubject').value || null;
  cl[key].push({ id: AppData.nextId(), content, isDone: false, sortOrder: maxOrder + 1, subjectId, completedAt: null });
  input.value = '';
  AppData.save(); renderChecklistPage(); renderDashboard(); toast('Đã thêm task');
}

function clearDone() {
  const key = dateKey(checklistDate);
  const cl = AppData.checklist();
  if (!cl[key]) return;
  const n = cl[key].filter(t => t.isDone).length;
  if (!n) { toast('Không có task đã xong'); return; }
  const prevStreak = AppData.streaks().currentStreak || 0;
  cl[key] = cl[key].filter(t => !t.isDone);
  AppData.save(); StreakEngine.recalc(key); checkStreakLoss(prevStreak); renderChecklistPage(); renderDashboard(); toast(`Đã xóa ${n} task`);
}

function copyYesterday() {
  const prevKey = dateKey(addDays(checklistDate, -1));
  const cl = AppData.checklist();
  const notDone = (cl[prevKey] || []).filter(t => !t.isDone);
  if (!notDone.length) { toast('Không có task chưa xong từ hôm qua'); return; }
  const key = dateKey(checklistDate);
  if (!cl[key]) cl[key] = [];
  
  // So sánh content và quy về null cho subjectId để so sánh chính xác kể cả undefined
  const toCopy = notDone.filter(t => !cl[key].some(todayT => 
    todayT.content === t.content && 
    (todayT.subjectId || null) === (t.subjectId || null)
  ));
  
  if (!toCopy.length) { toast('Đã copy rồi'); return; }

  let maxOrder = cl[key].reduce((m, t) => Math.max(m, t.sortOrder), -1);
  toCopy.forEach(t => cl[key].push({ id: AppData.nextId(), content: t.content, isDone: false, sortOrder: ++maxOrder, subjectId: t.subjectId || null, completedAt: null }));
  AppData.save(); renderChecklistPage(); renderDashboard(); toast(`Đã copy ${toCopy.length} task từ hôm qua`);
}

function changeDay(delta) { checklistDate = addDays(checklistDate, delta); renderChecklistPage(); }
function goToday() { checklistDate = new Date(); checklistDate.setHours(0, 0, 0, 0); renderChecklistPage(); }

/* ─ DRAG & DROP ─ */
function initDragDrop() {
  const ul = document.getElementById('taskList');
  let dragging = null;
  ul.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragging = item; item.style.opacity = '.4'; });
    item.addEventListener('dragend', () => { item.style.opacity = '1'; dragging = null; saveDragOrder(); });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragging || dragging === item) return;
      const r = item.getBoundingClientRect();
      ul.insertBefore(dragging, e.clientY < r.top + r.height / 2 ? item : item.nextSibling);
    });
  });
}
function saveDragOrder() {
  const key = dateKey(checklistDate);
  const items = AppData.checklist()[key];
  document.querySelectorAll('.task-item').forEach((li, i) => {
    const t = items.find(x => x.id === +li.dataset.id); if (t) t.sortOrder = i;
  });
  AppData.save();
}

/* ─ MODALS ─ */
function openModal(id) { const el = document.getElementById(id); el.classList.add('open'); el.querySelector('input,select,textarea')?.focus(); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function toggleMobileSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

let _alertResolve = null;
window.uiAlert = function({ title = 'Thông báo', message = '', icon = 'ph-info' } = {}) {
  // If it's called with string message, e.g. uiAlert('Hello')
  if (typeof arguments[0] === 'string') {
    message = arguments[0];
  }
  return new Promise(resolve => {
    _alertResolve = resolve;
    document.getElementById('customAlertTitle').innerHTML = `<i class="ph-fill ${icon}"></i> ${title}`;
    document.getElementById('customAlertMessage').innerHTML = message.replace(/\n/g, '<br>');
    const btn = document.getElementById('customAlertBtn');
    btn.onclick = () => {
      closeModal('customAlertModal');
      const r = _alertResolve; _alertResolve = null;
      if (r) r();
    };
    openModal('customAlertModal');
    btn.focus();
  });
};

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  // A pending confirm dialog must resolve (as cancel) before it's hidden
  if (document.getElementById('confirmModal').classList.contains('open')) { _confirmResolveAndClose(false); return; }
  if (document.getElementById('promptModal')?.classList.contains('open')) { _promptResolveAndClose(null); return; }
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

/* ─ CONFIRM DIALOG ─ (thay cho confirm() mặc định) */
let _confirmResolve = null;
function uiConfirm({ title = 'Xác nhận', message = '', confirmText = 'Xác nhận', cancelText = 'Huỷ', danger = false, icon } = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const ok = document.getElementById('confirmOkBtn');
    ok.textContent = confirmText;
    ok.className = danger ? 'btn-danger' : 'btn-primary';
    document.getElementById('confirmCancelBtn').textContent = cancelText;
    const ic = document.getElementById('confirmIcon');
    ic.className = 'confirm-icon ' + (danger ? 'is-danger' : 'is-info');
    ic.innerHTML = `<i class="ph-fill ${icon || (danger ? 'ph-warning' : 'ph-question')}"></i>`;
    openModal('confirmModal');
    ok.focus();
  });
}
function _confirmResolveAndClose(val) {
  closeModal('confirmModal');
  const r = _confirmResolve; _confirmResolve = null;
  if (r) r(val);
}

/* ─ PROMPT DIALOG ─ (thay cho prompt() mặc định) */
let _promptResolve = null;
function uiPrompt({ title = 'Nhập', message = '', value = '', placeholder = '', confirmText = 'Lưu', icon = 'ph-pencil-simple' } = {}) {
  return new Promise(resolve => {
    _promptResolve = resolve;
    document.getElementById('promptTitle').textContent = title;
    const msg = document.getElementById('promptMessage');
    msg.innerHTML = message ? esc(message).replace(/\n/g, '<br>') : '';
    msg.style.display = message ? '' : 'none';
    const input = document.getElementById('promptInput');
    input.value = value || '';
    input.placeholder = placeholder || '';
    document.getElementById('promptOkBtn').textContent = confirmText;
    document.getElementById('promptIcon').innerHTML = `<i class="ph-fill ${icon}"></i>`;
    openModal('promptModal');
    input.focus(); input.select();
  });
}
function _promptResolveAndClose(val) {
  closeModal('promptModal');
  const r = _promptResolve; _promptResolve = null;
  // null = huỷ. Chuỗi (kể cả rỗng) = người dùng xác nhận.
  if (r) r(val === null ? null : String(val).trim());
}
window.uiPrompt = uiPrompt;

/* ─ TOAST ─ */
let toastT;
const TOAST_ICONS = {
  success: 'ph-check-circle',
  info: 'ph-info',
  warn: 'ph-warning',
  error: 'ph-x-circle',
};
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  const ic = el.querySelector('.toast-icon');
  if (ic) ic.className = `ph-fill ${TOAST_ICONS[type] || TOAST_ICONS.success} toast-icon`;
  el.classList.remove('toast-success', 'toast-info', 'toast-warn', 'toast-error');
  el.classList.add(`toast-${TOAST_ICONS[type] ? type : 'success'}`);
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ─ UTILS ─ */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function tagChipClass(tag) { return { 'lưu-ý': 'chip-luu-y', 'lý-thuyết': 'chip-ly-thuyet', 'đề-cương': 'chip-de-cuong', 'khác': 'chip-khac' }[tag] || 'chip-khac'; }
function tagLabel(tag) { return { 'lưu-ý': 'Lưu ý', 'lý-thuyết': 'Lý thuyết', 'đề-cương': 'Đề cương', 'khác': 'Khác' }[tag] || tag; }
function emptyState(icon, title, sub) { return `<div class="empty-state"><i class="${icon}"></i><p>${esc(title)}</p><span>${esc(sub)}</span></div>`; }
let tempAvatarData = null;

function openProfileModal() {
  const u = AuthManager.currentUser;
  if (!u) return;
  document.getElementById('pName').value = u.displayName || u.username;
  document.getElementById('pUni').value = u.university || '';
  
  tempAvatarData = u.avatarData || null;
  const preview = document.getElementById('pAvatarPreview');
  if (tempAvatarData) {
    preview.textContent = '';
    preview.style.backgroundImage = `url(${tempAvatarData})`;
  } else {
    const initials = (u.displayName || u.username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    preview.textContent = initials;
    preview.style.backgroundImage = 'none';
  }
  openModal('profileModal');
}

function handleAvatarSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    tempAvatarData = evt.target.result;
    const preview = document.getElementById('pAvatarPreview');
    preview.textContent = '';
    preview.style.backgroundImage = `url(${tempAvatarData})`;
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const name = document.getElementById('pName').value.trim();
  const uni = document.getElementById('pUni').value.trim();
  if (!name) {
    toast('Tên hiển thị không được để trống', 'error');
    return;
  }
  
  AuthManager.updateUser({
    displayName: name,
    university: uni,
    avatarData: tempAvatarData
  });
  
  // Refresh UI
  const u = AuthManager.currentUser;
  const avatarEl = document.getElementById('userAvatar');
  if (u.avatarData) {
    avatarEl.textContent = '';
    avatarEl.style.backgroundImage = `url(${u.avatarData})`;
    avatarEl.style.color = 'transparent';
  } else {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
    avatarEl.style.backgroundImage = 'none';
    avatarEl.style.color = 'var(--text-1)';
  }
  document.getElementById('userName').textContent = name;
  document.getElementById('userUni').textContent = uni;
  
  closeModal('profileModal');
  toast('Cập nhật thông tin thành công');
}

function openDonateModal() {
  openModal('donateModal');
}
