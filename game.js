// ── Game Switcher ──────────────────────────────────
const btnSwitchSnake = document.getElementById('switch-snake');
const btnSwitchTTT = document.getElementById('switch-ttt');
const snakeApp = document.getElementById('snake-app');
const tttApp = document.getElementById('ttt-app');

btnSwitchSnake.addEventListener('click', () => {
  btnSwitchSnake.classList.add('active');
  btnSwitchTTT.classList.remove('active');
  snakeApp.classList.remove('hidden');
  tttApp.classList.add('hidden');
});

btnSwitchTTT.addEventListener('click', () => {
  btnSwitchTTT.classList.add('active');
  btnSwitchSnake.classList.remove('active');
  tttApp.classList.remove('hidden');
  snakeApp.classList.add('hidden');
});

// ── Constants & Variables ──────────────────────────
const GRID_SIZE = 20;
const CELL_PX   = 25;
const CANVAS_PX = GRID_SIZE * CELL_PX;
const SPEED_STEP  = 2;

let BASE_SPEED = 130;
let SPEED_FLOOR = 60;
const LEADERBOARD_TABLE = 'snake_scores';
const SUPABASE_URL = (window.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || '').trim();
const NAME_KEY_P1 = 'snake-player1-name';
const NAME_KEY_P2 = 'snake-player2-name';
const NAME_DEFAULT_P1 = 'Player 1';
const NAME_DEFAULT_P2 = 'Player 2';
const LEADERBOARD_RESET_VERSION = 'snake-lb-reset-v1';
const BANNED_NAME_PATTERNS = [
  /nigg/i, /fag/i, /retard/i, /cunt/i, /kike/i, /spic/i, /chink/i, /paki/i, /gook/i,
  /fuck/i, /shit/i, /bitch/i, /asshole/i, /bastard/i, /whore/i, /slut/i, /dick/i, /pussy/i, /cock/i,
  /rape/i, /rapist/i, /molest/i, /pedo/i,
  /hitler/i, /nazi/i, /kkk/i, /terror/i
];

// ── DOM refs ───────────────────────────────────────
const canvas       = document.getElementById('game-canvas');
const ctx          = canvas.getContext('2d');
const canvas2      = document.getElementById('game-canvas-2');
const ctx2         = canvas2.getContext('2d');
const canvasWrapper2 = document.getElementById('canvas-wrapper-2');

const overlay      = document.getElementById('overlay');
const startScreen  = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen  = document.getElementById('pause-screen');
const scoreEl      = document.getElementById('score');
const score2El     = document.getElementById('score2');
const highScoreEl  = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score-text');
const newBestEl    = document.getElementById('new-best');
const startBtn     = document.getElementById('start-btn');
const restartBtn   = document.getElementById('restart-btn');
const scoreBox     = document.getElementById('current-score-box');
const p2ScoreBox   = document.getElementById('p2-score-box');
const playerNameInput = document.getElementById('player-name-input');
const player2NameInput = document.getElementById('player2-name-input');
const p2SetupBox   = document.getElementById('p2-setup-box');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardStatusEl = document.getElementById('leaderboard-status');
const nameValidationEl = document.getElementById('name-validation-msg');
const winnerContainer = document.getElementById('winner-announcement-container');
const wallsToggle    = document.getElementById('walls-toggle');
const invisiwallToggle = document.getElementById('invisiwall-toggle');
const h2hContainer   = document.getElementById('head2head-container');
const h2hToggle      = document.getElementById('head2head-toggle');

canvas.width  = CANVAS_PX; canvas.height = CANVAS_PX;
canvas2.width = CANVAS_PX; canvas2.height = CANVAS_PX;

// ── State ──────────────────────────────────────────
let snake1, dir1, nextDir1, score1, p1Dead;
let snake2, dir2, nextDir2, score2, p2Dead;
let walls = [];

let apple1, goldenApple1 = null, goldenAppleTimeout1 = null, applesEaten1 = 0;
let apple2, goldenApple2 = null, goldenAppleTimeout2 = null, applesEaten2 = 0;

let speed, loopId, gameState;
let currentPlayer1 = "Player 1";
let currentPlayer2 = "Player 2";
let p1SelectedColor = 'green';
let p2SelectedColor = 'purple';
let multiMode = 'none'; // 'none', 'shared', 'split'
let selectedSpeed = 'normal'; // 'slow', 'normal', 'fast', 'insane'

let particles1 = [];
let particles2 = [];

let leaderboardEntries = [];
let leaderboard = [];
let highScore = parseInt(localStorage.getItem('snake-hi') || '0', 10);
highScoreEl.textContent = highScore;
let supabaseClient = null;

function detectHardwareMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function getCurrentDeviceType() {
  return detectHardwareMobile() ? 'Mobile' : 'Laptop';
}

// ── Custom Dropdowns ───────────────────────────────
function setupDropdown(dropdownId, textElementId, onChangeCallback) {
  const dropdown = document.getElementById(dropdownId);
  const selectedText = document.getElementById(textElementId);
  const items = dropdown.querySelectorAll('.dropdown-item');

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  items.forEach(item => {
    item.addEventListener('click', (e) => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const val = item.getAttribute('data-value');
      
      // Keep prefix if there is one (e.g. "Speed: ")
      const prefix = textElementId === 'speed-selected-text' ? "Speed: " : "";
      selectedText.textContent = prefix + item.textContent;
      
      onChangeCallback(val);
    });
  });

  document.addEventListener('click', () => { dropdown.classList.remove('open'); });
}

