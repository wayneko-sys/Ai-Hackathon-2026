/**
 * LifeDB 數據分析報告系統 — Google Apps Script
 * 
 * 部署方式：
 * 1. 開啟 Google Apps Script (script.google.com)
 * 2. 新增專案
 * 3. 將此檔案內容貼入 Code.gs
 * 4. 新增 HTML 檔案，命名為 "dashboard"，貼入 dashboard.html 內容
 * 5. 部署 → 新增部署 → Web App
 *    - 執行身份：我
 *    - 存取權限：知道連結的任何人
 * 6. 複製部署 URL 即可分享
 */

// ===== SPREADSHEET IDS =====
var SHEET_IDS = {
  report2025: "1aqpZAgkpOwimtObaHdpjXKtjBH7KDIOxcH-I08vnoCs",
  report2026: "14fKpMVbkNGtYwLq9MTKh1jB_sVyIGzeUVnzioHjcTTU",
  source2025: "1uunmNimFJ2fWDhtN3m18AXywlyrkQ52c63CZKRdMriM",
  source2026: "1lFP58KucOT_73rEdDN3Pl_eRgSvFJO8LA9YKdhwKuSE",
  leave:      "1hC-QkMemyj91RDYThCksWGNEU94qNUjBs_VevREswF4",
  nomove:     "1xuvhH8PvxhYcbc4rUL1mqWqMB856qwrmH2l-djVb0JY"
};

// ===== STAFF CONFIG =====
// manpower: Michael=2, Suki+Charly=1.5, others=1
// Team monthly target = 200, distributed by manpower
var STAFF_CONFIG = {
  "michael":   {name:"Michael",   manpower:2},
  "catlam":    {name:"Cat",       manpower:1},
  "aikolam":   {name:"Aiko",      manpower:1},
  "mikiszeto": {name:"Miki",      manpower:1},
  "evatsang":  {name:"Eva",       manpower:1},
  "sukito":    {name:"Suki",      manpower:1.5},
  "hazel":     {name:"Hazel",     manpower:1},
  "lauralau":  {name:"Laura",     manpower:1},
  "charly":    {name:"Charly",    manpower:1.5},
  "dereklee":  {name:"Derek",     manpower:1},
  "marcoma":   {name:"Marco",     manpower:1},
  "kikopang":  {name:"Kiko",      manpower:1},
  "heidili":   {name:"Heidi",     manpower:1}
};
var TEAM_MONTHLY_TARGET = 200;

// Short name → username mapping for M/N columns
var NAME_TO_USERNAME = {
  "mic":"michael", "michael":"michael",
  "cat":"catlam", "catlam":"catlam",
  "aiko":"aikolam", "aikolam":"aikolam",
  "miki":"mikiszeto", "mikiszeto":"mikiszeto",
  "eva":"evatsang", "evatsang":"evatsang",
  "suki":"sukito", "sukito":"sukito",
  "hazel":"hazel",
  "laura":"lauralau", "lauralau":"lauralau",
  "charly":"charly",
  "derek":"dereklee", "dereklee":"dereklee",
  "marco":"marcoma", "marcoma":"marcoma",
  "kiko":"kikopang", "kikopang":"kikopang",
  "heidi":"heidili", "heidili":"heidili"
};
function resolveUsername(name) {
  if (!name) return null;
  var key = String(name).trim().toLowerCase();
  return NAME_TO_USERNAME[key] || null;
}

// DEBUG: run this in Apps Script to see raw Summary sheet data
function debugSummary() {
  var ss = SpreadsheetApp.openById(SHEET_IDS.report2026);
  var sheet = ss.getSheetByName("Summary");
  var data = sheet.getDataRange().getValues();
  Logger.log("Headers: " + JSON.stringify(data[0]));
  for (var i = 1; i <= Math.min(5, data.length-1); i++) {
    Logger.log("Row " + i + ": " + JSON.stringify(data[i]));
  }
}

