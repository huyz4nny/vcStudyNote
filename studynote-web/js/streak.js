// ===================================================
// StudyNote — Streak Engine
// ===================================================

const StreakEngine = {

  // ── Level definitions ─────────────────────────────
  LEVELS: [
    null,
    { id: 1, name: 'Khởi động',  icon: '✨',  color: '#a78bfa', desc: 'Ít nhất 1 task hoàn thành' },
    { id: 2, name: 'Chăm chỉ',  icon: '🔥',  color: '#f59e0b', desc: '100% task xong (1 môn)' },
    { id: 3, name: 'Đa môn',    icon: '🔥🔥', color: '#f97316', desc: 'Task từ ≥2 môn hoàn thành' },
    { id: 4, name: 'ALL CLEAR', icon: '🔥🔥🔥',color: '#10b981', desc: '100% task + tất cả môn có task' },
  ],

  // ── Calculate level for a given date ─────────────
  calcLevel(dateKey) {
    const tasks = AppData.checklist()[dateKey] || [];
    if (!tasks.length) return 0;

    const done   = tasks.filter(t => t.isDone);
    const total  = tasks.length;
    const allDone = done.length === total && total > 0;

    // unique subject IDs with done tasks
    const doneSubjects = [...new Set(done.map(t => t.subjectId).filter(Boolean))];
    const subjects = AppData.subjects();

    // Level 4: all tasks done + tasks span ALL active subjects
    if (allDone) {
      const activeSubjectIds = subjects.map(s => s.id);
      const coversAll = activeSubjectIds.every(sid => doneSubjects.includes(sid));
      if (coversAll && activeSubjectIds.length > 0) return 4;
    }

    // Level 3: tasks from ≥2 subjects done (not necessarily all tasks)
    if (doneSubjects.length >= 2) return 3;

    // Level 2: all tasks done (but only 1 or no subject tag)
    if (allDone) return 2;

    // Level 1: at least 1 done
    if (done.length > 0) return 1;

    return 0;
  },

  // ── Recalculate streaks when tasks change ─────────
  recalc(changedDateKey) {
    const streaks = AppData.streaks();
    const level   = this.calcLevel(changedDateKey);

    // Store daily level
    if (!streaks.daily) streaks.daily = {};
    streaks.daily[changedDateKey] = { level };

    // Recalc consecutive daily streak (any level ≥ 1)
    streaks.currentStreak   = this._countConsecutive(d => (streaks.daily[d]?.level || 0) >= 1);
    streaks.bestStreak      = Math.max(streaks.bestStreak || 0, streaks.currentStreak);

    // All-clear streak
    streaks.allClearStreak     = this._countConsecutive(d => (streaks.daily[d]?.level || 0) === 4);
    streaks.bestAllClearStreak = Math.max(streaks.bestAllClearStreak || 0, streaks.allClearStreak);

    // Per-subject streaks
    if (!streaks.subjectStreaks) streaks.subjectStreaks = {};
    AppData.subjects().forEach(sub => {
      const curr = this._countConsecutive(d => {
        const tasks = AppData.checklist()[d] || [];
        return tasks.some(t => t.subjectId === sub.id && t.isDone);
      });
      if (!streaks.subjectStreaks[sub.id]) streaks.subjectStreaks[sub.id] = { current: 0, best: 0 };
      streaks.subjectStreaks[sub.id].current = curr;
      streaks.subjectStreaks[sub.id].best = Math.max(streaks.subjectStreaks[sub.id].best, curr);
    });

    AppData.save();
    return level;
  },

  _countConsecutive(predicate) {
    let count = 0;
    const base = new Date(); base.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(base); d.setDate(d.getDate() - i);
      const dk = d.toISOString().slice(0,10);
      if (predicate(dk)) count++;
      else break;
    }
    return count;
  },

  // ── Render streak widget in sidebar ───────────────
  renderWidget() {
    const el = document.getElementById('streakWidget');
    if (!el) return;

    const streaks = AppData.streaks();
    const todayKey = new Date().toISOString().slice(0,10);
    const todayLevel = this.calcLevel(todayKey);
    const levelDef = this.LEVELS[todayLevel] || null;

    const currentStreak = streaks.currentStreak || 0;
    const allClearStreak = streaks.allClearStreak || 0;

    el.innerHTML = `
      <div class="streak-widget ${todayLevel >= 4 ? 'streak-allclear' : ''}">
        <div class="streak-flame-row">
          <span class="streak-main-icon">${todayLevel >= 1 ? this.LEVELS[Math.min(todayLevel,4)].icon : '💤'}</span>
          <div class="streak-info">
            <div class="streak-count">${currentStreak} <span class="streak-unit">ngày</span></div>
            <div class="streak-name">${levelDef ? levelDef.name : 'Chưa có task'}</div>
          </div>
        </div>
        ${allClearStreak > 0 ? `<div class="streak-allclear-row"><i class="ph-fill ph-fire" style="color:#10b981"></i> ALL CLEAR ${allClearStreak} ngày liên tiếp</div>` : ''}
      </div>
    `;
  },

  // ── Render streak dashboard section ───────────────
  renderDashboardSection() {
    const el = document.getElementById('streakDashSection');
    if (!el) return;

    const streaks = AppData.streaks();
    const subjects = AppData.subjects();
    const todayKey = new Date().toISOString().slice(0,10);
    const todayLevel = this.calcLevel(todayKey);

    // Last 7 days heatmap
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      const dk = d.toISOString().slice(0,10);
      const lv = streaks.daily?.[dk]?.level || 0;
      days.push({ dk, lv, isToday: i === 0 });
    }

    const heatmap = days.map(d => `
      <div class="hm-cell lv-${d.lv} ${d.isToday ? 'hm-today' : ''}" title="${d.dk}">
        ${d.lv >= 4 ? '<i class="ph-fill ph-fire" style="font-size:.6rem;color:#10b981"></i>' : ''}
      </div>
    `).join('');

    // Subject streaks mini list
    const subStreakHtml = subjects.map(s => {
      const ss = streaks.subjectStreaks?.[s.id] || { current: 0, best: 0 };
      return `
        <div class="sub-streak-item">
          <div class="sub-streak-dot" style="background:${s.colorHex}"></div>
          <span class="sub-streak-code">${esc(s.code)}</span>
          <div class="sub-streak-bar-wrap">
            <div class="sub-streak-fill" style="width:${Math.min(100, ss.current/Math.max(ss.best,1)*100)}%;background:${s.colorHex}"></div>
          </div>
          <span class="sub-streak-num" style="color:${s.colorHex}">${ss.current}d</span>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="streak-dash-header">
        <div class="streak-big-icon">${this.LEVELS[Math.min(todayLevel,4)]?.icon || '💤'}</div>
        <div class="streak-big-info">
          <div class="streak-big-num">${streaks.currentStreak || 0} <span>ngày streak</span></div>
          <div class="streak-big-sub">Best: ${streaks.bestStreak || 0} ngày · ALL CLEAR: ${streaks.allClearStreak || 0} ngày</div>
        </div>
      </div>
      <div class="streak-heatmap">
        <div class="hm-label">7 ngày qua</div>
        <div class="hm-grid">${heatmap}</div>
      </div>
      <div class="sub-streaks-list">${subStreakHtml}</div>
    `;
  },

  // ── Celebration animation ─────────────────────────
  celebrate(level) {
    if (level < 2) return;
    const overlay = document.getElementById('streakCelebration');
    if (!overlay) return;

    const msgs = ['', '', '🔥 Chăm chỉ! Tất cả task xong!', '🔥🔥 Đa môn! Task nhiều môn hoàn thành!', '🔥🔥🔥 ALL CLEAR! Xuất sắc!'];
    const chars = level >= 4 ? '🧑‍💻' : level >= 3 ? '💪' : '⭐';

    document.getElementById('celebMsg').textContent = msgs[level] || '';
    document.getElementById('celebChar').textContent = chars;
    overlay.className = 'streak-celebration-overlay active lv' + level;

    clearTimeout(this._celebTimer);
    this._celebTimer = setTimeout(() => {
      overlay.classList.remove('active');
    }, level >= 4 ? 3500 : 2200);
  },

  // ── Streak lost animation ─────────────────────────
  streakLost(prevStreak) {
    const overlay = document.getElementById('streakCelebration');
    if (!overlay) return;

    document.getElementById('celebChar').textContent = '💔';
    document.getElementById('celebMsg').textContent = prevStreak > 1
      ? `Mất chuỗi ${prevStreak} ngày 😢`
      : 'Streak đã đứt 😢';
    overlay.className = 'streak-celebration-overlay active loss';

    clearTimeout(this._celebTimer);
    this._celebTimer = setTimeout(() => {
      overlay.classList.remove('active');
    }, 2200);
  }
};