setupDropdown('mode-dropdown', 'mode-selected-text', (mode) => {
  if (mode === 'none') {
    p2SetupBox.classList.add('hidden');
    p2ScoreBox.classList.add('hidden');
    canvasWrapper2.classList.add('hidden');
    if (h2hContainer) h2hContainer.classList.add('hidden');
  } else if (mode === 'shared') {
    p2SetupBox.classList.remove('hidden');
    p2ScoreBox.classList.remove('hidden');
    canvasWrapper2.classList.add('hidden');
    if (h2hContainer) h2hContainer.classList.remove('hidden');
  } else if (mode === 'split') {
    p2SetupBox.classList.remove('hidden');
    p2ScoreBox.classList.remove('hidden');
    canvasWrapper2.classList.remove('hidden');
    if (h2hContainer) h2hContainer.classList.add('hidden');
  }
  multiMode = mode;
  // Let updateColorUI exist
  if (window.updateColorUI) window.updateColorUI();
  void refreshLeaderboard();
});

setupDropdown('speed-dropdown', 'speed-selected-text', (speedVal) => {
  selectedSpeed = speedVal;
  if (speedVal === 'slow') { BASE_SPEED = 180; SPEED_FLOOR = 90; }
  else if (speedVal === 'normal') { BASE_SPEED = 130; SPEED_FLOOR = 60; }
  else if (speedVal === 'fast') { BASE_SPEED = 90; SPEED_FLOOR = 40; }
  else if (speedVal === 'insane') { BASE_SPEED = 50; SPEED_FLOOR = 20; }
  void refreshLeaderboard();
});
if (h2hContainer) h2hContainer.classList.add('hidden');

// Name Persistence & Moderation
function normalizeName(rawName) {
  return (rawName || '').replace(/\s+/g, ' ').trim().slice(0, 12);
}

function canonicalizeForModeration(name) {
  const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  return name
    .toLowerCase()
    .split('')
    .map(ch => map[ch] || ch)
    .join('')
    .replace(/[^a-z]/g, '');
}

function isNameAllowed(name) {
  const canonical = canonicalizeForModeration(name);
  return canonical.length > 0 && !BANNED_NAME_PATTERNS.some(pattern => pattern.test(canonical));
}

function setNameValidationMessage(message) {
  if (!nameValidationEl) return;
  if (message) {
    nameValidationEl.textContent = message;
    nameValidationEl.classList.remove('hidden');
  } else {
    nameValidationEl.textContent = '';
    nameValidationEl.classList.add('hidden');
  }
}

function hydrateSavedNames() {
  const storedP1 = normalizeName(localStorage.getItem(NAME_KEY_P1)) || NAME_DEFAULT_P1;
  const storedP2 = normalizeName(localStorage.getItem(NAME_KEY_P2)) || NAME_DEFAULT_P2;

  playerNameInput.value = isNameAllowed(storedP1) ? storedP1 : NAME_DEFAULT_P1;
  player2NameInput.value = isNameAllowed(storedP2) ? storedP2 : NAME_DEFAULT_P2;

  localStorage.setItem(NAME_KEY_P1, playerNameInput.value);
  localStorage.setItem(NAME_KEY_P2, player2NameInput.value);
}

function resetLeaderboardLocalDataIfNeeded() {
  if (localStorage.getItem(LEADERBOARD_RESET_VERSION) === 'done') return;
  localStorage.removeItem('snake-leaderboard');
  localStorage.setItem(LEADERBOARD_RESET_VERSION, 'done');
}

function tryPersistInputName(inputEl, storageKey) {
  const clean = normalizeName(inputEl.value);
  if (!clean) return;
  if (!isNameAllowed(clean)) {
    setNameValidationMessage('u aint slick lil bro');
    return;
  }
  inputEl.value = clean;
  localStorage.setItem(storageKey, clean);
  setNameValidationMessage('');
}

function resolvePlayerName(inputEl, storageKey, fallbackName, playerLabel) {
  const clean = normalizeName(inputEl.value) || fallbackName;
  if (!isNameAllowed(clean)) {
    setNameValidationMessage('u aint slick lil bro');
    inputEl.focus();
    return null;
  }
  inputEl.value = clean;
  localStorage.setItem(storageKey, clean);
  setNameValidationMessage('');
  return clean;
}


// ── Leaderboard ────────────────────────────────────
const MODE_LABELS = {
  none: '1P',
  shared: '2P Shared',
  split: '2P Split'
};
const SPEED_LABELS = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  insane: 'Insane'
};

function normalizeLeaderboardEntry(entry) {
  return {
    name: (entry?.name || 'Player').toString().slice(0, 12),
    score: Number(entry?.score || 0),
    mode: entry?.mode || 'none',
    speed: entry?.speed || 'normal',
    device_type: entry?.device_type || 'Laptop'
  };
}

function loadLocalLeaderboardEntries() {
  const raw = JSON.parse(localStorage.getItem('snake-leaderboard') || '[]');
  leaderboardEntries = raw
    .map(normalizeLeaderboardEntry)
    .filter(entry => isNameAllowed(entry.name));
}

function saveLocalLeaderboardEntries() {
  localStorage.setItem('snake-leaderboard', JSON.stringify(leaderboardEntries));
}

