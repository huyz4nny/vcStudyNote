// ===================================================
// Curriculum Page Logic (Drag & Drop)
// ===================================================

let draggedCurriculumSubject = null;

function renderCurriculumPage() {
  const container = document.getElementById('curriculumContainer');
  const curriculum = AppData.curriculum() || [];
  
  if (!curriculum.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border);">
        <i class="ph ph-graduation-cap" style="font-size: 3rem; color: var(--text-4); margin-bottom: 16px; display: block;"></i>
        <h3 style="color: var(--text-2); margin-bottom: 8px;">Chưa có dữ liệu chương trình học</h3>
        <p style="color: var(--text-3); margin-bottom: 16px;">Vui lòng bấm nút "Import FAP" để thêm Khung chương trình (Curriculum) vào hệ thống.</p>
        <button class="btn-primary" onclick="openModal('fapImportModal')">Import ngay</button>
      </div>
    `;
    return;
  }
  
  // Group by term
  const grouped = {};
  curriculum.forEach(s => {
    const t = s.termNo || 1;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(s);
  });
  
  const terms = Object.keys(grouped).sort((a,b) => parseInt(a) - parseInt(b));
  
  let html = '';
  terms.forEach(t => {
    let subjectsHtml = grouped[t].map(s => {
      return `
        <div class="curriculum-subject-card">
          <div class="cs-code" style="--em: ${s.colorHex}">${esc(s.code)}</div>
          <div class="cs-name" title="${esc(s.name)}">${esc(s.name)}</div>
          ${s.credits > 0 ? `
          <div class="cs-meta">
            <i class="ph-fill ph-coin"></i> ${s.credits} tín chỉ
          </div>` : ''}
        </div>
      `;
    }).join('');
    
    html += `
      <div class="term-container">
        <div class="term-header">
          <i class="ph-fill ph-books"></i> Kỳ ${t} (Term ${t})
        </div>
        <div class="term-subjects-grid">
          ${subjectsHtml}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}