// DEBUG: run this to diagnose monthly detail loading
function debugMonthlyDetails() {
  var ss = SpreadsheetApp.openById(SHEET_IDS.report2026);
  var sheets = ss.getSheets();
  Logger.log("=== All sheet names in report2026 ===");
  sheets.forEach(function(s) { Logger.log("  Sheet: '" + s.getName() + "' rows=" + s.getLastRow()); });

  // Try the month names we use
  var tryNames = ["01","02","03","04","05","1","2","3","4","5","1月","2月","3月","4月","5月","Jan","Feb","Mar","Apr","May"];
  tryNames.forEach(function(n) {
    var s = ss.getSheetByName(n);
    if (s) Logger.log("  Found sheet by name '" + n + "' → rows=" + s.getLastRow());
  });

  // Check May sheet specifically (current month)
  var maySheet = ss.getSheetByName("05");
  if (!maySheet) {
    Logger.log("❌ Sheet '05' not found! Trying '5'...");
    maySheet = ss.getSheetByName("5");
  }
  if (!maySheet) {
    Logger.log("❌ Sheet '5' not found! Trying '5月'...");
    maySheet = ss.getSheetByName("5月");
  }
  if (!maySheet) {
    Logger.log("❌ No May sheet found at all");
    return;
  }

  Logger.log("=== May sheet: '" + maySheet.getName() + "' ===");
  var data = maySheet.getDataRange().getValues();
  Logger.log("Headers (row 0): " + JSON.stringify(data[0]));
  Logger.log("Total rows: " + data.length);

  // Show first 5 data rows with columns M/N (index 12/13) and F
  for (var i = 1; i <= Math.min(5, data.length - 1); i++) {
    var row = data[i];
    var colF = row[5] || "(empty)";
    var colM = row[12] !== undefined ? row[12] : "(no col M)";
    var colN = row[13] !== undefined ? row[13] : "(no col N)";
    var resolvedM = resolveUsername(row[12]);
    var resolvedN = resolveUsername(row[13]);
    Logger.log("Row " + i + ": colF=" + colF + " | colM=" + colM + " → " + resolvedM + " | colN=" + colN + " → " + resolvedN);
  }

  // Run getMonthlyDetails and check result
  Logger.log("=== Running getMonthlyDetails('report2026') ===");
  var result = getMonthlyDetails("report2026");
  var usernames = Object.keys(result);
  Logger.log("Users found: " + usernames.length + " → " + JSON.stringify(usernames));
  usernames.forEach(function(u) {
    var months = Object.keys(result[u]);
    var total = 0;
    months.forEach(function(m) { total += result[u][m].cases; });
    Logger.log("  " + u + ": months=" + JSON.stringify(months) + " totalCases=" + total);
  });
}

function calcTargets() {
  var totalManpower = 0;
  Object.keys(STAFF_CONFIG).forEach(function(k) { totalManpower += STAFF_CONFIG[k].manpower; });
  var perUnit = TEAM_MONTHLY_TARGET / totalManpower;
  var targets = {};
  Object.keys(STAFF_CONFIG).forEach(function(k) {
    targets[k] = Math.round(perUnit * STAFF_CONFIG[k].manpower * 12); // annual target
  });
  return targets;
}

// ===== WEB APP ENTRY =====
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "data") {
    var data = getAllData();
    var output = ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
    return output;
  }
  return HtmlService.createHtmlOutputFromFile('dashboard')
    .setTitle('LifeDB 數據分析報告系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ===== MAIN DATA FUNCTION (with cache) =====
var CACHE_KEY = "lifedb_data";
var CACHE_KEY_FAST = "lifedb_fast";
var CACHE_KEY_SUMMARY = "lifedb_summary"; // ultra-fast first paint
var CACHE_KEY_MONTHLY = "lifedb_monthly";
var CACHE_TTL = 1800; // 30 minutes (data doesn't change that often)

function getAllData() {
  // Try full cache first
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  var targets = calcTargets();
  var data = {
    staff: getStaffList(targets),
    summary25: getSummary("report2025"),
    summary26: getSummary("report2026"),
    monthly25: getMonthlyDetails("report2025"),
    monthly26: getMonthlyDetails("report2026"),
    source25: getSourceData("source2025"),
    source26: getSourceData("source2026"),
    leave26: getLeaveData(2026),
    nomoveReasons26: getNoMoveCases(2026),
    timestamp: new Date().toISOString()
  };

  // Cache full data
  try {
    var json = JSON.stringify(data);
    // Split into chunks if too large (100KB limit per entry)
    if (json.length < 90000) {
      cache.put(CACHE_KEY, json, CACHE_TTL);
    } else {
      // Cache fast data separately
      var fastData = {staff:data.staff, summary25:data.summary25, summary26:data.summary26,
        source25:data.source25, source26:data.source26, leave26:data.leave26, timestamp:data.timestamp};
      cache.put(CACHE_KEY_FAST, JSON.stringify(fastData), CACHE_TTL);
    }
  } catch(e) {}

  return data;
}

// Ultra-fast: staff + summary only for first paint (~2-3s fresh, instant from cache)
function getSummaryOnly() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY_SUMMARY);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  // Also check fast/full cache
  var fast = cache.get(CACHE_KEY_FAST);
  if (fast) {
    try {
      var fd = JSON.parse(fast);
      return {staff:fd.staff, summary25:fd.summary25, summary26:fd.summary26, monthly25:{}, monthly26:{}, timestamp:fd.timestamp};
    } catch(e) {}
  }
  // Fetch fresh — only 3 spreadsheet calls
  var targets = calcTargets();
  var data = {
    staff: getStaffList(targets),
    summary25: getSummary("report2025"),
    summary26: getSummary("report2026"),
    monthly25: {},
    monthly26: {},
    timestamp: new Date().toISOString()
  };
  try { cache.put(CACHE_KEY_SUMMARY, JSON.stringify(data), CACHE_TTL); } catch(e) {}
  return data;
}