function getFilteredLeaderboard(mode = multiMode, speedVal = selectedSpeed) {
  return leaderboardEntries
    .filter(e => e.mode === mode && e.speed === speedVal && isNameAllowed(e.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function updateLeaderboardTitle(mode = multiMode, speedVal = selectedSpeed) {
  const titleEl = document.querySelector('#leaderboard-panel h3');
  if (!titleEl) return;
  titleEl.textContent = `🏆 ${MODE_LABELS[mode]} • ${SPEED_LABELS[speedVal]}`;
}

function setLeaderboardStatus(message, mode = 'offline') {
  if (!leaderboardStatusEl) return;
  leaderboardStatusEl.textContent = message;
  leaderboardStatusEl.classList.remove('online', 'offline');
  leaderboardStatusEl.classList.add(mode === 'online' ? 'online' : 'offline');
}

function updateLeaderboardUI() {
  leaderboardList.innerHTML = '';
  updateLeaderboardTitle();
  if (leaderboard.length === 0) leaderboardList.innerHTML = '<li style="color:var(--text-secondary);text-align:center;font-size:0.9rem;">No scores for this mode/speed yet</li>';

  leaderboard.forEach((entry, idx) => {
    const li = document.createElement('li');
    li.className = `leaderboard-item rank-${idx + 1}`;
    li.innerHTML = `<span class="lb-name">${idx + 1}. ${entry.name} <span class="lb-device">(${entry.device_type})</span></span> <span class="lb-score">${entry.score}</span>`;
    leaderboardList.appendChild(li);
  });
}

function saveToLeaderboardLocal(name, finalScore, mode, speedVal) {
  if (finalScore === 0) return;
  if (!isNameAllowed(name)) return;
  const deviceType = getCurrentDeviceType();
  const existing = leaderboardEntries.find(e => e.name === name && e.mode === mode && e.speed === speedVal);
  if (existing) {
    if (finalScore > existing.score) existing.score = finalScore;
    existing.device_type = deviceType;
  } else {
    leaderboardEntries.push({ name, score: finalScore, mode, speed: speedVal, device_type: deviceType });
  }
  saveLocalLeaderboardEntries();
  leaderboard = getFilteredLeaderboard(mode, speedVal);
}

function initializeSupabase() {
  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    setLeaderboardStatus('Local leaderboard');
    return;
  }
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function loadOnlineLeaderboard() {
  const mode = multiMode;
  const speedVal = selectedSpeed;

  if (!supabaseClient) {
    leaderboard = getFilteredLeaderboard(mode, speedVal);
    updateLeaderboardUI();
    return;
  }

  const { data, error } = await supabaseClient
    .from(LEADERBOARD_TABLE)
    .select('name, score, mode, speed, device_type, updated_at')
    .eq('mode', mode)
    .eq('speed', speedVal)
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Failed to load online leaderboard:', error);
    setLeaderboardStatus('Cloud offline - showing local', 'offline');
    leaderboard = getFilteredLeaderboard(mode, speedVal);
  } else {
    leaderboard = (data || [])
      .map(row => normalizeLeaderboardEntry(row))
      .filter(entry => isNameAllowed(entry.name));
    leaderboard.forEach(remoteEntry => {
      const localExisting = leaderboardEntries.find(e => e.name === remoteEntry.name && e.mode === remoteEntry.mode && e.speed === remoteEntry.speed);
      if (!localExisting) leaderboardEntries.push(remoteEntry);
      else if (remoteEntry.score > localExisting.score) localExisting.score = remoteEntry.score;
    });
    saveLocalLeaderboardEntries();
    setLeaderboardStatus('Global leaderboard (Supabase)', 'online');
  }

  updateLeaderboardUI();
}

async function upsertOnlineScore(name, score, mode, speedVal) {
  if (!supabaseClient || score <= 0) return;
  const deviceType = getCurrentDeviceType();

  const { data: existing, error: existingError } = await supabaseClient
    .from(LEADERBOARD_TABLE)
    .select('score')
    .eq('name', name)
    .eq('mode', mode)
    .eq('speed', speedVal)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  if (existing && existing.score >= score) return;

  const payload = {
    name,
    score,
    mode,
    speed: speedVal,
    device_type: deviceType,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabaseClient
    .from(LEADERBOARD_TABLE)
    .upsert(payload, { onConflict: 'name,mode,speed' });

  if (error) throw error;
}

async function syncScoresOnline(entries, mode, speedVal) {
  if (!supabaseClient) return;

  const validEntries = entries.filter(entry => entry.score > 0 && isNameAllowed(entry.name));
  if (validEntries.length === 0) return;

  try {
    await Promise.all(validEntries.map(entry => upsertOnlineScore(entry.name, entry.score, mode, speedVal)));
    await loadOnlineLeaderboard();
  } catch (error) {
    console.error('Failed to sync online scores:', error);
    setLeaderboardStatus('Cloud save failed - using local', 'offline');
  }
}

async function refreshLeaderboard() {
  leaderboard = getFilteredLeaderboard();
  updateLeaderboardUI();
  await loadOnlineLeaderboard();
}

initializeSupabase();
resetLeaderboardLocalDataIfNeeded();
loadLocalLeaderboardEntries();
leaderboard = getFilteredLeaderboard();
updateLeaderboardUI();
void refreshLeaderboard();

// ── Helpers ────────────────────────────────────────
function randomCell() { return Math.floor(Math.random() * GRID_SIZE); }

function isOccupied(pos, isP2) {
  if (walls.some(w => w.x === pos.x && w.y === pos.y)) return true;
  
  if (multiMode === 'shared') {
    if (!p1Dead && snake1.some(s => s.x === pos.x && s.y === pos.y)) return true;
    if (!p2Dead && snake2.some(s => s.x === pos.x && s.y === pos.y)) return true;
    if (goldenApple1 && goldenApple1.x === pos.x && goldenApple1.y === pos.y) return true;
    return false;
  } else {
    if (!isP2) {
      if (!p1Dead && snake1.some(s => s.x === pos.x && s.y === pos.y)) return true;
      if (goldenApple1 && goldenApple1.x === pos.x && goldenApple1.y === pos.y) return true;
      return false;
    } else {
      if (!p2Dead && snake2.some(s => s.x === pos.x && s.y === pos.y)) return true;
      if (goldenApple2 && goldenApple2.x === pos.x && goldenApple2.y === pos.y) return true;
      return false;
    }
  }
}

function spawnApple(isP2 = false) {
  let pos;
  do { pos = { x: randomCell(), y: randomCell() }; } while (isOccupied(pos, isP2));
  return pos;
}

function spawnGoldenApple1() {
  clearTimeout(goldenAppleTimeout1);
  goldenApple1 = spawnApple(false);
  goldenAppleTimeout1 = setTimeout(() => { goldenApple1 = null; }, 5000);
}

function spawnGoldenApple2() {
  clearTimeout(goldenAppleTimeout2);
  goldenApple2 = spawnApple(true);
  goldenAppleTimeout2 = setTimeout(() => { goldenApple2 = null; }, 5000);
}

// ── Drawing ────────────────────────────────────────
function drawBackground(targetCtx) {
  targetCtx.fillStyle = '#0d0d18';
  targetCtx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
  targetCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  targetCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const p = i * CELL_PX;
    targetCtx.beginPath(); targetCtx.moveTo(p, 0); targetCtx.lineTo(p, CANVAS_PX); targetCtx.stroke();
    targetCtx.beginPath(); targetCtx.moveTo(0, p); targetCtx.lineTo(CANVAS_PX, p); targetCtx.stroke();
  }
}

function drawWalls(targetCtx) {
  if (walls.length === 0) return;
  const isInvisi = invisiwallToggle.checked;
  
  walls.forEach(w => {
    const x = w.x * CELL_PX; const y = w.y * CELL_PX;
    targetCtx.shadowBlur = isInvisi ? 8 : 12;
    targetCtx.shadowColor = isInvisi ? 'rgba(255, 50, 150, 0.4)' : 'rgba(100, 150, 255, 0.5)';
    targetCtx.fillStyle = isInvisi ? 'rgba(200, 50, 120, 0.25)' : '#2d3b59';
    targetCtx.strokeStyle = isInvisi ? 'rgba(255, 100, 180, 0.8)' : '#5a90e6';
    targetCtx.lineWidth = 2;
    if (isInvisi) targetCtx.setLineDash([4, 4]);
    else targetCtx.setLineDash([]);
    
    roundRect(targetCtx, x+2, y+2, CELL_PX-4, CELL_PX-4, 4, targetCtx.fillStyle);
    targetCtx.stroke();
    
    targetCtx.shadowBlur = 0;
    targetCtx.setLineDash([]);
  });
}

const SNAKE_THEMES = {
  green: { shadowHead: 'rgba(100,255,170,0.6)', shadowBody: 'rgba(100,255,170,0.15)', head0: 'rgba(100,255,180,A)', head1: 'rgba(60,220,140,A)', body0: 'rgba(60,200,130,A)', body1: 'rgba(40,160,100,A)', hex: '#64ffaa' },
  purple: { shadowHead: 'rgba(199,100,255,0.6)', shadowBody: 'rgba(199,100,255,0.15)', head0: 'rgba(215,130,255,A)', head1: 'rgba(175,80,235,A)', body0: 'rgba(155,70,215,A)', body1: 'rgba(130,50,180,A)', hex: '#c764ff' },
  cyan: { shadowHead: 'rgba(50,230,255,0.6)', shadowBody: 'rgba(50,230,255,0.15)', head0: 'rgba(100,240,255,A)', head1: 'rgba(30,200,230,A)', body0: 'rgba(30,190,220,A)', body1: 'rgba(20,150,180,A)', hex: '#32e6ff' },
  yellow: { shadowHead: 'rgba(255,220,50,0.6)', shadowBody: 'rgba(255,220,50,0.15)', head0: 'rgba(255,230,100,A)', head1: 'rgba(230,200,30,A)', body0: 'rgba(230,190,20,A)', body1: 'rgba(180,150,10,A)', hex: '#ffdc32' },
  pink: { shadowHead: 'rgba(255,100,150,0.6)', shadowBody: 'rgba(255,100,150,0.15)', head0: 'rgba(255,130,170,A)', head1: 'rgba(235,80,130,A)', body0: 'rgba(215,70,110,A)', body1: 'rgba(180,50,90,A)', hex: '#ff6496' }
};

function roundRect(tCtx, x, y, w, h, r, fill) {
  tCtx.beginPath(); tCtx.moveTo(x+r, y); tCtx.lineTo(x+w-r, y); tCtx.quadraticCurveTo(x+w, y, x+w, y+r); tCtx.lineTo(x+w, y+h-r); tCtx.quadraticCurveTo(x+w, y+h, x+w-r, y+h); tCtx.lineTo(x+r, y+h); tCtx.quadraticCurveTo(x, y+h, x, y+h-r); tCtx.lineTo(x, y+r); tCtx.quadraticCurveTo(x, y, x+r, y); tCtx.closePath(); tCtx.fillStyle = fill; tCtx.fill();
}

function drawSnake(targetCtx, snakeArr, dirObj, colors, dead) {
  if (snakeArr.length === 0) return;
  snakeArr.forEach((seg, i) => {
    const isHead = i === 0; const progress = 1 - Math.max(0, i / snakeArr.length);
    const x = seg.x * CELL_PX; const y = seg.y * CELL_PX;

    if (dead) { targetCtx.shadowBlur = 0; targetCtx.fillStyle = 'rgba(80,80,80,0.5)'; } 
    else {
      targetCtx.shadowColor = isHead ? colors.shadowHead : colors.shadowBody;
      targetCtx.shadowBlur = isHead ? 14 : 6;
      const g = targetCtx.createLinearGradient(x, y, x+CELL_PX, y+CELL_PX);
      const alpha = 0.55 + 0.45 * progress;
      g.addColorStop(0, isHead ? colors.head0.replace('A',alpha) : colors.body0.replace('A',alpha));
      g.addColorStop(1, isHead ? colors.head1.replace('A',alpha) : colors.body1.replace('A',alpha));
      targetCtx.fillStyle = g;
    }
    const pad = isHead ? 1 : 2; const r = isHead ? 6 : 4;
    roundRect(targetCtx, x+pad, y+pad, CELL_PX-pad*2, CELL_PX-pad*2, r, targetCtx.fillStyle);
    targetCtx.shadowBlur = 0;
  });

  const head = snakeArr[0];
  const cx = head.x * CELL_PX + CELL_PX / 2; const cy = head.y * CELL_PX + CELL_PX / 2;
  const eyeOff = 4; let e1, e2;
  if (dirObj.x === 1)       { e1 = { x: cx+4, y: cy-eyeOff }; e2 = { x: cx+4, y: cy+eyeOff }; }
  else if (dirObj.x === -1) { e1 = { x: cx-4, y: cy-eyeOff }; e2 = { x: cx-4, y: cy+eyeOff }; }
  else if (dirObj.y === -1) { e1 = { x: cx-eyeOff, y: cy-4 }; e2 = { x: cx+eyeOff, y: cy-4 }; }
  else                      { e1 = { x: cx-eyeOff, y: cy+4 }; e2 = { x: cx+eyeOff, y: cy+4 }; }

  [e1, e2].forEach(e => {
    targetCtx.fillStyle = dead ? '#555' : '#fff';
    targetCtx.beginPath(); targetCtx.arc(e.x, e.y, 3, 0, Math.PI*2); targetCtx.fill();
    if (dead) {
      targetCtx.strokeStyle = '#222'; targetCtx.lineWidth = 1.5;
      targetCtx.beginPath(); targetCtx.moveTo(e.x-1.5, e.y-1.5); targetCtx.lineTo(e.x+1.5, e.y+1.5); targetCtx.stroke();
      targetCtx.beginPath(); targetCtx.moveTo(e.x+1.5, e.y-1.5); targetCtx.lineTo(e.x-1.5, e.y+1.5); targetCtx.stroke();
    } else {
      targetCtx.fillStyle = '#111';
      targetCtx.beginPath(); targetCtx.arc(e.x + dirObj.x, e.y + dirObj.y, 1.5, 0, Math.PI*2); targetCtx.fill();
    }
  });
}

function drawAppleInstance(targetCtx, pos, isGolden) {
  if (!pos) return;
  const cx = pos.x * CELL_PX + CELL_PX / 2; const cy = pos.y * CELL_PX + CELL_PX / 2;
  const r = CELL_PX / 2 - 3;
  targetCtx.shadowColor = isGolden ? 'rgba(255,215,0,0.8)' : 'rgba(255,68,102,0.7)';
  targetCtx.shadowBlur = isGolden ? 24 : 16;
  const g = targetCtx.createRadialGradient(cx-2, cy-2, 2, cx, cy, r);
  g.addColorStop(0, isGolden ? '#fff4a3' : '#ff6680'); g.addColorStop(1, isGolden ? '#e6ac00' : '#cc2244');
  targetCtx.fillStyle = g; targetCtx.beginPath(); targetCtx.arc(cx, cy, r, 0, Math.PI*2); targetCtx.fill();
  targetCtx.shadowBlur = 0;
  targetCtx.fillStyle = 'rgba(255,255,255,0.4)'; targetCtx.beginPath(); targetCtx.arc(cx-3, cy-3, 3, 0, Math.PI*2); targetCtx.fill();
  if (isGolden) {
    targetCtx.fillStyle = '#fff';
    targetCtx.beginPath(); targetCtx.arc(cx+4, cy+4, 1.5, 0, Math.PI*2); targetCtx.fill();
    targetCtx.beginPath(); targetCtx.arc(cx-4, cy+2, 1, 0, Math.PI*2); targetCtx.fill();
  }
  targetCtx.strokeStyle = '#55aa44'; targetCtx.lineWidth = 2;
  targetCtx.beginPath(); targetCtx.moveTo(cx, cy-r); targetCtx.lineTo(cx+2, cy-r-5); targetCtx.stroke();
  targetCtx.fillStyle = '#66cc55'; targetCtx.beginPath(); targetCtx.ellipse(cx+4, cy-r-3, 4, 2, Math.PI/4, 0, Math.PI*2); targetCtx.fill();
}

function spawnParticlesForContext(partsList, gx, gy, cOverride) {
  const cx = gx * CELL_PX + CELL_PX / 2; const cy = gy * CELL_PX + CELL_PX / 2;
  for (let i=0; i<12; i++) {
    const angle = Math.random() * Math.PI*2; const spd = 1.5 + Math.random() * 3.5;
    partsList.push({
      x: cx, y: cy, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, life: 1,
      color: cOverride || (Math.random()>0.5 ? '#ff6680':'#ffaa44'), size: 2 + Math.random()*3
    });
  }
}

function drawParticles(targetCtx, partsList) {
  partsList.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.04; p.size *= 0.97; });
  partsList.filter(p => p.life > 0).forEach(p => {
    targetCtx.globalAlpha = Math.max(0, p.life); targetCtx.fillStyle = p.color;
    targetCtx.beginPath(); targetCtx.arc(p.x, p.y, p.size, 0, Math.PI*2); targetCtx.fill();
  });
  targetCtx.globalAlpha = 1;
}

