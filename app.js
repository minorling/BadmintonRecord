const STORAGE_KEY = "badminton-record:v1";
const STORAGE_VERSION = 2;
let selectedPeriod = "month";

const state = loadState();

const elements = {
  playerForm: document.querySelector("#playerForm"),
  playerNameInput: document.querySelector("#playerNameInput"),
  playerList: document.querySelector("#playerList"),
  playerCount: document.querySelector("#playerCount"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  dateInput: document.querySelector("#dateInput"),
  previousDayButton: document.querySelector("#previousDayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  todayButton: document.querySelector("#todayButton"),
  matchCount: document.querySelector("#matchCount"),
  matchForm: document.querySelector("#matchForm"),
  scoreA: document.querySelector("#scoreA"),
  scoreB: document.querySelector("#scoreB"),
  teamAPlayer1: document.querySelector("#teamAPlayer1"),
  teamAPlayer2: document.querySelector("#teamAPlayer2"),
  teamBPlayer1: document.querySelector("#teamBPlayer1"),
  teamBPlayer2: document.querySelector("#teamBPlayer2"),
  formMessage: document.querySelector("#formMessage"),
  matchList: document.querySelector("#matchList"),
  emptyMatches: document.querySelector("#emptyMatches"),
  standingsBody: document.querySelector("#standingsBody"),
  partnerList: document.querySelector("#partnerList"),
  periodLabel: document.querySelector("#periodLabel"),
  periodRankingsBody: document.querySelector("#periodRankingsBody"),
  emptyPeriodRankings: document.querySelector("#emptyPeriodRankings"),
  periodTableWrap: document.querySelector("#periodTableWrap"),
  exportButton: document.querySelector("#exportButton"),
  resetDayButton: document.querySelector("#resetDayButton"),
};

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPlayer(elements.playerNameInput.value);
});

elements.matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addMatch();
});

document.querySelectorAll("[data-score]").forEach((button) => {
  button.addEventListener("click", () => {
    const [scoreA, scoreB] = button.dataset.score.split("-");
    elements.scoreA.value = scoreA;
    elements.scoreB.value = scoreB;
  });
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

document.querySelectorAll("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedPeriod = button.dataset.period;
    renderPeriodRankings();
  });
});

elements.exportButton.addEventListener("click", exportCsv);

elements.resetDayButton.addEventListener("click", () => {
  if (!confirm(`確定要清空 ${state.selectedDate} 的球員與比賽紀錄嗎？`)) return;
  state.days[state.selectedDate] = createEmptyDay();
  saveState();
  render();
});

elements.dateInput.addEventListener("change", () => {
  selectDate(elements.dateInput.value);
});

elements.previousDayButton.addEventListener("click", () => {
  selectDate(shiftDate(state.selectedDate, -1));
});

elements.nextDayButton.addEventListener("click", () => {
  selectDate(shiftDate(state.selectedDate, 1));
});

elements.todayButton.addEventListener("click", () => {
  selectDate(getTodayKey());
});

render();
registerServiceWorker();

function loadState() {
  const today = getTodayKey();
  const fallback = { version: STORAGE_VERSION, selectedDate: today, days: { [today]: createEmptyDay() } };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return fallback;
    if (parsed.days && typeof parsed.days === "object") return normalizeState(parsed, today);
    if (parsed.date && (Array.isArray(parsed.players) || Array.isArray(parsed.matches))) {
      return normalizeState(
        {
          version: STORAGE_VERSION,
          selectedDate: parsed.date,
          days: {
            [parsed.date]: {
              players: Array.isArray(parsed.players) ? parsed.players : [],
              matches: Array.isArray(parsed.matches) ? parsed.matches : [],
            },
          },
        },
        today,
      );
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  state.version = STORAGE_VERSION;
  pruneEmptyDays();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pruneEmptyDays() {
  Object.entries(state.days).forEach(([date, day]) => {
    if (date === state.selectedDate) return;
    if (day.players.length === 0 && day.matches.length === 0) delete state.days[date];
  });
}

function normalizeState(parsed, today) {
  const days = {};

  Object.entries(parsed.days || {}).forEach(([date, day]) => {
    if (!isDateKey(date)) return;
    days[date] = {
      players: Array.isArray(day?.players) ? day.players : [],
      matches: Array.isArray(day?.matches) ? day.matches : [],
    };
  });

  if (!days[today]) days[today] = createEmptyDay();

  const selectedDate = isDateKey(parsed.selectedDate) ? parsed.selectedDate : today;
  if (!days[selectedDate]) days[selectedDate] = createEmptyDay();

  return { version: STORAGE_VERSION, selectedDate, days };
}

function createEmptyDay() {
  return { players: [], matches: [] };
}

function currentDay() {
  if (!state.days[state.selectedDate]) state.days[state.selectedDate] = createEmptyDay();
  return state.days[state.selectedDate];
}

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function shiftDate(dateKey, dayDiff) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + dayDiff);
  return date.toLocaleDateString("sv-SE");
}

