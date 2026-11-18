/**
 * 客戶剩餘資產與預約關懷比對系統 - Excel 匯出與資料重設模組
 * js/export.js
 */

// 取得簡潔的關懷狀態大分類 (不含具體天數與 emoji，便於 Excel 篩選器分類)
function getCareCategory(item) {
  if (!item) return '無狀態';
  if (item.careLevel === 'NEVER_BOOKED') return '從未預約';
  if (item.careLevel === 'HIGH_PRIORITY') return '逾30天未約';
  if (item.careLevel === 'MODERATE') return '15~30天未約';
  if (item.careLevel === 'RECENT_CANCELED') return '近期取消未補';
  if (item.careLevel === 'RECENT_ACTIVE') {
    return (item.daysSinceLast !== undefined && item.daysSinceLast < 0) ? '未來有約' : '近期活躍';
  }
  // 若有其他自訂文字，自動去除 emoji 前綴與括號後綴
  return (item.careBadgeText || '')
    .replace(/^[^\s]+\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim() || '無狀態';
}

// 匯出 Excel 報表 (雙工作表：總表 + 重點關懷名單)
function exportToExcel() {
  if (!state.filteredResults || state.filteredResults.length === 0) {
    showToast('目前無可匯出的名單資料', 'warning');
    return;
  }

  showToast('正在產生 Excel 匯出檔...', 'info');

  try {
    // 工作表 1：客戶層級之比對總表 (已依姓名+手機歸納並套用金額門檻)
    const exportData = state.filteredResults.map(item => {
      // 訂單明細：不同訂單以換行分隔
      const orders = item.displayedOrders || item.assetOrders || [];
      const ordersDetail = orders.length > 0
        ? orders.map(o => `${o.orderNo} ${o.product} (${o.remainingQty}堂, $${o.remainingValue}, 個管師:${cleanStaffDisplay(o.caseManager || o.salesStaff)})`).join('\r\n')
        : '無訂單明細';

      // 預約歷程摘要：不同日期以換行分隔
      const appts = item.appointments || [];
      const apptsSummary = appts.length > 0
        ? appts.map(a => `${a.date} ${a.item}${a.type ? ` [${a.type}]` : ''} 治療師:${cleanStaffDisplay(a.staff)} (${a.status})`).join('\r\n')
        : '無預約記錄';

      return {
        '會員姓名': item.name,
        '聯絡手機': item.phone,
        '會員生日': item.birthday || '',
        '開單門店': item.store,
        '剩餘有效堂數': item.displayedQty !== undefined ? item.displayedQty : item.totalRemainingQty,
        '剩餘資產總額(NT$)': item.displayedValue !== undefined ? item.displayedValue : item.totalRemainingValue,
        '持有品項清單': (item.displayedProducts || item.productSummaryList || []).map(p => `${p.product}(${p.qty}堂)`).join('; '),
        '個管師': cleanStaffDisplay(item.caseManager || item.staff),
        '治療師': cleanStaffDisplay(item.latestStaff) === '--' ? '尚未預約治療師' : cleanStaffDisplay(item.latestStaff),
        '關懷狀態': getCareCategory(item),
        '最近預約日期': item.latestDate || '無紀錄',
        '最近預約類型': item.latestType || '',
        '最近預約項目(療程)': item.latestItem || '',
        '最近預約狀態': item.latestStatus || '',
        '累計預約總次數': item.apptCount,
        '有效訂單明細': ordersDetail,
        '所有預約歷程摘要': apptsSummary
      };
    });

    // 工作表 2：重點關懷名單 (剩餘堂數>0 且 逾30天未約或從未預約之客群)
    const urgentCareData = state.filteredResults
      .filter(item => {
        const qty = item.displayedQty !== undefined ? item.displayedQty : item.totalRemainingQty;
        return qty > 0 && (item.careLevel === 'NEVER_BOOKED' || item.careLevel === 'HIGH_PRIORITY');
      })
      .map(item => {
        const orders = item.displayedOrders || item.assetOrders || [];
        const ordersDetail = orders.length > 0
          ? orders.map(o => `${o.orderNo} ${o.product} (${o.remainingQty}堂, $${o.remainingValue}, 個管師:${cleanStaffDisplay(o.caseManager || o.salesStaff)})`).join('\r\n')
          : '無訂單明細';

        const appts = item.appointments || [];
        const apptsSummary = appts.length > 0
          ? appts.map(a => `${a.date} ${a.item}${a.type ? ` [${a.type}]` : ''} 治療師:${cleanStaffDisplay(a.staff)} (${a.status})`).join('\r\n')
          : '無預約記錄';

        return {
          '會員姓名': item.name,
          '聯絡手機': item.phone,
          '會員生日': item.birthday || '',
          '開單門店': item.store,
          '剩餘堂數': item.displayedQty !== undefined ? item.displayedQty : item.totalRemainingQty,
          '剩餘資產價值(NT$)': item.displayedValue !== undefined ? item.displayedValue : item.totalRemainingValue,
          '持有品項': (item.displayedProducts || item.productSummaryList || []).map(p => `${p.product}(${p.qty}堂)`).join('; '),
          '個管師': cleanStaffDisplay(item.caseManager || item.staff),
          '治療師': cleanStaffDisplay(item.latestStaff) === '--' ? '尚未預約治療師' : cleanStaffDisplay(item.latestStaff),
          '關懷狀態': getCareCategory(item),
          '上次預約日期': item.latestDate || '無預約記錄',
          '上次預約類型': item.latestType || '',
          '有效訂單明細': ordersDetail,
          '所有預約歷程摘要': apptsSummary
        };
      });

    if (!window.XLSX) {
      showToast('未找到 SheetJS 函式庫，無法匯出', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(exportData);
    ws1['!cols'] = [
      { wch: 14 }, // 會員姓名
      { wch: 15 }, // 聯絡手機
      { wch: 14 }, // 會員生日
      { wch: 18 }, // 開單門店
      { wch: 14 }, // 剩餘有效堂數
      { wch: 18 }, // 剩餘資產總額(NT$)
      { wch: 28 }, // 持有品項清單
      { wch: 16 }, // 個管師
      { wch: 16 }, // 治療師
      { wch: 16 }, // 關懷狀態
      { wch: 14 }, // 最近預約日期
      { wch: 14 }, // 最近預約類型
      { wch: 22 }, // 最近預約項目(療程)
      { wch: 14 }, // 最近預約狀態
      { wch: 15 }, // 累計預約總次數
      { wch: 48 }, // 有效訂單明細
      { wch: 55 }  // 所有預約歷程摘要
    ];
    applyWorksheetStyles(ws1);
    XLSX.utils.book_append_sheet(wb, ws1, '客戶關懷與比對總表');

    if (urgentCareData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(urgentCareData);
      ws2['!cols'] = [
        { wch: 14 }, // 會員姓名
        { wch: 15 }, // 聯絡手機
        { wch: 14 }, // 會員生日
        { wch: 18 }, // 開單門店
        { wch: 14 }, // 剩餘堂數
        { wch: 18 }, // 剩餘資產價值(NT$)
        { wch: 28 }, // 持有品項
        { wch: 16 }, // 個管師
        { wch: 16 }, // 治療師
        { wch: 16 }, // 關懷狀態
        { wch: 14 }, // 上次預約日期
        { wch: 14 }, // 上次預約類型
        { wch: 48 }, // 有效訂單明細
        { wch: 55 }  // 所有預約歷程摘要
      ];
      applyWorksheetStyles(ws2);
      XLSX.utils.book_append_sheet(wb, ws2, '🚨重點關懷名單(待追蹤)');
    }

    const fileName = `客戶剩餘資產與預約關懷比對_${getTodayYMD().replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`已成功匯出至《${fileName}》！`, 'success');
  } catch (err) {
    console.error('匯出失敗:', err);
    showToast(`匯出失敗：${err.message}`, 'error');
  }
}

/**
 * 為匯出的 Excel 工作表套用高質感視覺樣式：
 * 1. 標題列：深色沈穩背景 (Slate-800, #1E293B)、粗體白字、置中對齊
 * 2. 橫列交替底色 (Zebra Striping)：純白 (#FFFFFF) 與 淺灰藍 (#F1F5F9) 交替，每一橫列對照更清晰
 * 3. 直行之間用 20% 灰色格線 (#CCCCCC) 明確區隔
 * 4. 欄位內容智慧水平對齊 (金額/堂數靠右、日期/手機/狀態/人員置中、文字說明靠左)
 * 5. 設定舒適之標題與資料列高
 */
function applyWorksheetStyles(ws) {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);

  // 建立欄位名稱對照表
  const colNames = {};
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (headerCell && headerCell.v !== undefined) {
      colNames[C] = String(headerCell.v).trim();
    }
  }

  // 設定舒適之列高 (標題 26pt、資料列依換行數動態設定，確保多行文字不被遮蔽)
  const rows = [];
  rows[0] = { hpt: 26 };
  for (let R = 1; R <= range.e.r; ++R) {
    let maxLines = 1;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cellVal = ws[cellAddress] ? ws[cellAddress].v : '';
      if (typeof cellVal === 'string' && cellVal.includes('\n')) {
        const lineCount = cellVal.split('\n').length;
        if (lineCount > maxLines) maxLines = lineCount;
      }
    }
    // 基準行高 20pt，每多一行增加 15pt，確保多行訂單與預約摘要在 Excel 中完整展示
    rows[R] = { hpt: maxLines > 1 ? (10 + maxLines * 15) : 20 };
  }
  ws['!rows'] = rows;

  // 20% 灰色直行邊框設定 (#CCCCCC)
  const verticalBorder20 = { style: 'thin', color: { rgb: 'CCCCCC' } };
  // 水平淡分隔線 (#E2E8F0)
  const horizontalBorder = { style: 'thin', color: { rgb: 'E2E8F0' } };
  const headerBottomBorder = { style: 'medium', color: { rgb: 'CCCCCC' } };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const isHeader = (R === 0);
    // 橫列底色交替 (Zebra Striping)：第 1 列白、第 2 列淺灰藍，使橫向比對更清晰
    const rowBgColor = (R % 2 === 1) ? 'FFFFFF' : 'F1F5F9';

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      let cell = ws[cellAddress];
      if (!cell) {
        // 空白儲存格亦補齊物件，確保格線與底色完整連續
        cell = { t: 's', v: '' };
        ws[cellAddress] = cell;
      }

      const colName = colNames[C] || '';

      if (isHeader) {
        // 標題列
        cell.s = {
          font: {
            name: '微軟正黑體',
            sz: 11,
            bold: true,
            color: { rgb: 'FFFFFF' }
          },
          fill: {
            fgColor: { rgb: '1E293B' }
          },
          alignment: {
            vertical: 'center',
            horizontal: 'center',
            wrapText: false
          },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: headerBottomBorder,
            left: verticalBorder20,
            right: verticalBorder20
          }
        };
      } else {
        // 資料列：智慧對齊判斷
        let align = 'left';
        if (
          colName.includes('金額') ||
          colName.includes('總額') ||
          colName.includes('價值') ||
          colName.includes('堂數')
        ) {
          align = 'right';
          // 若為數值且為金額，格式化千分位
          if (typeof cell.v === 'number' && (colName.includes('額') || colName.includes('價值'))) {
            cell.z = '#,##0';
          }
        } else if (
          colName.includes('手機') ||
          colName.includes('生日') ||
          colName.includes('門店') ||
          colName.includes('日期') ||
          colName.includes('狀態') ||
          colName.includes('次數') ||
          colName.includes('個管師') ||
          colName.includes('治療師') ||
          colName.includes('類型')
        ) {
          align = 'center';
        }

        // 若儲存格內容包含換行符號或為明細/摘要欄位，自動啟用 wrapText
        const hasNewline = typeof cell.v === 'string' && cell.v.includes('\n');
        const isDetailCol = colName.includes('明細') || colName.includes('摘要');
        const shouldWrap = hasNewline || isDetailCol;

        cell.s = {
          font: {
            name: '微軟正黑體',
            sz: 10,
            color: { rgb: '1E293B' }
          },
          fill: {
            fgColor: { rgb: rowBgColor }
          },
          alignment: {
            vertical: 'center',
            horizontal: align,
            wrapText: shouldWrap
          },
          border: {
            top: horizontalBorder,
            bottom: horizontalBorder,
            left: verticalBorder20,
            right: verticalBorder20
          }
        };
      }
    }
  }
}

// 清空重設所有資料
function resetAllData() {
  state.rawAssets = [];
  state.rawAppointments = [];
  state.appointmentsMap.clear();
  state.matchedResults = [];
  state.filteredResults = [];
  state.expandedRowIds.clear();
  state.assetFileMeta = null;
  state.apptFileMeta = null;

  const fileInputAssets = document.getElementById('fileInputAssets');
  if (fileInputAssets) fileInputAssets.value = '';
  
  const fileInputAppts = document.getElementById('fileInputAppts');
  if (fileInputAppts) fileInputAppts.value = '';

  updateUploadBadge('badgeAssetStatus', '待上傳', 'bg-slate-100 text-slate-500 border-slate-200');
  const assetFileInfo = document.getElementById('assetFileInfo');
  if (assetFileInfo) {
    assetFileInfo.innerHTML = `
      <i data-lucide="mouse-pointer-click" class="w-4 h-4 text-slate-400"></i>
      <span>點擊選擇檔案或拖曳至此處</span>
    `;
  }

  updateUploadBadge('badgeApptStatus', '待上傳', 'bg-slate-100 text-slate-500 border-slate-200');
  const apptFileInfo = document.getElementById('apptFileInfo');
  if (apptFileInfo) {
    apptFileInfo.innerHTML = `
      <i data-lucide="mouse-pointer-click" class="w-4 h-4 text-slate-400"></i>
      <span>點擊選擇檔案或拖曳至此處</span>
    `;
  }

  const btnExport = document.getElementById('btnExportExcel');
  if (btnExport) btnExport.disabled = true;

  updateDashboardStats();
  updateTabCounts();
  renderTable();
  refreshIcons();
  showToast('已重設所有資料', 'info');
}
