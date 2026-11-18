/**
 * 客戶剩餘資產與預約關懷比對系統 - 表格渲染與介面互動模組
 * js/ui.js
 */

// 渲染客戶資料主表格
function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  const list = state.filteredResults;
  const total = list.length;

  const badgeEl = document.getElementById('badgeFilteredCount');
  if (badgeEl) {
    badgeEl.textContent = `${total} 位客戶`;
  }

  // 無資料之空狀態呈現
  if (total === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="py-16 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center space-y-2">
            <i data-lucide="filter-x" class="w-8 h-8 text-slate-300"></i>
            <div class="font-medium text-slate-600">無符合條件的名單資料</div>
            <p class="text-xs text-slate-400">請嘗試調整金額門檻、搜尋關鍵字或放寬篩選條件</p>
          </div>
        </td>
      </tr>
    `;
    const summaryEl = document.getElementById('textPaginationSummary');
    if (summaryEl) summaryEl.textContent = '顯示 0 - 0 位';
    const pageEl = document.getElementById('textCurrentPage');
    if (pageEl) pageEl.textContent = '1 / 1';
    
    const prevBtn = document.getElementById('btnPrevPage');
    if (prevBtn) prevBtn.disabled = true;
    const nextBtn = document.getElementById('btnNextPage');
    if (nextBtn) nextBtn.disabled = true;

    const controls = document.getElementById('paginationControls');
    if (controls) controls.innerHTML = '';
    
    refreshIcons();
    return;
  }

  // 分頁計算
  const totalPages = Math.ceil(total / state.pageSize) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const endIndex = Math.min(startIndex + state.pageSize, total);
  const pageItems = list.slice(startIndex, endIndex);

  const summaryEl = document.getElementById('textPaginationSummary');
  if (summaryEl) {
    summaryEl.textContent = `顯示 ${startIndex + 1} - ${endIndex} 位，共 ${total} 位客戶`;
  }
  const pageEl = document.getElementById('textCurrentPage');
  if (pageEl) {
    pageEl.textContent = `${state.currentPage} / ${totalPages}`;
  }
  
  const prevBtn = document.getElementById('btnPrevPage');
  if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
  const nextBtn = document.getElementById('btnNextPage');
  if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages;

  let html = '';
  pageItems.forEach((item) => {
    const isExpanded = state.expandedRowIds.has(item.rowId);
    const hasWarning = state.highlightInactive && (item.careLevel === 'NEVER_BOOKED' || item.careLevel === 'HIGH_PRIORITY');
    const rowBg = hasWarning ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80';

    // 預約狀態徽章
    let statusBadge = '<span class="text-slate-400">無預約</span>';
    let typeBadge = '';
    if (item.latestAppt) {
      if (item.latestType) {
        typeBadge = getApptTypeBadge(item.latestType);
      }
      const s = item.latestStatus;
      let sClass = 'bg-slate-100 text-slate-700';
      if (s.includes('離店') || s.includes('完成')) sClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      else if (s.includes('取消')) sClass = 'bg-rose-50 text-rose-700 border-rose-200';
      else if (s.includes('未到')) sClass = 'bg-amber-50 text-amber-700 border-amber-200';
      else if (s.includes('成功') || s.includes('預約')) sClass = 'bg-blue-50 text-blue-700 border-blue-200';

      statusBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${sClass}">${escapeHtml(s)}</span>`;
    }

    // 持有品項摘要標籤
    const prods = item.displayedProducts || item.productSummaryList || [];
    const productsHtml = prods.slice(0, 2).map(p => 
      `<span class="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/80 text-[11px] font-medium truncate max-w-[150px]" title="${escapeHtml(p.product)}: ${p.qty}堂">${escapeHtml(p.product)} <b class="ml-1 text-teal-700">(${p.qty})</b></span>`
    ).join(' ');
    const extraProdCount = prods.length - 2;

    const dispQty = item.displayedQty !== undefined ? item.displayedQty : item.totalRemainingQty;
    const dispVal = item.displayedValue !== undefined ? item.displayedValue : item.totalRemainingValue;
    const orderCnt = item.displayedOrders ? item.displayedOrders.length : item.orderCount;

    html += `
      <!-- 主客戶列 (姓名+手機整合) -->
      <tr class="transition-colors border-b border-slate-100 cursor-pointer ${rowBg}" onclick="toggleRowAccordion('${item.rowId}')">
        <!-- 展開箭頭 -->
        <td class="py-3 px-3 text-center">
          <button type="button" class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-transform ${isExpanded ? 'rotate-90 text-blue-600' : ''}">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </td>

        <!-- 會員姓名 (完整生日) / 手機 (均支援一鍵複製) -->
        <td class="py-3 px-3">
          <div class="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
            <span class="hover:text-blue-600 transition-colors cursor-pointer" onclick="event.stopPropagation(); copyToClipboard('${escapeJsString(item.name)}', '已複製姓名：${escapeJsString(item.name)}')" title="點擊複製姓名">
              ${escapeHtml(item.name || '未知姓名')}
            </span>
            <button type="button" onclick="event.stopPropagation(); copyToClipboard('${escapeJsString(item.name)}', '已複製姓名：${escapeJsString(item.name)}')" class="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-200/60 transition-colors" title="複製姓名">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            ${item.birthday ? `<span class="text-xs font-normal text-slate-500 font-mono tracking-tight">(${escapeHtml(item.birthday)})</span>` : ''}
          </div>

          <!-- 手機號碼 + 快速撥號與獨立複製 -->
          <div class="text-[11px] text-slate-600 font-mono flex items-center gap-1.5 mt-0.5" onclick="event.stopPropagation()">
            <a href="tel:${escapeHtml(item.phone)}" class="hover:text-blue-600 hover:underline flex items-center gap-0.5 font-medium" title="點擊撥打電話">
              <i data-lucide="phone" class="w-3 h-3 text-slate-400"></i>
              ${escapeHtml(item.phone || '--')}
            </a>
            ${item.phone ? `
              <button type="button" onclick="copyToClipboard('${escapeJsString(item.phone)}', '已複製手機：${escapeJsString(item.phone)}')" class="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-200/60 transition-colors" title="複製手機號碼">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </td>

        <!-- 會員號 -->
        <td class="py-3 px-3">
          <div class="font-mono text-[11px] font-semibold text-slate-700 flex items-center gap-1" onclick="event.stopPropagation()">
            <span>${escapeHtml(item.primaryMemberId)}</span>
            <button type="button" onclick="copyToClipboard('${escapeJsString(item.primaryMemberId)}', '已複製會員號')" class="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-200/60" title="複製會員號">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          ${item.memberIdsList && item.memberIdsList.length > 1 ? `
            <div class="text-[10px] text-indigo-600 font-medium mt-0.5 flex items-center gap-0.5">
              <i data-lucide="layers" class="w-2.5 h-2.5"></i>
              跨 ${item.memberIdsList.length} 個會員卡號
            </div>
          ` : `
            <div class="text-[10px] text-slate-400 mt-0.5">共 ${orderCnt} 筆訂單</div>
          `}
        </td>

        <!-- 開單門店 -->
        <td class="py-3 px-3">
          <div class="text-xs font-medium text-slate-700">${escapeHtml(item.store || '--')}</div>
        </td>

        <!-- 持有品項 / 療程摘要 -->
        <td class="py-3 px-3">
          <div class="flex flex-wrap items-center gap-1">
            ${productsHtml}
            ${extraProdCount > 0 ? `
              <span class="text-[10px] text-slate-500 font-semibold px-1 rounded bg-slate-100">+${extraProdCount}項</span>
            ` : ''}
          </div>
        </td>

        <!-- 總剩餘堂數 -->
        <td class="py-3 px-3 text-center">
          <div class="inline-flex flex-col items-center">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${dispQty > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}">
              ${dispQty} 堂
            </span>
            ${orderCnt > 1 ? `
              <span class="text-[10px] text-teal-600 font-semibold mt-0.5">共 ${orderCnt} 筆訂單</span>
            ` : ''}
          </div>
        </td>

        <!-- 剩餘資產價值 (金額) -->
        <td class="py-3 px-3 text-right">
          ${dispVal > 0 ? `
            <span class="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
              $${dispVal.toLocaleString()}
            </span>
          ` : `
            <span class="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-400">
              $0 (贈品)
            </span>
          `}
        </td>

        <!-- 個管師 (業績人員) -->
        <td class="py-3 px-3">
          <div class="text-xs text-slate-800 font-semibold flex items-center gap-1">
            <i data-lucide="user-check" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
            <span title="個管師 (業績人員)">${escapeHtml(cleanStaffDisplay(item.caseManager || item.staff))}</span>
          </div>
        </td>

        <!-- 關懷狀態標籤 -->
        <td class="py-3 px-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${item.careBadgeClass}">
            ${escapeHtml(item.careBadgeText)}
          </span>
        </td>

        <!-- 最近預約紀錄 -->
        <td class="py-3 px-3">
          ${item.latestDate ? `
            <div class="font-semibold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
              <span>${escapeHtml(item.latestDate)}</span>
              ${typeBadge}
              ${statusBadge}
            </div>
            <div class="text-[11px] text-slate-500 truncate max-w-[170px]" title="${escapeHtml(item.latestItem)}">
              ${escapeHtml(item.latestItem || '預約服務')}
            </div>
          ` : `
            <div class="text-xs text-rose-500 font-medium">從未預約</div>
            <div class="text-[10px] text-slate-400">無任何統計歷程</div>
          `}
        </td>

        <!-- 預約治療師 -->
        <td class="py-3 px-3">
          <div class="text-xs text-slate-700 font-medium">${escapeHtml(cleanStaffDisplay(item.latestStaff))}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(item.latestStore || '')}</div>
        </td>

        <!-- 累計預約次數 -->
        <td class="py-3 px-3 text-center">
          <span class="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-semibold ${item.apptCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}">
            ${item.apptCount} 次
          </span>
        </td>

        <!-- 操作按鈕 -->
        <td class="py-3 px-3 text-center" onclick="event.stopPropagation()">
          <div class="flex items-center justify-center gap-1">
            <button type="button" onclick="openCareModal('${item.rowId}')" class="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-medium flex items-center gap-1 transition-colors" title="產生關懷話術">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              關懷
            </button>
            <button type="button" onclick="toggleRowAccordion('${item.rowId}')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors">
              ${isExpanded ? '收合' : '明細'}
            </button>
          </div>
        </td>
      </tr>

      <!-- Accordion 展開區：含訂單資產明細與歷史預約明細 -->
      <tr id="accordion_${item.rowId}" class="${isExpanded ? '' : 'hidden'} bg-slate-50/95 border-b-2 border-slate-200">
        <td colspan="13" class="p-4 sm:p-5">
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            
            <!-- 會員概況條 -->
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                <h4 class="font-bold text-slate-800 text-sm">
                  【${escapeHtml(item.name)}】會員資產與預約全覽
                </h4>
                ${item.birthday ? `<span class="text-xs text-slate-500">生日：${escapeHtml(item.birthday)}</span>` : ''}
                <span class="text-xs text-slate-400">‧</span>
                <span class="text-xs text-slate-500">手機：<b class="text-slate-700">${escapeHtml(item.phone || '--')}</b></span>
                <span class="text-xs text-slate-400">‧</span>
                <span class="text-xs text-emerald-700 font-bold font-mono">剩餘價值：NT$ ${dispVal.toLocaleString()}</span>
              </div>

              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 font-medium">關懷評級：</span>
                <span class="font-medium text-slate-800 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  ${escapeHtml(item.careSuggestion)}
                </span>
              </div>
            </div>

            <!-- 區塊一：該客戶的名下資產訂單明細 -->
            <div>
              <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <i data-lucide="shopping-bag" class="w-4 h-4 text-blue-600"></i>
                  <span>名下資產訂單明細 (共 ${item.assetOrders.length} 筆訂單，有效計入 ${orderCnt} 筆)：</span>
                </div>
                <span class="text-[11px] font-normal text-slate-400">來源：《客戶剩餘資產》表</span>
              </div>

              <div class="overflow-x-auto rounded-lg border border-blue-100 bg-blue-50/20">
                <table class="w-full text-left text-xs">
                  <thead class="bg-blue-50/70 text-blue-900 text-[11px]">
                    <tr>
                      <th class="py-2 px-3 w-10 text-center">#</th>
                      <th class="py-2 px-3 min-w-[130px]">關聯訂單號</th>
                      <th class="py-2 px-3 min-w-[90px]">開單時間</th>
                      <th class="py-2 px-3 min-w-[150px]">商品名稱 (療程)</th>
                      <th class="py-2 px-3 min-w-[90px]">產品類別</th>
                      <th class="py-2 px-3 text-center min-w-[80px]">剩餘堂數</th>
                      <th class="py-2 px-3 text-right min-w-[100px]">剩餘價值 (NT$)</th>
                      <th class="py-2 px-3 min-w-[120px]">開單門店</th>
                      <th class="py-2 px-3 min-w-[140px]">個管師 (業績人員)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-blue-100 bg-white">
                    ${item.assetOrders.map((ord, idx) => `
                      <tr class="hover:bg-blue-50/40 transition-colors ${ord.remainingValue <= 0 ? 'bg-slate-50/60 opacity-80' : ''}">
                        <td class="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
                        <td class="py-2 px-3 font-mono text-slate-700 font-semibold">${escapeHtml(ord.orderNo)}</td>
                        <td class="py-2 px-3 text-slate-500 font-mono">${escapeHtml(ord.orderDate || '--')}</td>
                        <td class="py-2 px-3 text-slate-800 font-bold flex items-center gap-1.5">
                          <span>${escapeHtml(ord.product)}</span>
                          ${ord.remainingValue <= 0 ? `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-normal">0元贈送</span>` : ''}
                        </td>
                        <td class="py-2 px-3 text-slate-500">${escapeHtml(ord.category || '--')}</td>
                        <td class="py-2 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-full text-xs font-bold ${ord.remainingValue > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}">
                            ${ord.remainingQty} 堂
                          </span>
                        </td>
                        <td class="py-2 px-3 text-right font-mono font-bold ${ord.remainingValue > 0 ? 'text-emerald-700' : 'text-slate-400'}">
                          $${ord.remainingValue.toLocaleString()}
                        </td>
                        <td class="py-2 px-3 text-slate-700">${escapeHtml(ord.store || '--')}</td>
                        <td class="py-2 px-3 text-slate-700 text-[11px]">
                          <div class="font-bold text-slate-800">${escapeHtml(cleanStaffDisplay(ord.caseManager || ord.salesStaff || ord.staff))}</div>
                          ${ord.staff && cleanStaffDisplay(ord.staff) !== cleanStaffDisplay(ord.caseManager || ord.salesStaff) ? `<div class="text-[10px] text-slate-400">歸屬: ${escapeHtml(cleanStaffDisplay(ord.staff))}</div>` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 區塊二：歷史預約紀錄表格 -->
            <div>
              <div class="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <i data-lucide="calendar" class="w-4 h-4 text-teal-600"></i>
                  <span>歷史所有預約明細紀錄 (共 ${item.appointments.length} 次，由新到舊排序)：</span>
                </div>
                <span class="text-[11px] font-normal text-slate-400">來源：《預約統計》表</span>
              </div>

              ${item.appointments.length > 0 ? `
                <div class="overflow-x-auto rounded-lg border border-slate-200">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100 text-slate-600 text-[11px]">
                      <tr>
                        <th class="py-2 px-3 w-10 text-center">#</th>
                        <th class="py-2 px-3 min-w-[95px]">預約日期 (C欄)</th>
                        <th class="py-2 px-3 min-w-[85px]">預約時間</th>
                        <th class="py-2 px-3 min-w-[90px]">預約類型</th>
                        <th class="py-2 px-3 min-w-[135px]">預約項目 (療程)</th>
                        <th class="py-2 px-3 min-w-[90px]">預約狀態</th>
                        <th class="py-2 px-3 min-w-[130px]">預約角色員工 (治療師)</th>
                        <th class="py-2 px-3 min-w-[120px]">預約門店</th>
                        <th class="py-2 px-3 min-w-[70px] text-center">報到</th>
                        <th class="py-2 px-3 min-w-[150px]">備註說明</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${item.appointments.map((appt, idx) => `
                        <tr class="hover:bg-slate-50/80 transition-colors">
                          <td class="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
                          <td class="py-2 px-3 font-semibold text-slate-800 font-mono">${escapeHtml(appt.date)}</td>
                          <td class="py-2 px-3 text-slate-600 font-mono">${escapeHtml(appt.time || '--')}</td>
                          <td class="py-2 px-3">
                            ${getApptTypeBadge(appt.type)}
                          </td>
                          <td class="py-2 px-3 text-slate-800 font-medium">${escapeHtml(appt.item)}</td>
                          <td class="py-2 px-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${getApptStatusClass(appt.status)}">
                              ${escapeHtml(appt.status)}
                              ${appt.cancelStaff ? `<span class="ml-1 text-[10px] opacity-75">(${escapeHtml(appt.cancelStaff)})</span>` : ''}
                            </span>
                          </td>
                          <td class="py-2 px-3 text-slate-700 font-medium">${escapeHtml(cleanStaffDisplay(appt.staff))}</td>
                          <td class="py-2 px-3 text-slate-600">${escapeHtml(appt.store || '--')}</td>
                          <td class="py-2 px-3 text-center">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${appt.checkIn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}">
                              ${escapeHtml(appt.checkIn || 'N')}
                            </span>
                          </td>
                          <td class="py-2 px-3 text-slate-500 text-[11px]">${escapeHtml(appt.remarks || '--')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : `
                <div class="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center text-xs text-rose-700">
                  此客戶在《預約統計》表中查無任何預約紀錄。建議立即主動關懷，邀請安排首次療程預約！
                </div>
              `}
            </div>

          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // 渲染分頁按鈕控件
  renderPaginationControls(totalPages);

  // 重新建立頁面圖標
  refreshIcons();
}

// 切換 Accordion 展開/收合
function toggleRowAccordion(rowId) {
  if (state.expandedRowIds.has(rowId)) {
    state.expandedRowIds.delete(rowId);
  } else {
    state.expandedRowIds.add(rowId);
  }
  renderTable();
}

// 預約類型樣式化徽章 (療程 / 再消 / 初診 / 候補 等)
function getApptTypeBadge(type) {
  if (!type) return '<span class="text-slate-400 text-[10px]">--</span>';
  const t = String(type).trim();
  
  if (t.includes('初診')) {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">初診</span>`;
  }
  if (t.includes('再消')) {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">再消</span>`;
  }
  if (t.includes('療程')) {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">療程</span>`;
  }
  if (t.includes('候補')) {
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">候補</span>`;
  }
  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">${escapeHtml(t)}</span>`;
}

// 預約狀態樣式
function getApptStatusClass(status) {
  if (!status) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (status.includes('離店') || status.includes('完成')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-300';
  }
  if (status.includes('取消')) {
    return 'bg-rose-50 text-rose-700 border-rose-300';
  }
  if (status.includes('未到') || status.includes('缺席')) {
    return 'bg-amber-50 text-amber-700 border-amber-300';
  }
  return 'bg-blue-50 text-blue-700 border-blue-300';
}

// 去除員工頭銜字串前綴 (如 "運動管理師", "店經理", "物理治療師:") 並去除重複
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

// 產生分頁按鈕列
function renderPaginationControls(totalPages) {
  const container = document.getElementById('paginationControls');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let pagesHtml = '';
  const current = state.currentPage;

  let start = Math.max(1, current - 2);
  let end = Math.min(totalPages, current + 2);

  for (let p = start; p <= end; p++) {
    if (p === current) {
      pagesHtml += `<button class="w-7 h-7 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs">${p}</button>`;
    } else {
      pagesHtml += `<button onclick="goToPage(${p})" class="w-7 h-7 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200">${p}</button>`;
    }
  }

  container.innerHTML = pagesHtml;
}

// 跳轉指定頁數
function goToPage(page) {
  state.currentPage = page;
  renderTable();
}
