/**
 * 客戶剩餘資產與預約關懷比對系統 - 多維度篩選與排序模組
 * js/filters.js
 */

// 動態填入下拉選單選項
function populateDropdownFilters() {
  const stores = new Set();
  const therapistSet = new Set();
  const treatmentSet = new Set();

  state.matchedResults.forEach(client => {
    client.storesList.forEach(s => { if (s) stores.add(s); });
    
    client.assetOrders.forEach(ord => {
      if (ord.product) treatmentSet.add(ord.product);
      if (ord.caseManager) extractStaffNames(ord.caseManager).forEach(name => therapistSet.add(name));
      if (ord.salesStaff) extractStaffNames(ord.salesStaff).forEach(name => therapistSet.add(name));
    });
    client.appointments.forEach(appt => {
      if (appt.item) treatmentSet.add(appt.item);
    });

    (client.caseManagersList || []).forEach(rawStaff => {
      extractStaffNames(rawStaff).forEach(name => therapistSet.add(name));
    });
    (client.originalStaffList || client.staffList || []).forEach(rawStaff => {
      extractStaffNames(rawStaff).forEach(name => therapistSet.add(name));
    });
    client.appointments.forEach(appt => {
      extractStaffNames(appt.staff).forEach(name => therapistSet.add(name));
    });
  });

  populateSelect('filterStore', stores, '全部門店');
  populateSelect('filterStaff', therapistSet, '全部個管師 / 治療師');
  populateSelect('filterProduct', treatmentSet, '全部療程 / 品項');

  // 動態填入個管師 / 治療師複選清單
  populateStaffMultiSelect(therapistSet);
}

// 抽取人員姓名 (去除職稱與門店前綴)
function extractStaffNames(rawString) {
  if (!rawString) return [];
  const names = [];
  const parts = rawString.split(/[,;\s/]/).filter(Boolean);
  parts.forEach(p => {
    let clean = p.replace(/^[^:]+:/, '');
    clean = clean.replace(/^(西門|海安|安平|永康|東門|北門|新營)?(運動物理治療所|物理治療所|診所)/, '');
    clean = clean.replace(/^(高級物理治療師|高階物理治療師|資深物理治療師|物理治療師|運動管理師|個案管理師|個管師|店經理|管理師|治療師|總監|業務|顧問)/, '').trim();
    if (clean && clean.length >= 2 && clean.length <= 10) {
      names.push(clean);
    }
  });
  return names;
}

