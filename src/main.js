import { addThrow, createGame, gameView, undoThrow } from './game.js';
import { dartAtBoardPosition, dartboardMarkup } from './dartboard.js';
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
const PRECISION_LOUPE_SCALE = 2.5;
const PRECISION_LOUPE_SIZE_PX = 148;
const BOARD_VIEWBOX_SIZE = 300;

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
    <section class="input-panel ${view.isComplete ? 'completed' : ''}"><div class="input-tabs"><button class="input-tab ${inputMode === 'keypad' ? 'selected' : ''}" data-input-mode="keypad">数字キー</button><button class="input-tab ${inputMode === 'board' ? 'selected' : ''}" data-input-mode="board">盤面タップ</button></div>${inputMode === 'keypad' ? `<div class="mode-row"><span>SELECT AREA</span><div class="multipliers">${[1,2,3].map(m => `<button class="multiplier ${selectedMultiplier === m ? 'selected' : ''}" data-multiplier="${m}">${multiplierLabel(m)}</button>`).join('')}</div></div><div class="keypad">${numberButtons}<button class="score-key special" data-score="BULL"><span>BULL</span><small>50</small></button><button class="score-key miss" data-score="MISS"><span>MISS</span><small>0</small></button></div>` : `<div class="board-guide"><span>盤面に触れて、ルーペで狙いを合わせる</span><small>指を離すと着弾位置を記録</small></div><div class="board-wrap">${dartboardMarkup()}</div><button class="miss-board" data-score="MISS">MISS　0</button>`}<button class="undo" id="undo" ${game.throws.length ? '' : 'disabled'}>←　直前の1投を取り消す</button>${view.isComplete ? '<p class="complete-message">GAME SAVED — おつかれさまでした！</p>' : ''}</section>
    <section class="history"><div class="section-title"><span>ROUND LOG</span><span>1ST / 2ND / 3RD</span><span>SUBTOTAL</span></div>${renderRows(view)}</section></div>`;
  app.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => record(button.dataset.score)));
  const board = app.querySelector('.dartboard');
  if (board) bindBoardInput(board);
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
  const marks = record.throws.flatMap((dart, index) => dart.position ? [{ ...dart.position, label: index + 1 }] : []);
  const map = marks.length ? `<section class="landing-map"><div class="map-heading"><span>LANDING MAP</span><small>盤面タップで記録した着弾位置</small></div><div class="board-wrap map-board">${dartboardMarkup({ marks })}</div></section>` : '';
  app.innerHTML = `<div class="shell"><header><div><p class="eyebrow">COUNT-UP · ${formatDate(record.playedAt)}</p><h1>GAME DETAIL</h1></div><button class="back-button" id="back-to-history">×</button></header><section class="scoreboard"><div class="total"><span>FINAL SCORE</span><output>${view.total}</output></div><div class="progress"><span>8 ROUNDS</span><div class="detail-mark">SAVED</div></div></section><section class="history detail-history"><div class="section-title"><span>ROUND LOG</span><span>1ST / 2ND / 3RD</span><span>SUBTOTAL</span></div>${renderRows(view)}</section>${map}<button class="delete-button" id="delete-record">このゲームを削除</button></div>`;
  app.querySelector('#back-to-history').addEventListener('click', () => { screen = 'history'; render(); });
  app.querySelector('#delete-record').addEventListener('click', () => { if (confirm('このゲームの記録を削除しますか？')) { deleteGame(record.id); screen = 'history'; render(); } });
}
function resetGame() { if (game.throws.length && !confirm('現在のゲームをリセットしますか？')) return; game = createGame(); didSaveCurrentGame = false; savedCurrentGameId = null; selectedMultiplier = 1; render(); }
function record(value) { const dart = scoreHit(value); if (commitThrow(dart)) selectedMultiplier = 1; }
function finalizeThrow() { vibrateOnConfirmedThrow(); if (gameView(game).isComplete && !didSaveCurrentGame) { savedCurrentGameId = saveGame(game).id; didSaveCurrentGame = true; } render(); }
function boardPosition(svg, event) { const box = svg.getBoundingClientRect(); return { x: Math.round((((event.clientX - box.left) / box.width) * BOARD_VIEWBOX_SIZE - 150) * 10) / 10, y: Math.round((((event.clientY - box.top) / box.height) * BOARD_VIEWBOX_SIZE - 150) * 10) / 10 }; }
function commitThrow(dart, position = null) { const nextGame = addThrow(game, dart.score, dart.hit, position); if (nextGame === game) return false; game = nextGame; finalizeThrow(); return true; }
function recordBoardPosition(position) { const dart = dartAtBoardPosition(position); return dart ? commitThrow(dart, position) : false; }
function vibrateOnConfirmedThrow() { navigator.vibrate?.(10); }

function bindBoardInput(svg) {
  let activePointerId = null;
  let latestPosition = null;
  let loupe = null;

  const removeLoupe = () => { loupe?.remove(); loupe = null; };
  const updateLoupe = (event) => {
    latestPosition = boardPosition(svg, event);
    if (!loupe) return;
    const halfView = BOARD_VIEWBOX_SIZE / PRECISION_LOUPE_SCALE / 2;
    const loupeSvg = loupe.querySelector('svg');
    loupeSvg.setAttribute('viewBox', `${150 + latestPosition.x - halfView} ${150 + latestPosition.y - halfView} ${halfView * 2} ${halfView * 2}`);
    const left = Math.max(8, Math.min(window.innerWidth - PRECISION_LOUPE_SIZE_PX - 8, event.clientX - PRECISION_LOUPE_SIZE_PX / 2));
    const top = Math.max(8, event.clientY - PRECISION_LOUPE_SIZE_PX - 34);
    loupe.style.left = `${left}px`;
    loupe.style.top = `${top}px`;
  };
  const showLoupe = (event) => {
    loupe = document.createElement('div');
    loupe.className = 'precision-loupe';
    loupe.setAttribute('aria-hidden', 'true');
    loupe.innerHTML = `${dartboardMarkup()}<span class="precision-crosshair"></span>`;
    document.body.append(loupe);
    updateLoupe(event);
  };

  svg.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // The board has its own press-and-drag interaction; do not let WebKit
    // turn this press into native text selection or a long-press callout.
    if (event.cancelable) event.preventDefault();
    activePointerId = event.pointerId;
    latestPosition = boardPosition(svg, event);
    svg.setPointerCapture?.(event.pointerId);
    showLoupe(event);
  });
  svg.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointerId) return;
    latestPosition = boardPosition(svg, event);
    updateLoupe(event);
  });
  svg.addEventListener('pointerup', event => {
    if (event.pointerId !== activePointerId) return;
    const position = boardPosition(svg, event);
    activePointerId = null;
    removeLoupe();
    recordBoardPosition(position);
    event.preventDefault();
  });
  svg.addEventListener('pointercancel', event => {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    removeLoupe();
  });
  svg.addEventListener('contextmenu', event => event.preventDefault());
}
function render() { if (screen === 'history') renderHistory(); else if (screen === 'detail') renderDetail(); else renderGame(); }
render();
