// ===================================================
// StudyNote — Main Application Logic
// ===================================================

/* ---- INIT ---- */
let currentPage = 'dashboard';
let editingSubjectId = null;
let editingNoteId = null;
let editingAssignmentId = null;
let currentChecklistDate = new Date();
currentChecklistDate.setHours(0,0,0,0);

document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initDates();
  renderSidebarSubjects();
  renderDashboard();
  renderSubjects();
  renderNotes();
  renderAssignments();
  renderChecklist();
  initSidebarToggle();
  initThemeToggle();
});

/* ---- GREETING ---- */
function initGreeting() {
  const h = new Date().getHours();
  let g = h < 12 ? 'Chào buổi sáng! ☀️' : h < 18 ? 'Chào buổi chiều! 🌤️' : 'Chào buổi tối! 🌙';
  document.getElementById('greetingText').textContent = g;
  document.getElementById('todayText').textContent = formatDateLong(new Date());
}

/* ---- DATES ---- */
function initDates() {
  document.getElementById('checklistDateTitle').textContent = formatDateLong(currentChecklistDate);
}

function formatDateLong(d) {
  const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
  return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateShort(d) {
  if(!d) return '—';
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateTime(d) {
  if(!d) return '—';
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

/* ---- PAGE NAVIGATION ---- */
function showPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const nl = document.getElementById(`nav-${name}`);
  if(nl) nl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    subjects: 'Môn Học',
    notes: 'Ghi Chú',
    assignments: 'Bài Tập / Deadline',
    checklist: 'Việc Cần Làm'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
}

document.querySelectorAll('.nav-link[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

/* ---- SIDEBAR TOGGLE ---- */
function initSidebarToggle() {
  const btn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  btn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });
}

/* ---- THEME TOGGLE ---- */
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  btn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const icon = btn.querySelector('i');
    icon.className = document.body.classList.contains('light-mode')
      ? 'bi bi-sun-fill'
      : 'bi bi-moon-stars-fill';
  });
}

/* ---- SIDEBAR SUBJECTS ---- */
function renderSidebarSubjects() {
  const list = document.getElementById('subjectList');
  list.innerHTML = subjects.map(s => `
    <li class="subject-item" onclick="filterBySubject(${s.id})">
      <div class="subject-dot" style="background:${s.colorHex}"></div>
      <span class="subject-item-name">${s.code} — ${s.name}</span>
    </li>
  `).join('');
}

function filterBySubject(id) {
  showPage('notes');
  document.getElementById('noteSubjectFilter').value = id;
  filterNotes();
}

