/**
 * 客戶剩餘資產與預約關懷比對系統 - Hash Mapping 比對與客戶歸納引擎
 * js/matcher.js
 */

// 觸發全表比對流程
function triggerMatchingProcess() {
  if (state.rawAssets.length === 0 && state.rawAppointments.length === 0) {
    return;
  }

  console.time('HashMappingAndMatch');
  
  // ========================================================
  // 步驟 1：建立以「會員號」為 Key 的 appointmentsMap
  // ========================================================
  state.appointmentsMap.clear();
  
  if (state.rawAppointments.length > 0) {
    for (let i = 0; i < state.rawAppointments.length; i++) {
      const row = state.rawAppointments[i];
      
      const memberId = normalizeString(row['會員號'] || row['會員編號'] || row['病歷號'] || row['客戶編號']);
      const clientName = normalizeString(row['客戶姓名'] || row['姓名'] || row['會員姓名']);
      const clientPhone = normalizeString(row['聯絡電話'] || row['手機'] || row['電話']);

      // 欄位提取：預約日期 (原公式對應C欄)、預約時間、預約項目、預約狀態、預約角色員工、預約類型
      const apptDate = extractDateValue(row['預約日期'] || row['日期'] || row['門診日期'] || row['__EMPTY_2']);
      const apptTime = normalizeString(row['預約時間'] || row['時間'] || row['時段']);
      const apptItem = normalizeString(row['預約項目'] || row['項目'] || row['預約服務']);
      const apptType = normalizeApptType(normalizeString(row['預約類型'] || row['類型'] || row['門診類型']));
      
      // 清理預約狀態 (處理可能的換行符，例如 "已取消\n林鈺真")
      const rawStatus = normalizeString(row['預約狀態'] || row['狀態']);
      const statusParts = rawStatus.split('\n').map(s => s.trim()).filter(Boolean);
      const cleanStatus = statusParts[0] || '離店';
      const cancelStaff = statusParts.length > 1 ? statusParts.slice(1).join(' ') : '';

      const apptStaff = normalizeString(row['預約角色員工'] || row['預約員工'] || row['服務人員'] || row['客戶歸屬物理治療師']);
      const apptStore = normalizeString(row['預約門店'] || row['門店']);
      const checkIn = normalizeString(row['是否報到']);
      const remarks = normalizeString(row['預約備註'] || row['備註']);

      const apptObj = {
        id: `appt_${i}`,
        memberId: memberId,
        clientName: clientName,
        clientPhone: clientPhone,
        date: apptDate,
        time: apptTime,
        item: apptItem,
        type: apptType, // 預約類型 (療程內 / 再消費 / 初診 / 候補 等)
        status: cleanStatus,
        cancelStaff: cancelStaff,
        fullStatus: rawStatus,
        staff: apptStaff,
        store: apptStore,
        checkIn: checkIn,
        remarks: remarks
      };

      // 以會員號建置 Hash 索引
      if (memberId) {
        if (!state.appointmentsMap.has(memberId)) {
          state.appointmentsMap.set(memberId, []);
        }
        state.appointmentsMap.get(memberId).push(apptObj);
      }

      // 同時以 "姓名___手機" 為次級索引 (預防多卡號或卡號遺漏)
      if (clientName && clientPhone) {
        const namePhoneKey = `NP_${clientName}___${clientPhone}`;
        if (!state.appointmentsMap.has(namePhoneKey)) {
          state.appointmentsMap.set(namePhoneKey, []);
        }
        state.appointmentsMap.get(namePhoneKey).push(apptObj);
      }
    }

    // 將每個會員的所有預約紀錄依照「預約日期」由新到舊 (DESC) 排序
    for (const [key, list] of state.appointmentsMap.entries()) {
      list.sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (db !== da) return db.localeCompare(da);
        return (b.time || '').localeCompare(a.time || '');
      });
    }
  }

  // ========================================================
  // 步驟 2：以「會員姓名」＋「手機」歸納統整《客戶剩餘資產》表
  // ========================================================
  const customerMap = new Map();
  const refDateStr = state.baseDate || getTodayYMD();

  for (let i = 0; i < state.rawAssets.length; i++) {
    const row = state.rawAssets[i];
    const name = normalizeString(row['會員姓名'] || row['客戶姓名'] || row['姓名']);
    const phone = normalizeString(row['會員手機'] || row['聯絡電話'] || row['手機'] || row['電話']);
    const memberId = normalizeString(row['會員號'] || row['會員編號'] || row['病歷號'] || row['客戶編號']);
    const birthday = extractDateValue(row['會員生日']);
    
    if (!name && !phone && !memberId) continue;

    // 歸納主鍵：會員姓名 ＋ 手機 (無手機時以會員號備援)
    const custKey = `${name}___${phone || memberId}`;

    const remainingQty = parseFloat(row['剩餘數量'] || row['剩餘堂數']) || 0;
    const remainingValue = parseFloat(row['剩餘資產價值']) || 0;
    const product = normalizeString(row['商品名稱'] || row['品項名稱'] || row['產品名稱']);
    const category = normalizeString(row['產品大類'] || row['產品類別']);
    const store = normalizeString(row['開單門店'] || row['門店']);
    const staff = normalizeString(row['歸屬人員'] || row['負責人員']);
    const salesStaff = normalizeString(row['訂單銷售分配業績人員'] || row['銷售分配業績人員'] || row['業績人員'] || row['銷售業務']);
    // 使用者需求：個管師顯示「業績人員」的資料 (若無則備援為歸屬人員)
    const caseManager = salesStaff || staff;
    const recommender = normalizeString(row['訂單推薦人']);
    const orderNo = normalizeString(row['關聯訂單號']);
    const orderDate = extractDateValue(row['開單時間']);

    const orderItem = {
      orderNo: orderNo || `無單號-${i+1}`,
      orderDate,
      product: product || '未註明品項',
      category,
      remainingQty,
      remainingValue,
      store,
      staff,
      salesStaff,
      caseManager, // 個管師 (業績人員)
      recommender,
      memberId,
      raw: row
    };

    if (!customerMap.has(custKey)) {
      customerMap.set(custKey, {
        customerKey: custKey,
        name: name || '未知客戶',
        phone: phone || '',
        birthday: birthday || '',
        memberIdsSet: new Set(),
        storesSet: new Set(),
        staffSet: new Set(),
        caseManagerSet: new Set(), // 收集名下所有個管師 (業績人員)
        assetOrders: [],
        totalRemainingQty: 0,
        totalRemainingValue: 0
      });
    }

    const cust = customerMap.get(custKey);
    if (memberId) cust.memberIdsSet.add(memberId);
    if (store) cust.storesSet.add(store);
    if (staff) cust.staffSet.add(staff);
    if (caseManager) cust.caseManagerSet.add(caseManager);
    if (!cust.birthday && birthday) cust.birthday = birthday;
    cust.assetOrders.push(orderItem);
    cust.totalRemainingQty += remainingQty;
    cust.totalRemainingValue += remainingValue;
  }

  // ========================================================
  // 步驟 3：針對每個歸納後的客戶，匹配預約紀錄並計算關懷評級
  // ========================================================
  state.matchedResults = [];
  let customerIndex = 0;

  for (const [custKey, cust] of customerMap.entries()) {
    customerIndex++;
    const memberIdsList = Array.from(cust.memberIdsSet);
    const storesList = Array.from(cust.storesSet);
    const staffList = Array.from(cust.staffSet);
    const caseManagersList = Array.from(cust.caseManagerSet);
    const caseManagerDisplay = caseManagersList.length > 0 
      ? caseManagersList.join(', ') 
      : (staffList.join(', ') || '--');

    // 彙整此客戶的所有預約歷程 (去重)
    const apptSeen = new Set();
    const customerAppts = [];

    // 依據所有會員卡號查詢
    memberIdsList.forEach(mid => {
      const list = state.appointmentsMap.get(mid) || [];
      list.forEach(a => {
        const sig = `${a.date}_${a.time}_${a.item}_${a.type}_${a.staff}_${a.status}`;
        if (!apptSeen.has(sig)) {
          apptSeen.add(sig);
          customerAppts.push(a);
        }
      });
    });

    // 依據 "姓名___手機" 補全查詢
    if (cust.name && cust.phone) {
      const namePhoneKey = `NP_${cust.name}___${cust.phone}`;
      const list2 = state.appointmentsMap.get(namePhoneKey) || [];
      list2.forEach(a => {
        const sig = `${a.date}_${a.time}_${a.item}_${a.type}_${a.staff}_${a.status}`;
        if (!apptSeen.has(sig)) {
          apptSeen.add(sig);
          customerAppts.push(a);
        }
      });
    }

    // 由新到舊排序
    customerAppts.sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      if (db !== da) return db.localeCompare(da);
      return (b.time || '').localeCompare(a.time || '');
    });

    const latestAppt = customerAppts.length > 0 ? customerAppts[0] : null;

    // 計算關懷等級與未預約天數
    const careMetrics = computeCareMetrics(latestAppt, customerAppts.length, cust.totalRemainingQty, refDateStr);

    // 封裝歸納客戶物件
    const clientItem = {
      rowId: `cust_${customerIndex}_${custKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
      index: customerIndex,
      customerKey: custKey,
      name: cust.name,
      phone: cust.phone,
      birthday: cust.birthday,
      primaryMemberId: memberIdsList[0] || '--',
      memberIdsList: memberIdsList,
      store: storesList.join(', ') || '--',
      storesList: storesList,
      // 依使用者需求：個管師顯示業績人員的資料
      staff: caseManagerDisplay,
      caseManager: caseManagerDisplay,
      caseManagersList: caseManagersList,
      originalStaffList: staffList,
      totalRemainingQty: cust.totalRemainingQty,
      totalRemainingValue: cust.totalRemainingValue,
      orderCount: cust.assetOrders.length,
      assetOrders: cust.assetOrders,

      // 預約歷程
      appointments: customerAppts,
      apptCount: customerAppts.length,
      latestAppt: latestAppt,
      latestDate: latestAppt ? latestAppt.date : '',
      latestTime: latestAppt ? latestAppt.time : '',
      latestItem: latestAppt ? latestAppt.item : '',
      latestType: latestAppt ? (latestAppt.type || '') : '', // 最近預約類型 (初診 / 療程內 / 再消費 等)
      latestStatus: latestAppt ? latestAppt.status : '',
      latestStaff: latestAppt ? latestAppt.staff : '',
      latestStore: latestAppt ? latestAppt.store : '',

      // 關懷評級指標
      careLevel: careMetrics.careLevel,
      daysSinceLast: careMetrics.daysSinceLast,
      careBadgeText: careMetrics.careBadgeText,
      careBadgeClass: careMetrics.careBadgeClass,
      careSuggestion: careMetrics.careSuggestion
    };

    state.matchedResults.push(clientItem);
  }

  console.timeEnd('HashMappingAndMatch');

  // 更新篩選下拉選單選項
  populateDropdownFilters();

  // 執行篩選並重新渲染表格
  applyFiltersAndRender();

  // 啟用匯出按鈕
  const exportBtn = document.getElementById('btnExportExcel');
  if (exportBtn) exportBtn.disabled = state.matchedResults.length === 0;

  showToast(`已成功依「姓名＋手機」歸納 ${state.matchedResults.length} 位客戶！`, 'success');
}

// 關懷評級與日期計算模型
function computeCareMetrics(latestAppt, apptCount, remainingQty, refDateStr) {
  if (apptCount === 0 || !latestAppt || !latestAppt.date) {
    return {
      careLevel: 'NEVER_BOOKED',
      daysSinceLast: 9999,
      careBadgeText: '🔴 從未預約',
      careBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      careSuggestion: remainingQty > 0 
        ? '客戶尚有有效堂數但無任何預約記錄，需立即主動致電歡迎與引導預約！' 
        : '無預約記錄且已無剩餘資產。'
    };
  }

  const apptDateObj = parseDateStrToDate(latestAppt.date);
  const refDateObj = parseDateStrToDate(refDateStr);
  
  let days = 0;
  if (apptDateObj && refDateObj) {
    const msDiff = refDateObj.getTime() - apptDateObj.getTime();
    days = Math.round(msDiff / (1000 * 60 * 60 * 24));
  }

  const isCanceledOrNoShow = ['已取消', '未到診', '不會到診'].includes(latestAppt.status);

  if (days < 0) {
    return {
      careLevel: 'RECENT_ACTIVE',
      daysSinceLast: days,
      careBadgeText: `📅 未來有約 (${Math.abs(days)}天後)`,
      careBadgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-medium',
      careSuggestion: '已有排定之預約時段，請按診所排程正常接待。'
    };
  }

  if (days <= 14 && isCanceledOrNoShow) {
    return {
      careLevel: 'RECENT_CANCELED',
      daysSinceLast: days,
      careBadgeText: `⚠️ 近期取消未補 (${days}天前)`,
      careBadgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
      careSuggestion: `最近一筆預約狀態為「${latestAppt.status}」，目前尚未改約，建議致電關心並協助重新預約。`
    };
  }

  if (days <= 14) {
    return {
      careLevel: 'RECENT_ACTIVE',
      daysSinceLast: days,
      careBadgeText: `🟢 近期活躍 (${days}天前)`,
      careBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
      careSuggestion: '客戶維持定期出席習慣，狀態良好。'
    };
  }

  if (days <= 30) {
    return {
      careLevel: 'MODERATE',
      daysSinceLast: days,
      careBadgeText: `🟡 15~30天未約 (${days}天前)`,
      careBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
      careSuggestion: '間隔已超過2週，建議發送 LINE 或訊息關心身體或訓練進度。'
    };
  }

  return {
    careLevel: 'HIGH_PRIORITY',
    daysSinceLast: days,
    careBadgeText: `🚨 逾30天未約 (${days}天前)`,
    careBadgeClass: 'bg-red-100 text-red-800 border-red-400 font-bold',
    careSuggestion: '療程嚴重中斷！流失風險極高，強烈建議由專屬管理師/治療師電話深入關懷！'
  };
}
