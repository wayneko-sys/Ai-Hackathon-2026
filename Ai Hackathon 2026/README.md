# LifeDB 數據分析報告系統

## 項目背景

安老院舍銷售團隊每日需要跟進大量落訂個案，缺乏即時數據可視化工具，難以掌握團隊表現、個案來源趨勢及落訂預測。

本系統為 **AI Hackathon 2026** 參賽作品，參賽日期：4月17日–18日。

---

## 系統功能

### 🔐 角色權限登入系統
- 6 種角色：管理員、經理、隊長、組員、財務、HR
- 3 隊架構（Michael隊 / Suki隊 / Charly隊），各隊設隊長
- 角色決定可見頁面及數據範圍
- 院費數據僅管理員、經理、財務可見
- 隊長只可見自己隊嘅員工數據
- 支援多組密碼：`lifedb2026`、`admin`、`demo`、`7777`

### 🔒 角色權限矩陣

| 功能 | 管理員 | 經理 | 隊長 | 組員 | 財務 | HR |
|------|:------:|:----:|:----:|:----:|:----:|:--:|
| 總覽 Dashboard | ✅ | ✅ | ✅ 自己隊 | ✅ 個人 | ✅ | ✅ |
| 每月數據 | ✅ | ✅ | ✅ 自己隊 | ✅ 個人 | ❌ | ❌ |
| 來源分析 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 員工表現 | ✅ | ✅ | ✅ 自己隊 | ❌ | ❌ | ❌ |
| 團隊分析 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 院舍及院費 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 假期日曆 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 報告 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 院費數據 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

### 🏠 總覽 Dashboard
- 本月即時 Pulse Card：月份進度條、日均落訂、全月預測、剩餘工作日、今日請假、💪 團隊健康指數（0-100）
- ⚡ 預警系統：自動識別低表現員工、高不入住率、來源下跌
- 🔔 通知中心：sidebar 鈴鐺 + 紅色未讀 badge
- **排版（由上至下）：**
  1. KPI 卡片（總落訂、總院費、平均院費、平均不入住天數）
  2. 📈 落訂個案趨勢 Case Trend（全寬）
  3. 🏆 Top 10 員工 & 🚫 不入住率（兩個一排）
  4. 📂 開檔落訂率 & 💵 費用趨勢（兩個一排）

### 📅 每月數據 Monthly Data
- Sticky 選擇器 + 對比模式（任意兩月並排）
- 員工摘要表（按目標% 排序、狀態提示：🌟優秀 / ✅達標 / 👀留意 / ⚠️跟進 / 🔴緊急）

### 📡 來源分析 Source Analysis
- 年份 + 月份篩選 + 自動對比 + 升跌 KPI
- 🔄 轉化漏斗：開檔 → 落訂 → 入住
- 來源明細表（含變化欄）

### 👥 員工表現 Staff Performance
- 年份 + 月份篩選，Top 15 排名（可點擊）
- LV 進度（LV1 至 MAX）、Sparkline 迷你圖

### 👥 團隊分析 Team Analysis
- 3 隊 KPI 卡片、月度趨勢、Radar Chart
- 各隊成員排名表（👑 隊長標記）

### 💰 院舍及院費
- 月份篩選、員工費用排名、院舍排序
- 院舍詳情 Modal + 一鍵複製報告

### 🗓️ 假期日曆 Calendar
- 月份下拉、今日高亮、假期申請系統（組員/隊長）

### 📝 報告 Report
- 自訂日期範圍、報告文字生成器、一鍵複製
- 📊 PPT 生成（7 頁）
- 🤖 智能分析建議 + 📅 Google Calendar 整合

---

## 員工詳情 Modal
- 月份篩選 + 一鍵複製報告 + 📅 約見按鈕（自動生成 Google Calendar 行程）
- 🏅 成就 badge：🏆目標達成 / 👑MVP / ⭐Top 5 / 📈進步顯著

---

## 技術規格

| 項目 | 詳情 |
|------|------|
| 架構 | 單一 HTML + Google Apps Script 後端 |
| 圖表 | Chart.js 4.4.0 |
| PPT | PptxGenJS 3.12.0 |
| 數據載入 | 三階段載入（Summary → Fast → Monthly），Cache 30分鐘 |
| Cache 預熱 | Time-based Trigger 每 30 分鐘自動執行 `warmCache()` |
| 權限 | 6 種角色、頁面級 + 數據級控制 |
| 整合 | Google Calendar 約見 + 智能建議日曆 |
| PWA | manifest.json + Service Worker（離線快取）|
| 暗黑模式 | CSS variables + toggle |

---

## 快速開始

### Demo 版本（假數據）
1. 瀏覽器打開 `dashboard.html`
2. 選擇角色 → 輸入密碼（`demo` / `admin` / `lifedb2026` / `7777`）→ 登入

### 連接真實數據（Google Apps Script）
1. 在 Google Apps Script 新增專案
2. 貼入 `Code.gs`，新增 HTML 檔案貼入 `dashboard.html`
3. 部署為 Web App（執行身份：我、存取權限：知道連結的任何人）
4. 設定 Time-based Trigger：每 30 分鐘執行 `warmCache()`（確保秒開）

---

## 項目結構

```
├── dashboard.html      # 主應用（單一 HTML 檔案）
├── Code.gs             # Google Apps Script 後端
├── manifest.json       # PWA 設定
├── sw.js               # Service Worker
├── icons/              # PWA 圖示
├── test-data.js        # 本地測試假數據
├── README.md           # 項目說明
└── ABOUT.md            # 詳細功能文檔
```