function render() {
  drawBackground(ctx);
  
  if (multiMode === 'split') {
    drawBackground(ctx2);
    
    // ctx gets P1 only
    drawWalls(ctx);
    drawAppleInstance(ctx, apple1, false);
    drawAppleInstance(ctx, goldenApple1, true);
    if (p1Dead) drawSnake(ctx, snake1, dir1, SNAKE_THEMES[p1SelectedColor], true); 
    else drawSnake(ctx, snake1, dir1, SNAKE_THEMES[p1SelectedColor], false);
    drawParticles(ctx, particles1);
    particles1 = particles1.filter(p => p.life > 0);

    // ctx2 gets P2 only
    drawWalls(ctx2);
    drawAppleInstance(ctx2, apple2, false);
    drawAppleInstance(ctx2, goldenApple2, true);
    if (p2Dead) drawSnake(ctx2, snake2, dir2, SNAKE_THEMES[p2SelectedColor], true); 
    else drawSnake(ctx2, snake2, dir2, SNAKE_THEMES[p2SelectedColor], false);
    drawParticles(ctx2, particles2);
    particles2 = particles2.filter(p => p.life > 0);
  } else {
    drawWalls(ctx);
    drawAppleInstance(ctx, apple1, false);
    drawAppleInstance(ctx, goldenApple1, true);
    
    if (p1Dead && snake1.length>0) drawSnake(ctx, snake1, dir1, SNAKE_THEMES[p1SelectedColor], true);
    if (multiMode === 'shared' && p2Dead && snake2.length>0) drawSnake(ctx, snake2, dir2, SNAKE_THEMES[p2SelectedColor], true);
    if (!p1Dead && snake1.length>0) drawSnake(ctx, snake1, dir1, SNAKE_THEMES[p1SelectedColor], false);
    if (multiMode === 'shared' && !p2Dead && snake2.length>0) drawSnake(ctx, snake2, dir2, SNAKE_THEMES[p2SelectedColor], false);
    
    drawParticles(ctx, particles1);
    particles1 = particles1.filter(p => p.life > 0);
  }
}

