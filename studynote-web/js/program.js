// ===================================================
// StudyNote — "Chương trình của tôi" (My Program)
// ---------------------------------------------------
// MVP semester manager: define your real semesters, set the current one,
// rename them, reorder them, and move subjects between them.
//
// Single source of truth for the semester LIST is AppData.semesters()
// (userSemesters). Which subject belongs to which semester stays on
// subject.semester — so the 6 other pages keep working unchanged via
// window.activeSemester + subject.semester. No duplicated mapping.
// ===================================================

window.renderProgramPage = function () {
  if (typeof ensureUserSemesters === 'function') ensureUserSemesters();
  const container = document.getElementById('programContainer');
  if (!container) return;

  const program = [...AppData.semesters()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const allCodes = getSemesters();

  if (!program.length) {
    container.innerHTML = emptyState('ph ph-path', 'Chưa có kỳ học nào',
      'Nhấn "Thêm kỳ" hoặc Import FAP để bắt đầu lập chương trình của bạn.');
    return;
  }

  container.innerHTML = program.map((sem, idx) => {
    const subs = AppData.subjects().filter(s => s.semester === sem.code);
    const otherCodes = allCodes.filter(c => c !== sem.code);
    const canMove = otherCodes.length > 0;

    const subjectsHtml = subs.length ? subs.map(s => {
      const moveItems = otherCodes
        .map(c => `<button type="button" class="prog-move-item" onclick="programMoveSubject(${s.id}, '${esc(c)}')">
            <i class="ph ph-arrow-bend-up-right"></i><span>${esc(semesterLabel(c))}</span><span class="prog-move-code">${esc(c)}</span>
          </button>`).join('');
      return `
      <div class="prog-subject">
        <div class="prog-subj-left">
          <span class="prog-subj-dot" style="background:${s.colorHex}"></span>
          <span class="prog-subj-code" style="color:${s.colorHex}">${esc(s.code)}</span>
          <span class="prog-subj-name">${esc(s.name)}</span>
        </div>
        <div class="prog-subj-actions" onclick="event.stopPropagation()">
          <div class="prog-move-wrap">
            <button class="icon-btn" title="${canMove ? 'Chuyển sang kỳ khác' : 'Không có kỳ khác để chuyển'}"
                    ${canMove ? `onclick="programToggleMoveMenu(event, this)"` : 'disabled'}>
              <i class="ph ph-arrows-left-right"></i>
            </button>
            ${canMove ? `<div class="prog-move-menu" role="menu">
              <div class="prog-move-menu-head">Chuyển sang kỳ…</div>
              ${moveItems}
            </div>` : ''}
          </div>
          <button class="icon-btn" title="Bảng điểm" onclick="GradeModule.open(${s.id})"><i class="ph ph-exam"></i></button>
          <button class="icon-btn" title="Sửa môn" onclick="openSubjectEdit(${s.id})"><i class="ph ph-pencil"></i></button>
        </div>
      </div>`;
    }).join('')
      : '<div class="prog-empty">Chưa có môn nào trong kỳ này.</div>';

    return `
      <div class="prog-semester panel ${sem.isCurrent ? 'is-current' : ''}">
        <div class="prog-sem-head">
          <div class="prog-sem-title">
            ${sem.isCurrent
              ? '<span class="prog-current-badge"><i class="ph-fill ph-check-circle"></i> Kỳ hiện tại</span>'
              : `<button class="prog-setcur-btn" title="Đặt làm kỳ hiện tại" onclick="programSetCurrent('${esc(sem.code)}')"><i class="ph ph-target"></i> Đặt hiện tại</button>`}
            <h2 class="prog-sem-name">${esc(semesterLabel(sem.code))}</h2>
            <span class="prog-sem-code">${esc(sem.code)}</span>
            <span class="prog-sem-count">${subs.length} môn</span>
          </div>
          <div class="prog-sem-tools">
            <button class="icon-btn" title="Lên" onclick="programReorder('${esc(sem.code)}', -1)" ${idx === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i></button>
            <button class="icon-btn" title="Xuống" onclick="programReorder('${esc(sem.code)}', 1)" ${idx === program.length - 1 ? 'disabled' : ''}><i class="ph ph-arrow-down"></i></button>
            <button class="icon-btn" title="Đổi tên hiển thị" onclick="programSetLabel('${esc(sem.code)}')"><i class="ph ph-text-aa"></i></button>
            <button class="icon-btn" title="Đổi mã kỳ" onclick="programRenameCode('${esc(sem.code)}')"><i class="ph ph-textbox"></i></button>
            <button class="icon-btn" title="Xóa kỳ" style="color:var(--red)" onclick="programDeleteSemester('${esc(sem.code)}')"><i class="ph ph-trash"></i></button>
          </div>
        </div>
        <div class="prog-subject-list">${subjectsHtml}</div>
        <div class="prog-sem-foot">
          <button class="btn-primary btn-sm" onclick="openMultiSubjectModal('${esc(sem.code)}')"><i class="ph ph-plus"></i> Thêm môn vào kỳ</button>
        </div>
      </div>`;
  }).join('');
};

// Re-render the program page plus every semester-dependent view.
function programRefreshAll() {
  if (typeof renderProgramPage === 'function') renderProgramPage();
  if (typeof populateGlobalSemesterDropdown === 'function') populateGlobalSemesterDropdown();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderSidebarSubjects === 'function') renderSidebarSubjects();
  if (typeof renderSubjectPage === 'function') renderSubjectPage();
  if (typeof renderNotesPage === 'function') renderNotesPage();
  if (typeof renderAssignmentsPage === 'function') renderAssignmentsPage();
  if (typeof renderGradesPage === 'function') renderGradesPage();
}

