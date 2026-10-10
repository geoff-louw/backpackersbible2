/*
  Run with the Bulls - Backpackers Bible
  Usage on any page (see game-test.html for the full snippet):
    <div id="bull-run"> ...poster image (fallback for visitors without JavaScript)... </div>
    <link rel="stylesheet" href="/spain/assets/game/bull-run.css">
    <script src="/spain/assets/game/bull-run.js" defer></script>
  Anything you put inside #bull-run stays on the page; the game is added above it.
  Images are loaded from the img/ folder next to this script, so the page's depth doesn't matter.
*/
(function () {
'use strict';

/* ================= LOCATION OF IMAGES ================= */
var SCRIPT = document.currentScript;
var IMG_BASE = SCRIPT && SCRIPT.src
  ? new URL('img/', SCRIPT.src).href
  : '/spain/assets/game/img/';          // fallback if the script was injected oddly

function start() {
const root = document.getElementById('bull-run');
if (!root || root.dataset.ready) return;
root.dataset.ready = '1';

const GAME_NAME = 'Run with the Bulls';
const GAME_ABOUT = 'Run with the Bulls is a free arcade game from Backpackers Bible. Dash along a Spanish street as bulls charge towards you: jump single bulls, somersault over pairs and see how far you can run. It works on phones and computers, with no download or sign-up.';

root.querySelectorAll('.br-fallback').forEach(n => n.remove());   // the static poster is only for visitors without JavaScript
const ui = document.createElement('div');
ui.className = 'br-ui';
ui.innerHTML =
  '<canvas class="br-canvas" width="900" height="500" tabindex="0" role="application" aria-roledescription="game" ' +
  'aria-label="Run with the Bulls, an optional visual arcade game. Press Space or click to start. Left and right arrows move, Space or up arrow jumps, down arrow does a somersault, Escape pauses."></canvas>' +
  '<div class="br-pad">' +
    '<button type="button" data-k="left" aria-label="Move back">&#9664;</button>' +
    '<button type="button" data-k="right" aria-label="Move forward">&#9654;</button>' +
    '<button type="button" data-k="jump">JUMP</button>' +
    '<button type="button" data-k="roll">SOMERSAULT</button>' +
  '</div>' +
  '<div class="br-hint">&larr;&#xFE0E; &rarr;&#xFE0E; move &nbsp;|&nbsp; Space / &uarr;&#xFE0E; jump &nbsp;|&nbsp; &darr;&#xFE0E; somersault (clears two bulls) &nbsp;|&nbsp; Esc pause</div>' +
  '<div class="br-live" role="status" aria-live="polite"></div>';
root.insertBefore(ui, root.firstChild);

/* Structured data so search engines know what this is (descriptive only; no ratings are claimed) */
if (!document.getElementById('bull-run-jsonld')) {
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.id = 'bull-run-jsonld';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: GAME_NAME,
    description: GAME_ABOUT,
    genre: ['Arcade', 'Endless runner'],
    gamePlatform: 'Web browser',
    playMode: 'SinglePlayer',
    isAccessibleForFree: true,
    inLanguage: 'en-GB',
    image: new URL('poster.webp', IMG_BASE).href,
    publisher: { '@type': 'Organization', name: 'Backpackers Bible', url: 'https://backpackersbible.com' }
  });
  document.head.appendChild(ld);
}

/* ================= CONFIG (all tunable) ================= */
const W = 900, H = 500;
const GROUND = 476;                 // y where the feet land (inside the cobbled strip of the background)
const BACKGROUND_FILE = 'background.webp';   // drawn at 500px high; set to null for a plain placeholder
const BG_MIRROR = true;             // every second tile is flipped horizontally so the repeats join seamlessly
const BG_SPEED_FACTOR = 1.0;        // 1 = scrolls at ground speed; lower for a parallax feel

const SCROLL_START = 230, SCROLL_MAX = 330;   // px/s ground speed, ramps up over RAMP_METRES
const RAMP_METRES = 150;
/* Opening sequence: two single bulls, then the first pair (needs a somersault). After that it is random. */
const OPENING = ['single', 'single', 'pair'];
const OPENING_START = 1.2;                     // seconds before the first bull appears
const OPENING_GAPS = [1.9, 2.0];               // seconds between the opening bulls
const BULL_EXTRA = 170;                        // bulls run this much faster than the ground (px/s)
const PX_PER_METRE = 60;

const HOME_X = 200, MIN_X = 60, MAX_X = 620;   // guru's screen x range
const MOVE_SPEED = 260, RETURN_SPEED = 120;    // walking speed; drift back to HOME_X after a somersault

const JUMP  = { height: 225, gravity: 1150 };                    // apex in px
const ROLL  = { height: 268, gravity: 1000, forward: 240 };      // somersault: higher, longer, travels forward
const BUFFER = 0.12;                           // seconds a jump press is remembered just before landing

/* Sprite alignment: y of the feet (bottom of boots / hooves) inside each frame */
const GURU_FOOT = 183, BULL_FOOT = 175;
const GURU_SIZE = 200, BULL_W = 277;

/* Hitboxes (relative to the top-left of each sprite frame) */
const GURU_HB = { x: 72, y: 40, w: 56, h: 140 };
const BULL_HB = { x: 25, y: 70, w: 180, h: 105 };

/* Animation speeds */
const RUN_FPS = 9, BULL_FPS = 12;

/* ================= ASSETS ================= */
const NAMES = {
  stand: ['guru-standing-still'],
  run:   ['guru-running-1', 'guru-running-2', 'guru-running-3'],
  jump:  ['guru-jumping-1', 'guru-jumping-2', 'guru-jumping-3'],
  roll:  ['guru-somersault-1', 'guru-somersault-2', 'guru-somersault-3', 'guru-somersault-4', 'guru-somersault-5'],
  bull:  ['bull-1', 'bull-2', 'bull-3', 'bull-4']
};
const IMG = {};
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
}
async function loadAll() {
  for (const k of Object.keys(NAMES)) IMG[k] = await Promise.all(NAMES[k].map(n => loadImg(IMG_BASE + n + '.webp')));
  if (BACKGROUND_FILE) IMG.bg = await loadImg(IMG_BASE + BACKGROUND_FILE);
}

