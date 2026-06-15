// ===================================================
// StudyNote — Grade Calculator Module
// ===================================================

const GradeModule = {

  // ── Render grade page for a subject ───────────────
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
      tbody.innerHTML = `<tr><td colspan="6" class="grade-empty">
        <i class="ph ph-exam" style="font-size:1.5rem;display:block;margin-bottom:6px;opacity:.4"></i>
        Chưa có grade item nào. Nhấn "Thêm" để bắt đầu.
      </td></tr>`;
    } else {
      tbody.innerHTML = items.map(g => {
        const weighted = g.value !== null ? (g.value * g.weight / 10).toFixed(2) : '—';
        const condOk = this._checkCondition(g.value, g.condition);
        const condBadge = g.condition
          ? `<span class="grade-cond ${condOk === false ? 'cond-fail' : condOk === true ? 'cond-pass' : 'cond-none'}" title="Điều kiện: ${esc(g.condition)}">${esc(g.condition)}</span>`
          : '<span class="grade-cond cond-none">—</span>';

        return `<tr class="${g.value === null ? 'grade-row-empty' : ''}">
          <td class="grade-name">${esc(g.name)}</td>
          <td class="grade-weight">${g.weight}%</td>
          <td class="grade-value">
            <input type="number" class="grade-input" min="0" max="10" step="0.1"
              value="${g.value ?? ''}" placeholder="—"
              onchange="GradeModule.updateValue(${g.id}, this.value)"
              aria-label="Điểm ${esc(g.name)}"
            />
          </td>
          <td class="grade-cond-cell">${condBadge}</td>
          <td class="grade-weighted">${weighted}</td>
          <td class="grade-actions">
            <button class="icon-btn" onclick="GradeModule.editItem(${g.id})" aria-label="Sửa">
              <i class="ph ph-pencil"></i>
            </button>
            <button class="icon-btn" onclick="GradeModule.deleteItem(${g.id})" aria-label="Xóa" style="color:var(--red)">
              <i class="ph ph-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    // Weight total indicator
    const totalWeight = items.reduce((s, g) => s + g.weight, 0);
    const weightEl = document.getElementById('gradeWeightTotal');
    weightEl.textContent = `Tổng weight: ${totalWeight}%`;
    weightEl.className = 'grade-weight-total ' + (totalWeight === 100 ? 'w-ok' : totalWeight > 100 ? 'w-over' : 'w-under');

    // Summary calculation
    this.renderSummary(subjectId, threshold);
  },

  renderSummary(subjectId, threshold) {
    const items = AppData.gradeItems().filter(g => g.subjectId === subjectId);
    const scored   = items.filter(g => g.value !== null);
    const unscored = items.filter(g => g.value === null);

    // Check any condition failures
    const condFails = items.filter(g => g.condition && this._checkCondition(g.value, g.condition) === false);

    const weightedSum  = scored.reduce((s, g) => s + g.value * g.weight / 10, 0);
    const scoredWeight = scored.reduce((s, g) => s + g.weight, 0);
    const remainWeight = unscored.reduce((s, g) => s + g.weight, 0);

    const currentTotal = weightedSum; // out of (scoredWeight/10)
    const needed       = remainWeight > 0
      ? Math.max(0, (threshold - currentTotal) / (remainWeight / 10))
      : null;

    const isPassing = currentTotal >= threshold && remainWeight === 0;
    const isImpossible = needed !== null && needed > 10;
    const onTrack = needed !== null && needed <= 10 && needed >= 0;

    let statusHtml = '';
    if (condFails.length) {
      statusHtml += `<div class="grade-alert grade-alert-fail">
        <i class="ph-fill ph-warning-circle"></i>
        Cảnh báo: <strong>${condFails.map(g => esc(g.name)).join(', ')}</strong> chưa đạt điều kiện — có thể bị cấm thi/trượt môn.
      </div>`;
    }
    if (remainWeight === 0) {
      statusHtml += `<div class="grade-alert ${isPassing ? 'grade-alert-pass' : 'grade-alert-fail'}">
        <i class="ph-fill ${isPassing ? 'ph-check-circle' : 'ph-x-circle'}"></i>
        ${isPassing ? `Qua môn! Điểm tổng kết: <strong>${currentTotal.toFixed(2)}/10</strong>` : `Trượt môn. Điểm: <strong>${currentTotal.toFixed(2)}/10</strong> (cần ≥ ${threshold})`}
      </div>`;
    } else if (isImpossible) {
      statusHtml += `<div class="grade-alert grade-alert-fail">
        <i class="ph-fill ph-x-circle"></i>
        Không thể qua môn ngay cả khi đạt 10/10 tất cả phần còn lại.
      </div>`;
    } else if (onTrack) {
      statusHtml += `<div class="grade-alert grade-alert-warn">
        <i class="ph-fill ph-info"></i>
        Hiện tại: <strong>${currentTotal.toFixed(2)}</strong> điểm (${scoredWeight}% đã có điểm).
        Cần đạt <strong class="grade-needed">${needed.toFixed(1)}/10</strong> trung bình cho ${remainWeight}% còn lại để qua môn.
      </div>`;
    }

    // Visual gauge
    const gaugeEl = document.getElementById('gradeSummary');
    const pct = Math.min(100, currentTotal / threshold * 100);
    gaugeEl.innerHTML = `
      <div class="grade-gauge-wrap">
        <div class="grade-gauge-bar">
          <div class="grade-gauge-fill ${isPassing ? 'gauge-pass' : ''}" style="width:${pct}%"></div>
          <div class="grade-gauge-threshold" style="left:100%" title="Ngưỡng qua môn"></div>
        </div>
        <div class="grade-gauge-labels">
          <span class="grade-gauge-current">${currentTotal.toFixed(2)}/10</span>
          <span class="grade-gauge-pass">≥${threshold} để qua</span>
        </div>
      </div>
      ${statusHtml}
    `;
  },

  _checkCondition(value, condition) {
    if (!condition || value === null) return null;
    try {
      // condition like ">1", ">=4", "<10"
      return Function(`return ${value} ${condition}`)();
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
    document.getElementById('giName').value = '';
    document.getElementById('giWeight').value = '';
    document.getElementById('giValue').value = '';
    document.getElementById('giCondition').value = '';
    document.getElementById('giConditionLabel').value = '';
    document.getElementById('gradeItemModalTitle').textContent = 'Thêm Grade Item';
    openModal('gradeItemModal');
  },

  editItem(id) {
    const g = AppData.gradeItems().find(x => x.id === id);
    if (!g) return;
    document.getElementById('giSubjectId').value = g.subjectId;
    document.getElementById('giId').value = g.id;
    document.getElementById('giName').value = g.name;
    document.getElementById('giWeight').value = g.weight;
    document.getElementById('giValue').value = g.value ?? '';
    document.getElementById('giCondition').value = g.condition ?? '';
    document.getElementById('giConditionLabel').value = g.conditionLabel ?? '';
    document.getElementById('gradeItemModalTitle').textContent = 'Sửa Grade Item';
    openModal('gradeItemModal');
  },

  saveItem(e) {
    e.preventDefault();
    const subjectId = +document.getElementById('giSubjectId').value;
    const existingId = document.getElementById('giId').value;
    const raw = document.getElementById('giValue').value;
    const data = {
      subjectId,
      name:           document.getElementById('giName').value.trim(),
      weight:         +document.getElementById('giWeight').value,
      value:          raw === '' ? null : +raw,
      condition:      document.getElementById('giCondition').value.trim() || null,
      conditionLabel: document.getElementById('giConditionLabel').value.trim() || null,
    };
    if (!data.name || !data.weight) return;

    if (existingId) {
      Object.assign(AppData.gradeItems().find(g => g.id === +existingId), data);
    } else {
      AppData.gradeItems().push({ id: AppData.nextId(), ...data });
    }
    AppData.save();
    closeModal('gradeItemModal');
    this.render(subjectId);
    toast('Cập nhật bảng điểm thành công');
  },

  deleteItem(id) {
    const items = AppData.gradeItems();
    const idx = items.findIndex(g => g.id === id);
    if (idx < 0) return;
    const subjectId = items[idx].subjectId;
    items.splice(idx, 1);
    AppData.save();
    this.render(subjectId);
    toast('Đã xóa grade item');
  },

  updateThreshold(subjectId) {
    const val = parseFloat(document.getElementById('gradePassThreshold').value);
    const sub = AppData.subjects().find(s => s.id === subjectId);
    if (sub && !isNaN(val)) {
      sub.passThreshold = Math.min(10, Math.max(0, val));
      AppData.save();
      this.render(subjectId);
    }
  }
};