// 填充下拉選單輔助函式
function populateSelect(selectId, setValues, defaultText) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="">${defaultText}</option>`;
  Array.from(setValues).sort((a,b) => a.localeCompare(b, 'zh-Hant')).forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
  if (setValues.has(currentVal)) {
    select.value = currentVal;
  }
}

// 動態填入個管師/治療師多選清單 (支援即時勾選與關聯人數統計)
function populateStaffMultiSelect(therapistSet) {
  const container = document.getElementById('listStaffCheckboxes');
  if (!container) return;

  const staffArray = Array.from(therapistSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  
  if (staffArray.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">暫無人員名單</div>';
    updateStaffSelectButtonUI();
    return;
  }

  // 計算每位人員關聯的客戶數量
  const staffCountMap = new Map();
  state.matchedResults.forEach(client => {
    const clientStaffs = new Set();
    (client.caseManagersList || []).forEach(s => extractStaffNames(s).forEach(n => clientStaffs.add(n)));
    (client.originalStaffList || client.staffList || []).forEach(s => extractStaffNames(s).forEach(n => clientStaffs.add(n)));
    (client.assetOrders || []).forEach(o => {
      if (o.caseManager) extractStaffNames(o.caseManager).forEach(n => clientStaffs.add(n));
      if (o.salesStaff) extractStaffNames(o.salesStaff).forEach(n => clientStaffs.add(n));
    });
    client.appointments.forEach(a => extractStaffNames(a.staff).forEach(n => clientStaffs.add(n)));
    clientStaffs.forEach(n => {
      staffCountMap.set(n, (staffCountMap.get(n) || 0) + 1);
    });
  });

  const selectedSet = new Set(state.selectedStaffs || []);
  let html = '';

  staffArray.forEach(name => {
    const count = staffCountMap.get(name) || 0;
    const isChecked = selectedSet.has(name) ? 'checked' : '';
    html += `
      <label class="staff-option flex items-center justify-between px-2 py-1.5 hover:bg-blue-50/80 rounded-md cursor-pointer transition-colors group select-none text-slate-700" data-name="${escapeHtml(name)}">
        <div class="flex items-center gap-2 overflow-hidden">
          <input type="checkbox" value="${escapeHtml(name)}" class="staff-checkbox rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer accent-blue-600" ${isChecked} />
          <span class="text-xs group-hover:text-blue-700 truncate font-medium">${escapeHtml(name)}</span>
        </div>
        <span class="text-[10px] text-slate-400 group-hover:text-blue-500 font-mono shrink-0">${count}人</span>
      </label>
    `;
  });

  container.innerHTML = html;
  updateStaffSelectButtonUI();
}

// 更新個管師/治療師下拉按鈕外觀與摘要文字
function updateStaffSelectButtonUI() {
  const btn = document.getElementById('btnStaffDropdown');
  const label = document.getElementById('textStaffSelected');
  const badge = document.getElementById('badgeStaffCount');

  const selected = state.selectedStaffs || [];
  const count = selected.length;

  if (label) {
    if (count === 0) {
      label.textContent = '全部個管師 / 治療師';
      label.classList.remove('text-blue-700', 'font-semibold');
    } else if (count === 1) {
      label.textContent = selected[0];
      label.classList.add('text-blue-700', 'font-semibold');
    } else {
      label.textContent = `${selected[0]} +${count - 1}位`;
      label.classList.add('text-blue-700', 'font-semibold');
    }
  }

  if (badge) {
    if (count === 0) {
      badge.classList.add('hidden');
    } else {
      badge.textContent = `已選 ${count} 位`;
      badge.classList.remove('hidden');
    }
  }

  if (btn) {
    if (count > 0) {
      btn.classList.add('border-blue-400', 'bg-blue-50/40');
      btn.classList.remove('border-slate-200', 'bg-slate-50');
    } else {
      btn.classList.remove('border-blue-400', 'bg-blue-50/40');
      btn.classList.add('border-slate-200', 'bg-slate-50');
    }
  }
}

// 篩選與排序核心邏輯 (支援金額門檻過濾)
function applyFiltersAndRender() {
  const list = state.matchedResults;

  // 步驟 A：依據「金額門檻」重算每位客戶的有效訂單、剩餘堂數與價值
  const processedList = [];

  for (let i = 0; i < list.length; i++) {
    const client = list[i];
    let validOrders = client.assetOrders;

    // 依據金額門檻過濾各筆訂單
    if (state.filterAmountMode === 'PAID_ONLY') {
      validOrders = validOrders.filter(ord => ord.remainingValue > 0);
    } else if (state.filterAmountMode === 'GTE_1000') {
      validOrders = validOrders.filter(ord => ord.remainingValue >= 1000);
    } else if (state.filterAmountMode === 'GTE_3000') {
      validOrders = validOrders.filter(ord => ord.remainingValue >= 3000);
    } else if (state.filterAmountMode === 'GTE_5000') {
      validOrders = validOrders.filter(ord => ord.remainingValue >= 5000);
    } else if (state.filterAmountMode === 'GTE_10000') {
      validOrders = validOrders.filter(ord => ord.remainingValue >= 10000);
    } else if (state.filterAmountMode === 'ZERO_ONLY') {
      validOrders = validOrders.filter(ord => ord.remainingValue <= 0);
    }

    // 若啟用金額篩選且該客戶無任何符合門檻的訂單，則直接排除
    if (state.filterAmountMode !== 'ALL' && validOrders.length === 0) {
      continue;
    }

    // 計算有效堂數與金額
    const effectiveQty = validOrders.reduce((sum, o) => sum + o.remainingQty, 0);
    const effectiveVal = validOrders.reduce((sum, o) => sum + o.remainingValue, 0);

    // 若開啟「僅顯示剩餘堂數 > 0」，且有效堂數為 0，則排除
    if (state.onlyPositiveQty && effectiveQty <= 0) {
      continue;
    }

    // 重新統整有效品項標籤
    const prodMap = new Map();
    validOrders.forEach(ord => {
      const p = ord.product || '未註明品項';
      prodMap.set(p, (prodMap.get(p) || 0) + ord.remainingQty);
    });
    const effectiveProdList = [];
    prodMap.forEach((qty, pName) => {
      effectiveProdList.push({ product: pName, qty: qty });
    });

    // 建立呈現用的客戶物件副本
    processedList.push({
      ...client,
      displayedOrders: validOrders,
      displayedQty: effectiveQty,
      displayedValue: effectiveVal,
      displayedProducts: effectiveProdList
    });
  }

  let filtered = processedList;

  // 步驟 B：其他維度過濾
  // 1. 門店篩選
  if (state.selectedStore) {
    filtered = filtered.filter(item => item.storesList.includes(state.selectedStore));
  }

  // 2. 個管師 / 治療師 / 服務員工篩選 (支援複選)
  const activeStaffs = (state.selectedStaffs && state.selectedStaffs.length > 0)
    ? state.selectedStaffs
    : (state.selectedStaff ? [state.selectedStaff] : []);

  if (activeStaffs.length > 0) {
    const staffKwList = activeStaffs.map(s => s.toLowerCase());
    filtered = filtered.filter(item => {
      return staffKwList.some(staffKw => {
        const matchStaffField = (str) => {
          if (!str) return false;
          return str.toLowerCase().includes(staffKw);
        };
        const hasInCaseManager = (item.caseManagersList || []).some(matchStaffField);
        const hasInAsset = (item.originalStaffList || item.staffList || []).some(matchStaffField);
        const hasInOrders = (item.displayedOrders || []).some(o => 
          matchStaffField(o.caseManager) || matchStaffField(o.salesStaff)
        );
        const hasInAppt = item.appointments.some(a => matchStaffField(a.staff));
        return hasInCaseManager || hasInAsset || hasInOrders || hasInAppt;
      });
    });
  }

  // 3. 療程項目篩選
  if (state.selectedProduct) {
    const prodKw = state.selectedProduct.toLowerCase();
    filtered = filtered.filter(item => {
      const hasInAsset = item.displayedOrders.some(a => a.product.toLowerCase().includes(prodKw));
      const hasInAppt = item.appointments.some(a => a.item.toLowerCase().includes(prodKw));
      return hasInAsset || hasInAppt;
    });
  }

  // 4. 關鍵字搜尋 (姓名、手機、個管師/治療師、療程、會員號、訂單號)
  if (state.keyword) {
    const kw = state.keyword;
    filtered = filtered.filter(item => {
      const matchName = item.name && item.name.toLowerCase().includes(kw);
      const matchPhone = item.phone && item.phone.toLowerCase().includes(kw);
      const matchBday = item.birthday && item.birthday.includes(kw);
      const matchMemberId = item.memberIdsList.some(m => m.toLowerCase().includes(kw));
      
      const matchTreatment = item.displayedOrders.some(a => a.product.toLowerCase().includes(kw)) ||
                             item.appointments.some(a => a.item.toLowerCase().includes(kw));
      
      const matchStaffField = (str) => {
        if (!str) return false;
        return str.toLowerCase().includes(kw);
      };

      const matchStaff = (item.caseManagersList || []).some(matchStaffField) ||
                         (item.originalStaffList || item.staffList || []).some(matchStaffField) ||
                         (item.displayedOrders || []).some(o => matchStaffField(o.caseManager) || matchStaffField(o.salesStaff)) ||
                         item.appointments.some(a => matchStaffField(a.staff));
      
      const matchOrder = item.displayedOrders.some(a => a.orderNo.toLowerCase().includes(kw));

      const matchApptType = (item.latestType && (item.latestType.toLowerCase().includes(kw) || (kw.includes('療程') && item.latestType.includes('療程')) || (kw.includes('再消') && item.latestType.includes('再消')))) ||
                            item.appointments.some(a => a.type && (a.type.toLowerCase().includes(kw) || (kw.includes('療程') && a.type.includes('療程')) || (kw.includes('再消') && a.type.includes('再消'))));

      return matchName || matchPhone || matchBday || matchMemberId || matchTreatment || matchStaff || matchOrder || matchApptType;
    });
  }

  // 記錄套用關懷分類 Tab 篩選前的名單，用於計算各 Tab 徽章人數
  const preCareFilterList = filtered;

  // 5. 關懷分類 Tab
  if (state.currentCareFilter !== 'ALL') {
    filtered = filtered.filter(item => item.careLevel === state.currentCareFilter);
  }

  // 步驟 C：排序
  filtered.sort((a, b) => {
    if (state.sortMode === 'val_desc') {
      return b.displayedValue - a.displayedValue; // 金額由高到低
    } else if (state.sortMode === 'val_asc') {
      return a.displayedValue - b.displayedValue; // 金額由低到高
    } else if (state.sortMode === 'days_desc') {
      return b.daysSinceLast - a.daysSinceLast;
    } else if (state.sortMode === 'qty_desc') {
      return b.displayedQty - a.displayedQty;
    } else if (state.sortMode === 'date_desc') {
      return (b.latestDate || '').localeCompare(a.latestDate || '');
    } else if (state.sortMode === 'order_desc') {
      return b.displayedOrders.length - a.displayedOrders.length;
    } else if (state.sortMode === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '', 'zh-Hant');
    }
    return 0;
  });

  state.filteredResults = filtered;

  // 更新各分類標籤人數 (傳入篩選前列表，保持各Tab人數統計正確)
  updateTabCounts(preCareFilterList);

  // 更新指標儀表板 (含金額統計)
  updateDashboardStats();

  // 渲染表格
  renderTable();
}

// 更新分類標籤人數計數
function updateTabCounts(preCareFilterList) {
  const baseList = preCareFilterList || state.filteredResults;
  if (state.selectedStore) {
    baseList = baseList.filter(item => item.storesList.includes(state.selectedStore));
  }

  let countAll = baseList.length;
  let countNever = 0;
  let countOver30 = 0;
  let count15to30 = 0;
  let countActive = 0;
  let countCanceled = 0;

  baseList.forEach(item => {
    if (item.careLevel === 'NEVER_BOOKED') countNever++;
    else if (item.careLevel === 'HIGH_PRIORITY') countOver30++;
    else if (item.careLevel === 'MODERATE') count15to30++;
    else if (item.careLevel === 'RECENT_ACTIVE') countActive++;
    else if (item.careLevel === 'RECENT_CANCELED') countCanceled++;
  });

  setElementText('countTabAll', countAll);
  setElementText('countTabNever', countNever);
  setElementText('countTabOver30', countOver30);
  setElementText('countTab15to30', count15to30);
  setElementText('countTabActive', countActive);
  setElementText('countTabCanceled', countCanceled);
}

// 更新頂部儀表板數據
function updateDashboardStats() {
  const list = state.filteredResults;
  const uniqueMembers = list.length;
  
  let neverBookedCount = 0;
  let over30Count = 0;
  let activeCount = 0;
  let totalQty = 0;
  let totalVal = 0;

  list.forEach(r => {
    totalQty += (r.displayedQty !== undefined ? r.displayedQty : r.totalRemainingQty);
    totalVal += (r.displayedValue !== undefined ? r.displayedValue : r.totalRemainingValue);
    if (r.careLevel === 'NEVER_BOOKED') neverBookedCount++;
    if (r.careLevel === 'HIGH_PRIORITY') over30Count++;
    if (r.careLevel === 'RECENT_ACTIVE') activeCount++;
  });

  setElementText('statUniqueMembers', uniqueMembers.toLocaleString());
  setElementText('statTotalRemainingValue', `NT$ ${totalVal.toLocaleString()}`);
  setElementText('statNeverBooked', neverBookedCount.toLocaleString());
  setElementText('statOver30Days', over30Count.toLocaleString());
  setElementText('statActiveMembers', activeCount.toLocaleString());
  setElementText('statTotalRemainingQty', totalQty.toLocaleString());

  const noteEl = document.getElementById('statValueNote');
  if (noteEl) {
    if (state.filterAmountMode === 'PAID_ONLY') {
      noteEl.textContent = '已排除0元資產 (純付費療程)';
    } else if (state.filterAmountMode === 'ZERO_ONLY') {
      noteEl.textContent = '目前為0元贈品體驗客群';
    } else {
      noteEl.textContent = '全部名單剩餘金額總計';
    }
  }
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