/* ================= CANVAS ================= */
const cvs = root.querySelector('.br-canvas');
const ctx = cvs.getContext('2d');
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = cvs.clientWidth || W;
  cvs.width = Math.round(cssW * dpr);
  cvs.height = Math.round(cssW * (H / W) * dpr);
  const s = cvs.width / W;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
if ('ResizeObserver' in window) new ResizeObserver(fit).observe(cvs);
else window.addEventListener('resize', fit);

/* ================= STATE ================= */
let state = 'loading';      // loading | ready | playing | over
let paused = false;         // game is running but halted (focus lost / scrolled out of view)
let distance = 0, bgOffset = 0, best = 0, overT = 0;
let player, bulls, spawnT, spawnCount = 0, bufJump, bufRoll, showHB = false;
try { best = parseInt(localStorage.getItem('bullrun-best') || '0', 10) || 0; } catch (e) {}

const liveEl = ui.querySelector('.br-live');
function announce(msg) {            // spoken by screen readers; invisible on screen
  liveEl.textContent = '';
  setTimeout(() => { liveEl.textContent = msg; }, 60);
}

const keys = { left: false, right: false };
const rand = (a, b) => a + Math.random() * (b - a);
const metres = () => Math.floor(distance / PX_PER_METRE);
const scrollSpeed = () => SCROLL_START + (SCROLL_MAX - SCROLL_START) * Math.min(1, distance / PX_PER_METRE / RAMP_METRES);
const bullSpeed = () => scrollSpeed() + BULL_EXTRA;