function selectDate(dateKey) {
  if (!isDateKey(dateKey)) return;
  state.selectedDate = dateKey;
  if (!state.days[dateKey]) state.days[dateKey] = createEmptyDay();
  saveState();
  render();
}

function addPlayer(rawName) {
  const day = currentDay();
  const name = rawName.trim();
  if (!name) return;

  const exists = day.players.some((player) => player.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    elements.formMessage.textContent = `${name} 已經在當日球員裡`;
    return;
  }

  day.players.push({ id: crypto.randomUUID(), name });
  elements.playerNameInput.value = "";
  elements.formMessage.textContent = "";
  saveState();
  render();
}

function addMatch() {
  const day = currentDay();
  elements.formMessage.textContent = "";

  const teamA = [elements.teamAPlayer1.value, elements.teamAPlayer2.value];
  const teamB = [elements.teamBPlayer1.value, elements.teamBPlayer2.value];
  const scoreAValue = elements.scoreA.value.trim();
  const scoreBValue = elements.scoreB.value.trim();
  const scoreA = Number(scoreAValue);
  const scoreB = Number(scoreBValue);
  const selectedPlayers = [...teamA, ...teamB];
  const uniquePlayers = new Set(selectedPlayers);

  if (day.players.length < 4) {
    elements.formMessage.textContent = "至少要新增 4 位球員。";
    return;
  }

  if (selectedPlayers.some((id) => !id)) {
    elements.formMessage.textContent = "請選滿四位球員。";
    return;
  }

  if (uniquePlayers.size !== 4) {
    elements.formMessage.textContent = "同一場比賽不能重複選到同一位球員。";
    return;
  }

  if (!scoreAValue || !scoreBValue || !Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) {
    elements.formMessage.textContent = "請輸入兩隊分數。";
    return;
  }

  if (scoreA === scoreB) {
    elements.formMessage.textContent = "雙打比賽需要有勝負，分數不能相同。";
    return;
  }

  day.matches.push({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    teamA,
    teamB,
    scoreA,
    scoreB,
  });

  elements.scoreA.value = "";
  elements.scoreB.value = "";
  saveState();
  render();
  setActiveTab("matches");
}

function deleteMatch(matchId) {
  const day = currentDay();
  day.matches = day.matches.filter((match) => match.id !== matchId);
  saveState();
  render();
}

function render() {
  renderDateControls();
  renderHistory();
  renderPlayers();
  renderPlayerOptions();
  renderMatches();
  renderStandings();
  renderPartners();
  renderPeriodRankings();
  elements.matchCount.textContent = `第 ${currentDay().matches.length + 1} 場`;
}

function renderDateControls() {
  elements.dateInput.value = state.selectedDate;
}

function renderHistory() {
  const dates = Object.keys(state.days).sort((a, b) => b.localeCompare(a));
  elements.historyList.innerHTML = "";
  elements.historyCount.textContent = `${dates.length} 天`;

  dates.forEach((date) => {
    const day = state.days[date];
    const button = document.createElement("button");
    button.className = `history-day${date === state.selectedDate ? " active" : ""}`;
    button.type = "button";
    button.textContent = date;
    const meta = document.createElement("span");
    meta.textContent = `${day.matches.length} 場 / ${day.players.length} 人`;
    button.append(meta);
    button.addEventListener("click", () => selectDate(date));
    elements.historyList.append(button);
  });
}

function renderPlayers() {
  const day = currentDay();
  elements.playerList.innerHTML = "";
  elements.playerCount.textContent = `${day.players.length} 人`;

  day.players.forEach((player) => {
    const chip = document.createElement("button");
    chip.className = "player-chip";
    chip.type = "button";
    chip.textContent = player.name;
    chip.title = "點一下移除球員";
    chip.addEventListener("click", () => removePlayer(player.id));
    elements.playerList.append(chip);
  });
}

function removePlayer(playerId) {
  const day = currentDay();
  const isUsed = day.matches.some((match) => [...match.teamA, ...match.teamB].includes(playerId));
  if (isUsed) {
    alert("這位球員已經有比賽紀錄，先保留比較不會讓戰績缺資料。");
    return;
  }

  day.players = day.players.filter((player) => player.id !== playerId);
  saveState();
  render();
}

