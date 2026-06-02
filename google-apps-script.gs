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

function doGet(e) {
  e = e || { parameter: {} };

  if (e.parameter.action === "save") {
    const payload = parsePayload_(e.parameter.payload);
    if (payload.type !== "match") return respond_(e, { ok: false, error: "Unsupported payload type" });
    upsertMatch_(payload);
    return respond_(e, { ok: true, status: getStatus_() });
  }

  if (e.parameter.action === "delete") {
    const payload = parsePayload_(e.parameter.payload);
    markDeleted_(payload);
    return respond_(e, { ok: true, status: getStatus_() });
  }

  if (e.parameter.action === "list") {
    return respond_(e, { ok: true, matches: listMatches_(), status: getStatus_() });
  }

  if (e.parameter.action === "status") {
    return respond_(e, { ok: true, status: getStatus_() });
  }

  return respond_(e, { ok: true, app: "Badminton Record Backup", status: getStatus_() });
}

function doPost(e) {
  const payload = parsePayload_(e.postData.contents);

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

function getStatus_() {
  const sheet = getSheet_();
  const rowCount = Math.max(sheet.getLastRow() - 1, 0);
  return {
    sheetName: sheet.getName(),
    rowCount,
    activeMatchCount: listMatches_().length,
    lastRow: sheet.getLastRow(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function listMatches_() {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length)
    .getValues()
    .filter((row) => !row[14])
    .map((row) => ({
      matchId: row[2],
      date: formatDateKey_(row[3]),
      createdAt: formatDateTime_(row[4]),
      teamAPlayers: [row[5], row[6]],
      teamBPlayers: [row[7], row[8]],
      scoreA: Number(row[9]),
      scoreB: Number(row[10]),
      winner: row[11],
      teamAIds: splitIds_(row[12]),
      teamBIds: splitIds_(row[13]),
    }))
    .filter((match) => match.matchId && match.date);
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

function javascript_(source) {
  return ContentService.createTextOutput(source).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function respond_(e, value) {
  if (e.parameter.callback) {
    return javascript_(`${e.parameter.callback}(${JSON.stringify(value)});`);
  }
  return json_(value);
}

function parsePayload_(value) {
  return JSON.parse(value || "{}");
}

function splitIds_(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function formatDateKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value || "");
}

function formatDateTime_(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value || "");
}