window.programSetCurrent = function (code) {
  applyActiveSemester(code);   // sets isCurrent flags + persists + refreshes the 6 pages
  renderProgramPage();
  toast(`Đã đặt kỳ hiện tại: ${semesterLabel(code)}`, 'success');
};

// ── Menu "Chuyển kỳ" gọn cho từng môn ──────────────────────────
function programCloseMoveMenus() {
  document.querySelectorAll('.prog-move-wrap.open').forEach(w => w.classList.remove('open'));
}
window.programToggleMoveMenu = function (event, btn) {
  event.stopPropagation();
  const wrap = btn.closest('.prog-move-wrap');
  if (!wrap) return;
  const willOpen = !wrap.classList.contains('open');
  programCloseMoveMenus();
  if (willOpen) {
    wrap.classList.add('open');
    // Mở lên trên nếu gần đáy màn hình để menu không bị tràn.
    const r = btn.getBoundingClientRect();
    wrap.classList.toggle('drop-up', r.bottom + 240 > window.innerHeight);
  }
};
document.addEventListener('click', programCloseMoveMenus);

window.programSetLabel = async function (code) {
  const sem = AppData.semesters().find(s => s.code === code);
  if (!sem) return;
  const v = await uiPrompt({
    title: 'Đổi tên hiển thị',
    message: `Tên hiển thị cho kỳ ${code} (vd: Kỳ 1, Mùa hè 2025…). Để trống để dùng lại mã kỳ.`,
    value: sem.label || '',
    placeholder: 'Tên hiển thị…',
    icon: 'ph-text-aa'
  });
  if (v === null) return;
  sem.label = v;
  AppData.save();
  programRefreshAll();
  toast('Đã cập nhật tên hiển thị kỳ', 'success');
};

window.programRenameCode = async function (code) {
  const v = await uiPrompt({
    title: 'Đổi mã kỳ',
    message: `Đổi MÃ kỳ "${code}" thành mã mới (vd: SU2025, FA2025…).`,
    value: code,
    placeholder: 'Mã kỳ mới…',
    icon: 'ph-textbox'
  });
  if (!v || v === code) return;
  const newCode = v;
  if (AppData.semesters().some(s => s.code === newCode)) {
    uiAlert('Mã kỳ này đã tồn tại.');
    return;
  }
  const subs = AppData.subjects().filter(s => s.semester === code);
  const ok = await uiConfirm({
    title: 'Đổi mã kỳ',
    message: `Đổi mã "${code}" → "${newCode}". ${subs.length} môn sẽ được cập nhật theo. Tiếp tục?`
  });
  if (!ok) return;
  subs.forEach(s => s.semester = newCode);
  const sem = AppData.semesters().find(s => s.code === code);
  if (sem) sem.code = newCode;
  if (window.activeSemester === code) window.activeSemester = newCode;
  persistActiveSemester();
  programRefreshAll();
  toast(`Đã đổi mã kỳ thành ${newCode}`, 'success');
};