function renderPlayerOptions() {
  const day = currentDay();
  const selects = [
    elements.teamAPlayer1,
    elements.teamAPlayer2,
    elements.teamBPlayer1,
    elements.teamBPlayer2,
  ];
  const currentValues = new Map(selects.map((select) => [select.id, select.value]));

  selects.forEach((select) => {
    select.innerHTML = "";
    select.append(new Option("選擇球員", ""));
    day.players.forEach((player) => {
      select.append(new Option(player.name, player.id));
    });
    select.value = currentValues.get(select.id) || "";
  });
}

function renderMatches() {
  const day = currentDay();
  elements.matchList.innerHTML = "";
  elements.emptyMatches.hidden = day.matches.length > 0;

  [...day.matches].reverse().forEach((match, index, reversedMatches) => {
    const matchNumber = reversedMatches.length - index;
    const teamAWins = match.scoreA > match.scoreB;
    const item = document.createElement("li");
    item.className = "match-item";
    item.innerHTML = `
      <div class="match-main">
        <div class="match-team ${teamAWins ? "winner" : ""}">${escapeHtml(teamName(match.teamA))}</div>
        <div class="score">${match.scoreA}:${match.scoreB}</div>
        <div class="match-team right ${teamAWins ? "" : "winner"}">${escapeHtml(teamName(match.teamB))}</div>
      </div>
      <div class="match-actions">
        <span>第 ${matchNumber} 場</span>
        <button class="delete-match" type="button">刪除</button>
      </div>
    `;
    item.querySelector(".delete-match").addEventListener("click", () => deleteMatch(match.id));
    elements.matchList.append(item);
  });
}

function renderStandings() {
  const standings = getStandings();
  elements.standingsBody.innerHTML = "";

  standings.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.name)}</td>
      <td>${row.played}</td>
      <td>${row.wins}</td>
      <td>${row.losses}</td>
      <td>${formatRate(row.wins, row.played)}</td>
      <td>${formatDiff(row.pointsFor - row.pointsAgainst)}</td>
    `;
    elements.standingsBody.append(tr);
  });
}

function renderPartners() {
  const partners = getPartnerStats();
  elements.partnerList.innerHTML = "";

  if (partners.length === 0) {
    elements.partnerList.innerHTML = `<div class="empty-state">還沒有搭檔紀錄。</div>`;
    return;
  }

  partners.forEach((partner) => {
    const card = document.createElement("div");
    card.className = "partner-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(partner.names.join(" / "))}</strong>
        <span>${partner.played} 場，${partner.wins} 勝 ${partner.losses} 敗，分差 ${formatDiff(partner.diff)}</span>
      </div>
      <div class="partner-rate">${formatRate(partner.wins, partner.played)}</div>
    `;
    elements.partnerList.append(card);
  });
}

