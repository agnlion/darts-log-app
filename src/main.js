import { addThrow, createGame, gameView, undoThrow } from './game.js';
import { dartFromBoard, dartboardMarkup } from './dartboard.js';
import { deleteGame, loadGames, saveGame } from './history-store.js';
import './style.css';

let game = createGame();
let selectedMultiplier = 1;
let inputMode = 'keypad';
let screen = 'game';
let selectedRecordId = null;
let didSaveCurrentGame = false;
let savedCurrentGameId = null;
const app = document.querySelector('#app');

function multiplierLabel(multiplier) { return multiplier === 1 ? 'SINGLE' : multiplier === 2 ? 'DOUBLE' : 'TRIPLE'; }
function scoreHit(value) {
  if (value === 'MISS') return { score: 0, hit: 'MISS' };
  if (value === 'BULL') return { score: 50, hit: 'BULL' };
  const prefix = selectedMultiplier === 1 ? 'S' : selectedMultiplier === 2 ? 'D' : 'T';
  return { score: Number(value) * selectedMultiplier, hit: `${prefix}${value}` };
}
function formatDate(value) { return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function renderRows(view) {
  return view.rounds.map(round => `<article class="round ${screen === 'game' && round.number === view.currentRound && !view.isComplete ? 'active' : ''}">
    <div class="round-number">R${String(round.number).padStart(2, '0')}</div>
    <div class="darts">${[0, 1, 2].map(index => { const dart = round.throws[index]; return `<div class="dart ${dart ? 'filled' : ''}">${dart ? `<b>${dart.hit}</b><span>${dart.score}</span>` : '<span>—</span>'}</div>`; }).join('')}</div>
    <strong>${round.throws.length ? round.subtotal : '—'}</strong></article>`).join('');
}
function renderGame() {
  const view = gameView(game);
  const current = view.rounds[Math.min(view.currentRound - 1, 7)];
  const numberButtons = Array.from({ length: 20 }, (_, i) => i + 1).map(n => `<button class="score-key" data-score="${n}"><span>${n}</span><small>${n * selectedMultiplier}</small></button>`).join('');
  app.innerHTML = `<div class="shell"><header><div><p class="eyebrow">COUNT-UP / 8 ROUNDS</p><h1>DARTS LOG</h1></div><div class="header-actions"><button class="history-button" id="show-history">LOG</button><button class="new-game" id="new-game" aria-label="新しいゲームを開始">↻</button></div></header>
    <section class="scoreboard"><div class="total"><span>TOTAL</span><output>${view.total}</output></div><div class="progress"><span>ROUND ${String(view.currentRound).padStart(2, '0')} <i>/ ${view.isComplete ? 'FINISHED' : `${view.currentDart}TH DART`}</i></span><div class="dots">${Array.from({length: 24}, (_, i) => `<i class="${i < game.throws.length ? 'done' : ''}"></i>`).join('')}</div></div></section>
    <section class="current-round"><div><span>THIS ROUND</span><strong>${current.subtotal}</strong></div><div class="live-darts">${[0, 1, 2].map(i => `<span class="${current.throws[i] ? 'recorded' : ''}">${current.throws[i] ? current.throws[i].score : i + 1}</span>`).join('')}</div></section>
    <section class="input-panel ${view.isComplete ? 'completed' : ''}"><div class="input-tabs"><button class="input-tab ${inputMode === 'keypad' ? 'selected' : ''}" data-input-mode="keypad">数字キー</button><button class="input-tab ${inputMode === 'board' ? 'selected' : ''}" data-input-mode="board">盤面タップ</button></div>${inputMode === 'keypad' ? `<div class="mode-row"><span>SELECT AREA</span><div class="multipliers">${[1,2,3].map(m => `<button class="multiplier ${selectedMultiplier === m ? 'selected' : ''}" data-multiplier="${m}">${multiplierLabel(m)}</button>`).join('')}</div></div><div class="keypad">${numberButtons}<button class="score-key special" data-score="BULL"><span>BULL</span><small>50</small></button><button class="score-key miss" data-score="MISS"><span>MISS</span><small>0</small></button></div>` : `<div class="board-guide"><span>狙ったエリアをタップ</span><small>外側=DOUBLE　中央の細い輪=TRIPLE</small></div><div class="board-wrap">${dartboardMarkup()}</div><button class="miss-board" data-score="MISS">MISS　0</button>`}<button class="undo" id="undo" ${game.throws.length ? '' : 'disabled'}>←　直前の1投を取り消す</button>${view.isComplete ? '<p class="complete-message">GAME SAVED — おつかれさまでした！</p>' : ''}</section>
    <section class="history"><div class="section-title"><span>ROUND LOG</span><span>1ST / 2ND / 3RD</span><span>SUBTOTAL</span></div>${renderRows(view)}</section></div>`;
  app.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => record(button.dataset.score)));
  app.querySelectorAll('[data-board-score]').forEach(zone => zone.addEventListener('click', () => recordBoard(zone.dataset.boardScore, zone.dataset.boardRing)));
  app.querySelectorAll('[data-input-mode]').forEach(button => button.addEventListener('click', () => { inputMode = button.dataset.inputMode; render(); }));
  app.querySelectorAll('[data-multiplier]').forEach(button => button.addEventListener('click', () => { selectedMultiplier = Number(button.dataset.multiplier); render(); }));
  app.querySelector('#undo').addEventListener('click', () => { if (savedCurrentGameId) deleteGame(savedCurrentGameId); game = undoThrow(game); didSaveCurrentGame = false; savedCurrentGameId = null; selectedMultiplier = 1; render(); });
  app.querySelector('#new-game').addEventListener('click', resetGame);
  app.querySelector('#show-history').addEventListener('click', () => { screen = 'history'; render(); });
}
function renderHistory() {
  const games = loadGames();
  app.innerHTML = `<div class="shell"><header><div><p class="eyebrow">YOUR GAMES</p><h1>GAME LOG</h1></div><button class="back-button" id="back-to-game">×</button></header><section class="log-summary"><span>SAVED GAMES</span><strong>${games.length}</strong><small>この端末に保存されています</small></section><section class="game-list">${games.length ? games.map(record => { const view = gameView(record); return `<button class="game-card" data-record="${record.id}"><span>${formatDate(record.playedAt)}</span><strong>${view.total}</strong><i>COUNT-UP · 8 ROUNDS</i><b>›</b></button>`; }).join('') : '<p class="empty-log">まだ保存済みのゲームはありません。<br>24投を終えるとここに記録されます。</p>'}</section></div>`;
  app.querySelector('#back-to-game').addEventListener('click', () => { screen = 'game'; render(); });
  app.querySelectorAll('[data-record]').forEach(button => button.addEventListener('click', () => { selectedRecordId = button.dataset.record; screen = 'detail'; render(); }));
}
function renderDetail() {
  const record = loadGames().find(item => item.id === selectedRecordId);
  if (!record) { screen = 'history'; render(); return; }
  const view = gameView(record);
  app.innerHTML = `<div class="shell"><header><div><p class="eyebrow">COUNT-UP · ${formatDate(record.playedAt)}</p><h1>GAME DETAIL</h1></div><button class="back-button" id="back-to-history">×</button></header><section class="scoreboard"><div class="total"><span>FINAL SCORE</span><output>${view.total}</output></div><div class="progress"><span>8 ROUNDS</span><div class="detail-mark">SAVED</div></div></section><section class="history detail-history"><div class="section-title"><span>ROUND LOG</span><span>1ST / 2ND / 3RD</span><span>SUBTOTAL</span></div>${renderRows(view)}</section><button class="delete-button" id="delete-record">このゲームを削除</button></div>`;
  app.querySelector('#back-to-history').addEventListener('click', () => { screen = 'history'; render(); });
  app.querySelector('#delete-record').addEventListener('click', () => { if (confirm('このゲームの記録を削除しますか？')) { deleteGame(record.id); screen = 'history'; render(); } });
}
function resetGame() { if (game.throws.length && !confirm('現在のゲームをリセットしますか？')) return; game = createGame(); didSaveCurrentGame = false; savedCurrentGameId = null; selectedMultiplier = 1; render(); }
function record(value) { const dart = scoreHit(value); game = addThrow(game, dart.score, dart.hit); selectedMultiplier = 1; if (gameView(game).isComplete && !didSaveCurrentGame) { savedCurrentGameId = saveGame(game).id; didSaveCurrentGame = true; } render(); }
function recordBoard(value, ring) { const dart = dartFromBoard(value, ring); game = addThrow(game, dart.score, dart.hit); if (gameView(game).isComplete && !didSaveCurrentGame) { savedCurrentGameId = saveGame(game).id; didSaveCurrentGame = true; } render(); }
function render() { if (screen === 'history') renderHistory(); else if (screen === 'detail') renderDetail(); else renderGame(); }
render();
