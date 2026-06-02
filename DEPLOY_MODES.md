# 部署模式設定

這個專案支援兩種模式：

```text
edit: 管理版，可以新增球員、輸入比賽、同步寫入 Google Sheets
view: 觀看版，只會自動從 Google Sheets 載入資料，不能新增、刪除、同步寫入
```

預設的 `config.js` 是管理版：

```js
window.BADMINTON_RECORD_CONFIG = {
  mode: "edit",
};
```

## 做法 A：Cloudflare Pages 環境變數

你可以用同一個 GitHub repo 建兩個 Cloudflare Pages 專案：

```text
badminton-record-admin
badminton-record-view
```

管理版專案：

```text
APP_MODE=edit
```

觀看版專案：

```text
APP_MODE=view
```

Cloudflare Pages 的 Build command 設成：

```bash
printf 'window.BADMINTON_RECORD_CONFIG = { mode: "%s" };\n' "${APP_MODE:-edit}" > config.js
```

Build output directory 維持：

```text
.
```

這樣兩個 Pages 專案可以吃同一個 branch，但產生不同模式。

## 做法 B：固定檔案

如果你不想用環境變數，也可以直接改 `config.js`：

管理版：

```js
window.BADMINTON_RECORD_CONFIG = {
  mode: "edit",
};
```

觀看版：

```js
window.BADMINTON_RECORD_CONFIG = {
  mode: "view",
};
```

這個做法通常需要不同 branch，例如：

```text
test    -> edit
viewer  -> view
```

## 注意

view mode 是前端介面限制，不是真正權限控管。因為 Apps Script Web App URL 是公開在前端程式裡，懂技術的人仍可能直接呼叫 Apps Script。若要真正權限控管，需要改成登入、token、或後端服務。