function reset() {
  player = { x: HOME_X, h: 0, vy: 0, vx: 0, mode: 'run', modeT: 0, animT: 0 };
  bulls = [];
  distance = 0; bgOffset = 0;
  spawnT = OPENING_START; spawnCount = 0; bufJump = 0; bufRoll = 0;
}
function startGame() { reset(); paused = false; state = 'playing'; announce('Game started. Bulls are charging. Jump single bulls and somersault over pairs.'); }

/* ================= INPUT ================= */
function doJump() {
  if (state !== 'playing' || paused) return;
  if (player.mode === 'run') {
    player.mode = 'jump'; player.modeT = 0; player.vy = Math.sqrt(2 * JUMP.gravity * JUMP.height); player.vx = 0;
  } else bufJump = BUFFER;
}
function doRoll() {
  if (state !== 'playing' || paused) return;
  if (player.mode === 'run') {
    player.mode = 'roll'; player.modeT = 0; player.vy = Math.sqrt(2 * ROLL.gravity * ROLL.height); player.vx = ROLL.forward;
  } else bufRoll = BUFFER;
}
function action(fn) {
  if (paused) { paused = false; announce('Carrying on.'); return; }
  if (state === 'ready' || state === 'over') {
    if (state === 'over' && overT < 0.5) return;
    startGame(); return;
  }
  fn();
}

/* Keys only act while the game has focus, so the page still scrolls normally everywhere else */
ui.addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
  else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') action(doJump);
  else if (k === 'ArrowDown' || k === 's' || k === 'S') action(doRoll);
  else if (k === 'Escape' || k === 'p' || k === 'P') togglePause();
  else if (k === 'h' || k === 'H') showHB = !showHB;
});
window.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
});

/* Focus ring only for keyboard users, so mouse and touch players never see an outline */
let kbd = false;
document.addEventListener('keydown', () => { kbd = true; }, true);
document.addEventListener('pointerdown', () => { kbd = false; root.classList.remove('br-kb'); }, true);
cvs.addEventListener('focus', () => root.classList.toggle('br-kb', kbd));
cvs.addEventListener('blur', () => root.classList.remove('br-kb'));

cvs.addEventListener('pointerdown', () => {
  cvs.focus({ preventScroll: true });
  if (paused || state === 'ready' || state === 'over') action(doJump);
});

root.querySelectorAll('.br-pad button').forEach(b => {
  const k = b.dataset.k;
  const down = () => {
    if (k === 'left') keys.left = true;
    else if (k === 'right') keys.right = true;
    else action(k === 'jump' ? doJump : doRoll);
  };
  const up = () => { if (k === 'left') keys.left = false; else if (k === 'right') keys.right = false; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); down(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, up));
});

