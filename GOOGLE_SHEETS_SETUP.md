# Google Sheets 備份設定

## 1. 建立 Google Sheet

建立一份新的 Google Sheet，例如命名為 `Badminton Record Backup`。

## 2. 建立 Apps Script

在 Google Sheet 裡選：

`Extensions` -> `Apps Script`

把本專案的 `google-apps-script.gs` 內容放進 Apps Script 編輯器，取代原本的 `Code.gs`。

## 3. 部署 Web App

在 Apps Script 編輯器右上角選：

`Deploy` -> `New deployment`

設定：

```text
Type: Web app
Execute as: Me
Who has access: Anyone
```

第一次部署時 Google 會要求授權，允許這個 Apps Script 寫入你的試算表。

部署完成後，複製 Web app URL，網址通常會以 `/exec` 結尾。

## 4. 在羽球記分 App 裡設定

羽球記分 App 目前已固定使用這個 Web app URL，欄位不可修改：

```text
https://script.google.com/macros/s/AKfycbwak1uerNqCRIBpmT6OKqik2JXI3G-pCcoJAlNEZ_x-ExZqHaJaP6zmWEU2iHDjFum-3g/exec
```

每次打開網頁後，App 會自動從 Google Sheets 載入資料。

之後每次新增比賽會自動送到 Google Sheet。如果網路失敗或還沒設定 URL，資料仍會留在手機，可以之後按 `同步全部` 補送。

如果換手機、Safari 資料被清掉，App 開啟時會自動載入。也可以手動按 `從 Sheets 載入`。

`檢查 Sheets` 可以用來排查同步狀態。它會顯示 Google Sheet 目前共有幾列，以及有幾場可載入。

如果之前用舊版 App 顯示已備份，但 Google Sheet 裡沒有資料，請在原本有本機紀錄的手機上按 `同步全部`。新版 `同步全部` 會重新送出所有本機比賽，而不是只送待同步紀錄。

## 5. 更新 Apps Script 時

如果之後修改 `google-apps-script.gs`，需要到 Apps Script：

`Deploy` -> `Manage deployments` -> 編輯部署 -> 選 `New version` -> `Deploy`

同一個 Web app URL 可以沿用。

這一步很重要：只修改 Apps Script 程式碼但沒有部署新版本時，手機 App 還是會連到舊版程式。

## 6. 排查同步問題

如果另一台裝置按 `從 Sheets 載入` 顯示 0 場：

1. 先打開 Google Sheet，看 `Matches` 工作表是否真的有比賽列。
2. 在 App 按 `檢查 Sheets`，確認 `可載入` 的場數是否大於 0。
3. 如果 Google Sheet 沒資料，回到有本機紀錄的手機，按 `同步全部`。
4. 如果 Google Sheet 有資料但 App 顯示 0，通常是 Apps Script 沒有部署新版，請重新執行 `New version` -> `Deploy`。
