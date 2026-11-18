/**
 * 客戶剩餘資產與預約關懷比對系統 - 常用工具函式庫
 * js/utils.js
 */

// 字串去空白標準化
function normalizeString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

// 智能日期數值提取 (相容 Date 物件、Excel 序列數字、標準字串)
function extractDateValue(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel 序列日期轉 JS Date
    const jsDate = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      const y = jsDate.getFullYear();
      const m = String(jsDate.getMonth() + 1).padStart(2, '0');
      const d = String(jsDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const s = String(val).trim();
  const match = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return s.split(' ')[0];
}

// 日期字串轉 JS Date 物件
function parseDateStrToDate(str) {
  if (!str) return null;
  const s = extractDateValue(str);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  }
  return null;
}

// 取得今日 YYYY-MM-DD
function getTodayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// HTML 字元轉義防 XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// JavaScript 字串轉義 (防止 inline onclick 發生語法錯誤)
function escapeJsString(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// 預約類型標準化 (療程內 -> 療程, 再消費 -> 再消)
function normalizeApptType(rawType) {
  if (!rawType) return '';
  const s = String(rawType).trim();
  if (s === '療程內' || s === '療程') return '療程';
  if (s === '再消費' || s === '再消') return '再消';
  if (s.includes('初診')) return '初診';
  if (s.includes('候補')) return '候補';
  return s;
}

// 去除員工頭銜字串前綴 (如 "運動管理師", "店經理", "物理治療師:") 並去除重複人名
// 治療師只保留人名，去除職稱頭銜 (例如「物理治療師高于鈞」處理為「高于鈞」)
function cleanStaffDisplay(staffStr) {
  if (!staffStr || staffStr === '--') return '--';
  const parts = String(staffStr).split(/[,;/]/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '--';
  const cleaned = parts.map(p => {
    let clean = p.replace(/^[^:]+:/, '');
    clean = clean.replace(/^(西門|海安|安平|永康|東門|北門|新營)?(運動物理治療所|物理治療所|診所)/, '');
    clean = clean.replace(/^(高級物理治療師|高階物理治療師|資深物理治療師|物理治療師|運動管理師|個案管理師|個管師|店經理|管理師|治療師|總監|業務|顧問)/, '').trim();
    return clean || p;
  });
  // 去除重複人名
  return Array.from(new Set(cleaned)).filter(Boolean).join(', ') || staffStr;
}

// 一鍵複製至剪貼簿
function copyToClipboard(text, successMsg) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || '已複製至剪貼簿！', 'success');
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast(successMsg || '已複製至剪貼簿！', 'success');
}

// 氣泡提示通知 (Toast)
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  
  let bgClass = 'bg-slate-800 text-white';
  let icon = 'info';
  if (type === 'success') {
    bgClass = 'bg-emerald-600 text-white shadow-emerald-500/20';
    icon = 'check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-rose-600 text-white shadow-rose-500/20';
    icon = 'alert-triangle';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-600 text-white shadow-amber-500/20';
    icon = 'alert-circle';
  }

  toast.className = `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  refreshIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// 重新建立頁面 Lucide 圖標
function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
