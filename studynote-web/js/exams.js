// ===================================================
// StudyNote — Exam Reminder Module
// "Lưu ý buổi sau có kiểm tra" — nhắc nổi bật ở Dashboard
// ===================================================

const ExamModule = {

  // ── Countdown từ chuỗi ngày "YYYY-MM-DD" ───────────
  countdown(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    let label;
    if (diff < 0) label = 'Đã qua';
    else if (diff === 0) label = 'Hôm nay';
    else if (diff === 1) label = 'Ngày mai';
    else label = `Còn ${diff} ngày`;
    const cls = diff < 0 ? 'exam-ok' : diff <= 2 ? 'exam-urgent' : diff <= 7 ? 'exam-soon' : 'exam-ok';
    return { diff, label, cls };
  },

  // ── Danh sách buổi KT để hiển thị ──────────────────
  // Tự xóa buổi đã qua hơn 1 tuần; ưu tiên các buổi sắp tới lên trước.
  upcoming() {
    const list = AppData.examReminders();

    // Dọn các buổi KT đã qua hơn 7 ngày (giữ lại buổi sắp tới + vừa qua trong tuần).
    const fresh = list.filter(e => this.countdown(e.examDate).diff >= -7);
    if (fresh.length !== list.length) {
      AppData.get().examReminders = fresh;
      AppData.save();
    }

    // Sắp xếp: nhóm sắp tới (diff >= 0) lên trước, mỗi nhóm gần → xa.
    return fresh.slice().sort((a, b) => {
      const pa = this.countdown(a.examDate).diff < 0 ? 1 : 0;
      const pb = this.countdown(b.examDate).diff < 0 ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.examDate.localeCompare(b.examDate);
    });
  },

  // ── Vẽ banner nhắc nhở trên Dashboard ──────────────
  renderDashboardAlerts() {
    const section = document.getElementById('examAlertSection');
    if (!section) return;
    const list = this.upcoming();

    document.getElementById('examAlertCount').textContent = list.length;

    if (!list.length) {
      section.classList.add('is-empty');
      section.classList.remove('exam-has-urgent');
      document.getElementById('examAlertList').innerHTML =
        `<li class="exam-empty">Chưa có lịch kiểm tra nào. Nhấn “Thêm lịch KT” để được nhắc trước mỗi buổi kiểm tra.</li>`;
      return;
    }
    section.classList.remove('is-empty');

    // Nếu có buổi KT trong vòng 2 ngày → cho cả banner rung nhẹ
    const hasUrgent = list.some(e => this.countdown(e.examDate).diff <= 2);
    section.classList.toggle('exam-has-urgent', hasUrgent);

    document.getElementById('examAlertList').innerHTML = list.map(e => {
      const sub = AppData.subjects().find(s => s.id === e.subjectId);
      const { label, cls } = this.countdown(e.examDate);
      return `<li class="exam-item ${cls}">
        <div class="exam-date-badge">
          <i class="ph-fill ph-exam" aria-hidden="true"></i>
          <span>${label}</span>
        </div>
        <div class="exam-info">
          <div class="exam-title">${esc(e.title)}</div>
          <div class="exam-meta">
            ${sub ? `<span class="exam-subject" style="--c:${sub.colorHex}">${esc(sub.code)}</span>` : ''}
            <span class="exam-day"><i class="ph ph-calendar-blank"></i>${fmtDate(e.examDate)}</span>
            ${e.note ? `<span class="exam-note"><i class="ph ph-note"></i>${esc(e.note)}</span>` : ''}
          </div>
        </div>
        <div class="exam-actions">
          <button class="icon-btn" onclick="ExamModule.open(${e.id})" aria-label="Sửa"><i class="ph ph-pencil"></i></button>
          <button class="icon-btn" onclick="ExamModule.remove(${e.id})" aria-label="Xóa" style="color:var(--red)"><i class="ph ph-trash"></i></button>
        </div>
      </li>`;
    }).join('');
  },

  // ── Mở modal thêm / sửa ────────────────────────────
  open(id = null) {
    // Nạp dropdown môn học (lọc theo kỳ hiện tại)
    let list = AppData.subjects();
    if (window.activeSemester) {
      list = list.filter(s => s.semester === window.activeSemester);
    }
    const opts = list.map(s => `<option value="${s.id}">${esc(s.code)} — ${esc(s.name)}</option>`).join('');
    document.getElementById('exSubject').innerHTML = `<option value="">Chọn môn học</option>${opts}`;

    const e = id ? AppData.examReminders().find(x => x.id === id) : {};
    document.getElementById('examModalTitle').textContent = id ? 'Sửa lịch kiểm tra' : 'Thêm lịch kiểm tra';
    document.getElementById('exId').value = id || '';
    document.getElementById('exSubject').value = e.subjectId || '';
    document.getElementById('exTitle').value = e.title || '';
    document.getElementById('exDate').value = e.examDate || dateKey(today);
    document.getElementById('exNote').value = e.note || '';
    openModal('examModal');
  },

  save(ev) {
    ev.preventDefault();
    const id = document.getElementById('exId').value;
    const data = {
      subjectId: +document.getElementById('exSubject').value || null,
      title: document.getElementById('exTitle').value.trim(),
      examDate: document.getElementById('exDate').value,        // "YYYY-MM-DD"
      note: document.getElementById('exNote').value.trim(),
    };
    if (!data.title || !data.examDate) return;

    if (id) {
      Object.assign(AppData.examReminders().find(x => x.id === +id), data);
      toast('Cập nhật lịch kiểm tra');
    } else {
      AppData.examReminders().push({ id: AppData.nextId(), createdAt: new Date().toISOString(), ...data });
      toast('Đã thêm lịch kiểm tra');
    }
    AppData.save();
    closeModal('examModal');
    this.renderDashboardAlerts();
  },

  async remove(id) {
    if (!await uiConfirm({ title: 'Xóa lịch kiểm tra', message: 'Xóa lịch kiểm tra này?', confirmText: 'Xóa', danger: true, icon: 'ph-trash' })) return;
    const list = AppData.examReminders();
    list.splice(list.findIndex(x => x.id === id), 1);
    AppData.save();
    this.renderDashboardAlerts();
    toast('Đã xóa lịch kiểm tra');
  }
};
