/**
 * 客戶剩餘資產與預約關懷比對系統 - 關懷話術產生器彈窗模組
 * js/modal.js
 */

// 初始化關懷彈窗事件監聽
function setupModalEvents() {
  const modal = document.getElementById('careModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnCopy = document.getElementById('btnCopyCareText');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const textEl = document.getElementById('modalCareText');
      if (textEl) {
        copyToClipboard(textEl.value, '已複製關懷話術！可直接貼至 LINE 或簡訊');
      }
    });
  }
}

// 開啟並產生客戶專屬關懷話術
function openCareModal(rowId) {
  const item = state.filteredResults.find(r => r.rowId === rowId) || state.matchedResults.find(r => r.rowId === rowId);
  if (!item) return;

  const modal = document.getElementById('careModal');
  if (!modal) return;

  const prods = item.displayedProducts || item.productSummaryList || [];
  const prodText = prods.map(p => `${p.product} ${p.qty}堂`).join('、');
  const dispQty = item.displayedQty !== undefined ? item.displayedQty : item.totalRemainingQty;
  const dispVal = item.displayedValue !== undefined ? item.displayedValue : item.totalRemainingValue;
  
  const clientInfoEl = document.getElementById('modalClientInfo');
  if (clientInfoEl) {
    clientInfoEl.innerHTML = `
      <div class="flex items-center justify-between">
        <div>姓名：<b>${escapeHtml(item.name)}</b> ${item.birthday ? `(${escapeHtml(item.birthday)})` : ''} ‧ 手機：<b>${escapeHtml(item.phone || '無電話')}</b></div>
        <button type="button" onclick="copyToClipboard('${escapeJsString(item.phone)}', '已複製手機號碼')" class="text-xs text-blue-600 hover:underline">複製電話</button>
      </div>
      <div class="text-[11px] text-slate-500 mt-1">
        門店：${escapeHtml(item.store || '--')} ‧ 剩餘：<span class="text-teal-700 font-bold">${dispQty} 堂【${escapeHtml(prodText || '無品項')}】</span>
        ${dispVal > 0 ? ` ‧ 價值：<span class="text-emerald-700 font-bold font-mono">NT$ ${dispVal.toLocaleString()}</span>` : ''}
        ${item.latestDate ? ` ‧ 上次到診：${item.latestDate}${item.latestType ? ` (${escapeHtml(item.latestType)})` : ''}` : ' ‧ 尚無到診紀錄'}
      </div>
    `;
  }

  let script = '';
  const storeName = item.store || '診所';
  
  if (item.careLevel === 'NEVER_BOOKED') {
    script = `${item.name} 您好！這裡是${storeName}😊 提醒您在診所尚有 ${dispQty} 堂課程（${prodText}）尚未安排時間。最近身體狀況還好嗎？若想預約安排專業物理治療評估或運動訓練，隨時可以直接回覆我們幫您預留時段喔！祝您順心！`;
  } else if (item.careLevel === 'HIGH_PRIORITY') {
    script = `${item.name} 您好！這裡是${storeName}關心您😊 您上次於 ${item.latestDate} 進行【${item.latestItem || '治療/訓練'}】，已滿一個月未回診囉。不知道最近身體狀況恢復得如何？您名下尚有 ${dispQty} 堂課程（${prodText}），建議可以持續回診維持最佳效果，歡迎回覆預約合適的時段喔！`;
  } else if (item.careLevel === 'RECENT_CANCELED') {
    script = `${item.name} 您好！這裡是${storeName}😊 看到您先前預約的時段臨時有事取消，特別關心您目前狀況還好嗎？您尚有 ${dispQty} 堂課程（${prodText}），若這幾天有空檔，我們隨時能為您重新安排時段喔！`;
  } else {
    script = `${item.name} 您好！這裡是${storeName}😊 關心您上次於 ${item.latestDate || ''} 訓練/治療後的感覺還好嗎？提醒您名下尚有 ${dispQty} 堂課程（${prodText}），歡迎隨時與我們預約下一次的時段喔！`;
  }

  const careTextEl = document.getElementById('modalCareText');
  if (careTextEl) {
    careTextEl.value = script;
  }
  
  modal.classList.remove('hidden');
}
