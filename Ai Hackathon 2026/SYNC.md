# 本地 ↔ Apps Script 同步 Checklist

呢個 repo 嘅 `Code.gs` **唔會自動推上** Google Apps Script。改完之後要手動 copy-paste，否則 deployed Web App 仲行緊舊 code。

---

## 何時要同步

✅ 改咗 `Code.gs`（後端邏輯、cache、staff config、trigger 等）
❌ 只改 `dashboard.html` / `README.md` / `ABOUT.md`（前端＋文檔，唔影響 Apps Script）

---

## 同步步驟（每次改完 Code.gs）

1. **本地：copy 最新 Code.gs**
   - VS Code 開 `C:\Users\User\projects\Ai Hackathon 2026\Code.gs`
   - `Ctrl+A` → `Ctrl+C`

2. **遠端：paste 入 Apps Script**
   - 開 [script.google.com](https://script.google.com)，揀 LifeDB 專案
   - 左邊揀 `Code.gs`
   - `Ctrl+A` → `Ctrl+V`
   - `Ctrl+S` 儲存

3. **驗證** — Function 下拉揀 `listTriggers` → ▶ Run → `Ctrl+Enter` 開 Logs

---

## Trigger Setup（首次部署或重置）

只需做一次。如果 `listTriggers` 顯示冇 `warmCache` handler：

1. Function 下拉揀 `setupWarmCacheTrigger` → ▶ Run
2. 首次 run 會彈權限授權 → 用 `@lifedb.hk` 帳號授權
3. Logs 顯示 `created 1 new (every 30 min)`
4. 左邊 🕓 Triggers panel 確認多咗一行：handler=warmCache, 每 30 分鐘

⚠️ Cache TTL 係 1800s（30 分鐘），trigger 必須 match 呢個間隔，唔好改其他值。

---

## 常見坑

- **改完本地冇推上**：dashboard 行緊舊 code，新功能唔會生效。Build flag、新 sheet ID、新 cache key 全部要記得 sync。
- **OAuth 授權失敗**：`lifedb.hk` Workspace 可能 block 第三方 app。Trigger setup 用嘅係官方 Apps Script API，正常情況下唔需要額外授權。
- **Trigger 重複**：`setupWarmCacheTrigger` 已內建去重邏輯（會先刪除所有 `warmCache` handler 嘅 trigger），re-run 安全。
- **Cache 唔 update**：跑 `warmCache` 手動強制刷新（佢會清三條 cache key 再 refetch）。

---

## 相關 Function 快速參考

| Function | 用途 | 何時跑 |
|---------|------|--------|
| `setupWarmCacheTrigger` | 建立 30 分鐘 trigger | 首次部署 / trigger 被刪 |
| `listTriggers` | 列出所有 trigger | 驗證用 |
| `warmCache` | 手動清 cache + 預熱 | 數據過舊、debug |
| `debugSummary` | print Sheet headers + 5 row | Sheet schema 改咗 |
| `debugGetSummaryData` | print summary26 內容 | dashboard 顯示有錯 |
