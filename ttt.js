const tttCells = document.querySelectorAll('.ttt-cell');
const tttStatus = document.getElementById('ttt-status');
const tttResetBtn = document.getElementById('ttt-reset-btn');
const tttP1Input = document.getElementById('ttt-p1-input');
const tttP2Input = document.getElementById('ttt-p2-input');
const TTT_NAME_KEY_P1 = 'ttt-player1-name';
const TTT_NAME_KEY_P2 = 'ttt-player2-name';
const TTT_DEFAULT_P1 = 'Player 1';
const TTT_DEFAULT_P2 = 'Player 2';
const TTT_BANNED_NAME_PATTERNS = [
  /nigg/i, /fag/i, /retard/i, /cunt/i, /kike/i, /spic/i, /chink/i, /paki/i, /gook/i,
  /fuck/i, /shit/i, /bitch/i, /asshole/i, /bastard/i, /whore/i, /slut/i, /dick/i, /pussy/i, /cock/i,
  /rape/i, /rapist/i, /molest/i, /pedo/i,
  /hitler/i, /nazi/i, /kkk/i, /terror/i
];

let board = ['', '', '', '', '', '', '', '', ''];
let tttCurrentPlayer = 'X';
let tttActive = true;

const winConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function normalizeTTTName(rawName) {
  return (rawName || '').replace(/\s+/g, ' ').trim().slice(0, 12);
}

function canonicalizeTTTName(name) {
  const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  return name
    .toLowerCase()
    .split('')
    .map(ch => map[ch] || ch)
    .join('')
    .replace(/[^a-z]/g, '');
}

function isTTTNameAllowed(name) {
  const canonical = canonicalizeTTTName(name);
  return canonical.length > 0 && !TTT_BANNED_NAME_PATTERNS.some(pattern => pattern.test(canonical));
}

function sanitizeAndPersistTTTName(inputEl, storageKey, fallbackName) {
  const normalized = normalizeTTTName(inputEl.value) || fallbackName;
  if (!isTTTNameAllowed(normalized)) {
    inputEl.value = localStorage.getItem(storageKey) || fallbackName;
    return;
  }
  inputEl.value = normalized;
  localStorage.setItem(storageKey, normalized);
}

function hydrateTTTNames() {
  const p1 = normalizeTTTName(localStorage.getItem(TTT_NAME_KEY_P1)) || TTT_DEFAULT_P1;
  const p2 = normalizeTTTName(localStorage.getItem(TTT_NAME_KEY_P2)) || TTT_DEFAULT_P2;
  tttP1Input.value = isTTTNameAllowed(p1) ? p1 : TTT_DEFAULT_P1;
  tttP2Input.value = isTTTNameAllowed(p2) ? p2 : TTT_DEFAULT_P2;
  localStorage.setItem(TTT_NAME_KEY_P1, tttP1Input.value);
  localStorage.setItem(TTT_NAME_KEY_P2, tttP2Input.value);
}

function updateStatusText() {
  if (!tttActive) return;
  const p1Name = tttP1Input.value.trim() || 'Player 1';
  const p2Name = tttP2Input.value.trim() || 'Player 2';
  
  if (tttCurrentPlayer === 'X') {
    tttStatus.textContent = `${p1Name}'s Turn (X)`;
    tttStatus.className = 'status-x';
  } else {
    tttStatus.textContent = `${p2Name}'s Turn (O)`;
    tttStatus.className = 'status-o';
  }
}

function handleCellClick(e) {
  const cell = e.target;
  const idx = parseInt(cell.getAttribute('data-idx'));

  if (board[idx] !== '' || !tttActive) return;

  board[idx] = tttCurrentPlayer;
  cell.textContent = tttCurrentPlayer;
  cell.classList.add('occupied');
  
  if (tttCurrentPlayer === 'X') {
    cell.classList.add('cell-x');
  } else {
    cell.classList.add('cell-o');
  }

  checkWin();
}

function checkWin() {
  let roundWon = false;
  for (let i = 0; i < winConditions.length; i++) {
    const [a, b, c] = winConditions[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      roundWon = true;
      break;
    }
  }

  const p1Name = tttP1Input.value.trim() || 'Player 1';
  const p2Name = tttP2Input.value.trim() || 'Player 2';

  if (roundWon) {
    tttActive = false;
    if (tttCurrentPlayer === 'X') {
      tttStatus.innerHTML = `<span class="graffiti-winner">${p1Name} Wins!</span>`;
      tttStatus.className = 'status-x';
    } else {
      tttStatus.innerHTML = `<span class="graffiti-winner" style="background: linear-gradient(45deg, #c764ff, #4facfe, #c764ff); -webkit-background-clip: text; text-shadow: 0 0 20px rgba(199,100,255,0.6);">${p2Name} Wins!</span>`;
      tttStatus.className = 'status-o';
    }
    return;
  }

  if (!board.includes('')) {
    tttActive = false;
    tttStatus.textContent = 'Game Ended in a Draw!';
    tttStatus.className = '';
    return;
  }

  tttCurrentPlayer = tttCurrentPlayer === 'X' ? 'O' : 'X';
  updateStatusText();
}

function restartTTT() {
  board = ['', '', '', '', '', '', '', '', ''];
  tttActive = true;
  tttCurrentPlayer = 'X';
  updateStatusText();
  
  tttCells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('occupied', 'cell-x', 'cell-o');
  });
}

tttCells.forEach(cell => cell.addEventListener('click', handleCellClick));
tttResetBtn.addEventListener('click', restartTTT);
tttP1Input.addEventListener('input', updateStatusText);
tttP2Input.addEventListener('input', updateStatusText);
tttP1Input.addEventListener('change', () => sanitizeAndPersistTTTName(tttP1Input, TTT_NAME_KEY_P1, TTT_DEFAULT_P1));
tttP2Input.addEventListener('change', () => sanitizeAndPersistTTTName(tttP2Input, TTT_NAME_KEY_P2, TTT_DEFAULT_P2));
tttP1Input.addEventListener('blur', () => sanitizeAndPersistTTTName(tttP1Input, TTT_NAME_KEY_P1, TTT_DEFAULT_P1));
tttP2Input.addEventListener('blur', () => sanitizeAndPersistTTTName(tttP2Input, TTT_NAME_KEY_P2, TTT_DEFAULT_P2));

// Init
hydrateTTTNames();
updateStatusText();
