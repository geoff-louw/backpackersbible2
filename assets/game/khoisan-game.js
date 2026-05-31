(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const ASSET_PATH = '/assets/game/';
  const CANVAS_H   = 200;
  const COOLDOWN_F = 52;          // frames between shots (~0.87s at 60fps)
  const HUNTER_SCALE = 1.7;       // size scalar for hunter
  const HUNTER_X_PCT = 0.12;      // hunter left position as fraction of width
  const HUNTER_Y_PCT = 0.22;      // hunter top as fraction of height

  // SVG natural dimensions (mm, but we treat as unitless ratio)
  const HUNTER_VB  = { w: 62.27,  h: 79.91 };  // hunter viewBox
  const ELAND_VB   = { w: 61.02,  h: 27.16 };  // eland viewBox (frames 1+2)
  const ELAND3_VB  = { w: 61.16,  h: 29.67 };  // eland frame 3 is slightly taller

  // ── CANVAS SETUP ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('kalahari-game');
  if (!canvas) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const W   = canvas.offsetWidth;
  const H   = CANVAS_H;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // ── DERIVED CONSTANTS ────────────────────────────────────────────────────────
  const HX = W * HUNTER_X_PCT;
  const HY = H * HUNTER_Y_PCT;
  const HS = HUNTER_SCALE;

  // Hunter rendered dimensions
  const HUNTER_W = HUNTER_VB.w * HS * (H / HUNTER_VB.h) * 0.38;
  const HUNTER_H = H * HS * 0.38;

  // Arrow launch point (tip of nocked arrow in frame)
  const ARROW_SX = HX + HUNTER_W * 1.05;
  const ARROW_SY = HY + HUNTER_H * 0.27;

  // Hunter collision box (torso only)
  const H_COLL = { x: HX + 2, y: HY + 4, w: HUNTER_W * 0.55, h: HUNTER_H * 0.85 };

  // ── IMAGE LOADING ────────────────────────────────────────────────────────────
  const imgs = {};
  const IMG_KEYS = ['h1','h2','h3','h1n','h2n','h3n','e1','e2','e3','rock','arrow'];
  const IMG_SRCS = {
    h1:   ASSET_PATH + 'khoisan-1.svg',
    h2:   ASSET_PATH + 'khoisan-2.svg',
    h3:   ASSET_PATH + 'khoisan-3.svg',
    h1n:  ASSET_PATH + 'khoisan-1_NO_ARROW.svg',
    h2n:  ASSET_PATH + 'khoisan-2_NO_ARROW.svg',
    h3n:  ASSET_PATH + 'khoisan-3_NO_ARROW.svg',
    e1:   ASSET_PATH + 'eland-1.svg',
    e2:   ASSET_PATH + 'eland-2.svg',
    e3:   ASSET_PATH + 'eland-3.svg',
    rock: ASSET_PATH + 'rock.webp',
    arrow:ASSET_PATH + 'arrow.svg',
  };

  let imagesLoaded = 0;
  const TOTAL_IMAGES = IMG_KEYS.length;

  IMG_KEYS.forEach(k => {
    const img = new Image();
    img.onload  = () => { imagesLoaded++; };
    img.onerror = () => { imagesLoaded++; }; // degrade gracefully
    img.src = IMG_SRCS[k];
    imgs[k] = img;
  });

  // ── STATE ────────────────────────────────────────────────────────────────────
  let state      = 'start';   // 'start' | 'playing' | 'dead'
  let score      = 0;
  let hiScore    = 0;
  let gameTick   = 0;
  let huntFrame  = 0;
  let frameTick  = 0;
  let cooldown   = 0;
  let arrows     = [];        // { x, y, vx, vy }
  let eland      = [];        // { x, y, w, h, frame, frameTick, alpha, dying, dyingTimer }
  let particles  = [];        // { x, y, vx, vy, life, maxLife }
  let spawnTimer = 0;
  let spawnInterval = 130;
  let gameSpeed  = 1;

  // Eland rendered size
  const ELAND_RENDER_H = H * 0.38;
  const ELAND_RENDER_W = ELAND_VB.w / ELAND_VB.h * ELAND_RENDER_H;

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  function resetGame() {
    state = 'playing';
    score = 0;
    gameTick = 0;
    huntFrame = 0;
    frameTick = 0;
    cooldown = 0;
    arrows = [];
    eland = [];
    particles = [];
    spawnTimer = 60;
    spawnInterval = 130;
    gameSpeed = 1;
  }

  function shoot() {
    if (cooldown > 0 || state !== 'playing') return;
    arrows.push({ x: ARROW_SX, y: ARROW_SY, vx: 11, vy: -0.4 });
    cooldown = COOLDOWN_F;
  }

  function spawnEland() {
    // vertical alignment: feet sit at same level as hunter's feet
    const groundY = HY + HUNTER_H * 0.98;
    const y = groundY - ELAND_RENDER_H;
    eland.push({
      x: W + 20,
      y: y,
      w: ELAND_RENDER_W,
      h: ELAND_RENDER_H,
      frame: 0,
      frameTick: 0,
      alpha: 1,
      dying: false,
      dyingTimer: 0,
    });
  }

  function addParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const a  = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 35, maxLife: 35 });
    }
  }

  // ── DRAW HELPERS ─────────────────────────────────────────────────────────────
  function drawBg() {
    if (imgs.rock.complete && imgs.rock.naturalWidth > 0) {
      ctx.drawImage(imgs.rock, 0, 0, W, H);
      // slight darkening tint for contrast
      ctx.fillStyle = 'rgba(50,15,0,0.18)';
      ctx.fillRect(0, 0, W, H);
    } else {
      // Fallback gradient
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0,   '#c8966a');
      g.addColorStop(0.4, '#b07840');
      g.addColorStop(1,   '#a06030');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawHunter() {
    // Choose frame set: with arrow if cooldown=0 (arrow ready), without if reloading
    const hasArrow = cooldown === 0;
    const fi = huntFrame; // 0,1,2
    const key = hasArrow ? ['h1','h2','h3'][fi] : ['h1n','h2n','h3n'][fi];
    const img = imgs[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, HX, HY, HUNTER_W, HUNTER_H);
    }
  }

  function drawEland(e) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    const fi = e.frame; // 0,1,2
    const key = ['e1','e2','e3'][fi];
    const img = imgs[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, e.x, e.y, e.w, e.h);
    } else {
      // Fallback silhouette rectangle
      ctx.fillStyle = '#4d0000';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.restore();
  }

  function drawArrow(ar) {
    const img = imgs.arrow;
    if (img && img.complete && img.naturalWidth > 0) {
      // Arrow SVG is horizontal; rotate to match velocity
      const angle = Math.atan2(ar.vy, ar.vx);
      const aw = 55, ah = 8;
      ctx.save();
      ctx.translate(ar.x, ar.y);
      ctx.rotate(angle);
      ctx.drawImage(img, 0, -ah/2, aw, ah);
      ctx.restore();
    } else {
      // Fallback
      ctx.save();
      ctx.strokeStyle = '#4d0000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const angle = Math.atan2(ar.vy, ar.vx);
      ctx.translate(ar.x, ar.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.fillStyle = '#4d0000';
      ctx.beginPath();
      ctx.moveTo(10,0); ctx.lineTo(4,-4); ctx.lineTo(4,4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
      ctx.fillStyle = '#4d0000';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawCooldownBar() {
    if (cooldown <= 0) return;
    const pct = cooldown / COOLDOWN_F;
    const bw = 44, bh = 5, bx = HX + 2, by = HY - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(bx, by, bw, bh);
    // Colour shifts red→gold as it refills
    const r = Math.floor(255);
    const g = Math.floor(180 + 75 * (1 - pct));
    ctx.fillStyle = `rgba(${r},${g},80,0.88)`;
    ctx.fillRect(bx, by, bw * pct, bh);
  }

  function drawHUD() {
    ctx.save();
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillStyle = 'rgba(255,220,150,0.92)';
    ctx.textAlign = 'right';
    ctx.fillText('Score: ' + score, W - 12, 20);
    if (hiScore > 0) {
      ctx.font = '11px Georgia, serif';
      ctx.fillStyle = 'rgba(255,210,130,0.72)';
      ctx.fillText('Best: ' + hiScore, W - 12, 36);
    }
    ctx.restore();
  }

  function drawOverlay(lines) {
    ctx.save();
    ctx.font = 'bold 15px Georgia, serif';
    let maxW = 0;
    lines.forEach(l => {
      ctx.font = l.bold ? 'bold 15px Georgia,serif' : '12px Georgia,serif';
      maxW = Math.max(maxW, ctx.measureText(l.t).width);
    });
    const lh = 22, pad = 16;
    const boxW = maxW + pad * 2.5;
    const boxH = lh * lines.length + pad * 2 - 4;
    const bx = W/2 - boxW/2, by = H/2 - boxH/2;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    lines.forEach((l, i) => {
      ctx.font = l.bold ? 'bold 15px Georgia,serif' : '12px Georgia,serif';
      ctx.fillStyle = l.col || 'rgba(255,220,150,0.97)';
      ctx.textAlign = 'center';
      ctx.fillText(l.t, W/2, by + pad + lh * i + lh * 0.7);
    });
    ctx.restore();
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  function update() {
    if (state !== 'playing') return;
    gameTick++;

    // Animate hunter
    frameTick++;
    if (frameTick >= 9) { frameTick = 0; huntFrame = (huntFrame + 1) % 3; }

    // Cooldown
    if (cooldown > 0) cooldown--;

    // Speed ramp
    gameSpeed = 1 + gameTick * 0.0009;

    // Eland speed: eland runs ahead of (to the right of) the hunter,
    // moving rightward but slower than the hunter would scroll — achieved
    // by moving them leftward at a modest speed so they close distance gradually
    const elandSpeed = 1.1 * gameSpeed;

    // Spawn
    spawnTimer++;
    spawnInterval = Math.max(55, 130 - gameTick * 0.03);
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEland();
    }

    // Move eland
    eland.forEach(e => {
      if (!e.dying) {
        e.x -= elandSpeed;
        // Animate eland run cycle
        e.frameTick++;
        if (e.frameTick >= 8) { e.frameTick = 0; e.frame = (e.frame + 1) % 3; }
      }
    });

    // Move arrows
    arrows = arrows.filter(ar => {
      ar.x += ar.vx;
      ar.vy += 0.1;
      ar.y += ar.vy;
      return ar.x < W + 30 && ar.y < H + 30 && ar.y > -20;
    });

    // Arrow–eland collision
    arrows.forEach((ar, ai) => {
      eland.forEach(e => {
        if (e.dying) return;
        if (ar.x > e.x && ar.x < e.x + e.w && ar.y > e.y && ar.y < e.y + e.h) {
          e.dying = true;
          e.dyingTimer = 45;
          score += 10 + Math.floor(gameTick / 100);
          addParticles(ar.x, ar.y);
          arrows.splice(ai, 1);
        }
      });
    });

    // Dying eland fade
    eland = eland.filter(e => {
      if (e.dying) {
        e.dyingTimer--;
        e.alpha = e.dyingTimer / 45;
        return e.dyingTimer > 0;
      }
      // Off screen to the left — eland escaped
      if (e.x + e.w < 0) {
        // Eland escaped — game over
        state = 'dead';
        if (score > hiScore) hiScore = score;
        return false;
      }
      // Collision with hunter
      if (
        e.x < H_COLL.x + H_COLL.w &&
        e.x + e.w > H_COLL.x &&
        e.y < H_COLL.y + H_COLL.h &&
        e.y + e.h > H_COLL.y
      ) {
        state = 'dead';
        if (score > hiScore) hiScore = score;
      }
      return true;
    });

    // Particles
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      return p.life > 0;
    });
  }

  // ── MAIN LOOP ────────────────────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    update();

    eland.forEach(drawEland);
    arrows.forEach(drawArrow);
    drawParticles();
    drawHunter();
    drawCooldownBar();

    if (state === 'playing') {
      drawHUD();
    } else if (state === 'start') {
      drawHUD();
      drawOverlay([
        { t: 'CAN YOU SURVIVE THE KALAHARI?', bold: true },
        { t: 'Tap to play', col: 'rgba(255,210,130,0.85)' },
      ]);
    } else if (state === 'dead') {
      drawHUD();
      drawOverlay([
        { t: 'The Kalahari claimed you.', bold: true, col: 'rgba(255,190,110,0.97)' },
        { t: 'Score: ' + score + '   Best: ' + hiScore, col: 'rgba(255,220,150,0.9)' },
        { t: 'Tap to try again', col: 'rgba(255,210,130,0.75)' },
      ]);
    }

    requestAnimationFrame(loop);
  }

  // ── INPUT ────────────────────────────────────────────────────────────────────
  function handleTap() {
    if (state === 'start' || state === 'dead') {
      resetGame();
    } else {
      shoot();
    }
  }

  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); handleTap(); }, { passive: false });

  // ── START ────────────────────────────────────────────────────────────────────
  // Wait for at least the rock image before first paint; otherwise start anyway
  function waitAndStart() {
    if (imagesLoaded >= TOTAL_IMAGES || imagesLoaded >= 1) {
      loop();
    } else {
      setTimeout(waitAndStart, 50);
    }
  }
  waitAndStart();

})();