// Fast load: summary + source + leave (~5-8s fresh, instant from cache)
function getFastData() {
  var cache = CacheService.getScriptCache();
  // Skip CACHE_KEY_SUMMARY — it has no source/leave data.
  // Try fast cache (has source + leave)
  var cached = cache.get(CACHE_KEY_FAST);
  if (cached) {
    try {
      var d2 = JSON.parse(cached);
      Logger.log("getFastData: CACHE_KEY_FAST hit");
      return d2;
    } catch(e) {}
  }
  // Try full cache
  var full = cache.get(CACHE_KEY);
  if (full) {
    try {
      var d3 = JSON.parse(full);
      Logger.log("getFastData: CACHE_KEY (full) hit");
      return d3;
    } catch(e) {}
  }
  // Fetch fresh fast data
  Logger.log("getFastData: all cache miss, fetching fresh");
  var targets = calcTargets();
  var data = {
    staff: getStaffList(targets),
    summary25: getSummary("report2025"),
    summary26: getSummary("report2026"),
    source25: getSourceData("source2025"),
    source26: getSourceData("source2026"),
    leave26: getLeaveData(2026),
    nomoveReasons26: getNoMoveCases(2026),
    monthly25: {},
    monthly26: {},
    timestamp: new Date().toISOString()
  };
  Logger.log("getFastData: fresh data fetched, summary26[3].cases=" + (data.summary26[3] ? data.summary26[3].cases : "null"));
  try {
    var json = JSON.stringify(data);
    cache.put(CACHE_KEY_FAST, json, CACHE_TTL);
    // Also cache summary-only subset for ultra-fast first paint
    var summaryOnly = {
      staff: data.staff,
      summary25: data.summary25,
      summary26: data.summary26,
      monthly25: {}, monthly26: {},
      timestamp: data.timestamp
    };
    cache.put(CACHE_KEY_SUMMARY, JSON.stringify(summaryOnly), CACHE_TTL);
    Logger.log("getFastData: cached CACHE_KEY_FAST and CACHE_KEY_SUMMARY");
  } catch(e) {
    Logger.log("getFastData: cache write failed: " + e);
  }
  return data;
}

// Warm up cache — called from Time-based Trigger every 30 minutes.
// (Cache TTL is 1800s = 30 min, so the trigger interval matches the TTL.)
function warmCache() {
  var cache = CacheService.getScriptCache();
  cache.remove(CACHE_KEY);
  cache.remove(CACHE_KEY_FAST);
  cache.remove(CACHE_KEY_SUMMARY);
  cache.remove(CACHE_KEY_MONTHLY);
  Logger.log("Cache cleared, warming up...");
  getFastData();
  getMonthlyData();
  Logger.log("Cache warmed up at " + new Date().toISOString());
}

// ===== TRIGGER SETUP =====
// Run setupWarmCacheTrigger() ONCE manually from the Apps Script editor:
//   1. Open script.google.com, find this project
//   2. Function dropdown → select "setupWarmCacheTrigger"
//   3. Click Run → authorize if prompted
//   4. Verify in Triggers panel (clock icon in left sidebar)
//
// Idempotent: removes any existing warmCache triggers first, so safe to re-run.
function setupWarmCacheTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  var removed = 0;
  existing.forEach(function(t) {
    if (t.getHandlerFunction() === "warmCache") {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });

  ScriptApp.newTrigger("warmCache")
    .timeBased()
    .everyMinutes(30)
    .create();

  var msg = "setupWarmCacheTrigger: removed " + removed + " old trigger(s), created 1 new (every 30 min).";
  Logger.log(msg);
  return msg;
}

// Diagnostic — list all current triggers in this Apps Script project.
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log("Total triggers: " + triggers.length);
  triggers.forEach(function(t, i) {
    Logger.log((i + 1) + ". handler=" + t.getHandlerFunction()
      + " event=" + t.getEventType()
      + " id=" + t.getUniqueId());
  });
  return triggers.length;
}

// DEBUG: check what getSummaryData returns right now
function debugGetSummaryData() {
  var d = getSummaryData();
  Logger.log("summary26 length: " + (d.summary26 ? d.summary26.length : 0));
  if (d.summary26) {
    d.summary26.forEach(function(s, i) {
      if (s) Logger.log("summary26[" + i + "]: cases=" + s.cases + " avg=" + s.avg + " fee=" + s.fee);
    });
  }
}