// ── Game Logic ─────────────────────────────────────
function initGame() {
  const mid = Math.floor(GRID_SIZE / 2);
  
  walls = [];
  if (wallsToggle.checked || invisiwallToggle.checked) {
    const numStructures = Math.floor(Math.random() * 3) + 1; // 1 to 3
    for (let w = 0; w < numStructures; w++) {
      const length = Math.floor(Math.random() * 2) + 4; // 4 or 5
      const isHorizontal = Math.random() > 0.5;
      
      let startPos; let valid = false; let tries = 0;
      while (!valid && tries < 100) {
        tries++;
        startPos = { 
           x: Math.floor(Math.random() * (GRID_SIZE - (isHorizontal ? length : 0))), 
           y: Math.floor(Math.random() * (GRID_SIZE - (!isHorizontal ? length : 0))) 
        };
        
        let localValid = true;
        for (let i=0; i < length; i++) {
           let cx = startPos.x + (isHorizontal ? i : 0);
           let cy = startPos.y + (!isHorizontal ? i : 0);
           // Prevent spawning near player start locations (middle rows)
           if (cy >= (mid - 3) && cy <= (mid + 3)) { localValid = false; break; }
           // Prevent overlapping existing walls
           if (walls.some(wp => wp.x === cx && wp.y === cy)) { localValid = false; break; }
        }
        if (localValid) valid = true;
      }
      
      if (valid) {
        for (let i=0; i < length; i++) {
           let cx = startPos.x + (isHorizontal ? i : 0);
           let cy = startPos.y + (!isHorizontal ? i : 0);
           walls.push({ x: cx, y: cy });
        }
      }
    }
  }

  snake1 = [ { x: mid - 3, y: mid }, { x: mid - 3, y: mid + 1 }, { x: mid - 3, y: mid + 2 } ];
  dir1 = { x: 0, y: -1 }; nextDir1 = { x: 0, y: -1 };
  score1 = 0; p1Dead = false; applesEaten1 = 0;
  particles1 = []; goldenApple1 = null; clearTimeout(goldenAppleTimeout1);
  apple1 = spawnApple(false);

  if (multiMode !== 'none') {
    snake2 = [ { x: mid + 3, y: mid }, { x: mid + 3, y: mid + 1 }, { x: mid + 3, y: mid + 2 } ];
    dir2 = { x: 0, y: -1 }; nextDir2 = { x: 0, y: -1 };
    score2 = 0; p2Dead = false; applesEaten2 = 0;
    particles2 = []; goldenApple2 = null; clearTimeout(goldenAppleTimeout2);
    apple2 = (multiMode === 'split') ? spawnApple(true) : null;
  } else {
    p2Dead = true; 
  }

  speed = BASE_SPEED;
  scoreEl.textContent = '0';
  score2El.textContent = '0';
  winnerContainer.innerHTML = '';
}

