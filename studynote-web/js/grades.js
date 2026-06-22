// ===================================================
// StudyNote — Grade Calculator Module
// ===================================================

const GradeModule = {

  // ── Render grade page for a subject ───────────────
  getSubjectGradesStatus(subjId) {
    const sub = AppData.subjects().find(s => s.id === subjId);
    if (!sub) return { html: '', status: '', statusClass: '', currentTotal: 0 };
    
    if (sub.statusOverride === 'PASS') {
       return { html: '', status: 'PASSED', statusClass: 'status-passed', currentTotal: 0 };
    }
    if (sub.statusOverride === 'FAIL') {
       return { html: '', status: 'FAILED', statusClass: 'status-failed', currentTotal: 0 };
    }

    const items = AppData.gradeItems().filter(g => g.subjectId === subjId);
    const threshold = sub.passThreshold ?? 5;
    const scored   = items.filter(g => g.value !== null);
    const unscored = items.filter(g => g.value === null);

    const weightedSum  = scored.reduce((s, g) => s + g.value * (g.weight / 100), 0);
    const remainWeight = unscored.reduce((s, g) => s + g.weight, 0);

    const currentTotal = weightedSum; 
    const condFails = items.filter(g => g.condition && this._checkCondition(g.value, g.condition) === false);
    const isPassing = currentTotal >= threshold && remainWeight === 0 && condFails.length === 0;
    
    let status = 'STUDYING';
    let statusClass = 'status-studying';
    if (remainWeight === 0) {
       status = isPassing ? 'PASSED' : 'FAILED';
       statusClass = isPassing ? 'status-passed' : 'status-failed';
    } else if (condFails.length > 0) {
       status = 'FAILED (Cảnh báo)';
       statusClass = 'status-failed';
    }

    return { status, statusClass, currentTotal };
  },

  open(subjectId) {
    const sub = AppData.subjects().find(s => s.id === subjectId);
    if (!sub) return;

    const modal = document.getElementById('gradeModal');
    document.getElementById('gradeModalTitle').textContent = `Bảng điểm — ${sub.code}`;
    document.getElementById('gradeSubjectId').value = subjectId;
    document.getElementById('gradePassThreshold').value = sub.passThreshold ?? 5;

    this.render(subjectId);
    openModal('gradeModal');
  },

  render(subjectId) {
    const items = AppData.gradeItems().filter(g => g.subjectId === subjectId);
    const sub   = AppData.subjects().find(s => s.id === subjectId);
    const threshold = sub?.passThreshold ?? 5;

    const tbody = document.getElementById('gradeTableBody');

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="grade-empty">
        <i class="ph ph-exam" style="font-size:1.5rem;display:block;margin-bottom:6px;opacity:.4"></i>
        Chưa có cột điểm nào. Nhấn "Thêm" để bắt đầu.
      </td></tr>`;
      document.getElementById('gradeTableFooter').innerHTML = '';
      document.getElementById('gradeSummary').innerHTML = '';
      return;
    }

    const grouped = {};
    items.forEach(g => {
       const cat = g.category || 'Other';
       if (!grouped[cat]) grouped[cat] = [];
       grouped[cat].push(g);
    });

    let tbodyHtml = '';
    
    for (const [cat, catItems] of Object.entries(grouped)) {
       let catWeight = 0;
       
       catItems.forEach((g, idx) => {
         catWeight += g.weight;
         const valStr = g.value !== null ? g.value.toString() : '';
         
         const condOk = this._checkCondition(g.value, g.condition);
         let condStr = g.condition ? g.condition.trim() : '> 0';
         if (g.condition) {
           if (!isNaN(condStr)) condStr = '≥ ' + condStr;
           else condStr = condStr.replace(/^>=\s*/, '≥ ').replace(/^>\s*/, '≥ ');
         }
         
         let comment = `Cond: ${esc(condStr)}`;
         if (condOk === false) comment += ' ❌';
         else if (condOk === true) comment += ' ✅';

         tbodyHtml += `<tr>
           <td class="grade-name">
             ${esc(g.name)}
             <div class="grade-actions-inline">
                <button class="icon-btn-tiny" onclick="GradeModule.editItem(${g.id})"><i class="ph ph-pencil"></i></button>
                <button class="icon-btn-tiny text-red" onclick="GradeModule.deleteItem(${g.id})"><i class="ph ph-trash"></i></button>
             </div>
           </td>
           <td class="grade-weight">${g.weight.toFixed(1)} %</td>
           <td class="grade-value">
             <div class="custom-number-input">
               <input type="number" class="grade-input-inline" min="0" max="10" step="0.1" value="${valStr}" onchange="GradeModule.updateValue(${g.id}, this.value)" />
               <div class="spinner-col">
                 <button type="button" tabindex="-1" onclick="GradeModule.stepValue(${g.id}, 0.1)"><i class="ph-fill ph-caret-up"></i></button>
                 <button type="button" tabindex="-1" onclick="GradeModule.stepValue(${g.id}, -0.1)"><i class="ph-fill ph-caret-down"></i></button>
               </div>
             </div>
           </td>
           <td class="grade-comment">${comment}</td>
         </tr>`;
       });
       
       tbodyHtml += `<tr class="grade-category-total">
         <td class="grade-name-total">Total (${esc(cat)})
           <button class="icon-btn-tiny text-em" style="margin-left:8px; opacity:1" onclick="GradeModule.addItemInline(${subjectId}, '${esc(cat)}')"><i class="ph ph-plus"></i></button>
         </td>
         <td class="grade-weight-total-cell">${catWeight.toFixed(1)} %</td>
         <td></td>
         <td></td>
       </tr>`;
    }

    tbody.innerHTML = tbodyHtml;

    // Summary calculation
    this.renderSummary(subjectId, threshold);
  },

  renderSummary(subjectId, threshold) {
    const subject = AppData.subjects().find(s => s.id === subjectId);
    const items = AppData.gradeItems().filter(g => g.subjectId === subjectId);
    const scored   = items.filter(g => g.value !== null);
    const unscored = items.filter(g => g.value === null);

    const weightedSum  = scored.reduce((s, g) => s + g.value * (g.weight / 100), 0);
    const scoredWeight = scored.reduce((s, g) => s + g.weight, 0);
    const remainWeight = unscored.reduce((s, g) => s + g.weight, 0);

    const currentTotal = weightedSum; // out of 10
    const needed = remainWeight > 0 ? Math.max(0, (threshold - currentTotal) / (remainWeight / 100)) : null;

    const condFails = items.filter(g => g.condition && this._checkCondition(g.value, g.condition) === false);
    const isPassing = currentTotal >= threshold && remainWeight === 0 && condFails.length === 0;
    const isImpossible = needed !== null && needed > 10;
    
    let status = 'STUDYING';
    let statusClass = 'status-studying';
    if (remainWeight === 0) {
       status = isPassing ? 'PASSED' : 'FAILED';
       statusClass = isPassing ? 'status-passed' : 'status-failed';
    } else if (isImpossible || condFails.length > 0) {
       status = 'FAILED (Cảnh báo)';
       statusClass = 'status-failed';
    }

    if (subject && subject.statusOverride === 'PASS') {
       status = 'PASSED (Override)';
       statusClass = 'status-passed';
    } else if (subject && subject.statusOverride === 'FAIL') {
       status = 'FAILED (Override)';
       statusClass = 'status-failed';
    }

    const footerHtml = `
      <div class="fpt-grade-footer-row">
        <div class="fpt-grade-footer-label" style="width:30%">COURSE TOTAL</div>
        <div class="fpt-grade-footer-label" style="width:30%">AVERAGE</div>
        <div class="fpt-grade-footer-val">${currentTotal.toFixed(1)}</div>
      </div>
      <div class="fpt-grade-footer-row">
        <div class="fpt-grade-footer-label" style="width:30%"></div>
        <div class="fpt-grade-footer-label" style="width:30%">STATUS</div>
        <div class="fpt-grade-footer-val ${statusClass}">${status}</div>
      </div>
    `;
    
    document.getElementById('gradeTableFooter').innerHTML = footerHtml;
    
    let alertHtml = '';
    const totalWeight = scoredWeight + remainWeight;
    if (items.length > 0 && totalWeight < 100) {
       alertHtml += `<div class="grade-alert grade-alert-fail" style="margin-bottom:8px; margin-top:8px"><i class="ph-fill ph-warning-circle"></i> Chưa nhập đủ Total 100% (Hiện tại: ${totalWeight.toFixed(1)}%)</div>`;
    }
    if (needed !== null && needed <= 10 && needed >= 0) {
       alertHtml += `<div class="grade-alert grade-alert-warn"><i class="ph-fill ph-info"></i> Cần đạt trung bình <strong>${needed.toFixed(3)}/10</strong> cho ${remainWeight}% còn lại để qua môn.</div>`;
    }
    document.getElementById('gradeSummary').innerHTML = alertHtml;
  },

  _checkCondition(value, condition) {
    if (value === null) return null;
    if (!condition || condition.trim() === '') return value > 0;
    
    let cond = condition.trim();
    if (!isNaN(cond)) cond = '>=' + cond;
    else cond = cond.replace(/^>\s*/, '>=');
    
    try {
      return Function(`return ${value} ${cond}`)();
    } catch { return null; }
  },

  updateValue(id, raw) {
    const item = AppData.gradeItems().find(g => g.id === id);
    if (!item) return;
    item.value = raw === '' ? null : Math.min(10, Math.max(0, parseFloat(raw)));
    AppData.save();
    this.render(item.subjectId);
  },

  addItem(subjectId) {
    document.getElementById('giSubjectId').value = subjectId;
    document.getElementById('giId').value = '';
    document.getElementById('giCategory').value = '';
    document.getElementById('giName').value = '';
    document.getElementById('giWeight').value = '';
    document.getElementById('giValue').value = '';
    document.getElementById('giCondition').value = '';
    document.getElementById('giConditionLabel').value = '';
    document.getElementById('gradeItemModalTitle').textContent = 'Thêm cột điểm';
    openModal('gradeItemModal');
  },

  editItem(id) {
    const g = AppData.gradeItems().find(x => x.id === id);
    if (!g) return;
    document.getElementById('giSubjectId').value = g.subjectId;
    document.getElementById('giId').value = g.id;
    document.getElementById('giCategory').value = g.category || '';
    document.getElementById('giName').value = g.name;
    document.getElementById('giWeight').value = g.weight;
    document.getElementById('giValue').value = g.value ?? '';
    document.getElementById('giCondition').value = g.condition ?? '';
    document.getElementById('giConditionLabel').value = g.conditionLabel ?? '';
    document.getElementById('gradeItemModalTitle').textContent = 'Sửa cột điểm';
    openModal('gradeItemModal');
  },

  saveItem(e) {
    e.preventDefault();
    const subjectId = +document.getElementById('giSubjectId').value;
    const existingId = document.getElementById('giId').value;
    const raw = document.getElementById('giValue').value;
    const data = {
      subjectId,
      category:       document.getElementById('giCategory').value.trim(),
      name:           document.getElementById('giName').value.trim(),
      weight:         +document.getElementById('giWeight').value,
      value:          raw === '' ? null : +raw,
      condition:      document.getElementById('giCondition').value.trim() || null,
      conditionLabel: document.getElementById('giConditionLabel').value.trim() || null,
    };
    if (!data.name || !data.weight || !data.category) return;

    if (existingId) {
      Object.assign(AppData.gradeItems().find(g => g.id === +existingId), data);
    } else {
      AppData.gradeItems().push({ id: AppData.nextId(), ...data });
    }
    AppData.save();
    closeModal('gradeItemModal');
    this.render(subjectId);
    toast(existingId ? 'Cập nhật cột điểm thành công' : 'Thêm cột điểm thành công');
  },

  deleteItem(id) {
    const items = AppData.gradeItems();
    const idx = items.findIndex(g => g.id === id);
    if (idx < 0) return;
    const subjectId = items[idx].subjectId;
    items.splice(idx, 1);
    AppData.save();
    this.render(subjectId);
    toast('Đã xóa cột điểm');
  },

  updateThreshold(subjectId) {
    const val = parseFloat(document.getElementById('gradePassThreshold').value);
    const sub = AppData.subjects().find(s => s.id === subjectId);
    if (sub && !isNaN(val)) {
      sub.passThreshold = Math.min(10, Math.max(0, val));
      AppData.save();
      this.render(subjectId);
    }
  },

  addItemInline(subjectId, cat) {
    this.addItem(subjectId);
    setTimeout(() => {
      document.getElementById('giCategory').value = cat;
    }, 10);
  },

  stepValue(id, diff) {
    const item = AppData.gradeItems().find(g => g.id === id);
    if (!item) return;
    let val = item.value === null ? 0 : item.value;
    val = Math.min(10, Math.max(0, val + diff));
    item.value = parseFloat(val.toFixed(1));
    AppData.save();
    this.render(item.subjectId);
  }
};

const GradeDragDrop = {
  draggedId: null,
  start(e, id) {
    this.draggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 10);
  },
  end(e) {
    this.draggedId = null;
    e.target.style.opacity = '1';
    document.querySelectorAll('.grades-semester-box').forEach(b => b.classList.remove('drag-over'));
  },
  over(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  },
  leave(e) {
    e.currentTarget.classList.remove('drag-over');
  },
  drop(e, targetSem) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!this.draggedId) return;
    let sub = AppData.subjects().find(s => s.id === this.draggedId);
    if (sub) {
      sub.semester = targetSem;
      AppData.save();
      renderGradesPage();
    }
    this.draggedId = null;
  }
};

// NOTE: these methods are merged INTO the GradeModule object declared at the top of
// this file (not a second object). Inline onclick handlers resolve `GradeModule` to
// that single const, so rename/alias/import/override must live on the same object.
Object.assign(GradeModule, {
  editSemesterAlias(semCode) {
    // Semester display name now lives on userSemesters (shared with "Chương trình của tôi").
    if (typeof ensureUserSemesters === 'function') ensureUserSemesters();
    let sem = AppData.semesters().find(s => s.code === semCode);
    const curr = (sem && sem.label) || '';
    const newAlias = prompt(`Tên hiển thị cho kỳ ${semCode} (vd: Kỳ 1, Kỳ Mùa Hè...)\nĐể trống để dùng lại mã kỳ:`, curr);
    if (newAlias === null) return;
    if (!sem) {
      const program = AppData.semesters();
      sem = { code: semCode, label: '', order: program.length, isCurrent: false };
      program.push(sem);
    }
    sem.label = newAlias.trim();
    AppData.save();
    if (typeof populateGlobalSemesterDropdown === 'function') populateGlobalSemesterDropdown();
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof renderProgramPage === 'function') renderProgramPage();
    renderGradesPage();
  },
  async renameSemester(oldSem) {
    const newSem = prompt(`Đổi tên kỳ: ${oldSem}\nNhập mã kỳ mới (VD: SU2026, Ky1...):`);
    if (!newSem || !newSem.trim() || newSem.trim() === oldSem) return;
    
    const finalNewSem = newSem.trim();
    const subs = AppData.subjects().filter(s => s.semester === oldSem);
    
    const ok = await uiConfirm({
      title: 'Xác nhận Đổi tên Kỳ',
      message: `Bạn sắp đổi tên kỳ "${oldSem}" thành "${finalNewSem}".\nSẽ có ${subs.length} môn học được cập nhật theo.\n\nTiếp tục?`
    });
    if (!ok) return;
    
    subs.forEach(s => s.semester = finalNewSem);

    // Update the program entry's code (single source for the semester list).
    if (typeof ensureUserSemesters === 'function') ensureUserSemesters();
    const semEntry = AppData.semesters().find(s => s.code === oldSem);
    if (semEntry) semEntry.code = finalNewSem;

    AppData.save();

    // The renamed code IS the shared semester name — it now propagates to every
    // feature keyed off subject.semester (dashboard, sidebar, filters, grades).
    // The curriculum framework is intentionally untouched: it lives in a separate
    // store (curriculumData, grouped by termNo), not by subject.semester.
    if (window.activeSemester === oldSem) {
       window.activeSemester = finalNewSem;
       if (typeof persistActiveSemester === 'function') persistActiveSemester();
    }

    // Refresh every semester-dependent view so the new name shows everywhere.
    if (typeof populateGlobalSemesterDropdown === 'function') populateGlobalSemesterDropdown();
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderSidebarSubjects === 'function') renderSidebarSubjects();
    if (typeof renderSubjectPage === 'function') renderSubjectPage();
    if (typeof renderNotesPage === 'function') renderNotesPage();
    if (typeof renderAssignmentsPage === 'function') renderAssignmentsPage();
    if (typeof renderProgramPage === 'function') renderProgramPage();
    renderGradesPage();
    toast(`Đã đổi mã kỳ thành ${finalNewSem}`);
  },

  // Manually mark a subject PASSED/FAILED (or 'auto' to clear) straight from the
  // grades overview. Needed for pass-with-0-point subjects that auto-compute as FAILED.
  setStatusOverride(subjId, value) {
    const sub = AppData.subjects().find(s => s.id === subjId);
    if (!sub) return;
    if (value === 'PASS' || value === 'FAIL') sub.statusOverride = value;
    else delete sub.statusOverride;
    AppData.save();
    renderGradesPage();
    if (typeof renderDashboard === 'function') renderDashboard();
    toast(value === 'PASS' ? `Đã đặt ${sub.code} → Qua môn`
        : value === 'FAIL' ? `Đã đặt ${sub.code} → Trượt môn`
        : `Đã trả ${sub.code} về tính tự động`);
  },

  openImportModal() {
    document.getElementById('fapGradeText').value = '';
    openModal('fapGradeImportModal');
  },
  
  async doImport() {
    const text = document.getElementById('fapGradeText').value;
    if (!text.trim()) { uiAlert('Vui lòng nhập bảng khung điểm.'); return; }
    const subjectId = +document.getElementById('gradeSubjectId').value;
    
    const lines = text.split('\n');
    let items = [];
    let currentCategory = 'Other';
    
    for (let line of lines) {
      // Split by tab. If not enough tabs, try splitting by 2 or more spaces.
      let parts = line.split(/\t/);
      if (parts.length < 3) {
        parts = line.split(/\s{2,}/);
      }
      parts = parts.map(s => s.trim());
      
      // FIX: dùng 'let' thay vì 'const' vì biến này có thể bị re-assign phídưới
      let low = (parts[0] || '').toLowerCase();
      if (!low) {
        // If first column is empty, check if second column is valid
        if (parts.length >= 3) {
          low = parts[1].toLowerCase();
        } else {
          continue;
        }
      }
      
      if (low.startsWith('grade category')) continue;
      if (low.startsWith('total') || low.startsWith('course total') || low.startsWith('status')) continue;
      
      // Usually FAP mark scheme is: Category \t Name \t Weight \t Value
      // If Category is empty, it means it belongs to previous Category
      if (parts.length >= 3) {
        let cat = parts[0];
        let name = parts[1];
        let weightStr = parts[2];
        
        if (cat) currentCategory = cat;
        else cat = currentCategory;
        
        let weightMatch = weightStr.match(/([\d.]+)/);
        if (weightMatch) {
          items.push({
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
    
    if (items.length === 0) {
      uiAlert('Không tìm thấy cột điểm hợp lệ nào. Vui lòng copy đúng bảng (có các cột bằng Tab).');
      return;
    }
    
    const existing = AppData.gradeItems().filter(g => g.subjectId === subjectId);
    if (existing.length > 0) {
      const ok = await uiConfirm({
        title: 'Ghi đè Khung điểm',
        message: 'Môn này đã có sẵn các cột điểm. Bạn có muốn Xoá sạch (Ghi đè) để Import khung mới không?\n\n(Chọn "Đã xác nhận" để xoá toàn bộ cột điểm cũ, "Đừng" để ghép chung)',
        danger: true
      });
      if (ok) {
        AppData.get().gradeItems = AppData.gradeItems().filter(g => g.subjectId !== subjectId);
      }
    }
    
    items.forEach(i => i.id = AppData.nextId());
    AppData.gradeItems().push(...items);
    AppData.save();
    
    closeModal('fapGradeImportModal');
    toast(`Đã import thành công ${items.length} cột điểm!`);
    GradeModule.render(subjectId);
  }
});

// Expose the single, fully-merged object on window for any explicit window.GradeModule use.
window.GradeModule = GradeModule;

window.renderGradesPage = function() {
  const container = document.getElementById('gradesPageContainer');
  const sems = getSemesters();
  const filter = document.getElementById('gradesSemesterFilter');

  // Rebuild options every render (preserving the current choice) so a renamed
  // semester immediately shows its new name instead of a stale one.
  const prevValue = filter.value;
  const firstRender = filter.options.length <= 1;
  filter.innerHTML = '<option value="">Tất cả kỳ</option>' + sems.map(s => `<option value="${esc(s)}">${esc(typeof semesterLabel === 'function' ? semesterLabel(s) : s)}</option>`).join('');
  if (firstRender) {
    filter.value = (activeSemester && sems.includes(activeSemester)) ? activeSemester : (sems[0] || '');
  } else if (prevValue === '' || sems.includes(prevValue)) {
    filter.value = prevValue;
  } else {
    filter.value = (activeSemester && sems.includes(activeSemester)) ? activeSemester : (sems[0] || '');
  }

  let sem = filter.value;
  document.getElementById('gradesSemesterLabel').textContent = sem ? `Kỳ ${typeof semesterLabel === 'function' ? semesterLabel(sem) : sem}` : 'Tất cả kỳ học';
  
  let subjects = AppData.subjects();
  if (sem) subjects = subjects.filter(s => s.semester === sem);
  
  if (!subjects.length) {
    container.innerHTML = emptyState('ph ph-books', 'Không có môn học', 'Không có môn học nào trong kỳ này.');
    return;
  }
  
  let html = '';
  
  if (!sem) {
    let studied = 0, gpaCredits = 0, gpaPoints = 0;
    let forecastStudied = 0, forecastGpaCredits = 0, forecastGpaPoints = 0;
    
    subjects.forEach(sub => {
      const items = AppData.gradeItems().filter(g => g.subjectId === sub.id);
      if (!items.length) return;
      
      const scoredWeight = items.reduce((s, g) => s + (g.value !== null ? g.weight : 0), 0);
      const totalWeight = items.reduce((s, g) => s + g.weight, 0);
      const weightedSum = items.reduce((s, g) => s + (g.value !== null ? g.value * (g.weight / 100) : 0), 0);
      
      const isFinished = totalWeight === 100 && scoredWeight === 100;
      const isCounted = sub.isCountedInGPA !== false;
      
      if (isFinished) {
        studied += sub.credits;
        forecastStudied += sub.credits;
        if (isCounted) {
          gpaCredits += sub.credits;
          gpaPoints += weightedSum * sub.credits;
          forecastGpaCredits += sub.credits;
          forecastGpaPoints += weightedSum * sub.credits;
        }
      } else if (scoredWeight > 0) {
        const extrapolatedGrade = weightedSum / (scoredWeight / 100);
        forecastStudied += sub.credits;
        if (isCounted) {
          forecastGpaCredits += sub.credits;
          forecastGpaPoints += extrapolatedGrade * sub.credits;
        }
      }
    });
    
    const gpa = gpaCredits > 0 ? (gpaPoints / gpaCredits) : 0;
    const forecastGpa = forecastGpaCredits > 0 ? (forecastGpaPoints / forecastGpaCredits) : 0;
    
    html += `
    <div class="bento-stats" style="margin-bottom: 24px;">
       <div class="bento-cell bento-accent" style="background:var(--bg-card); color:var(--text-1); border: 2px solid var(--em)">
         <span class="bento-num" style="color:var(--em); font-size: 2.5rem">${gpaCredits > 0 ? gpa.toFixed(2) : '--'}</span>
         <span class="bento-lbl" style="font-weight:600">CUMULATIVE GPA</span>
       </div>
       <div class="bento-cell" style="display:flex; flex-direction:column; justify-content:center">
         <span class="bento-num">${gpaCredits}</span>
         <span class="bento-lbl">∑ Tín chỉ tính GPA</span>
       </div>
       <div class="bento-cell" style="display:flex; flex-direction:column; justify-content:center">
         <span class="bento-num">${studied}</span>
         <span class="bento-lbl">∑ Tín chỉ đã học</span>
       </div>
       <div class="bento-cell" style="border: 1px dashed var(--em); background: transparent; display:flex; flex-direction:column; justify-content:center">
         <span class="bento-num" style="color:var(--em)">${forecastGpaCredits > 0 ? forecastGpa.toFixed(2) : '--'}</span>
         <span class="bento-lbl">GPA Ước lượng<br/><small style="font-weight:normal">(Tính cả môn đang học)</small></span>
       </div>
    </div>
    `;
  }

  const renderedSubjects = subjects.map(sub => {
    const items = AppData.gradeItems().filter(g => g.subjectId === sub.id);
    const threshold = sub.passThreshold ?? 5;
    
    const grouped = {};
    items.forEach(g => {
       const cat = g.category || 'Other';
       if (!grouped[cat]) grouped[cat] = [];
       grouped[cat].push(g);
    });

    let tbodyHtml = '';
    
    if (!items.length) {
      tbodyHtml = `<tr><td colspan="5" class="grade-empty">
        Chưa có cột điểm nào.
      </td></tr>`;
    } else {
      for (const [cat, catItems] of Object.entries(grouped)) {
         let catWeight = 0;
         catItems.forEach((g, idx) => {
           catWeight += g.weight;
           const valStr = g.value !== null ? g.value.toString() : '';
           const condOk = GradeModule._checkCondition(g.value, g.condition);
           
           let condStr = g.condition ? g.condition.trim() : '> 0';
           if (g.condition) {
             if (!isNaN(condStr)) condStr = '≥ ' + condStr;
             else condStr = condStr.replace(/^>=\s*/, '≥ ').replace(/^>\s*/, '≥ ');
           }
           
           let comment = `Cond: ${esc(condStr)}`;
           if (condOk === false) comment += ' ❌';
           else if (condOk === true) comment += ' ✅';

           tbodyHtml += `<tr>
             <td class="grade-name">
               ${esc(g.name)}
               <div class="grade-actions-inline">
                  <button class="icon-btn-tiny" onclick="GradeModule.editItem(${g.id})"><i class="ph ph-pencil"></i></button>
                  <button class="icon-btn-tiny text-red" onclick="GradeModule.deleteItem(${g.id})"><i class="ph ph-trash"></i></button>
               </div>
             </td>
             <td class="grade-weight">${g.weight.toFixed(1)} %</td>
             <td class="grade-value">
               <div class="custom-number-input">
                 <input type="number" class="grade-input-inline" min="0" max="10" step="0.1" value="${valStr}" onchange="GradeModule.updateValue(${g.id}, this.value); if(currentPage==='grades') renderGradesPage();" />
                 <div class="spinner-col">
                   <button type="button" tabindex="-1" onclick="GradeModule.stepValue(${g.id}, 0.1); if(currentPage==='grades') renderGradesPage();"><i class="ph-fill ph-caret-up"></i></button>
                   <button type="button" tabindex="-1" onclick="GradeModule.stepValue(${g.id}, -0.1); if(currentPage==='grades') renderGradesPage();"><i class="ph-fill ph-caret-down"></i></button>
                 </div>
               </div>
             </td>
             <td class="grade-comment">${comment}</td>
           </tr>`;
         });
         
         tbodyHtml += `<tr class="grade-category-total">
           <td class="grade-name-total">Total (${esc(cat)})
             <button class="icon-btn-tiny text-em" style="margin-left:8px; opacity:1" onclick="GradeModule.addItemInline(${sub.id}, '${esc(cat)}')"><i class="ph ph-plus"></i></button>
           </td>
           <td class="grade-weight-total-cell">${catWeight.toFixed(1)} %</td>
           <td></td>
           <td></td>
         </tr>`;
      }
    }

    const scored   = items.filter(g => g.value !== null);
    const unscored = items.filter(g => g.value === null);
    const weightedSum  = scored.reduce((s, g) => s + g.value * (g.weight / 100), 0);
    const scoredWeight = scored.reduce((s, g) => s + g.weight, 0);
    const remainWeight = unscored.reduce((s, g) => s + g.weight, 0);
    const currentTotal = weightedSum;
    const needed = remainWeight > 0 ? Math.max(0, (threshold - currentTotal) / (remainWeight / 100)) : null;
    const condFails = items.filter(g => g.condition && GradeModule._checkCondition(g.value, g.condition) === false);
    const isPassing = currentTotal >= threshold && remainWeight === 0 && condFails.length === 0;
    const isImpossible = needed !== null && needed > 10;
    
    let status = 'STUDYING';
    let statusClass = 'status-studying';
    if (remainWeight === 0) {
       status = isPassing ? 'PASSED' : 'FAILED';
       statusClass = isPassing ? 'status-passed' : 'status-failed';
    } else if (isImpossible || condFails.length > 0) {
       status = 'FAILED (Cảnh báo)';
       statusClass = 'status-failed';
    }

    if (sub.statusOverride === 'PASS') {
       status = 'PASSED (Override)';
       statusClass = 'status-passed';
    } else if (sub.statusOverride === 'FAIL') {
       status = 'FAILED (Override)';
       statusClass = 'status-failed';
    }
    
    let alertHtml = '';
    const totalWeight = scoredWeight + remainWeight;
    if (items.length > 0 && totalWeight < 100) {
       alertHtml += `<div class="grade-alert grade-alert-fail" style="margin-bottom:0; margin-top:8px"><i class="ph-fill ph-warning-circle"></i> Chưa nhập đủ Total 100% (Hiện tại: ${totalWeight.toFixed(1)}%)</div>`;
    }
    if (needed !== null && needed <= 10 && needed >= 0) {
       alertHtml += `<div class="grade-alert grade-alert-warn" style="margin-bottom:0; margin-top:8px"><i class="ph-fill ph-info"></i> Cần đạt trung bình <strong>${needed.toFixed(3)}/10</strong> cho ${remainWeight}% còn lại để qua môn.</div>`;
    }

    const footerHtml = items.length ? `
      <div class="fpt-grade-footer">
        <div class="fpt-grade-footer-row">
          <div class="fpt-grade-footer-label" style="width:30%">COURSE TOTAL</div>
          <div class="fpt-grade-footer-label" style="width:30%">AVERAGE</div>
          <div class="fpt-grade-footer-val">${currentTotal.toFixed(1)}</div>
        </div>
        <div class="fpt-grade-footer-row">
          <div class="fpt-grade-footer-label" style="width:30%"></div>
          <div class="fpt-grade-footer-label" style="width:30%">STATUS</div>
          <div class="fpt-grade-footer-val ${statusClass}">${status}</div>
        </div>
      </div>` : '';

    // Manual PASS/FAIL override — for subjects that "pass" with 0 points and would
    // otherwise auto-compute as FAILED. 'Tự động' clears the override.
    const ov = sub.statusOverride || '';
    const overrideHtml = `
      <div class="grade-override-row" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)">
        <span style="font-size:.8rem;color:var(--text-3)"><i class="ph ph-flag"></i> Ghi đè trạng thái:</span>
        <button class="btn-sm ${ov === 'PASS' ? 'btn-primary' : 'btn-outline'}" onclick="GradeModule.setStatusOverride(${sub.id}, 'PASS')">Qua môn</button>
        <button class="btn-sm ${ov === 'FAIL' ? 'btn-primary' : 'btn-outline'}" onclick="GradeModule.setStatusOverride(${sub.id}, 'FAIL')">Trượt môn</button>
        <button class="btn-sm ${ov === '' ? 'btn-primary' : 'btn-outline'}" onclick="GradeModule.setStatusOverride(${sub.id}, '')">Tự động</button>
        ${ov ? '<span style="font-size:.72rem;color:var(--text-4)">(đang ghi đè thủ công)</span>' : ''}
      </div>`;

    const accordionHtml = `
      <div class="grade-accordion-panel panel" style="margin-bottom: 20px;" id="ga-${sub.id}">
        <div class="grade-accordion-header" onclick="this.parentElement.classList.toggle('open')">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="spg-dot" style="background:${sub.colorHex};width:10px;height:10px;border-radius:50%"></div>
            <h2 class="panel-h2" style="margin:0;font-size:1.1rem">${esc(sub.code)} - ${esc(sub.name)}</h2>
          </div>
          <div style="display:flex;align-items:center;gap:16px">
            <div style="text-align:right">
               <div style="font-size:0.8rem;color:var(--text-4)">GPA: <strong style="color:var(--text-1)">${currentTotal.toFixed(1)}/10</strong></div>
               <div style="font-size:0.7rem;font-weight:600" class="${statusClass}">${status}</div>
            </div>
            <button class="icon-btn-tiny accordion-caret"><i class="ph ph-caret-down" style="font-size:1.1rem"></i></button>
          </div>
        </div>
        <div class="grade-accordion-body-wrap">
          <div class="grade-accordion-body">
            <div style="padding: 16px 20px; padding-top: 4px;">
              <div style="display:flex; justify-content:flex-end; margin-bottom: 12px;">
                <button class="btn-primary btn-sm" onclick="GradeModule.addItem(${sub.id})">
                  <i class="ph ph-plus"></i> Thêm item
                </button>
              </div>
              <div style="overflow-x:auto">
                <table class="fpt-grade-table" aria-label="Bảng điểm" style="margin-top:0">
                  <thead>
                    <tr>
                      <th>GRADE ITEM</th>
                      <th>WEIGHT</th>
                      <th>VALUE</th>
                      <th>COMMENT</th>
                    </tr>
                  </thead>
                  <tbody>${tbodyHtml}</tbody>
                </table>
                ${alertHtml}
                ${footerHtml}
                ${overrideHtml}
                <div class="grade-condition-note">* Lưu ý: <strong>Cond</strong> là điều kiện điểm tối thiểu để qua môn. Mặc định là > 0 nếu để trống.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return { sub, html: accordionHtml, status, statusClass, currentTotal };
  });
  
  if (!sem) {
    html += `<div class="grades-semester-grid">`;
    sems.forEach(s => {
       const semSubs = renderedSubjects.filter(rs => rs.sub.semester === s);
       const semName = (typeof semesterLabel === 'function') ? semesterLabel(s) : s;
       const alias = (semName && semName !== s) ? ` (${esc(s)})` : '';
       html += `
         <div class="grades-semester-box" data-sem="${esc(s)}"
              ondragover="GradeDragDrop.over(event)"
              ondragleave="GradeDragDrop.leave(event)"
              ondrop="GradeDragDrop.drop(event, '${esc(s)}')">
           <div class="grades-semester-header">
             Kỳ ${esc(semName)}${alias}
             <div style="display:inline-flex; gap:4px; margin-left:8px;">
               <button class="icon-btn-tiny" onclick="GradeModule.editSemesterAlias('${esc(s)}')" title="Đổi tên hiển thị"><i class="ph ph-text-aa"></i></button>
               <button class="icon-btn-tiny" onclick="GradeModule.renameSemester('${esc(s)}')" title="Đổi mã kỳ"><i class="ph ph-textbox"></i></button>
             </div>
             <span style="font-size:0.8rem;color:var(--text-4);background:var(--bg-body);padding:2px 8px;border-radius:12px;margin-left:auto">${semSubs.length} môn</span>
           </div>
           <div class="grades-subject-list">
             ${semSubs.map(rs => `
               <div class="grades-draggable-subject" draggable="true" 
                    ondragstart="GradeDragDrop.start(event, ${rs.sub.id})" 
                    ondragend="GradeDragDrop.end(event)"
                    onclick="document.getElementById('gradesSemesterFilter').value = '${esc(s)}'; renderGradesPage();"
                    title="Nhấn để xem chi tiết điểm">
                 <div class="gds-left">
                   <div class="gds-code" style="color:${rs.sub.colorHex}">${esc(rs.sub.code)}</div>
                   <div class="gds-name">${esc(rs.sub.name)}</div>
                 </div>
                 <div class="gds-right" style="flex-direction:column; align-items:flex-end; gap:4px">
                   <span class="${rs.statusClass}" style="font-size:0.7rem; font-weight:600">${rs.status}</span>
                   <span style="font-size:0.9rem; font-weight:700; color:var(--text-1)">${rs.currentTotal.toFixed(1)}</span>
                 </div>
               </div>
             `).join('')}
           </div>
         </div>
       `;
    });
    html += `</div>`;
  } else {
    renderedSubjects.forEach(rs => { html += rs.html; });
  }
  
  container.innerHTML = html;
};
