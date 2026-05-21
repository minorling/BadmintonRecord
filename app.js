const STORAGE_KEY = "badminton-record:v1";

const state = loadState();

const elements = {
  playerForm: document.querySelector("#playerForm"),
  playerNameInput: document.querySelector("#playerNameInput"),
  playerList: document.querySelector("#playerList"),
  playerCount: document.querySelector("#playerCount"),
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
  exportButton: document.querySelector("#exportButton"),
  resetTodayButton: document.querySelector("#resetTodayButton"),
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

elements.exportButton.addEventListener("click", exportCsv);

elements.resetTodayButton.addEventListener("click", () => {
  if (!confirm("確定要清空今日球員與比賽紀錄嗎？")) return;
  state.players = [];
  state.matches = [];
  saveState();
  render();
});

render();
registerServiceWorker();

function loadState() {
  const today = getTodayKey();
  const fallback = { date: today, players: [], matches: [] };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.date !== today) return fallback;
    return {
      date: today,
      players: Array.isArray(parsed.players) ? parsed.players : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function addPlayer(rawName) {
  const name = rawName.trim();
  if (!name) return;

  const exists = state.players.some((player) => player.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    elements.formMessage.textContent = `${name} 已經在今日球員裡`;
    return;
  }

  state.players.push({ id: crypto.randomUUID(), name });
  elements.playerNameInput.value = "";
  elements.formMessage.textContent = "";
  saveState();
  render();
}

function addMatch() {
  elements.formMessage.textContent = "";

  const teamA = [elements.teamAPlayer1.value, elements.teamAPlayer2.value];
  const teamB = [elements.teamBPlayer1.value, elements.teamBPlayer2.value];
  const scoreAValue = elements.scoreA.value.trim();
  const scoreBValue = elements.scoreB.value.trim();
  const scoreA = Number(scoreAValue);
  const scoreB = Number(scoreBValue);
  const selectedPlayers = [...teamA, ...teamB];
  const uniquePlayers = new Set(selectedPlayers);

  if (state.players.length < 4) {
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

  state.matches.push({
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
  state.matches = state.matches.filter((match) => match.id !== matchId);
  saveState();
  render();
}

function render() {
  renderPlayers();
  renderPlayerOptions();
  renderMatches();
  renderStandings();
  renderPartners();
  elements.matchCount.textContent = `第 ${state.matches.length + 1} 場`;
}

function renderPlayers() {
  elements.playerList.innerHTML = "";
  elements.playerCount.textContent = `${state.players.length} 人`;

  state.players.forEach((player) => {
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
  const isUsed = state.matches.some((match) => [...match.teamA, ...match.teamB].includes(playerId));
  if (isUsed) {
    alert("這位球員已經有比賽紀錄，先保留比較不會讓戰績缺資料。");
    return;
  }

  state.players = state.players.filter((player) => player.id !== playerId);
  saveState();
  render();
}

function renderPlayerOptions() {
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
    state.players.forEach((player) => {
      select.append(new Option(player.name, player.id));
    });
    select.value = currentValues.get(select.id) || "";
  });
}

function renderMatches() {
  elements.matchList.innerHTML = "";
  elements.emptyMatches.hidden = state.matches.length > 0;

  [...state.matches].reverse().forEach((match, index, reversedMatches) => {
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

function getStandings() {
  const rows = new Map(
    state.players.map((player) => [
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

  state.matches.forEach((match) => {
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

function getPartnerStats() {
  const partners = new Map();

  state.matches.forEach((match) => {
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
  return state.players.find((player) => player.id === playerId)?.name || "未知球員";
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
  if (state.matches.length === 0) {
    alert("目前沒有比賽可以匯出。");
    return;
  }

  const rows = [
    ["日期", "場次", "A隊球員1", "A隊球員2", "A隊分數", "B隊分數", "B隊球員1", "B隊球員2", "勝方"],
    ...state.matches.map((match, index) => [
      state.date,
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
  link.download = `badminton-${state.date}.csv`;
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