window.programMoveSubject = function (subjId, toCode) {
  if (!toCode) return;
  const sub = AppData.subjects().find(s => s.id === subjId);
  if (!sub) return;
  sub.semester = toCode;
  AppData.save();
  programRefreshAll();
  toast(`Đã chuyển ${sub.code} sang ${semesterLabel(toCode)}`, 'success');
};

window.programReorder = function (code, dir) {
  const program = [...AppData.semesters()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const i = program.findIndex(s => s.code === code);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= program.length) return;
  const a = program[i], b = program[j];
  const tmp = a.order ?? i;
  a.order = b.order ?? j;
  b.order = tmp;
  // Normalize order values to 0..n-1 to stay clean.
  program.sort((x, y) => (x.order ?? 0) - (y.order ?? 0)).forEach((s, k) => s.order = k);
  AppData.save();
  programRefreshAll();
};

window.programDeleteSemester = async function (code) {
  const delLabel = semesterLabel(code);
  const subs = AppData.subjects().filter(s => s.semester === code);
  const ok = await uiConfirm({
    title: 'Xóa kỳ học',
    message: subs.length
      ? `Kỳ "${semesterLabel(code)}" còn ${subs.length} môn. Xóa kỳ sẽ KHÔNG xóa môn, nhưng các môn này sẽ không còn thuộc kỳ nào (bạn có thể gán lại sau). Tiếp tục?`
      : `Xóa kỳ "${semesterLabel(code)}"?`,
    confirmText: 'Xóa', danger: true, icon: 'ph-trash'
  });
  if (!ok) return;
  const data = AppData.get();
  data.userSemesters = AppData.semesters().filter(s => s.code !== code);
  subs.forEach(s => s.semester = '');
  data.userSemesters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach((s, k) => s.order = k);
  if (window.activeSemester === code) {
    window.activeSemester = data.userSemesters[0]?.code || '';
  }
  data.userSemesters.forEach(s => s.isCurrent = (s.code === window.activeSemester));
  persistActiveSemester();
  programRefreshAll();
  toast(`Đã xóa kỳ ${delLabel}`, 'warn');
};

// ── DYNAMIC REPEATER SUBJECT ADDITION ──────────────────────────────────
let dynamicSubjectBlockId = 0;

window.openMultiSubjectModal = function (code) {
  if (!code) code = window.activeSemester;
  document.getElementById('dynamicSubjectSemester').value = code || '';
  document.getElementById('dynamicSubjectModalTitle').textContent = code ? `Thêm môn học vào kỳ ${code}` : `Thêm môn học`;
  document.getElementById('dynamicSubjectList').innerHTML = '';
  dynamicSubjectBlockId = 0;
  addDynamicSubjectBlock();
  openModal('dynamicSubjectModal');
};