/* Pause when the player clicks away, switches tab, or scrolls the game out of view */
function pauseIfPlaying() {
  if (state === 'playing' && !paused) { paused = true; keys.left = keys.right = false; announce('Paused. Press Space or click to carry on.'); }
}
function togglePause() {
  if (state !== 'playing') return;
  if (paused) { paused = false; announce('Carrying on.'); } else pauseIfPlaying();
}
ui.addEventListener('focusout', e => { if (!ui.contains(e.relatedTarget)) pauseIfPlaying(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfPlaying(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => { if (!es[0].isIntersecting) pauseIfPlaying(); }, { threshold: 0.3 }).observe(cvs);
}

/* ================= UPDATE ================= */
function spawnBulls() {
  const m = metres();
  const pair = spawnCount < OPENING.length
    ? OPENING[spawnCount] === 'pair'
    : Math.random() < Math.min(0.5, 0.3 + m / 400);
  spawnCount++;
  const x = W + 60, pitch = 320;
  bulls.push({ x, t: rand(0, 1) });
  if (pair) bulls.push({ x: x + pitch, t: rand(0, 1) });
  if (spawnCount <= OPENING_GAPS.length) { spawnT = OPENING_GAPS[spawnCount - 1]; return; }
  const diff = Math.min(1, m / RAMP_METRES);
  spawnT = Math.max(1.65, rand(2.0, 3.0) - diff * 0.5) + (pair ? 0.8 : 0);
}

function update(dt) {
  if (state === 'over') { overT += dt; return; }
  if (state !== 'playing') { player.animT += dt; return; }
  if (paused) return;

  const sp = scrollSpeed(), bs = bullSpeed();
  distance += sp * dt;
  bgOffset += sp * dt * BG_SPEED_FACTOR;

  /* player */
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  player.x += dir * MOVE_SPEED * dt + player.vx * dt;
  if (dir === 0 && player.mode === 'run' && player.x > HOME_X) player.x = Math.max(HOME_X, player.x - RETURN_SPEED * dt);
  player.x = Math.max(MIN_X, Math.min(MAX_X, player.x));

  if (player.mode === 'run') {
    player.animT += dt * (sp / SCROLL_START);
  } else {
    const g = player.mode === 'jump' ? JUMP.gravity : ROLL.gravity;
    player.modeT += dt;
    player.vy -= g * dt;
    player.h += player.vy * dt;
    if (player.h <= 0) {
      player.h = 0; player.vy = 0; player.vx = 0; player.mode = 'run'; player.modeT = 0;
      if (bufRoll > 0) { bufRoll = 0; doRoll(); }
      else if (bufJump > 0) { bufJump = 0; doJump(); }
    }
  }
  bufJump = Math.max(0, bufJump - dt);
  bufRoll = Math.max(0, bufRoll - dt);

  /* bulls */
  spawnT -= dt;
  if (spawnT <= 0) spawnBulls();
  for (const b of bulls) { b.x -= bs * dt; b.t += dt * (bs / 450); }
  bulls = bulls.filter(b => b.x > -BULL_W - 40);

  /* collisions */
  const gx = player.x + GURU_HB.x, gy = GROUND - player.h - GURU_FOOT + GURU_HB.y;
  for (const b of bulls) {
    const bx = b.x + BULL_HB.x, by = GROUND - BULL_FOOT + BULL_HB.y;
    if (gx < bx + BULL_HB.w && gx + GURU_HB.w > bx && gy < by + BULL_HB.h && gy + GURU_HB.h > by) {
      state = 'over'; overT = 0;
      const m = metres();
      const isBest = m > best;
      if (isBest) { best = m; try { localStorage.setItem('bullrun-best', String(best)); } catch (e) {} }
      announce('Gored after ' + m + ' metres. ' + (isBest ? 'New best. ' : 'Your best is ' + best + ' metres. ') + 'Press Space or click to try again.');
      return;
    }
  }
}

/* ================= DRAW ================= */
function guruFrame() {
  if (state === 'ready') return IMG.stand[0];
  if (player.mode === 'jump') {
    const i = player.vy > 260 ? 0 : (player.vy < -260 ? 2 : 1);
    return IMG.jump[i];
  }
  if (player.mode === 'roll') {
    const air = 2 * Math.sqrt(2 * ROLL.gravity * ROLL.height) / ROLL.gravity;
    const i = Math.min(4, Math.floor((player.modeT / air) * 5));
    return IMG.roll[i];
  }
  return IMG.run[Math.floor(player.animT * RUN_FPS) % 3];
}

function drawBackground() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  if (IMG.bg && IMG.bg.naturalWidth) {
    const s = H / IMG.bg.naturalHeight, w = IMG.bg.naturalWidth * s;
    const k = Math.floor(bgOffset / w);
    let x = -(bgOffset - k * w);
    for (let i = 0; x < W; i++, x += w) {
      if (BG_MIRROR && (k + i) % 2 === 1) {
        ctx.save(); ctx.translate(x + w + 0.5, 0); ctx.scale(-1, 1);
        ctx.drawImage(IMG.bg, 0, 0, w + 1, H); ctx.restore();
      } else ctx.drawImage(IMG.bg, x - 0.5, 0, w + 1, H);
    }
    return;
  }
  /* placeholder if no background image is available */
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
  ctx.lineWidth = 2;
  const step = 90, off = bgOffset % step;
  for (let x = -off; x < W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, GROUND + 14); ctx.lineTo(x + 40, GROUND + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 45, GROUND + 28); ctx.lineTo(x + 70, GROUND + 28); ctx.stroke();
  }
}