function processSnake(snakeArr, directionObj, nextDirectionObj, getIsDead, setIsDead, incrementScoreFunc, myApple, myGolden, myEatCallback, myGoldenEatCallback, isP2) {
  if (getIsDead()) return false;
  directionObj.x = nextDirectionObj.x; directionObj.y = nextDirectionObj.y;
  const head = { x: snakeArr[0].x + directionObj.x, y: snakeArr[0].y + directionObj.y };

  if (head.x < 0) head.x = GRID_SIZE - 1; else if (head.x >= GRID_SIZE) head.x = 0;
  if (head.y < 0) head.y = GRID_SIZE - 1; else if (head.y >= GRID_SIZE) head.y = 0;

  if (snakeArr.some(s => s.x === head.x && s.y === head.y)) { setIsDead(true); return false; }
  
  if (walls.some(w => w.x === head.x && w.y === head.y)) { 
    if (invisiwallToggle.checked) incrementScoreFunc(-1);
    else { setIsDead(true); return false; }
  }
  
  snakeArr.unshift(head);
  let ate = false;

  let targetApple = (multiMode === 'shared') ? apple1 : myApple;
  let targetGolden = (multiMode === 'shared') ? goldenApple1 : myGolden;

  if (targetGolden && head.x === targetGolden.x && head.y === targetGolden.y) {
    incrementScoreFunc(10);
    myGoldenEatCallback();
    ate = true;
  } else if (head.x === targetApple.x && head.y === targetApple.y) {
    incrementScoreFunc(1);
    myEatCallback();
    ate = true;
  }

  if (!ate) snakeArr.pop();
  return true;
}

