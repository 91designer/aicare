/**
 * 客戶剩餘資產與預約關懷比對系統 - 全域設定與狀態管理
 * js/config.js
 */

const state = {
  // 原始解析之 Excel 資料
  rawAssets: [],         // 《客戶剩餘資產》原始訂單列表
  rawAppointments: [],   // 《預約統計》原始預約歷程列表
  
  // 核心 Hash Mapping 字典索引
  // Key: 會員號 (string), Value: Array of Appointment objects
  appointmentsMap: new Map(),

  // 以「會員姓名」+「手機」歸納後的客戶結果陣列 (Consolidated Customers)
  matchedResults: [],

  // 篩選與呈現視圖狀態
  filteredResults: [],
  currentCareFilter: 'ALL',       // 關懷狀態分頁 (ALL, NEVER_BOOKED, HIGH_PRIORITY, MODERATE, RECENT_ACTIVE, RECENT_CANCELED)
  selectedStaff: '',              // 單一人員篩選 (向下相容)
  selectedStaffs: [],             // 個管師 / 治療師複選陣列 (支援多選)
  selectedProduct: '',            // 療程 / 服務項目篩選
  filterAmountMode: 'PAID_ONLY',  // 金額門檻：預設為 'PAID_ONLY' (僅限付費資產 > 0，排除0元)
  baseDate: '2026-09-30',         // 基準計算日期 (預設為西門店樣本日期，可自行變更)
  sortMode: 'val_desc',           // 排序模式：預設為依剩餘金額由高到低
  keyword: '',                    // 搜尋關鍵字 (姓名/手機/治療師/療程/卡號/單號)
  onlyPositiveQty: true,          // 僅顯示剩餘堂數 > 0
  highlightInactive: true,        // 高亮警示待關懷客群
  
  // 分頁控制
  currentPage: 1,
  pageSize: 20,

  // Accordion 展開紀錄 (存放已展開之客戶 rowId)
  expandedRowIds: new Set(),
  isAllExpanded: false,

  // 檔案詮釋資料 (名稱、大小、筆數)
  assetFileMeta: null,
  apptFileMeta: null
};