// Ultra-fast first paint: staff + summary only (Phase 1)
// On cache miss: reads 3 sheets (report2025 Summary, report2026 Summary, nomove for 2026)
// Skips: source, leave, nomove for 2025
function getSummaryData() {
  var cache = CacheService.getScriptCache();
  var summaryCache = cache.get(CACHE_KEY_SUMMARY);
  if (summaryCache) {
    try {
      var d = JSON.parse(summaryCache);
      Logger.log("getSummaryData: cache hit");
      return d;
    } catch(e) {}
  }
  Logger.log("getSummaryData: cache miss, fetching minimal data");
  var targets = calcTargets();
  var data = {
    staff: getStaffList(targets),
    summary25: getSummary("report2025", true),
    summary26: getSummary("report2026"),
    nomoveReasons26: getNoMoveCases(2026),
    monthly25: {}, monthly26: {},
    timestamp: new Date().toISOString()
  };
  try {
    cache.put(CACHE_KEY_SUMMARY, JSON.stringify(data), CACHE_TTL);
  } catch(e) {}
  return data;
}

// Get monthly detail only (background load)
function getMonthlyData() {
  var cache = CacheService.getScriptCache();
  // Check dedicated monthly cache first (fastest)
  var mc = cache.get(CACHE_KEY_MONTHLY);
  if (mc) {
    try {
      var md = JSON.parse(mc);
      if (md.monthly26 && Object.keys(md.monthly26).length > 0) {
        Logger.log("getMonthlyData: CACHE_KEY_MONTHLY hit");
        return md;
      }
    } catch(e) {}
  }
  // Fallback: check full cache
  var full = cache.get(CACHE_KEY);
  if (full) {
    try {
      var d = JSON.parse(full);
      if (d.monthly26 && Object.keys(d.monthly26).length > 0) {
        Logger.log("getMonthlyData: CACHE_KEY hit");
        return {monthly25: d.monthly25 || {}, monthly26: d.monthly26};
      }
    } catch(e) {}
  }
  // Compute fresh — both years
  var m25 = {};
  var m26 = {};
  try { m25 = getMonthlyDetails("report2025"); } catch(e) { Logger.log("getMonthlyData: report2025 failed: " + e); }
  try { m26 = getMonthlyDetails("report2026"); } catch(e) { Logger.log("getMonthlyData: report2026 failed: " + e); }
  Logger.log("getMonthlyData: m25 users=" + Object.keys(m25).length + ", m26 users=" + Object.keys(m26).length);
  var result = {monthly25: m25, monthly26: m26};
  try {
    var json = JSON.stringify(result);
    if (json.length < 90000) {
      cache.put(CACHE_KEY_MONTHLY, json, CACHE_TTL);
      Logger.log("getMonthlyData: cached to CACHE_KEY_MONTHLY (" + json.length + " bytes)");
    }
  } catch(e) { Logger.log("getMonthlyData: cache write failed: " + e); }
  return result;
}

// Force refresh cache
function clearCache() {
  var cache = CacheService.getScriptCache();
  cache.remove(CACHE_KEY);
  cache.remove(CACHE_KEY_FAST);
  cache.remove(CACHE_KEY_SUMMARY);
  cache.remove(CACHE_KEY_MONTHLY);
  Logger.log("Cache cleared");
}

// ===== STAFF LIST =====
function getStaffList(targets) {
  var colors = [
    "#6366f1","#3b82f6","#22c55e","#f59e0b","#ef4444",
    "#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4",
    "#84cc16","#a855f7","#e11d48","#0ea5e9","#10b981"
  ];
  var list = [];
  var keys = Object.keys(STAFF_CONFIG);
  keys.forEach(function(k, i) {
    list.push({
      id: i,
      username: k,
      name: STAFF_CONFIG[k].name,
      color: colors[i % colors.length],
      target: targets[k],
      manpower: STAFF_CONFIG[k].manpower
    });
  });
  return list;
}

// ===== NO-MOVE DATA (from 不入住申請個案 sheet) =====
var _noMoveCache = {};
function getNoMoveCases(year) {
  if (_noMoveCache[year]) return _noMoveCache[year];
  var ss = SpreadsheetApp.openById(SHEET_IDS.nomove);
  var sheets = ss.getSheets();
  var byMonth = {};
  var byStaff = {};
  var byReason = {};
  var byStaffReason = {};

  sheets.forEach(function(sheet) {
    if (sheet.getLastRow() < 2) return;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var dateVal = row[8]; // column I: 申請時間
      if (!dateVal) continue;
      var d = new Date(dateVal);
      if (isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year) continue;
      var mIdx = d.getMonth();

      var rawHandler = String(row[7]).trim().toLowerCase(); // column H: 申請人
      var handler = resolveUsername(rawHandler);
      var reason = String(row[2]).trim(); // column C: 不入住原因

      byMonth[mIdx] = (byMonth[mIdx] || 0) + 1;

      if (reason) {
        byReason[reason] = (byReason[reason] || 0) + 1;
      }

      if (handler) {
        if (!byStaff[handler]) byStaff[handler] = {};
        byStaff[handler][mIdx] = (byStaff[handler][mIdx] || 0) + 1;
        if (reason) {
          if (!byStaffReason[handler]) byStaffReason[handler] = {};
          byStaffReason[handler][reason] = (byStaffReason[handler][reason] || 0) + 1;
        }
      }
    }
  });

  var result = { byMonth: byMonth, byStaff: byStaff, byReason: byReason, byStaffReason: byStaffReason };
  _noMoveCache[year] = result;
  return result;
}