function pulseScore(box) { box.classList.add('pulse'); setTimeout(() => box.classList.remove('pulse'), 400); }

function handleEatP1() {
  applesEaten1++; spawnParticlesForContext(particles1, apple1.x, apple1.y);
  apple1 = spawnApple(false);
  speed = Math.max(SPEED_FLOOR, speed - SPEED_STEP);
  if (applesEaten1 > 0 && applesEaten1 % 10 === 0) spawnGoldenApple1();
}
function handleEatP1Golden() {
  spawnParticlesForContext(particles1, goldenApple1.x, goldenApple1.y, '#ffd700');
  goldenApple1 = null; clearTimeout(goldenAppleTimeout1);
}

function handleEatP2() {
  applesEaten2++; 
  if (multiMode === 'split') {
    spawnParticlesForContext(particles2, apple2.x, apple2.y);
    apple2 = spawnApple(true);
    if (applesEaten2 > 0 && applesEaten2 % 10 === 0) spawnGoldenApple2();
  } else {
    spawnParticlesForContext(particles1, apple1.x, apple1.y);
    apple1 = spawnApple(false);
    if (applesEaten2 > 0 && applesEaten2 % 10 === 0) spawnGoldenApple1();
  }
  speed = Math.max(SPEED_FLOOR, speed - SPEED_STEP);
}
function handleEatP2Golden() {
  if (multiMode === 'split') {
    spawnParticlesForContext(particles2, goldenApple2.x, goldenApple2.y, '#ffd700');
    goldenApple2 = null; clearTimeout(goldenAppleTimeout2);
  } else {
    spawnParticlesForContext(particles1, goldenApple1.x, goldenApple1.y, '#ffd700');
    goldenApple1 = null; clearTimeout(goldenAppleTimeout1);
  }
}

function tick() {
  processSnake(snake1, dir1, nextDir1, () => p1Dead, v => p1Dead=v, pts => { 
    score1 += pts; 
    scoreEl.textContent=score1; 
    pulseScore(scoreBox); 
  }, apple1, goldenApple1, handleEatP1, handleEatP1Golden, false);
  
  if (multiMode !== 'none') {
    processSnake(snake2, dir2, nextDir2, () => p2Dead, v => p2Dead=v, pts => { 
      score2 += pts; 
      score2El.textContent=score2; 
      pulseScore(p2ScoreBox); 
    }, apple2, goldenApple2, handleEatP2, handleEatP2Golden, true);
  }

  // ── Head 2 Head PvP Logic ──
  if (multiMode === 'shared' && h2hToggle.checked && !p1Dead && !p2Dead) {
     const p1Head = snake1[0];
     const p2Head = snake2[0];
     let p1HitP2Body = snake2.some((s, idx) => idx !== 0 && s.x === p1Head.x && s.y === p1Head.y);
     let p2HitP1Body = snake1.some((s, idx) => idx !== 0 && s.x === p2Head.x && s.y === p2Head.y);
     
     let headToHead = (p1Head.x === p2Head.x && p1Head.y === p2Head.y);
     if (snake1.length > 1 && snake2.length > 1 && 
         p1Head.x === snake2[1].x && p1Head.y === snake2[1].y && 
         p2Head.x === snake1[1].x && p2Head.y === snake1[1].y) {
         headToHead = true;
     }

     if (headToHead) {
        if (score1 > score2) p2Dead = true;
        else if (score2 > score1) p1Dead = true;
        else { p1Dead = true; p2Dead = true; }
     } else {
        if (p1HitP2Body) p1Dead = true;
        if (p2HitP1Body) p2Dead = true;
     }
  }

  render();

  if (p1Dead && (p2Dead || multiMode === 'none')) return gameOver();
  loopId = setTimeout(tick, speed);
}

function startGame() {
  const p1Name = resolvePlayerName(playerNameInput, NAME_KEY_P1, NAME_DEFAULT_P1, 'Player 1');
  if (!p1Name) return;
  currentPlayer1 = p1Name;

  if (multiMode !== 'none') {
    const p2Name = resolvePlayerName(player2NameInput, NAME_KEY_P2, NAME_DEFAULT_P2, 'Player 2');
    if (!p2Name) return;
    currentPlayer2 = p2Name;
  } else {
    currentPlayer2 = NAME_DEFAULT_P2;
  }
  
  initGame(); gameState = 'playing'; showOverlay(false);
  render(); loopId = setTimeout(tick, speed);
}