/* ---- DASHBOARD ---- */
function renderDashboard() {
  // Stats
  document.getElementById('stat-subjects').textContent = subjects.length;
  const allNotes = notes.length;
  document.getElementById('stat-notes').textContent = allNotes;
  const pendingAssign = assignments.filter(a => a.status !== 2).length;
  document.getElementById('stat-assignments').textContent = pendingAssign;

  const todayTasks = checklistData[dateKey(today)] || [];
  const done = todayTasks.filter(t => t.isDone).length;
  const total = todayTasks.length;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-total').textContent = total;

  // Deadline list
  const sorted = [...assignments]
    .filter(a => a.status !== 2 && a.deadline)
    .sort((a,b) => a.deadline - b.deadline)
    .slice(0, 5);

  document.getElementById('deadlineList').innerHTML = sorted.map(a => {
    const sub = subjects.find(s => s.id === a.subjectId);
    const { cls, label } = deadlineInfo(a.deadline);
    return `
      <div class="deadline-item">
        <div class="deadline-badge ${cls}"><i class="bi bi-${deadlineIcon(a.deadline)}"></i></div>
        <div class="deadline-info">
          <div class="deadline-name">${a.title}</div>
          <div class="deadline-meta">${sub?.code || ''} · ${priorityLabel(a.priority)}</div>
        </div>
        <div class="deadline-time">${label}</div>
      </div>
    `;
  }).join('');

  // Mini checklist
  document.getElementById('miniChecklist').innerHTML = todayTasks.slice(0, 5).map(t => `
    <li class="${t.isDone ? 'done' : ''}">
      <div class="mini-check ${t.isDone ? 'done' : ''}">
        ${t.isDone ? '<i class="bi bi-check"></i>' : ''}
      </div>
      ${t.content}
    </li>
  `).join('');

  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('dashProgressFill').style.width = pct + '%';
  document.getElementById('dashProgressText').textContent = `${done}/${total} hoàn thành`;

  // Subject progress
  document.getElementById('subjectProgressGrid').innerHTML = subjects.map(s => {
    const sNotes = notes.filter(n => n.subjectId === s.id).length;
    const sAssign = assignments.filter(a => a.subjectId === s.id);
    const sDone = sAssign.filter(a => a.status === 2).length;
    const sTotal = sAssign.length;
    const pct = sTotal > 0 ? Math.round(sDone / sTotal * 100) : 0;
    return `
      <div class="subject-progress-item">
        <div class="subject-progress-header">
          <div class="subject-progress-name">
            <div class="subject-progress-dot" style="background:${s.colorHex}"></div>
            ${s.code} — ${s.name.split(' ').slice(0,3).join(' ')}
          </div>
          <div class="subject-progress-pct">${pct}% BT xong</div>
        </div>
        <div class="subject-bar">
          <div class="subject-bar-fill" style="width:${pct}%;background:${s.colorHex}"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ---- SUBJECTS ---- */
function renderSubjects() {
  const grid = document.getElementById('subjectsGrid');
  if(!subjects.length) {
    grid.innerHTML = emptyState('bi-book', 'Chưa có môn học nào', 'Nhấn "+ Thêm môn học" để bắt đầu');
    return;
  }
  grid.innerHTML = subjects.map(s => {
    const sNotes = notes.filter(n => n.subjectId === s.id).length;
    const sAssign = assignments.filter(a => a.subjectId === s.id);
    const sDone = sAssign.filter(a => a.status === 2).length;
    return `
      <div class="subject-card" onclick="filterBySubject(${s.id})">
        <div class="subject-card-banner" style="background:${s.colorHex}"></div>
        <div class="subject-card-body">
          <div class="subject-card-header">
            <div class="subject-card-title">${s.name}</div>
            <div class="subject-card-code" style="background:${s.colorHex}22;color:${s.colorHex}">${s.code}</div>
          </div>
          <div class="subject-card-info">
            <div class="subject-info-row"><i class="bi bi-person-fill"></i>${s.lecturer || '—'}</div>
            <div class="subject-info-row"><i class="bi bi-award-fill"></i>${s.credits} tín chỉ · ${s.semester}</div>
          </div>
          <div class="subject-card-stats" onclick="event.stopPropagation()">
            <div class="subject-stat">
              <div class="subject-stat-val" style="color:${s.colorHex}">${sNotes}</div>
              <div class="subject-stat-lbl">Ghi chú</div>
            </div>
            <div class="subject-stat">
              <div class="subject-stat-val" style="color:${s.colorHex}">${sAssign.length}</div>
              <div class="subject-stat-lbl">Bài tập</div>
            </div>
            <div class="subject-stat">
              <div class="subject-stat-val" style="color:${s.colorHex}">${sDone}/${sAssign.length}</div>
              <div class="subject-stat-lbl">Hoàn thành</div>
            </div>
            <div style="margin-left:auto;display:flex;gap:6px;">
              <button class="btn-icon" onclick="openSubjectModal(${s.id})" title="Sửa"><i class="bi bi-pencil"></i></button>
              <button class="btn-icon" onclick="deleteSubject(${s.id})" title="Xóa" style="color:var(--accent-red)"><i class="bi bi-trash3"></i></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openSubjectModal(id = null) {
  editingSubjectId = id;
  document.getElementById('subjectModalTitle').textContent = id ? 'Sửa Môn Học' : 'Thêm Môn Học';
  if(id) {
    const s = subjects.find(x => x.id === id);
    document.getElementById('subjectName').value = s.name;
    document.getElementById('subjectCode').value = s.code;
    document.getElementById('subjectLecturer').value = s.lecturer || '';
    document.getElementById('subjectCredits').value = s.credits || 3;
    document.getElementById('subjectSemester').value = s.semester || '';
    document.getElementById('subjectColor').value = s.colorHex;
  } else {
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';
    document.getElementById('subjectLecturer').value = '';
    document.getElementById('subjectCredits').value = 3;
    document.getElementById('subjectSemester').value = 'SU2026';
    document.getElementById('subjectColor').value = '#6366f1';
  }
  openModal('subjectModal');
}

function setColor(hex) {
  document.getElementById('subjectColor').value = hex;
}

function saveSubject(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('subjectName').value.trim(),
    code: document.getElementById('subjectCode').value.trim(),
    lecturer: document.getElementById('subjectLecturer').value.trim(),
    credits: parseInt(document.getElementById('subjectCredits').value),
    semester: document.getElementById('subjectSemester').value.trim(),
    colorHex: document.getElementById('subjectColor').value,
    isActive: true,
    noteCount: 0,
    assignmentCount: 0
  };
  if(editingSubjectId) {
    const idx = subjects.findIndex(s => s.id === editingSubjectId);
    subjects[idx] = { ...subjects[idx], ...data };
    showToast('Cập nhật môn học thành công!');
  } else {
    subjects.push({ id: genId(), ...data });
    showToast('Thêm môn học thành công!');
  }
  closeModal('subjectModal');
  renderSubjects();
  renderSidebarSubjects();
  renderDashboard();
  populateSubjectFilters();
}

function deleteSubject(id) {
  if(!confirm('Xóa môn học này? Ghi chú và bài tập liên quan cũng sẽ bị xóa.')) return;
  const idx = subjects.findIndex(s => s.id === id);
  subjects.splice(idx, 1);
  renderSubjects();
  renderSidebarSubjects();
  renderDashboard();
  showToast('Đã xóa môn học!', true);
}

/* ---- NOTES ---- */
function renderNotes() {
  populateSubjectFilters();
  filterNotes();
}

function populateSubjectFilters() {
  const opts = subjects.map(s => `<option value="${s.id}">${s.code} — ${s.name}</option>`).join('');
  ['noteSubjectFilter', 'assignSubjectFilter', 'noteSubjectId', 'assignSubjectId'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const first = el.options[0];
    el.innerHTML = '';
    if(first) el.appendChild(first.cloneNode(true));
    else el.innerHTML = '<option value="">Chọn môn học</option>';
    el.innerHTML += opts;
  });
}

function filterNotes() {
  const subjectId = parseInt(document.getElementById('noteSubjectFilter').value) || null;
  const tag = document.getElementById('noteTagFilter').value;
  const kw = document.getElementById('noteSearch').value.toLowerCase();

  let filtered = [...notes];
  if(subjectId) filtered = filtered.filter(n => n.subjectId === subjectId);
  if(tag) filtered = filtered.filter(n => n.tag === tag);
  if(kw) filtered = filtered.filter(n =>
    n.title.toLowerCase().includes(kw) || (n.content && n.content.toLowerCase().includes(kw))
  );
  filtered.sort((a,b) => b.isPinned - a.isPinned || b.updatedAt - a.updatedAt);

  const grid = document.getElementById('notesGrid');
  if(!filtered.length) {
    grid.innerHTML = emptyState('bi-journal-x', 'Không có ghi chú nào', 'Thử thay đổi bộ lọc hoặc thêm ghi chú mới');
    return;
  }
  grid.innerHTML = filtered.map(n => {
    const sub = subjects.find(s => s.id === n.subjectId);
    return `
      <div class="note-card" onclick="openNoteDetail(${n.id})">
        ${n.isPinned ? '<div class="note-card-pin"><i class="bi bi-pin-fill"></i></div>' : ''}
        <div class="note-card-header">
          <span class="tag-badge ${tagClass(n.tag)}">${tagLabel(n.tag)}</span>
          ${sub ? `<span class="subject-badge" style="background:${sub.colorHex}">${sub.code}</span>` : ''}
        </div>
        <div class="note-card-title">${n.title}</div>
        <div class="note-card-excerpt">${n.content || 'Không có nội dung...'}</div>
        <div class="note-card-footer">
          <span>${formatDateShort(n.updatedAt)}</span>
          <div class="note-actions" onclick="event.stopPropagation()">
            <button class="btn-icon" onclick="togglePin(${n.id})" title="${n.isPinned ? 'Bỏ ghim':'Ghim'}">
              <i class="bi bi-pin${n.isPinned ? '-fill':''}" style="color:${n.isPinned ? 'var(--accent-yellow)':''}"></i>
            </button>
            <button class="btn-icon" onclick="openNoteModal(${n.id})" title="Sửa"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon" onclick="deleteNote(${n.id})" title="Xóa" style="color:var(--accent-red)"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openNoteModal(id = null) {
  editingNoteId = id;
  document.getElementById('noteModalTitle').textContent = id ? 'Sửa Ghi Chú' : 'Thêm Ghi Chú';
  if(id) {
    const n = notes.find(x => x.id === id);
    document.getElementById('noteTitle').value = n.title;
    document.getElementById('noteContent').value = n.content || '';
    document.getElementById('noteSubjectId').value = n.subjectId;
    document.getElementById('noteTag').value = n.tag || 'khác';
  } else {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteSubjectId').value = '';
    document.getElementById('noteTag').value = 'lý-thuyết';
  }
  openModal('noteModal');
}

function saveNote(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('noteTitle').value.trim(),
    content: document.getElementById('noteContent').value.trim(),
    subjectId: parseInt(document.getElementById('noteSubjectId').value),
    tag: document.getElementById('noteTag').value,
    updatedAt: new Date()
  };
  if(editingNoteId) {
    const idx = notes.findIndex(n => n.id === editingNoteId);
    notes[idx] = { ...notes[idx], ...data };
    showToast('Cập nhật ghi chú thành công!');
  } else {
    notes.push({ id: genId(), isPinned: false, createdAt: new Date(), ...data });
    showToast('Thêm ghi chú thành công!');
  }
  closeModal('noteModal');
  filterNotes();
  renderDashboard();
}

function openNoteDetail(id) {
  const n = notes.find(x => x.id === id);
  const sub = subjects.find(s => s.id === n.subjectId);
  document.getElementById('noteDetailTitle').textContent = n.title;
  document.getElementById('noteDetailDate').textContent = `Cập nhật: ${formatDateShort(n.updatedAt)} · Tạo: ${formatDateShort(n.createdAt)}`;
  document.getElementById('noteDetailContent').textContent = n.content || 'Không có nội dung.';
  document.getElementById('noteDetailTag').className = `tag-badge ${tagClass(n.tag)}`;
  document.getElementById('noteDetailTag').textContent = tagLabel(n.tag);
  document.getElementById('noteDetailSubject').className = 'subject-badge';
  document.getElementById('noteDetailSubject').style.background = sub ? sub.colorHex : '#999';
  document.getElementById('noteDetailSubject').textContent = sub ? sub.code : '';
  document.getElementById('noteDetailEdit').onclick = () => { closeModal('noteDetailModal'); openNoteModal(id); };
  document.getElementById('noteDetailDelete').onclick = () => { closeModal('noteDetailModal'); deleteNote(id); };
  openModal('noteDetailModal');
}

function togglePin(id) {
  const n = notes.find(x => x.id === id);
  n.isPinned = !n.isPinned;
  filterNotes();
  showToast(n.isPinned ? 'Đã ghim ghi chú!' : 'Đã bỏ ghim!');
}

function deleteNote(id) {
  if(!confirm('Xóa ghi chú này?')) return;
  const idx = notes.findIndex(n => n.id === id);
  notes.splice(idx, 1);
  filterNotes();
  renderDashboard();
  showToast('Đã xóa ghi chú!', true);
}

/* ---- ASSIGNMENTS ---- */
const PRIORITY_LABELS = ['Thấp','Trung bình','Cao','Khẩn cấp'];
const STATUS_LABELS = ['Chưa làm','Đang làm','Hoàn thành'];

function priorityLabel(p) { return PRIORITY_LABELS[p] || '—'; }

function deadlineInfo(dl) {
  if(!dl) return { cls: 'badge-green', label: 'Không có deadline' };
  const now = new Date();
  const diff = (dl - now) / 86400000; // days
  if(diff < 0) return { cls: 'badge-red', label: 'Quá hạn!' };
  if(diff <= 1) return { cls: 'badge-red', label: 'Hôm nay' };
  if(diff <= 3) return { cls: 'badge-yellow', label: `${Math.ceil(diff)} ngày` };
  return { cls: 'badge-green', label: `${Math.ceil(diff)} ngày` };
}

function deadlineIcon(dl) {
  if(!dl) return 'calendar';
  const diff = (dl - new Date()) / 86400000;
  if(diff < 0) return 'exclamation-triangle-fill';
  if(diff <= 1) return 'alarm-fill';
  if(diff <= 3) return 'clock-fill';
  return 'calendar-check';
}

function deadlineTagClass(dl) {
  if(!dl) return 'dl-ok';
  const diff = (dl - new Date()) / 86400000;
  if(diff < 0) return 'dl-overdue';
  if(diff <= 3) return 'dl-near';
  return 'dl-ok';
}

function renderAssignments() {
  populateSubjectFilters();
  filterAssignments();
}

function filterAssignments() {
  const subjectId = parseInt(document.getElementById('assignSubjectFilter').value) || null;
  const status = document.getElementById('assignStatusFilter').value;
  const priority = document.getElementById('assignPriorityFilter').value;
  const sort = document.getElementById('assignSortFilter').value;

  let filtered = [...assignments];
  if(subjectId) filtered = filtered.filter(a => a.subjectId === subjectId);
  if(status !== '') filtered = filtered.filter(a => a.status === parseInt(status));
  if(priority !== '') filtered = filtered.filter(a => a.priority === parseInt(priority));
  filtered.sort((a,b) => {
    const da = a.deadline || new Date(9999,0,1);
    const db = b.deadline || new Date(9999,0,1);
    return sort === 'asc' ? da - db : db - da;
  });

  const list = document.getElementById('assignmentsList');
  if(!filtered.length) {
    list.innerHTML = emptyState('bi-clipboard2-x', 'Không có bài tập nào', 'Thử thay đổi bộ lọc hoặc thêm bài tập mới');
    return;
  }
  list.innerHTML = filtered.map(a => {
    const sub = subjects.find(s => s.id === a.subjectId);
    const { cls, label } = deadlineInfo(a.deadline);
    const dlClass = deadlineTagClass(a.deadline);
    return `
      <div class="assignment-card">
        <div class="assignment-priority priority-${a.priority}" title="${priorityLabel(a.priority)}"></div>
        <div class="assignment-info">
          <div class="assignment-title">
            ${a.title}
            ${a.deadline && (a.deadline - new Date()) / 86400000 < 0 ? '<span class="deadline-tag dl-overdue">Quá hạn</span>' :
              a.deadline && (a.deadline - new Date()) / 86400000 <= 2 ? '<span class="deadline-tag dl-near">Sắp hết hạn</span>' : ''}
          </div>
          <div class="assignment-meta">
            ${sub ? `<span style="color:${sub.colorHex}">${sub.code}</span>` : ''}
            <span><i class="bi bi-calendar3" style="margin-right:3px"></i>${formatDateTime(a.deadline)}</span>
            <span>${priorityLabel(a.priority)}</span>
          </div>
        </div>
        <div onclick="cycleStatus(${a.id})" class="status-badge status-${a.status}" title="Click để đổi trạng thái">
          ${STATUS_LABELS[a.status]}
        </div>
        <div class="assignment-actions">
          <button class="btn-icon" onclick="openAssignmentModal(${a.id})" title="Sửa"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon" onclick="deleteAssignment(${a.id})" title="Xóa" style="color:var(--accent-red)"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function cycleStatus(id) {
  const a = assignments.find(x => x.id === id);
  a.status = (a.status + 1) % 3;
  filterAssignments();
  renderDashboard();
  showToast(`Trạng thái: ${STATUS_LABELS[a.status]}`);
}

function openAssignmentModal(id = null) {
  editingAssignmentId = id;
  document.getElementById('assignmentModalTitle').textContent = id ? 'Sửa Bài Tập' : 'Thêm Bài Tập';
  if(id) {
    const a = assignments.find(x => x.id === id);
    document.getElementById('assignTitle').value = a.title;
    document.getElementById('assignSubjectId').value = a.subjectId;
    document.getElementById('assignPriority').value = a.priority;
    document.getElementById('assignStatus').value = a.status;
    document.getElementById('assignDescription').value = a.description || '';
    if(a.deadline) {
      const dl = new Date(a.deadline);
      dl.setMinutes(dl.getMinutes() - dl.getTimezoneOffset());
      document.getElementById('assignDeadline').value = dl.toISOString().slice(0,16);
    } else {
      document.getElementById('assignDeadline').value = '';
    }
  } else {
    document.getElementById('assignTitle').value = '';
    document.getElementById('assignSubjectId').value = '';
    document.getElementById('assignPriority').value = 1;
    document.getElementById('assignStatus').value = 0;
    document.getElementById('assignDescription').value = '';
    document.getElementById('assignDeadline').value = '';
  }
  openModal('assignmentModal');
}

function saveAssignment(e) {
  e.preventDefault();
  const dlVal = document.getElementById('assignDeadline').value;
  const data = {
    title: document.getElementById('assignTitle').value.trim(),
    subjectId: parseInt(document.getElementById('assignSubjectId').value),
    priority: parseInt(document.getElementById('assignPriority').value),
    status: parseInt(document.getElementById('assignStatus').value),
    description: document.getElementById('assignDescription').value.trim(),
    deadline: dlVal ? new Date(dlVal) : null
  };
  if(editingAssignmentId) {
    const idx = assignments.findIndex(a => a.id === editingAssignmentId);
    assignments[idx] = { ...assignments[idx], ...data };
    showToast('Cập nhật bài tập thành công!');
  } else {
    assignments.push({ id: genId(), ...data });
    showToast('Thêm bài tập thành công!');
  }
  closeModal('assignmentModal');
  filterAssignments();
  renderDashboard();
}

function deleteAssignment(id) {
  if(!confirm('Xóa bài tập này?')) return;
  const idx = assignments.findIndex(a => a.id === id);
  assignments.splice(idx, 1);
  filterAssignments();
  renderDashboard();
  showToast('Đã xóa bài tập!', true);
}

/* ---- CHECKLIST ---- */
function renderChecklist() {
  document.getElementById('checklistDateTitle').textContent = formatDateLong(currentChecklistDate);
  const isToday = dateKey(currentChecklistDate) === dateKey(today);
  document.getElementById('todayBtn').style.opacity = isToday ? '0.4' : '1';

  const key = dateKey(currentChecklistDate);
  if(!checklistData[key]) checklistData[key] = [];
  const items = checklistData[key].sort((a,b) => a.sortOrder - b.sortOrder);

  const done = items.filter(t => t.isDone).length;
  const total = items.length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('checklistProgressFill').style.width = pct + '%';
  document.getElementById('checklistProgressText').textContent = `${done}/${total} hoàn thành`;

  const ul = document.getElementById('checklistItems');
  if(!items.length) {
    ul.innerHTML = `<li style="padding:30px 24px;text-align:center;color:var(--text-muted);font-size:0.9rem;">
      <i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
      Chưa có task nào cho ngày này</li>`;
    return;
  }
  ul.innerHTML = items.map(t => `
    <li class="checklist-item ${t.isDone ? 'done' : ''}" data-id="${t.id}" draggable="true">
      <i class="bi bi-grip-vertical drag-handle"></i>
      <div class="check-box ${t.isDone ? 'checked' : ''}" onclick="toggleTask(${t.id})">
        ${t.isDone ? '<i class="bi bi-check"></i>' : ''}
      </div>
      <span class="check-content ${t.isDone ? 'done' : ''}">${t.content}</span>
      <button class="delete-task-btn" onclick="deleteTask(${t.id})"><i class="bi bi-trash3"></i></button>
    </li>
  `).join('');

  initDragDrop();
}

function toggleTask(id) {
  const key = dateKey(currentChecklistDate);
  const task = checklistData[key].find(t => t.id === id);
  task.isDone = !task.isDone;
  renderChecklist();
  renderDashboard();
}

function deleteTask(id) {
  const key = dateKey(currentChecklistDate);
  const idx = checklistData[key].findIndex(t => t.id === id);
  checklistData[key].splice(idx, 1);
  renderChecklist();
  renderDashboard();
}

function addTask() {
  const input = document.getElementById('newTaskInput');
  const content = input.value.trim();
  if(!content) return;
  const key = dateKey(currentChecklistDate);
  if(!checklistData[key]) checklistData[key] = [];
  const maxOrder = checklistData[key].reduce((m,t) => Math.max(m, t.sortOrder), -1);
  checklistData[key].push({ id: genId(), content, isDone: false, sortOrder: maxOrder + 1 });
  input.value = '';
  renderChecklist();
  renderDashboard();
  showToast('Đã thêm task!');
}

function handleTaskInput(e) {
  if(e.key === 'Enter') addTask();
}

function clearDone() {
  const key = dateKey(currentChecklistDate);
  if(!checklistData[key]) return;
  const removed = checklistData[key].filter(t => t.isDone).length;
  if(!removed) { showToast('Không có task đã xong!'); return; }
  checklistData[key] = checklistData[key].filter(t => !t.isDone);
  renderChecklist();
  renderDashboard();
  showToast(`Đã xóa ${removed} task hoàn thành!`);
}

function copyYesterday() {
  const prevDay = addDays(currentChecklistDate, -1);
  const prevKey = dateKey(prevDay);
  if(!checklistData[prevKey]) { showToast('Không có dữ liệu ngày hôm qua!'); return; }
  const notDone = checklistData[prevKey].filter(t => !t.isDone);
  if(!notDone.length) { showToast('Hôm qua không còn task chưa xong!'); return; }
  const key = dateKey(currentChecklistDate);
  if(!checklistData[key]) checklistData[key] = [];
  let maxOrder = checklistData[key].reduce((m,t) => Math.max(m, t.sortOrder), -1);
  notDone.forEach(t => {
    checklistData[key].push({ id: genId(), content: t.content, isDone: false, sortOrder: ++maxOrder });
  });
  renderChecklist();
  renderDashboard();
  showToast(`Đã copy ${notDone.length} task từ hôm qua!`);
}

function changeChecklistDay(delta) {
  currentChecklistDate = addDays(currentChecklistDate, delta);
  renderChecklist();
}

function goToToday() {
  currentChecklistDate = new Date();
  currentChecklistDate.setHours(0,0,0,0);
  renderChecklist();
}

/* ---- DRAG & DROP (Checklist) ---- */
function initDragDrop() {
  const ul = document.getElementById('checklistItems');
  let dragging = null;

  ul.querySelectorAll('.checklist-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragging = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragging = null; saveOrder(); });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if(dragging && dragging !== item) {
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if(e.clientY < mid) ul.insertBefore(dragging, item);
        else ul.insertBefore(dragging, item.nextSibling);
      }
    });
  });
}