function renderPeriodRankings() {
  const rankings = getPeriodRankings(selectedPeriod);
  elements.periodRankingsBody.innerHTML = "";
  elements.periodLabel.textContent = formatPeriodLabel(selectedPeriod);
  elements.emptyPeriodRankings.hidden = rankings.length > 0;
  elements.periodTableWrap.hidden = rankings.length === 0;

  document.querySelectorAll("[data-period]").forEach((button) => {
    button.classList.toggle("active", button.dataset.period === selectedPeriod);
  });

  rankings.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.played}</td>
      <td>${row.wins}</td>
      <td>${row.losses}</td>
      <td>${formatRate(row.wins, row.played)}</td>
      <td>${formatDiff(row.pointsFor - row.pointsAgainst)}</td>
    `;
    elements.periodRankingsBody.append(tr);
  });
}

function getStandings() {
  const day = currentDay();
  const rows = new Map(
    day.players.map((player) => [
      player.id,
      {
        id: player.id,
        name: player.name,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );

  day.matches.forEach((match) => {
    applyTeamResult(rows, match.teamA, match.scoreA, match.scoreB);
    applyTeamResult(rows, match.teamB, match.scoreB, match.scoreA);
  });

  return [...rows.values()].sort((a, b) => {
    const rateDiff = b.wins / Math.max(b.played, 1) - a.wins / Math.max(a.played, 1);
    if (rateDiff !== 0) return rateDiff;
    return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
  });
}

function applyTeamResult(rows, team, pointsFor, pointsAgainst) {
  team.forEach((playerId) => {
    const row = rows.get(playerId);
    if (!row) return;
    row.played += 1;
    row.pointsFor += pointsFor;
    row.pointsAgainst += pointsAgainst;
    if (pointsFor > pointsAgainst) row.wins += 1;
    else row.losses += 1;
  });
}

function getPeriodRankings(period) {
  const rows = new Map();
  const dates = getDatesForPeriod(period);

  dates.forEach((date) => {
    const day = state.days[date];
    day.matches.forEach((match) => {
      applyNamedTeamResult(rows, day, match.teamA, match.scoreA, match.scoreB);
      applyNamedTeamResult(rows, day, match.teamB, match.scoreB, match.scoreA);
    });
  });

  return [...rows.values()].sort(sortRankingRows);
}

function applyNamedTeamResult(rows, day, team, pointsFor, pointsAgainst) {
  team.forEach((playerId) => {
    const name = playerNameFromDay(day, playerId);
    const key = name.trim().toLowerCase();
    if (!key || name === "未知球員") return;

    const row =
      rows.get(key) ||
      {
        name,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };

    row.played += 1;
    row.pointsFor += pointsFor;
    row.pointsAgainst += pointsAgainst;
    if (pointsFor > pointsAgainst) row.wins += 1;
    else row.losses += 1;
    rows.set(key, row);
  });
}

function sortRankingRows(a, b) {
  const rateDiff = b.wins / Math.max(b.played, 1) - a.wins / Math.max(a.played, 1);
  if (rateDiff !== 0) return rateDiff;

  const diffA = a.pointsFor - a.pointsAgainst;
  const diffB = b.pointsFor - b.pointsAgainst;
  if (diffB !== diffA) return diffB - diffA;

  if (b.wins !== a.wins) return b.wins - a.wins;
  return a.name.localeCompare(b.name, "zh-Hant");
}

function getDatesForPeriod(period) {
  return Object.keys(state.days)
    .filter((date) => dateMatchesPeriod(date, period))
    .sort((a, b) => a.localeCompare(b));
}

function dateMatchesPeriod(dateKey, period) {
  const selected = parseDateKey(state.selectedDate);
  const date = parseDateKey(dateKey);
  if (!selected || !date) return false;
  if (date.year !== selected.year) return false;

  if (period === "year") return true;
  if (period === "quarter") return getQuarter(date.month) === getQuarter(selected.month);
  return date.month === selected.month;
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getQuarter(month) {
  return Math.ceil(month / 3);
}

function formatPeriodLabel(period) {
  const selected = parseDateKey(state.selectedDate);
  if (!selected) return "";
  if (period === "year") return `${selected.year} 年度`;
  if (period === "quarter") return `${selected.year} 年 Q${getQuarter(selected.month)}`;
  return `${selected.year} 年 ${selected.month} 月`;
}

function getPartnerStats() {
  const day = currentDay();
  const partners = new Map();

  day.matches.forEach((match) => {
    addPartnerResult(partners, match.teamA, match.scoreA, match.scoreB);
    addPartnerResult(partners, match.teamB, match.scoreB, match.scoreA);
  });

  return [...partners.values()].sort((a, b) => {
    const rateDiff = b.wins / b.played - a.wins / a.played;
    if (rateDiff !== 0) return rateDiff;
    return b.diff - a.diff;
  });
}

function addPartnerResult(partners, team, pointsFor, pointsAgainst) {
  const sortedIds = [...team].sort();
  const key = sortedIds.join("+");
  const current = partners.get(key) || {
    ids: sortedIds,
    names: sortedIds.map(playerName),
    played: 0,
    wins: 0,
    losses: 0,
    diff: 0,
  };

  current.played += 1;
  current.diff += pointsFor - pointsAgainst;
  if (pointsFor > pointsAgainst) current.wins += 1;
  else current.losses += 1;
  partners.set(key, current);
}

function teamName(team) {
  return team.map(playerName).join(" / ");
}

function playerName(playerId) {
  return currentDay().players.find((player) => player.id === playerId)?.name || "未知球員";
}

function playerNameFromDay(day, playerId) {
  return day.players.find((player) => player.id === playerId)?.name || "未知球員";
}

function formatRate(wins, played) {
  if (!played) return "0%";
  return `${Math.round((wins / played) * 100)}%`;
}

function formatDiff(diff) {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

function setActiveTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

function exportCsv() {
  const day = currentDay();
  if (day.matches.length === 0) {
    alert("目前沒有比賽可以匯出。");
    return;
  }

  const rows = [
    ["日期", "場次", "A隊球員1", "A隊球員2", "A隊分數", "B隊分數", "B隊球員1", "B隊球員2", "勝方"],
    ...day.matches.map((match, index) => [
      state.selectedDate,
      index + 1,
      playerName(match.teamA[0]),
      playerName(match.teamA[1]),
      match.scoreA,
      match.scoreB,
      playerName(match.teamB[0]),
      playerName(match.teamB[1]),
      match.scoreA > match.scoreB ? "A隊" : "B隊",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `badminton-${state.selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