function shadow(cx, scale) {
  ctx.fillStyle = 'rgba(0,0,0,' + (0.22 * scale).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(cx, GROUND + 4, 55 * scale, 8 * scale, 0, 0, Math.PI * 2); ctx.fill();
}

function text(str, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px "Century Gothic", CenturyGothic, AppleGothic, sans-serif';
  ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.fillText(str, x, y);
}

function drawHB(x, y, w, h, c) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }

function btn(label, y, dark) {
  const w = 420, h = 48, x = W / 2 - w / 2;
  if (dark) {                       /* white text on a plain black rectangle */
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y - 32, w, h);
    text(label, W / 2, y, 18, '#fff');
    return;
  }
  ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#670000'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y - 32, w, h, 10); else ctx.rect(x, y - 32, w, h);
  ctx.fill(); ctx.stroke();
  text(label, W / 2, y, 18, '#000');
}

function draw() {
  drawBackground();
  if (state === 'loading') { text('Loading…', W / 2, H / 2, 28, '#000'); return; }

  /* shadows */
  shadow(player.x + GURU_SIZE / 2, Math.max(0.35, 1 - player.h / 320));
  for (const b of bulls) shadow(b.x + BULL_W / 2, 1.5);

  /* bulls */
  for (const b of bulls) {
    const f = IMG.bull[Math.floor(b.t * BULL_FPS) % 4];
    ctx.drawImage(f, b.x, GROUND - BULL_FOOT);
    if (showHB) drawHB(b.x + BULL_HB.x, GROUND - BULL_FOOT + BULL_HB.y, BULL_HB.w, BULL_HB.h, '#bc1d23');
  }

  /* guru */
  const gy = GROUND - player.h - GURU_FOOT;
  ctx.drawImage(guruFrame(), player.x, gy);
  if (showHB) drawHB(player.x + GURU_HB.x, gy + GURU_HB.y, GURU_HB.w, GURU_HB.h, '#005F8A');

  /* HUD */
  if (state !== 'ready') {
    text(metres() + ' m', W - 20, 40, 28, '#000', 'right');
    text('Best ' + best + ' m', W - 20, 66, 15, '#000', 'right');
  }

  if (state === 'ready') {
    ctx.fillStyle = '#000';
    ctx.fillRect(W / 2 - 290, 60, 580, 180);
    text('RUN WITH THE BULLS', W / 2, 125, 40, '#fff');
    text('Spain, 7 a.m. Try to keep your trousers.', W / 2, 158, 16, '#fff');
    text('CLICK OR TAP TO RUN', W / 2, 210, 18, '#fff');
  }
  if (state === 'playing' && paused) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(W / 2 - 290, 90, 580, 150);
    text('PAUSED', W / 2, 160, 48, '#fff');
    text('CLICK OR TAP TO CARRY ON', W / 2, 210, 18, '#fff');
  }
  if (state === 'over') {
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(0, 0, W, H);
    text('GORED!', W / 2, 150, 54, '#000');
    text(metres() + ' m' + (metres() >= best && best > 0 ? '  (new best!)' : '   |   best ' + best + ' m'), W / 2, 190, 22, '#000');
    btn('CLICK OR TAP TO TRY AGAIN', 250, true);
  }
}

/* ================= LOOP ================= */
let last = 0;
function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  if (state !== 'loading') update(dt);
  draw();
  requestAnimationFrame(loop);
}

fit();
reset();
loadAll().then(() => { state = 'ready'; announce('Run with the Bulls is ready. Press Space or click to start. Escape pauses.'); });
requestAnimationFrame(ts => { last = ts; requestAnimationFrame(loop); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