// ===== SUMMARY DATA (from Summary sheet) =====
// skipNomove: if true, skip the slow nomove sheet read (used for fast first paint)
function getSummary(sheetKey, skipNomove) {
  var ss = SpreadsheetApp.openById(SHEET_IDS[sheetKey]);
  var sheet = ss.getSheetByName("Summary");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  // headers: 月份, 總數, 總院費, 平均院費, 不入住數, 不入住率, 開檔落訂率
  var result = [];
  var monthNames = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var mName = String(row[0]).trim();
    if (!mName) continue;
    var mIdx = monthNames.indexOf(mName);
    if (mIdx < 0) continue;
    var cases = Number(row[1]) || 0;
    var fee = Number(row[2]) || 0;
    var avg = Number(row[3]) || 0;
    var nomove = Number(row[4]) || 0;
    var nomoveRate = cases > 0 ? (nomove / cases * 100) : 0;
    var openRate = Number(row[6]) || 0;
    if (openRate > 0 && openRate < 1) openRate = openRate * 100;
    result.push({
      m: (mIdx+1) + "月",
      mIdx: mIdx,
      cases: cases,
      fee: fee,
      avg: avg,
      nomove: nomove,
      nomoveRate: parseFloat(nomoveRate.toFixed(1)),
      openRate: parseFloat(openRate.toFixed(1))
    });
  }
  // Sort by month index
  result.sort(function(a,b) { return a.mIdx - b.mIdx; });

  // Override nomove data from 不入住申請個案 sheet (skip for fast first paint)
  if (!skipNomove) {
    var nmYear = (sheetKey === "report2026") ? 2026 : 2025;
    try {
      var nmData = getNoMoveCases(nmYear);
      result.forEach(function(r) {
        var nm = nmData.byMonth[r.mIdx] || 0;
        r.nomove = nm;
        r.nomoveRate = r.cases > 0 ? parseFloat((nm / r.cases * 100).toFixed(1)) : 0;
      });
    } catch(e) {
      Logger.log("getSummary: nomove sheet read failed, using Summary sheet data: " + e);
    }
  }

  return result;
}

// ===== MONTHLY DETAIL DATA (per staff per month) =====
function getMonthlyDetails(sheetKey) {
  var ss = SpreadsheetApp.openById(SHEET_IDS[sheetKey]);
  var months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  var result = {}; // {username: {month: {cases, fee, homes:{}, nomove}}}
  var is2026 = (sheetKey === "report2026");

  months.forEach(function(m, mIdx) {
    var sheet = ss.getSheetByName(m);
    if (!sheet || sheet.getLastRow() < 2) return;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var handlerCol = -1, feeCol = -1, homeCol = -1, moveCol = -1;
    for (var h = 0; h < headers.length; h++) {
      var hStr = String(headers[h]).trim();
      if (hStr === "經手人") handlerCol = h;
      if (hStr === "院舍") homeCol = h;
      if (hStr === "入住日期") moveCol = h;
      if (typeof headers[h] === "number" && headers[h] > 10000) feeCol = h;
    }
    if (feeCol < 0) feeCol = 10;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fee = Number(row[feeCol]) || 0;
      var home = homeCol >= 0 ? String(row[homeCol]).trim() : "";
      var moveStatus = moveCol >= 0 ? String(row[moveCol]).trim() : "";
      var isNoMove = moveStatus === "未入住" || moveStatus === "";

      // 2026: use M/N columns (index 12/13) for handler attribution
      // M = primary handler, N = secondary (shared 0.5 each)
      var handlers = [];
      if (is2026) {
        var nameM = resolveUsername(row[12]);
        var nameN = resolveUsername(row[13]);
        if (nameM) handlers.push(nameM);
        if (nameN) handlers.push(nameN);
      }
      // Fallback: use F column (經手人) for 2025 or when M/N empty
      if (handlers.length === 0) {
        var fallback = handlerCol >= 0 ? resolveUsername(row[handlerCol]) : null;
        if (fallback) handlers.push(fallback);
      }
      if (handlers.length === 0) continue;

      var caseShare = 1 / handlers.length; // 1 if solo, 0.5 if shared
      var feeShare = fee / handlers.length;

      handlers.forEach(function(handler) {
        if (!result[handler]) result[handler] = {};
        if (!result[handler][mIdx]) result[handler][mIdx] = {cases:0, fee:0, homes:{}, nomove:0};
        result[handler][mIdx].cases += caseShare;
        result[handler][mIdx].fee += feeShare;
        if (home) {
          result[handler][mIdx].homes[home] = (result[handler][mIdx].homes[home] || 0) + caseShare;
        }
        if (isNoMove) result[handler][mIdx].nomove += caseShare;
      });
    }
  });

  // Override nomove from 不入住申請個案 sheet
  var nmYear = (sheetKey === "report2026") ? 2026 : 2025;
  try {
    var nmData = getNoMoveCases(nmYear);
    Object.keys(result).forEach(function(h) {
      Object.keys(result[h]).forEach(function(mi) {
        result[h][mi].nomove = 0;
      });
    });
    Object.keys(nmData.byStaff).forEach(function(h) {
      if (!result[h]) return;
      Object.keys(nmData.byStaff[h]).forEach(function(mi) {
        if (result[h][mi]) {
          result[h][mi].nomove = nmData.byStaff[h][mi];
        }
      });
    });
  } catch(e) {
    Logger.log("getMonthlyDetails: nomove sheet read failed, using report sheet data: " + e);
  }

  return result;
}

