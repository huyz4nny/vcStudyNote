window.FapImportModule = {
  openModal(mode) {
    const tsSection = document.getElementById('fapTranscriptSection');
    const curSection = document.getElementById('fapCurriculumSection');
    const instructions = document.getElementById('fapImportInstructions');
    
    if (mode === 'transcript') {
      tsSection.style.display = 'block';
      curSection.style.display = 'none';
      instructions.innerHTML = `<li><strong>Bảng điểm:</strong> Truy cập FAP &gt; Academic Transcript. Copy toàn bộ bảng điểm chữ (hoặc text từ file PDF) và dán vào dưới đây.</li>`;
    } else if (mode === 'curriculum') {
      tsSection.style.display = 'none';
      curSection.style.display = 'block';
      instructions.innerHTML = `<li><strong>Khung chương trình:</strong> Truy cập FAP &gt; Curriculum. Copy toàn bộ bảng "Curriculum" và dán vào dưới đây.</li>`;
    } else {
      tsSection.style.display = 'block';
      curSection.style.display = 'block';
      instructions.innerHTML = `
        <li><strong>Bảng điểm:</strong> Truy cập FAP &gt; Academic Transcript. Copy toàn bộ bảng điểm chữ (hoặc text từ file PDF) và dán vào dưới đây.</li>
        <li><strong>Khung chương trình:</strong> Truy cập FAP &gt; Curriculum. Copy toàn bộ bảng "Curriculum" và dán vào dưới đây.</li>
      `;
    }
    
    document.getElementById('fapTranscriptText').value = '';
    document.getElementById('fapCurriculumText').value = '';
    this._resetPdfState();

    openModal('fapImportModal');
  },

  // ── Đọc trực tiếp file PDF bảng điểm (pdf.js) ──────────────────
  _pdfRows: null,

  _resetPdfState() {
    this._pdfRows = null;
    const input = document.getElementById('fapPdfInput');
    if (input) input.value = '';
    this._setPdfStatus('', '');
  },

  _setPdfStatus(msg, kind) {
    const el = document.getElementById('fapPdfStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'fap-pdf-status' + (kind === 'ok' ? ' is-ok' : kind === 'err' ? ' is-err' : '');
  },

  // Tải pdf.js theo nhu cầu (chỉ khi người dùng chọn PDF) để không
  // làm chậm/chặn lúc khởi động app nếu mạng tới CDN bị chặn.
  _ensurePdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (this._pdfLibPromise) return this._pdfLibPromise;
    this._pdfLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
      s.onload = () => window.pdfjsLib
        ? resolve(window.pdfjsLib)
        : reject(new Error('pdf.js tải xong nhưng không khởi tạo được'));
      s.onerror = () => reject(new Error('không tải được thư viện pdf.js (cần kết nối mạng)'));
      document.head.appendChild(s);
    }).catch(err => { this._pdfLibPromise = null; throw err; });
    return this._pdfLibPromise;
  },

  async onPdfPicked(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    this._setPdfStatus('Đang đọc PDF…', '');
    try {
      const rows = await this.parsePdfTranscript(file);
      if (!rows.length) {
        this._pdfRows = null;
        this._setPdfStatus('Không tìm thấy môn học nào. Hãy chắc chắn đây là file Bảng điểm quá trình của FPT.', 'err');
      } else {
        this._pdfRows = rows;
        this._setPdfStatus(`✓ Đã đọc ${rows.length} môn — GPA tạm tính ${this._previewGpa(rows)}. Bấm "Bắt đầu Import" để lưu.`, 'ok');
      }
    } catch (e) {
      console.error('[fapImport] PDF parse error:', e);
      this._pdfRows = null;
      this._setPdfStatus('Lỗi đọc PDF: ' + (e && e.message ? e.message : 'không xác định'), 'err');
    } finally {
      event.target.value = ''; // cho phép chọn lại cùng file
    }
  },

  // Bóc tách bảng điểm FPT từ PDF dựa trên toạ độ text (chính xác theo cột).
  async parsePdfTranscript(file) {
    await this._ensurePdfLib();
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    // 1) Gom item text kèm toạ độ, nhóm theo dòng (cùng y) từng trang.
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const pageLines = [];
      for (const it of tc.items) {
        const str = (it.str || '').replace(/\s+/g, ' ').trim();
        if (!str) continue;
        const x = it.transform[4];
        const y = it.transform[5];
        let line = pageLines.find(l => Math.abs(l.y - y) <= 3);
        if (!line) { line = { y, items: [] }; pageLines.push(line); }
        line.items.push({ str, x });
      }
      pageLines.sort((a, b) => b.y - a.y);            // trên → dưới
      pageLines.forEach(l => l.items.sort((a, b) => a.x - b.x)); // trái → phải
      lines.push(...pageLines);
    }

    // 2) Dựng dòng logic: ghép tên xuống dòng, bỏ tiêu đề nhóm.
    const TERM = /^(FA|SP|SU)\d{2}$/i;
    const hasTerm = items => items.some(t => TERM.test(t.str));
    const startsNo = items => items.length && /^\d{1,3}$/.test(items[0].str);

    const rows = [];
    let rowBuf = null;
    for (const line of lines) {
      const items = line.items;
      if (!items.length) continue;
      if (startsNo(items)) {
        rowBuf = items.slice();
        if (hasTerm(rowBuf)) { rows.push(rowBuf); rowBuf = null; }
      } else if (rowBuf) {
        rowBuf = rowBuf.concat(items);
        if (hasTerm(rowBuf)) { rows.push(rowBuf); rowBuf = null; }
      }
      // còn lại: tiêu đề nhóm (English Preparation Course, Mathematics…) → bỏ qua
    }

    // 3) Bóc từng dòng theo giá trị cột + tách tên EN|VI theo toạ độ x.
    const out = [];
    for (const items of rows) {
      const parsed = this._parsePdfRowItems(items);
      if (parsed) out.push(parsed);
    }
    return out;
  },

  _parsePdfRowItems(items) {
    // Tách item thành token nhưng giữ x của item (đủ để xác định ranh giới cột).
    const sorted = items.slice().sort((a, b) => a.x - b.x);
    const toks = [];
    for (const it of sorted) {
      for (const part of it.str.split(/\s+/)) {
        if (part) toks.push({ str: part, x: it.x });
      }
    }
    if (toks.length < 5) return null;

    const TERM = /^(FA|SP|SU)\d{2}$/i;
    const LETTER = /^([A-F][+-]?|\*)$/i;
    const GRADE = /^(\d{1,2}(?:\.\d+)?|\*|F)$/i;
    const INT = /^\d{1,3}$/;

    // 4 cột phải, từ phải sang: Học kỳ | Điểm chữ | Điểm số | Tín chỉ
    const term = toks[toks.length - 1];
    const letter = toks[toks.length - 2];
    const grade = toks[toks.length - 3];
    const credits = toks[toks.length - 4];
    if (!TERM.test(term.str) || !LETTER.test(letter.str) ||
        !GRADE.test(grade.str) || !INT.test(credits.str)) return null;

    const hasNo = INT.test(toks[0].str);
    const nameToks = toks.slice(hasNo ? 1 : 0, toks.length - 4);
    if (!nameToks.length) return null;

    const { en, vi } = this._splitName(nameToks);
    return {
      no: hasNo ? parseInt(toks[0].str) : null,
      nameEn: en,
      nameVi: vi || en,
      credits: parseInt(credits.str) || 0,
      grade: grade.str,
      letter: letter.str,
      term: term.str.toUpperCase(),
    };
  },

  // Tách "tên EN | tên VI" tại khoảng trống x lớn nhất (ranh giới 2 cột).
  _splitName(nameToks) {
    if (nameToks.length < 2) return { en: nameToks[0]?.str || '', vi: '' };
    let idx = -1, gap = -1;
    for (let i = 1; i < nameToks.length; i++) {
      const g = nameToks[i].x - nameToks[i - 1].x;
      if (g > gap) { gap = g; idx = i; }
    }
    // chỉ tách khi khoảng trống đủ rõ so với khoảng cách chữ thông thường
    if (idx > 0 && gap > 18) {
      return {
        en: nameToks.slice(0, idx).map(t => t.str).join(' '),
        vi: nameToks.slice(idx).map(t => t.str).join(' '),
      };
    }
    return { en: nameToks.map(t => t.str).join(' '), vi: '' };
  },

  _previewGpa(rows) {
    let pts = 0, cr = 0;
    for (const r of rows) {
      const c = r.credits || 0;
      if (!c) continue;
      if (!r.grade || r.grade === '*' || isNaN(parseFloat(r.grade))) continue;
      if ((r.letter || '').toUpperCase() === 'F') continue;
      if (this.isExcludedFromGPA((r.nameEn || '') + ' ' + (r.nameVi || ''))) continue;
      pts += parseFloat(r.grade) * c; cr += c;
    }
    return cr ? (pts / cr).toFixed(2) : '--';
  },

  async doImport() {
    const transcriptText = document.getElementById('fapTranscriptText').value.trim();
    const curriculumText = document.getElementById('fapCurriculumText').value.trim();
    const hasPdf = this._pdfRows && this._pdfRows.length > 0;

    if (!hasPdf && !transcriptText && !curriculumText) {
      uiAlert('Vui lòng tải file PDF hoặc dán ít nhất 1 loại dữ liệu để import!');
      return;
    }

    let subjectsAdded = 0;

    if (curriculumText) {
      if (AppData.curriculum().length > 0) {
        const confirmed = await uiConfirm({
          title: 'Ghi đè Khung chương trình',
          message: 'Khung chương trình đã tồn tại. Bạn có chắc muốn xoá toàn bộ và cập nhật lại không?',
          danger: true
        });
        if (!confirmed) return;
        AppData.curriculum().length = 0; // Clear existing curriculum
      }
      subjectsAdded += this.parseCurriculum(curriculumText);
    }
    
    if (hasPdf) {
      // Import từ PDF: luôn ghi đè sạch bảng điểm.
      if (AppData.subjects().length > 0) {
        const confirmed = await uiConfirm({
          title: 'Ghi đè sạch bảng điểm',
          message: 'Import từ PDF sẽ XOÁ toàn bộ môn học và điểm thành phần hiện có, rồi nạp lại từ đầu.\n\nLưu ý: ghi chú, bài tập và lịch thi đang gắn với môn cũ sẽ bị mất liên kết.',
          confirmText: 'Xoá & Import', danger: true, icon: 'ph-trash'
        });
        if (!confirmed) return;
      }
      AppData.subjects().length = 0;
      AppData.gradeItems().length = 0;
      subjectsAdded += this.parseTranscriptRows(this._pdfRows);
    } else if (transcriptText) {
      if (AppData.subjects().length > 0) {
        const confirmed = await uiConfirm({
          title: 'Ghi đè Bảng điểm',
          message: 'Dữ liệu bảng điểm/môn học đã tồn tại. Bạn có muốn xoá toàn bộ dữ liệu cũ để import mới không?\n\n(Chọn "Xác nhận" để xoá sạch, chọn "Huỷ" để ghép thêm vào dữ liệu cũ)',
          danger: true
        });
        if (confirmed) {
          AppData.subjects().length = 0;
          AppData.gradeItems().length = 0;
        }
      }
      subjectsAdded += this.parseTranscript(transcriptText);
    }

    this.finishImport(subjectsAdded);
  },

  finishImport(subjectsAdded) {
    if (subjectsAdded > 0) {
      // Register any newly-imported semesters into "Chương trình của tôi".
      if (typeof ensureUserSemesters === 'function') ensureUserSemesters();
      AppData.save();
      toast(`Đã import/cập nhật thành công ${subjectsAdded} môn học!`);
      closeModal('fapImportModal');
      document.getElementById('fapTranscriptText').value = '';
      document.getElementById('fapCurriculumText').value = '';
      this._resetPdfState();

      // Refresh views
      if (typeof renderSubjectPage === 'function') renderSubjectPage();
      if (typeof renderSidebarSubjects === 'function') renderSidebarSubjects();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderGradesPage === 'function') renderGradesPage();
      if (typeof populateFilters === 'function') populateFilters();
      if (typeof populateGlobalSemesterDropdown === 'function') populateGlobalSemesterDropdown();
      if (typeof renderProgramPage === 'function') renderProgramPage();
      if (typeof renderCurriculumPage === 'function') renderCurriculumPage();
    } else {
      uiAlert('Không tìm thấy môn học nào hợp lệ. Vui lòng kiểm tra lại định dạng text!');
    }
  },
  
  addCustomCurriculumSubject() {
    const code = document.getElementById('currSubjCode').value.trim();
    const name = document.getElementById('currSubjName').value.trim();
    const credits = parseInt(document.getElementById('currSubjCredits').value) || 3;
    const termNo = parseInt(document.getElementById('currSubjTerm').value) || 9;
    
    if (!code || !name) {
      uiAlert('Vui lòng nhập đủ mã môn và tên môn');
      return;
    }
    
    // Check if exists
    let subj = AppData.curriculum().find(s => s.code && s.code.toUpperCase() === code.toUpperCase());
    if (subj) {
      uiAlert('Môn học này đã có trong khung chương trình!');
      return;
    }
    
    AppData.curriculum().push({
      id: AppData.nextId(),
      name: name,
      code: code,
      credits: credits,
      termNo: termNo,
      colorHex: this.getRandomColor(),
      passThreshold: 5,
      isCountedInGPA: !this.isExcludedFromGPA(code + ' ' + name)
    });
    
    AppData.save();
    toast(`Đã thêm môn ${code} vào Term ${termNo}`);
    closeModal('addCurriculumSubjModal');
    
    // Clear form
    document.getElementById('currSubjCode').value = '';
    document.getElementById('currSubjName').value = '';
    
    if (typeof renderCurriculumPage === 'function') renderCurriculumPage();
  },

  isExcludedFromGPA(nameCode) {
    const n = nameCode.toLowerCase();
    if (n.includes('vovinam') || n.includes('physical') || n.includes('gdqp') || n.includes('military') || n.includes('on the job') || n.includes('ojt')) {
      return true;
    }
    return false;
  },

  parseCurriculum(text) {
    const lines = text.split('\n');
    let count = 0;
    
    // Regex: STT(digits) Code(word) Name(string) Term(digits)
    // Example: 1 GDQP Military training 0
    // Example: 22 SWE202c Introduction to Software Engineering 3
    const regex = /^\d+\s+([A-Z0-9a-z\-_]+)\s+(.+?)\s+(\d+)$/;
    
    for (let line of lines) {
      line = line.trim();
      const match = line.match(regex);
      if (match) {
        const code = match[1];
        const name = match[2];
        const termNo = parseInt(match[3]);
        
        // Check if exists in curriculum
        let subj = AppData.curriculum().find(s => s.code && s.code.toUpperCase() === code.toUpperCase());
        if (!subj) {
          AppData.curriculum().push({
            id: AppData.nextId(),
            name: name,
            code: code,
            credits: 0, 
            termNo: termNo,
            colorHex: this.getRandomColor(),
            passThreshold: 5,
            isCountedInGPA: !this.isExcludedFromGPA(code + ' ' + name)
          });
          count++;
        }
      }
    }
    return count;
  },

  parseTranscript(text) {
    // Định dạng bảng điểm quá trình FPT (dán từ PDF): không có tab, mỗi môn
    // kết thúc bằng học kỳ ngắn (FA23/SP26/SU25…). Định tuyến sang parser riêng.
    if (!/\t/.test(text) && /(FA|SP|SU)\d{2}\s*$/im.test(text)) {
      return this.parseTranscriptRows(this.buildFptRowsFromText(text));
    }

    const lines = text.split('\n');
    let count = 0;

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('No') || line.startsWith('(*)')) continue;

      const parts = line.split('\t');
      
      let semester = '', code = '', name = '', creditsStr = '', gradeStr = '', status = '';
      
      if (parts.length >= 10) {
         // 10 columns: No | Term | Semester | Subject Code | prerequisite | Replaced Subject | Subject Name | Credit | Grade | Status
         semester = parts[2].trim();
         code = parts[3].trim();
         name = parts[6].trim();
         creditsStr = parts[7].trim();
         gradeStr = parts[8].trim();
         status = parts[9].trim();
      } else if (parts.length >= 7) {
         // 7 columns: No | Semester | SubjectCode | SubjectName | Credit | Grade | Status
         semester = parts[1].trim();
         code = parts[2].trim();
         name = parts[3].trim();
         creditsStr = parts[4].trim();
         gradeStr = parts[5].trim();
         status = parts[6].trim();
      } else {
         // Space separated fallback for 10 columns (less accurate)
         const regex = /^\d+\s+\d+\s+([A-Za-z]+\d{4})?\s*([A-Z0-9\-_]+)\s+.*?\s+(\d+)\s+([0-9.]+|\*|F)?\s+(Passed|Not passed|Studying|Not started)$/i;
         const match = line.match(regex);
         if (match) {
            semester = match[1] || '';
            code = match[2];
            creditsStr = match[3];
            gradeStr = match[4] || '';
            status = match[5];
            name = code; // name not easily extracted via regex due to var spaces
         } else {
            continue;
         }
      }
      
      // Parse semester (e.g. "Fall2023" -> FA23, "Spring 2026" -> SP26).
      // Extract the 4-digit year and use its last 2 digits. Previously slice(-2)
      // grabbed the last 2 chars blindly, so a year-range cell like "2025-2026"
      // produced the WRONG year (SU2025 became 26).
      let shortSem = semester;
      const semLow = semester.toLowerCase();
      const season = semLow.startsWith('fall')   ? 'FA'
                   : semLow.startsWith('spring') ? 'SP'
                   : semLow.startsWith('summer') ? 'SU' : '';
      const yearMatch = semester.match(/(20\d{2})/);
      if (season && yearMatch) {
        shortSem = season + yearMatch[1].slice(-2);
      } else if (season && /\d{2}$/.test(semester)) {
        shortSem = season + semester.slice(-2);
      }
      
      const credits = parseInt(creditsStr) || 0;
      let gradeVal = null;
      if (gradeStr && gradeStr !== '*' && gradeStr !== 'F' && !isNaN(parseFloat(gradeStr))) {
        gradeVal = parseFloat(gradeStr);
      }
      
      const statLower = status.toLowerCase();
      // Ignore subjects that haven't started and have no semester assigned usually
      if (statLower.includes('not started')) continue;
      
      let excluded = this.isExcludedFromGPA(code + ' ' + name);
      if (statLower.includes('not passed') || gradeStr === 'F') excluded = true; 
      if (credits === 0) excluded = true;
      
      let subj = AppData.subjects().find(s => s.code && s.code.toUpperCase() === code.toUpperCase());
      
      if (!subj) {
        // Try to get actual name from curriculum if fallback was used
        if (name === code) {
           let cSubj = AppData.curriculum().find(c => c.code.toUpperCase() === code.toUpperCase());
           if (cSubj) name = cSubj.name;
        }
        
        subj = {
          id: AppData.nextId(),
          name: name,
          code: code,
          credits: credits,
          semester: shortSem,
          colorHex: this.getRandomColor(),
          passThreshold: 5,
          isCountedInGPA: !excluded,
          isActive: true
        };
        AppData.subjects().push(subj);
        count++;
      } else {
        subj.credits = credits || subj.credits;
        if (shortSem) subj.semester = shortSem;
        subj.isCountedInGPA = !excluded;
        count++; 
      }
      
      if (gradeVal !== null) {
        let gradeItems = AppData.gradeItems().filter(g => g.subjectId === subj.id);
        if (gradeItems.length === 0) {
          AppData.gradeItems().push({
            id: AppData.nextId(),
            subjectId: subj.id,
            category: 'Total',
            name: 'Final Grade',
            weight: 100,
            value: gradeVal,
            condition: '>= 5'
          });
        } else if (gradeItems.length === 1 && gradeItems[0].name === 'Final Grade') {
          gradeItems[0].value = gradeVal;
        }
      }
    }
    return count;
  },
  
  // ── Tạo môn học + điểm từ dữ liệu bảng điểm đã chuẩn hoá ───────
  // rows: [{no, nameEn, nameVi, credits, grade('*'|số), letter, term}]
  // Dùng cho đường PDF (đã ghi đè sạch) và fallback FPT dán-text.
  parseTranscriptRows(rows) {
    let count = 0;
    const used = new Set(
      AppData.subjects().map(s => (s.code || '').toUpperCase()).filter(Boolean)
    );

    for (const r of rows) {
      const nameVi = r.nameVi || r.nameEn || '';
      const nameEn = r.nameEn || r.nameVi || '';
      const credits = r.credits || 0;
      const gradeStr = r.grade || '';
      const letter = (r.letter || '');

      let gradeVal = null;
      if (gradeStr && gradeStr !== '*' && gradeStr.toUpperCase() !== 'F' && !isNaN(parseFloat(gradeStr))) {
        gradeVal = parseFloat(gradeStr);
      }

      let excluded = this.isExcludedFromGPA(nameEn + ' ' + nameVi);
      if (letter.toUpperCase() === 'F' || gradeStr.toUpperCase() === 'F') excluded = true;
      if (credits === 0) excluded = true;

      const code = this._resolveCode(nameEn, nameVi, used);

      const subj = {
        id: AppData.nextId(),
        name: nameVi,
        nameEn: nameEn,
        code: code,
        credits: credits,
        semester: (r.term || '').toUpperCase(),
        letterGrade: letter,
        colorHex: this.getRandomColor(),
        passThreshold: 5,
        isCountedInGPA: !excluded,
        isActive: true,
      };
      AppData.subjects().push(subj);
      count++;

      if (gradeVal !== null) {
        AppData.gradeItems().push({
          id: AppData.nextId(),
          subjectId: subj.id,
          category: 'Total',
          name: 'Final Grade',
          weight: 100,
          value: gradeVal,
          condition: '>= 5'
        });
      }
    }
    return count;
  },

  // Mã môn: PDF không có cột mã → ưu tiên khớp tên với Khung chương trình
  // để lấy mã thật, nếu không thì sinh mã viết tắt từ tên tiếng Anh.
  _resolveCode(nameEn, nameVi, used) {
    const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const cands = [norm(nameEn), norm(nameVi)].filter(Boolean);
    const cur = AppData.curriculum().find(c => c.code && cands.includes(norm(c.name)));
    if (cur && !used.has(cur.code.toUpperCase())) {
      used.add(cur.code.toUpperCase());
      return cur.code;
    }
    return this._uniqueCode(this._acronym(nameEn || nameVi), used);
  },

  _acronym(name) {
    const words = String(name || '')
      .split(/[\s\-/]+/)
      .map(w => w.replace(/[^A-Za-z0-9]/g, ''))
      .filter(w => /^[A-Za-z]/.test(w));
    let code = words.map(w => w[0]).join('').toUpperCase();
    if (code.length < 2 && words[0]) code = words[0].slice(0, 4).toUpperCase();
    return (code || 'MON').slice(0, 6);
  },

  _uniqueCode(base, used) {
    let code = base, i = 2;
    while (used.has(code.toUpperCase())) code = base + (i++);
    used.add(code.toUpperCase());
    return code;
  },

  // Dựng các dòng môn từ TEXT dán dạng FPT (fallback, không có toạ độ x):
  // ghép tên xuống dòng, bỏ tiêu đề nhóm; tên giữ dạng gộp EN+VI.
  buildFptRowsFromText(text) {
    const TERM = /^(FA|SP|SU)\d{2}$/i;
    const out = [];
    let buf = null;
    const flush = toks => { const r = this._parseRowTokens(toks); if (r) out.push(r); };

    for (let raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const toks = line.split(/\s+/);
      const startsNo = /^\d{1,3}$/.test(toks[0]);
      const endsTerm = TERM.test(toks[toks.length - 1]);
      if (startsNo) {
        buf = toks.slice();
        if (endsTerm) { flush(buf); buf = null; }
      } else if (buf) {
        buf = buf.concat(toks);
        if (endsTerm) { flush(buf); buf = null; }
      }
      // còn lại: tiêu đề nhóm → bỏ qua
    }
    return out;
  },

  _parseRowTokens(tokens) {
    const TERM = /^(FA|SP|SU)\d{2}$/i;
    const LETTER = /^([A-F][+-]?|\*)$/i;
    const GRADE = /^(\d{1,2}(?:\.\d+)?|\*|F)$/i;
    const INT = /^\d{1,3}$/;
    if (tokens.length < 5) return null;

    const term = tokens[tokens.length - 1];
    const letter = tokens[tokens.length - 2];
    const grade = tokens[tokens.length - 3];
    const credits = tokens[tokens.length - 4];
    if (!TERM.test(term) || !LETTER.test(letter) || !GRADE.test(grade) || !INT.test(credits)) return null;

    const hasNo = INT.test(tokens[0]);
    const name = tokens.slice(hasNo ? 1 : 0, tokens.length - 4).join(' ');
    if (!name) return null;

    return {
      no: hasNo ? parseInt(tokens[0]) : null,
      nameEn: name,
      nameVi: '',
      credits: parseInt(credits) || 0,
      grade: grade,
      letter: letter,
      term: term.toUpperCase(),
    };
  },

  getRandomColor() {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
};