window.addDynamicSubjectBlock = function () {
  dynamicSubjectBlockId++;
  const id = dynamicSubjectBlockId;
  const list = document.getElementById('dynamicSubjectList');
  const curriculum = AppData.curriculum() || [];
  
  let currOptions = '<option value="">-- Chọn môn từ Khung chương trình --</option>';
  const existingCodes = AppData.subjects().map(x => (x.code || '').toUpperCase());
  const available = curriculum.filter(c => c.code && !existingCodes.includes(c.code.toUpperCase()));
  available.forEach(c => {
    currOptions += `<option value="${esc(c.code)}">${esc(c.code)} - ${esc(c.name)}</option>`;
  });
  
  const div = document.createElement('div');
  div.className = 'dyn-subject-block';
  div.id = `dsb-${id}`;
  div.innerHTML = `
    <div class="dsb-header">
      <div class="dsb-title">Môn học #${id}</div>
      <button type="button" class="icon-btn" onclick="removeDynamicSubjectBlock(${id})" style="color:var(--red)" title="Xoá"><i class="ph ph-trash"></i></button>
    </div>
    <div class="dsb-type-toggle">
      <label><input type="radio" name="dsb_type_${id}" value="curriculum" checked onchange="toggleDsbType(${id})"> Khung chương trình</label>
      <label><input type="radio" name="dsb_type_${id}" value="manual" onchange="toggleDsbType(${id})"> Tự nhập thủ công</label>
    </div>
    <div class="dsb-body">
      <div id="dsb_curr_${id}" class="dsb-curriculum">
        <select id="dsb_curr_select_${id}" class="field-input">
          ${currOptions}
        </select>
      </div>
      <div id="dsb_man_${id}" class="dsb-manual" style="display:none">
        <input type="text" id="dsb_man_name_${id}" class="field-input dsb-manual-full" placeholder="Tên môn *" />
        <input type="text" id="dsb_man_code_${id}" class="field-input" placeholder="Mã môn" />
        <input type="number" id="dsb_man_credits_${id}" class="field-input" placeholder="Tín chỉ" value="3" min="1" max="10" />
      </div>
    </div>
  `;
  list.appendChild(div);
};

window.removeDynamicSubjectBlock = function (id) {
  const block = document.getElementById(`dsb-${id}`);
  if (block) block.remove();
  if (document.getElementById('dynamicSubjectList').children.length === 0) {
    addDynamicSubjectBlock();
  }
};

window.toggleDsbType = function (id) {
  const type = document.querySelector(`input[name="dsb_type_${id}"]:checked`).value;
  document.getElementById(`dsb_curr_${id}`).style.display = type === 'curriculum' ? 'block' : 'none';
  document.getElementById(`dsb_man_${id}`).style.display = type === 'manual' ? 'grid' : 'none';
};

window.saveDynamicSubjects = function () {
  const semesterCode = document.getElementById('dynamicSubjectSemester').value;
  const blocks = document.querySelectorAll('.dyn-subject-block');
  const curriculum = AppData.curriculum() || [];
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  let addedCount = 0;
  let hasError = false;
  
  blocks.forEach(block => {
    const id = block.id.replace('dsb-', '');
    const type = document.querySelector(`input[name="dsb_type_${id}"]:checked`).value;
    
    if (type === 'curriculum') {
      const code = document.getElementById(`dsb_curr_select_${id}`).value;
      if (code) {
        const c = curriculum.find(x => x.code === code);
        if (c) {
          AppData.subjects().push({
            id: AppData.nextId(),
            code: c.code,
            name: c.name,
            semester: semesterCode,
            lecturer: '',
            credits: c.credits || 3,
            passThresh: 5,
            status: '',
            colorHex: colors[addedCount % colors.length],
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }
    } else {
      const name = document.getElementById(`dsb_man_name_${id}`).value.trim();
      const code = document.getElementById(`dsb_man_code_${id}`).value.trim();
      const credits = +document.getElementById(`dsb_man_credits_${id}`).value || 3;
      
      if (name) {
        AppData.subjects().push({
          id: AppData.nextId(),
          code: code,
          name: name,
          semester: semesterCode,
          lecturer: '',
          credits: credits,
          passThresh: 5,
          status: '',
          colorHex: colors[addedCount % colors.length],
          createdAt: new Date().toISOString()
        });
        addedCount++;
      } else {
        if (code) hasError = true;
      }
    }
  });
  
  if (hasError) {
    toast('Một số môn bị bỏ qua do thiếu Tên môn.', 'warn');
  }
  
  if (addedCount > 0) {
    AppData.save();
    programRefreshAll();
    closeModal('dynamicSubjectModal');
    toast(`Đã thêm ${addedCount} môn học vào kỳ ${semesterCode}`, 'success');
  } else if (!hasError) {
    toast('Chưa có môn nào được thêm', 'warn');
  }
};