// ===== SOURCE DATA =====
function getSourceData(sheetKey) {
  var ss = SpreadsheetApp.openById(SHEET_IDS[sheetKey]);
  var year = sheetKey === "source2025" ? "2025" : "2026";

  // Try daily tab with multiple naming conventions
  var dailyNames = [year, "Daily", "daily", "每日", "日報"];
  for (var dn = 0; dn < dailyNames.length; dn++) {
    var sheet = ss.getSheetByName(dailyNames[dn]);
    if (sheet && sheet.getLastRow() >= 2) {
      var result = getSourceFromDaily(sheet);
      if (result.some(function(r){return r !== null;})) return result;
    }
  }

  // Try trend tab
  var trendNames = ["個案走勢", "走勢", "Summary", "summary"];
  for (var tn = 0; tn < trendNames.length; tn++) {
    var trendSheet = ss.getSheetByName(trendNames[tn]);
    if (trendSheet && trendSheet.getLastRow() > 1) {
      var tResult = getSourceFromTrend(trendSheet);
      if (tResult.some(function(r){return r !== null;})) return tResult;
    }
  }

  // Last resort: try the first sheet
  var allSheets = ss.getSheets();
  if (allSheets.length > 0) {
    var first = allSheets[0];
    if (first.getLastRow() >= 2) {
      var headers = first.getRange(1, 1, 1, first.getLastColumn()).getValues()[0];
      var hasNewCol = headers.some(function(h){return String(h).indexOf("新增數") >= 0;});
      if (hasNewCol) {
        var row1val = first.getRange(2, 1).getValue();
        if (row1val instanceof Date) {
          return getSourceFromDaily(first);
        } else {
          return getSourceFromTrend(first);
        }
      }
    }
  }
  return [];
}

function getSourceFromTrend(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var newCols = [];
  for (var h = 0; h < headers.length; h++) {
    var hStr = String(headers[h]);
    if (hStr.indexOf("新增數") >= 0) {
      newCols.push(h);
    }
  }

  var result = [];
  for (var m = 0; m < 12; m++) result.push(null);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var monthData = [];
    for (var c = 0; c < Math.min(newCols.length, 8); c++) {
      monthData.push(Math.round(Number(row[newCols[c]]) || 0));
    }
    if (!monthData.some(function(v){return v > 0;})) continue;

    // Try to parse month from column A (e.g. "1月", "5月", "Jan", date object)
    var label = row[0];
    var mIdx = -1;
    if (label instanceof Date && !isNaN(label.getTime())) {
      mIdx = label.getMonth();
    } else {
      var s = String(label);
      var mm = s.match(/(\d+)\s*月/);
      if (mm) { mIdx = parseInt(mm[1]) - 1; }
      else {
        var enMonths = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        for (var em = 0; em < 12; em++) {
          if (s.toLowerCase().indexOf(enMonths[em]) >= 0) { mIdx = em; break; }
        }
      }
    }
    if (mIdx >= 0 && mIdx < 12) {
      result[mIdx] = monthData;
    }
  }

  // Fallback: if no months were matched by label, use sequential order
  var hasAny = result.some(function(r){return r !== null;});
  if (!hasAny) {
    var seqIdx = 0;
    for (var j = 1; j < data.length; j++) {
      var row2 = data[j];
      if (!row2[0]) continue;
      var md = [];
      for (var c2 = 0; c2 < Math.min(newCols.length, 8); c2++) {
        md.push(Math.round(Number(row2[newCols[c2]]) || 0));
      }
      if (md.some(function(v){return v > 0;})) {
        result[seqIdx] = md;
        seqIdx++;
      }
    }
  }
  return result;
}

