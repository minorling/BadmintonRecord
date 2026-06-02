const SHEET_NAME = "Matches";
const HEADERS = [
  "Synced At",
  "Source",
  "Match ID",
  "Date",
  "Created At",
  "A Player 1",
  "A Player 2",
  "B Player 1",
  "B Player 2",
  "A Score",
  "B Score",
  "Winner",
  "A Player IDs",
  "B Player IDs",
  "Deleted At",
];

function doGet() {
  return json_({ ok: true, app: "Badminton Record Backup" });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");

  if (payload.type === "delete_match") {
    markDeleted_(payload);
    return json_({ ok: true });
  }

  if (payload.type !== "match") {
    return json_({ ok: false, error: "Unsupported payload type" });
  }

  upsertMatch_(payload);
  return json_({ ok: true });
}

function upsertMatch_(payload) {
  const sheet = getSheet_();
  const rowNumber = findMatchRow_(sheet, payload.matchId);
  const row = [
    new Date(),
    payload.source || "badminton-record",
    payload.matchId,
    payload.date,
    payload.createdAt,
    (payload.teamAPlayers || [])[0] || "",
    (payload.teamAPlayers || [])[1] || "",
    (payload.teamBPlayers || [])[0] || "",
    (payload.teamBPlayers || [])[1] || "",
    payload.scoreA,
    payload.scoreB,
    payload.winner,
    (payload.teamAIds || []).join(","),
    (payload.teamBIds || []).join(","),
    "",
  ];

  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
    return;
  }

  sheet.appendRow(row);
}

function markDeleted_(payload) {
  const sheet = getSheet_();
  const rowNumber = findMatchRow_(sheet, payload.matchId);
  if (!rowNumber) return;
  sheet.getRange(rowNumber, HEADERS.length).setValue(new Date());
}

function findMatchRow_(sheet, matchId) {
  if (!matchId || sheet.getLastRow() < 2) return null;

  const values = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues();
  const index = values.findIndex((row) => row[0] === matchId);
  return index === -1 ? null : index + 2;
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