function gameOver() {
  gameState = 'over'; clearTimeout(loopId);
  let maxScore = score1; if (multiMode !== 'none') maxScore = Math.max(score1, score2);
  const isNewBest = maxScore > highScore;
  if (isNewBest) { highScore = maxScore; localStorage.setItem('snake-hi', highScore); highScoreEl.textContent = highScore; }

  const categoryMode = multiMode;
  const categorySpeed = selectedSpeed;

  saveToLeaderboardLocal(currentPlayer1, score1, categoryMode, categorySpeed);
  if (multiMode !== 'none') saveToLeaderboardLocal(currentPlayer2, score2, categoryMode, categorySpeed);
  updateLeaderboardUI();
  void syncScoresOnline([
    { name: currentPlayer1, score: score1 },
    { name: currentPlayer2, score: multiMode !== 'none' ? score2 : 0 }
  ], categoryMode, categorySpeed);

  winnerContainer.innerHTML = '';
  
  if (multiMode !== 'none') {
    if (score1 > score2) {
      winnerContainer.innerHTML = `<span class="graffiti-winner" style="background: linear-gradient(45deg, #10e060, #a0ffd0, #10e060); -webkit-background-clip: text; text-shadow: 0 0 20px rgba(100,255,170,0.6);">${currentPlayer1} Wins!</span>`;
      finalScoreEl.textContent = `Score: ${score1}`;
    } else if (score2 > score1) {
      winnerContainer.innerHTML = `<span class="graffiti-winner" style="background: linear-gradient(45deg, #c764ff, #4facfe, #c764ff); -webkit-background-clip: text; text-shadow: 0 0 20px rgba(199,100,255,0.6);">${currentPlayer2} Wins!</span>`;
      finalScoreEl.textContent = `Score: ${score2}`;
    } else {
      winnerContainer.innerHTML = `<span class="graffiti-winner" style="color: #fff; background: none; -webkit-text-fill-color: #fff;">It's a Tie!</span>`;
      finalScoreEl.textContent = `Score: ${score1}`;
    }
  } else { 
    finalScoreEl.textContent = `Score: ${score1}`; 
  }
  
  newBestEl.classList.toggle('hidden', !isNewBest);
  startScreen.classList.add('hidden'); pauseScreen.classList.add('hidden');
  gameOverScreen.classList.remove('hidden'); showOverlay(true);
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused'; clearTimeout(loopId);
    startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); pauseScreen.classList.remove('hidden'); showOverlay(true);
  } else if (gameState === 'paused') {
    gameState = 'playing'; showOverlay(false); loopId = setTimeout(tick, speed);
  }
}

function showOverlay(show) { overlay.classList.toggle('visible', show); }

// ── Input ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (gameState === 'playing' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
  
  if (gameState === 'playing') {
    if (!p1Dead) {
       switch (e.key.toLowerCase()) {
         case 'w': if (dir1.y !== 1) nextDir1 = { x: 0, y: -1 }; break;
         case 's': if (dir1.y !== -1) nextDir1 = { x: 0, y: 1 }; break;
         case 'a': if (dir1.x !== 1) nextDir1 = { x: -1, y: 0 }; break;
         case 'd': if (dir1.x !== -1) nextDir1 = { x: 1, y: 0 }; break;
         case 'arrowup':    if (multiMode === 'none' && dir1.y !== 1) nextDir1 = { x: 0, y: -1 }; break;
         case 'arrowdown':  if (multiMode === 'none' && dir1.y !== -1) nextDir1 = { x: 0, y: 1 }; break;
         case 'arrowleft':  if (multiMode === 'none' && dir1.x !== 1) nextDir1 = { x: -1, y: 0 }; break;
         case 'arrowright': if (multiMode === 'none' && dir1.x !== -1) nextDir1 = { x: 1, y: 0 }; break;
       }
    }
    if (multiMode !== 'none' && !p2Dead) {
       switch (e.key) {
         case 'ArrowUp':    if (dir2.y !== 1) nextDir2 = { x: 0, y: -1 }; break;
         case 'ArrowDown':  if (dir2.y !== -1) nextDir2 = { x: 0, y: 1 }; break;
         case 'ArrowLeft':  if (dir2.x !== 1) nextDir2 = { x: -1, y: 0 }; break;
         case 'ArrowRight': if (dir2.x !== -1) nextDir2 = { x: 1, y: 0 }; break;
       }
    }
  }

  if (e.key === ' ' || e.key.toLowerCase() === 'p') {
    if (document.activeElement === playerNameInput || document.activeElement === player2NameInput || document.activeElement.tagName === 'INPUT') return;
    if (gameState === 'playing' || gameState === 'paused') { e.preventDefault(); togglePause(); }
  }
  if (e.key === 'Enter') { if (gameState === 'idle' || gameState === 'over') startGame(); }
});

startBtn.addEventListener('click', startGame); restartBtn.addEventListener('click', startGame);

// ── Color Selectors UI ──────────────────────────────
const p1Swatches = document.querySelectorAll('#p1-colors .c-swatch');
const p2Swatches = document.querySelectorAll('#p2-colors .c-swatch');

function updateColorUI() {
  if (multiMode !== 'none' && p1SelectedColor === p2SelectedColor) {
     const fallback = Object.keys(SNAKE_THEMES).find(k => k !== p1SelectedColor);
     p2SelectedColor = fallback;
  }
  
  p1Swatches.forEach(sw => {
    const col = sw.getAttribute('data-color');
    sw.classList.toggle('active', col === p1SelectedColor);
    sw.classList.toggle('disabled', multiMode !== 'none' && col === p2SelectedColor);
  });
  p2Swatches.forEach(sw => {
    const col = sw.getAttribute('data-color');
    sw.classList.toggle('active', col === p2SelectedColor);
    sw.classList.toggle('disabled', col === p1SelectedColor);
  });
}

p1Swatches.forEach(sw => sw.addEventListener('click', () => {
    const col = sw.getAttribute('data-color');
    if (multiMode !== 'none' && col === p2SelectedColor) return;
    p1SelectedColor = col;
    updateColorUI();
}));

p2Swatches.forEach(sw => sw.addEventListener('click', () => {
    const col = sw.getAttribute('data-color');
    if (col === p1SelectedColor) return;
    p2SelectedColor = col;
    updateColorUI();
}));

playerNameInput.addEventListener('input', () => setNameValidationMessage(''));
player2NameInput.addEventListener('input', () => setNameValidationMessage(''));
playerNameInput.addEventListener('change', () => tryPersistInputName(playerNameInput, NAME_KEY_P1));
player2NameInput.addEventListener('change', () => tryPersistInputName(player2NameInput, NAME_KEY_P2));
playerNameInput.addEventListener('blur', () => tryPersistInputName(playerNameInput, NAME_KEY_P1));
player2NameInput.addEventListener('blur', () => tryPersistInputName(player2NameInput, NAME_KEY_P2));

hydrateSavedNames();
playerNameInput.focus();
updateColorUI();
initGame(); render();