function getSourceFromDaily(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  // Find 新增數 columns
  var newCols = [];
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).indexOf("新增數") >= 0) newCols.push(h);
  }
  if (newCols.length === 0) return [];
  
  // Aggregate by month
  var monthly = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var d = row[0];
    if (!d) continue;
    var date = new Date(d);
    if (isNaN(date.getTime())) continue;
    var mKey = date.getMonth(); // 0-11
    if (!monthly[mKey]) monthly[mKey] = new Array(newCols.length).fill(0);
    for (var c = 0; c < newCols.length; c++) {
      monthly[mKey][c] += Number(row[newCols[c]]) || 0;
    }
  }
  
  var result = [];
  for (var m = 0; m < 12; m++) {
    if (monthly[m]) {
      var rounded = monthly[m].map(function(v){return Math.round(v);});
      result.push(rounded.some(function(v){return v > 0;}) ? rounded : null);
    } else {
      result.push(null);
    }
  }
  return result;
}

// DEBUG: run this to diagnose source2026 missing months
function debugSource2026() {
  var ss = SpreadsheetApp.openById(SHEET_IDS.source2026);
  var sheets = ss.getSheets();
  Logger.log("=== All tabs in source2026 ===");
  sheets.forEach(function(s) {
    Logger.log("  Tab: '" + s.getName() + "' rows=" + s.getLastRow() + " cols=" + s.getLastColumn());
  });

  // Check "2026" tab
  var daily = ss.getSheetByName("2026");
  if (daily) {
    var data = daily.getDataRange().getValues();
    Logger.log("=== Tab '2026' headers: " + JSON.stringify(data[0].slice(0, 15)));
    Logger.log("=== Tab '2026' first 3 rows ===");
    for (var i = 1; i <= Math.min(3, data.length-1); i++) {
      Logger.log("  Row " + i + ": col0=" + data[i][0] + " type=" + typeof data[i][0]);
    }
    Logger.log("=== Tab '2026' last 3 rows ===");
    for (var j = Math.max(1, data.length-3); j < data.length; j++) {
      Logger.log("  Row " + j + ": col0=" + data[j][0] + " type=" + typeof data[j][0]);
    }
    // Check what months exist
    var months = {};
    for (var k = 1; k < data.length; k++) {
      var d = data[k][0];
      if (!d) continue;
      var dt = new Date(d);
      if (!isNaN(dt.getTime())) months[dt.getMonth()] = (months[dt.getMonth()]||0)+1;
    }
    Logger.log("=== Months found: " + JSON.stringify(months));
  } else {
    Logger.log("❌ Tab '2026' NOT FOUND");
  }

  // Check "個案走勢" tab
  var trend = ss.getSheetByName("個案走勢");
  if (trend) {
    var tdata = trend.getDataRange().getValues();
    Logger.log("=== Tab '個案走勢' headers: " + JSON.stringify(tdata[0].slice(0, 15)));
    for (var r = 1; r < tdata.length; r++) {
      Logger.log("  Row " + r + ": col0='" + tdata[r][0] + "' type=" + typeof tdata[r][0] + " (is Date: " + (tdata[r][0] instanceof Date) + ")");
    }
  } else {
    Logger.log("❌ Tab '個案走勢' NOT FOUND");
  }

  // Run actual getSourceData and show result
  var result = getSourceData("source2026");
  Logger.log("=== getSourceData result ===");
  for (var m = 0; m < 12; m++) {
    if (result[m]) Logger.log("  Month " + (m+1) + ": " + JSON.stringify(result[m]));
  }
  Logger.log("  Total months with data: " + result.filter(function(r){return r!==null;}).length);
}

// DEBUG: run this to check leave sheet structure
function debugLeaveData() {
  var ss = SpreadsheetApp.openById(SHEET_IDS.leave);
  var sheets = ss.getSheets();
  Logger.log("=== All sheets in leave spreadsheet ===");
  sheets.forEach(function(s) { Logger.log("  '" + s.getName() + "' rows=" + s.getLastRow() + " cols=" + s.getLastColumn()); });

  var testNames = ["1-4月/2026","5-8月/2026","1-4月/2025","5-8月/2025"];
  testNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log("❌ Sheet '" + name + "' NOT FOUND"); return; }
    Logger.log("✅ Sheet '" + name + "' found, rows=" + sheet.getLastRow());
    var data = sheet.getDataRange().getValues();
    // Show first 5 rows to see structure
    for (var r = 0; r < Math.min(5, data.length); r++) {
      var row = data[r].slice(0, 20).map(function(v){ return String(v).substring(0, 15); });
      Logger.log("  Row " + r + ": " + JSON.stringify(row));
    }
  });

  // Test actual parsing
  var result = getLeaveData(2026);
  var months = Object.keys(result);
  Logger.log("=== getLeaveData(2026) result ===");
  Logger.log("Months with data: " + JSON.stringify(months));
  months.forEach(function(m) {
    var days = Object.keys(result[m]);
    var totalEntries = days.reduce(function(a, d){ return a + result[m][d].length; }, 0);
    Logger.log("  Month " + (parseInt(m)+1) + ": " + days.length + " days, " + totalEntries + " entries");
  });
}

