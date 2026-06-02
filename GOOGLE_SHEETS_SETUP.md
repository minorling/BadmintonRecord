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

打開羽球記分 App，在 `Google Sheets 備份` 區塊貼上 Web app URL，按 `儲存`。

之後每次新增比賽會自動送到 Google Sheet。如果網路失敗或還沒設定 URL，資料仍會留在手機，可以之後按 `同步全部` 補送。

如果換手機、Safari 資料被清掉，或想把 Google Sheet 裡的舊資料拉回 App，按 `從 Sheets 載入`。

## 5. 更新 Apps Script 時

如果之後修改 `google-apps-script.gs`，需要到 Apps Script：

`Deploy` -> `Manage deployments` -> 編輯部署 -> 選 `New version` -> `Deploy`

同一個 Web app URL 可以沿用。

這一步很重要：只修改 Apps Script 程式碼但沒有部署新版本時，手機 App 還是會連到舊版程式。