function saveOrder() {
  const key = dateKey(currentChecklistDate);
  const items = checklistData[key];
  document.querySelectorAll('.checklist-item').forEach((li, i) => {
    const id = parseInt(li.dataset.id);
    const task = items.find(t => t.id === id);
    if(task) task.sortOrder = i;
  });
}

/* ---- MODALS ---- */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/* ---- TOAST ---- */
let toastTimer;
function showToast(msg, warn = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.querySelector('i').className = warn ? 'bi bi-info-circle-fill' : 'bi bi-check-circle-fill';
  t.querySelector('i').style.color = warn ? 'var(--accent-yellow)' : 'var(--accent-green)';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---- HELPERS ---- */
function emptyState(icon, title, sub) {
  return `<div class="empty-state" style="grid-column:1/-1;">
    <i class="bi ${icon}"></i>
    <p style="font-size:1rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">${title}</p>
    <p>${sub}</p>
  </div>`;
}

function tagClass(tag) {
  const map = { 'lưu-ý':'tag-luu-y','lý-thuyết':'tag-ly-thuyet','đề-cương':'tag-de-cuong','khác':'tag-khac' };
  return map[tag] || 'tag-khac';
}

function tagLabel(tag) {
  const map = { 'lưu-ý':'⚠️ Lưu ý','lý-thuyết':'📖 Lý thuyết','đề-cương':'📋 Đề cương','khác':'📌 Khác' };
  return map[tag] || tag;
}
