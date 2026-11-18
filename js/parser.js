/**
 * 客戶剩餘資產與預約關懷比對系統 - Excel 檔案解析模組
 * js/parser.js
 */

// 通用 SheetJS 讀取 Promise
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel 檔案內無任何工作表');
        }
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// 綁定拖曳上傳區 (Drag & Drop + File Input)
function setupDropzone(dropzoneId, inputId, handler) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  if (!dropzone || !input) return;

  dropzone.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handler(file);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dropzone-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dropzone-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) handler(file);
  });
}

// 處理《客戶剩餘資產》檔案上傳
async function handleAssetFileUpload(file) {
  showToast(`正在讀取《${file.name}》...`, 'info');
  try {
    const data = await readExcelFile(file);
    state.rawAssets = data;
    state.assetFileMeta = { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', count: data.length };
    
    updateUploadBadge('badgeAssetStatus', `已載入 ${data.length} 筆訂單`, 'bg-emerald-100 text-emerald-700 border-emerald-300');
    document.getElementById('assetFileInfo').innerHTML = `
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
      <span class="font-medium text-slate-700">${escapeHtml(file.name)}</span> (${state.assetFileMeta.size})
    `;
    refreshIcons();

    showToast(`成功解析《客戶剩餘資產》共 ${data.length} 筆訂單！`, 'success');
    triggerMatchingProcess();
  } catch (err) {
    console.error('解析資產表失敗:', err);
    showToast(`解析失敗：${err.message}`, 'error');
  }
}

// 處理《預約統計》檔案上傳
async function handleApptFileUpload(file) {
  showToast(`正在讀取《${file.name}》...`, 'info');
  try {
    const data = await readExcelFile(file);
    state.rawAppointments = data;
    state.apptFileMeta = { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', count: data.length };

    updateUploadBadge('badgeApptStatus', `已載入 ${data.length} 筆歷程`, 'bg-emerald-100 text-emerald-700 border-emerald-300');
    document.getElementById('apptFileInfo').innerHTML = `
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
      <span class="font-medium text-slate-700">${escapeHtml(file.name)}</span> (${state.apptFileMeta.size})
    `;
    refreshIcons();

    showToast(`成功解析《預約統計》共 ${data.length} 筆！`, 'success');
    triggerMatchingProcess();
  } catch (err) {
    console.error('解析預約統計失敗:', err);
    showToast(`解析失敗：${err.message}`, 'error');
  }
}

function updateUploadBadge(badgeId, text, className) {
  const el = document.getElementById(badgeId);
  if (!el) return;
  el.textContent = text;
  el.className = `text-[11px] font-semibold px-2 py-0.5 rounded-full border ${className}`;
}