// ===== LEAVE DATA =====
function getLeaveData(year) {
  var ss = SpreadsheetApp.openById(SHEET_IDS.leave);
  var result = {}; // {monthIndex: {day: [{type, who}]}}
  
  // Sheet names for 2026: "1-4月/2026", "5-8月/2026", "9-12月/2026"
  var sheetNames = [];
  if (year === 2026) {
    sheetNames = ["1-4月/2026","5-8月/2026","9-12月/2026"];
  } else {
    sheetNames = ["1-4月/2025","5-8月/2025","9-12月/2025"];
  }
  
  sheetNames.forEach(function(sName) {
    var sheet = ss.getSheetByName(sName);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    parseCalendarSheet(data, result);
  });
  
  return result;
}

function parseCalendarSheet(data, result) {
  // Each sheet has TWO calendar sections stacked vertically (e.g. Jan+Feb on top, Mar+Apr below).
  // Each section: month-name row → weekday header → repeating [day-number row, entry rows…].
  // Entry rows: col 0 = leave type ("AL","補"…), calendar cols = staff names.
  var monthNames = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  var holidayRe = /勞動|新年|聖誕|中秋|端午|重陽|國慶|回歸|佛誕|復活|清明|假期|公眾/;

  // Scan ALL rows for month names (not just first 5)
  var allPositions = [];
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      var val = String(data[r][c]).trim();
      var mIdx = monthNames.indexOf(val);
      if (mIdx >= 0) {
        allPositions.push({startCol: c, monthIdx: mIdx, headerRow: r});
      }
    }
  }
  if (allPositions.length === 0) return;

  // Group by headerRow into sections
  var sections = {};
  allPositions.forEach(function(mp) {
    if (!sections[mp.headerRow]) sections[mp.headerRow] = [];
    sections[mp.headerRow].push(mp);
  });
  var sectionRows = Object.keys(sections).map(Number).sort(function(a,b){return a-b;});

  for (var si = 0; si < sectionRows.length; si++) {
    var hRow = sectionRows[si];
    var monthPositions = sections[hRow];
    var startRow = hRow + 2; // skip weekday header
    var endRow = (si + 1 < sectionRows.length) ? sectionRows[si + 1] : data.length;

    monthPositions.forEach(function(mp) {
      if (!result[mp.monthIdx]) result[mp.monthIdx] = {};
    });

    var dayMap = {};
    monthPositions.forEach(function(mp) { dayMap[mp.monthIdx] = {}; });

    for (var r = startRow; r < endRow; r++) {
      var row = data[r];
      if (!row || row.length === 0) continue;

      var isDayRow = false;
      monthPositions.forEach(function(mp) {
        var found = false;
        var newMap = {};
        for (var dc = 0; dc < 7; dc++) {
          var col = mp.startCol + dc;
          if (col >= row.length) continue;
          var v = row[col];
          if (typeof v === "number" && v >= 1 && v <= 31) {
            found = true;
            newMap[col] = v;
          }
        }
        if (found) {
          isDayRow = true;
          dayMap[mp.monthIdx] = newMap;
        }
      });
      if (isDayRow) continue;

      var col0 = String(row[0]).trim();
      if (!col0) continue;

      var leaveType = "";
      if (/AL/i.test(col0) || col0.indexOf("年假") >= 0) {
        leaveType = "al";
      } else if (col0.indexOf("補") >= 0) {
        if (/AM/i.test(col0) || col0.indexOf("上午") >= 0) leaveType = "comp-am";
        else if (/PM/i.test(col0) || col0.indexOf("下午") >= 0) leaveType = "comp-pm";
        else leaveType = "comp";
      } else if (/SL/i.test(col0) || col0.indexOf("病") >= 0) {
        leaveType = "sl";
      } else if (/NP/i.test(col0) || col0.indexOf("無薪") >= 0) {
        leaveType = "np";
      }
      if (!leaveType) continue;

      monthPositions.forEach(function(mp) {
        for (var dc = 0; dc < 7; dc++) {
          var col = mp.startCol + dc;
          if (col >= row.length) continue;
          var cell = String(row[col]).trim();
          if (!cell || cell === "0") continue;
          if (cell.indexOf("\n") >= 0 || holidayRe.test(cell)) continue;

          var day = dayMap[mp.monthIdx][col];
          if (!day) continue;

          if (!result[mp.monthIdx][day]) result[mp.monthIdx][day] = [];
          result[mp.monthIdx][day].push({type: leaveType, who: cell});
        }
      });
    }
  }
}
