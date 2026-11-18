/**
 * 客戶剩餘資產與預約關懷比對系統 - 應用程式初始化與事件綁定主程式
 * js/app.js
 */

// 標頭操作按鈕綁定 (Excel 匯出與重設清空)
function setupHeaderActions() {
  const btnExport = document.getElementById('btnExportExcel');
  if (btnExport) {
    btnExport.addEventListener('click', exportToExcel);
  }

  const btnReset = document.getElementById('btnResetAll');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('確定要清空目前已載入的所有檔案與比對資料嗎？')) {
        resetAllData();
      }
    });
  }

  // 若仍有示範按鈕則保留防護相容
  const btnDemo = document.getElementById('btnLoadDemo');
  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      showToast('已停用一鍵帶入，請主動上傳 Excel 檔案', 'info');
    });
  }
}

// 篩選工具列與切換事件綁定
function setupFilterEvents() {
  // 快捷分類 Tab 按鈕 (全部, 從未預約, 逾30天未回診, 15-30天, 活躍, 剛取消)
  document.querySelectorAll('.care-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.care-tab-btn').forEach(b => {
        b.classList.remove('bg-slate-900', 'text-white', 'shadow-sm', 'active');
        b.classList.add('bg-slate-100', 'text-slate-600');
      });
      btn.classList.remove('bg-slate-100', 'text-slate-600');
      btn.classList.add('bg-slate-900', 'text-white', 'shadow-sm', 'active');
      state.currentCareFilter = btn.getAttribute('data-care-filter') || 'ALL';
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // 門店變更
  const filterStore = document.getElementById('filterStore');
  if (filterStore) {
    filterStore.addEventListener('change', (e) => {
      state.selectedStore = e.target.value;
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 個管師 / 治療師 複選下拉選單事件綁定
  const btnStaffDropdown = document.getElementById('btnStaffDropdown');
  const panelStaffDropdown = document.getElementById('panelStaffDropdown');
  const iconStaffChevron = document.getElementById('iconStaffChevron');
  const containerStaffDropdown = document.getElementById('containerStaffDropdown');
  const inputSearchStaff = document.getElementById('inputSearchStaff');
  const btnSelectAllStaff = document.getElementById('btnSelectAllStaff');
  const btnClearStaffSelection = document.getElementById('btnClearStaffSelection');
  const listStaffCheckboxes = document.getElementById('listStaffCheckboxes');

  if (btnStaffDropdown && panelStaffDropdown) {
    // 點擊按鈕切換展開 / 收合
    btnStaffDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = panelStaffDropdown.classList.contains('hidden');
      if (isClosed) {
        panelStaffDropdown.classList.remove('hidden');
        if (iconStaffChevron) iconStaffChevron.classList.add('rotate-180');
        if (inputSearchStaff) {
          inputSearchStaff.focus();
        }
      } else {
        panelStaffDropdown.classList.add('hidden');
        if (iconStaffChevron) iconStaffChevron.classList.remove('rotate-180');
      }
    });

    // 阻止點擊浮動面板內部冒泡導致選單被關閉
    panelStaffDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 點擊面板外部自動關閉下拉選單
    document.addEventListener('click', (e) => {
      if (containerStaffDropdown && !containerStaffDropdown.contains(e.target)) {
        panelStaffDropdown.classList.add('hidden');
        if (iconStaffChevron) iconStaffChevron.classList.remove('rotate-180');
      }
    });
  }

  // 搜尋人員即時過濾清單
  if (inputSearchStaff && listStaffCheckboxes) {
    inputSearchStaff.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const options = listStaffCheckboxes.querySelectorAll('.staff-option');
      options.forEach(opt => {
        const name = opt.getAttribute('data-name') || '';
        if (!q || name.toLowerCase().includes(q)) {
          opt.classList.remove('hidden');
        } else {
          opt.classList.add('hidden');
        }
      });
    });
  }

  // 全選人員 (優先全選當前搜尋過濾可見之選項)
  if (btnSelectAllStaff && listStaffCheckboxes) {
    btnSelectAllStaff.addEventListener('click', () => {
      const visibleCheckboxes = listStaffCheckboxes.querySelectorAll('.staff-option:not(.hidden) .staff-checkbox');
      visibleCheckboxes.forEach(cb => { cb.checked = true; });
      syncSelectedStaffs();
    });
  }

  // 清空人員複選
  if (btnClearStaffSelection && listStaffCheckboxes) {
    btnClearStaffSelection.addEventListener('click', () => {
      const allCheckboxes = listStaffCheckboxes.querySelectorAll('.staff-checkbox');
      allCheckboxes.forEach(cb => { cb.checked = false; });
      state.selectedStaffs = [];
      state.selectedStaff = '';
      updateStaffSelectButtonUI();
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 勾選變更 (事件委派至清單容器)
  if (listStaffCheckboxes) {
    listStaffCheckboxes.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('staff-checkbox')) {
        syncSelectedStaffs();
      }
    });
  }

  function syncSelectedStaffs() {
    if (!listStaffCheckboxes) return;
    const checked = listStaffCheckboxes.querySelectorAll('.staff-checkbox:checked');
    state.selectedStaffs = Array.from(checked).map(cb => cb.value);
    state.selectedStaff = state.selectedStaffs.length === 1 ? state.selectedStaffs[0] : '';
    updateStaffSelectButtonUI();
    state.currentPage = 1;
    applyFiltersAndRender();
  }

  // 向下相容單選 select 元素 (若有)
  const filterStaff = document.getElementById('filterStaff');
  if (filterStaff) {
    filterStaff.addEventListener('change', (e) => {
      state.selectedStaff = e.target.value;
      state.selectedStaffs = e.target.value ? [e.target.value] : [];
      updateStaffSelectButtonUI();
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 療程項目變更
  const filterProduct = document.getElementById('filterProduct');
  if (filterProduct) {
    filterProduct.addEventListener('change', (e) => {
      state.selectedProduct = e.target.value;
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 金額門檻選單變更
  const filterAmount = document.getElementById('filterAmount');
  const chkExcludeZeroVal = document.getElementById('chkExcludeZeroVal');
  if (filterAmount) {
    filterAmount.addEventListener('change', (e) => {
      state.filterAmountMode = e.target.value;
      if (chkExcludeZeroVal) {
        chkExcludeZeroVal.checked = (state.filterAmountMode === 'PAID_ONLY');
      }
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 排除 0 元資產快捷勾選框
  if (chkExcludeZeroVal) {
    chkExcludeZeroVal.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.filterAmountMode = 'PAID_ONLY';
        if (filterAmount) filterAmount.value = 'PAID_ONLY';
      } else {
        state.filterAmountMode = 'ALL';
        if (filterAmount) filterAmount.value = 'ALL';
      }
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 排序方式
  const selectSort = document.getElementById('selectSort');
  if (selectSort) {
    selectSort.addEventListener('change', (e) => {
      state.sortMode = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 基準日期變更
  const inputBaseDate = document.getElementById('inputBaseDate');
  if (inputBaseDate) {
    inputBaseDate.addEventListener('change', (e) => {
      state.baseDate = e.target.value;
      triggerMatchingProcess();
    });
  }

  // 關鍵字搜尋 (防抖)
  let debounceTimer = null;
  const inputSearch = document.getElementById('inputSearch');
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.keyword = e.target.value.trim().toLowerCase();
        state.currentPage = 1;
        applyFiltersAndRender();
      }, 150);
    });
  }

  // 僅總剩餘數量 > 0 開關
  const chkOnlyPositiveQty = document.getElementById('chkOnlyPositiveQty');
  if (chkOnlyPositiveQty) {
    chkOnlyPositiveQty.addEventListener('change', (e) => {
      state.onlyPositiveQty = e.target.checked;
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // 高亮開關
  const chkHighlightInactive = document.getElementById('chkHighlightInactive');
  if (chkHighlightInactive) {
    chkHighlightInactive.addEventListener('change', (e) => {
      state.highlightInactive = e.target.checked;
      renderTable();
    });
  }

  // 清除所有篩選
  const btnClearFilters = document.getElementById('btnClearFilters');
  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      state.currentCareFilter = 'ALL';
      state.selectedStore = '';
      state.selectedStaff = '';
      state.selectedStaffs = [];
      state.selectedProduct = '';
      state.filterAmountMode = 'PAID_ONLY'; // 重設仍預設為排除0元資產
      state.keyword = '';
      state.onlyPositiveQty = true;

      if (filterStore) filterStore.value = '';
      if (filterStaff) filterStaff.value = '';
      if (filterProduct) filterProduct.value = '';
      if (filterAmount) filterAmount.value = 'PAID_ONLY';
      if (chkExcludeZeroVal) chkExcludeZeroVal.checked = true;
      if (inputSearch) inputSearch.value = '';
      if (chkOnlyPositiveQty) chkOnlyPositiveQty.checked = true;

      // 重設人員多選狀態
      if (listStaffCheckboxes) {
        listStaffCheckboxes.querySelectorAll('.staff-checkbox').forEach(cb => { cb.checked = false; });
        listStaffCheckboxes.querySelectorAll('.staff-option').forEach(opt => opt.classList.remove('hidden'));
      }
      if (inputSearchStaff) inputSearchStaff.value = '';
      if (panelStaffDropdown) panelStaffDropdown.classList.add('hidden');
      if (iconStaffChevron) iconStaffChevron.classList.remove('rotate-180');
      updateStaffSelectButtonUI();

      document.querySelectorAll('.care-tab-btn').forEach((b, idx) => {
        if (idx === 0) {
          b.classList.remove('bg-slate-100', 'text-slate-600');
          b.classList.add('bg-slate-900', 'text-white', 'shadow-sm', 'active');
        } else {
          b.classList.remove('bg-slate-900', 'text-white', 'shadow-sm', 'active');
          b.classList.add('bg-slate-100', 'text-slate-600');
        }
      });

      state.currentPage = 1;
      applyFiltersAndRender();
      showToast('已重設所有篩選條件 (維持排除0元付費模式)', 'info');
    });
  }

  // 全部展開 / 全部收合
  const btnToggleAllRows = document.getElementById('btnToggleAllRows');
  if (btnToggleAllRows) {
    btnToggleAllRows.addEventListener('click', () => {
      state.isAllExpanded = !state.isAllExpanded;
      const textSpan = document.getElementById('btnToggleAllRowsText');
      if (state.isAllExpanded) {
        state.filteredResults.forEach(item => state.expandedRowIds.add(item.rowId));
        if (textSpan) textSpan.textContent = '收合所有客戶訂單與歷程';
      } else {
        state.expandedRowIds.clear();
        if (textSpan) textSpan.textContent = '展開所有客戶訂單與歷程';
      }
      renderTable();
    });
  }

  // 每頁筆數
  const selectPageSize = document.getElementById('selectPageSize');
  if (selectPageSize) {
    selectPageSize.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      renderTable();
    });
  }

  // 分頁切換 (上一頁 / 下一頁)
  const btnPrevPage = document.getElementById('btnPrevPage');
  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
  }

  const btnNextPage = document.getElementById('btnNextPage');
  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      const totalPages = Math.ceil(state.filteredResults.length / state.pageSize) || 1;
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });
  }
}

// 應用程式進入點
document.addEventListener('DOMContentLoaded', () => {
  // 設定基準日期 (預設為西門店資料時間，使用者可自選)
  const inputBaseDate = document.getElementById('inputBaseDate');
  if (inputBaseDate) {
    if (!state.baseDate) {
      state.baseDate = getTodayYMD();
    }
    inputBaseDate.value = state.baseDate;
  }

  // 初始化圖標
  refreshIcons();

  // 綁定檔案上傳事件 (Drag & Drop + Input Click)
  setupDropzone('dropzoneAssets', 'fileInputAssets', handleAssetFileUpload);
  setupDropzone('dropzoneAppts', 'fileInputAppts', handleApptFileUpload);

  // 綁定功能事件
  setupFilterEvents();
  setupHeaderActions();
  setupModalEvents();

  // 初始空資料渲染
  updateStaffSelectButtonUI();
  updateDashboardStats();
  updateTabCounts();
  renderTable();
});
