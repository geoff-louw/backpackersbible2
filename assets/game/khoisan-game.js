(function () {
  'use strict';

  const ASSET_PATH   = '/assets/game/';
  const CANVAS_H     = 200;
  const COOLDOWN_F   = 72;

  // ── CANVAS ──────────────────────────────────────────────────────────────────
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

  // ── RESPONSIVE SCALE ────────────────────────────────────────────────────────
  const isMobile  = W < 600;
  const SCALE_MOD = isMobile ? 0.70 : 1.0;
  const HS        = 1.7 * SCALE_MOD;

  const HX = W * (isMobile ? 0.06 : 0.12);
  const HY = H * 0.22;

  // Hunter rendered size derived from SVG aspect ratio (62.27 x 79.91mm)
  const HUNTER_H_PX = H * HS * 0.38;
  const HUNTER_W_PX = HUNTER_H_PX * (62.27 / 79.91);

  // Arrow launch point
  const ARROW_SX = HX + HUNTER_W_PX * 1.05;
  const ARROW_SY = HY + HUNTER_H_PX * 0.27;

  // Hunter collision box
  const H_COLL = { x: HX + 2, y: HY + 4, w: HUNTER_W_PX * 0.55, h: HUNTER_H_PX * 0.85 };

  // Eland size — aspect ratio 61.02 x 27.16mm
  const ELAND_RENDER_H = H * 0.38 * SCALE_MOD;
  const ELAND_RENDER_W = ELAND_RENDER_H * (61.02 / 27.16);

  // ── IMAGES ──────────────────────────────────────────────────────────────────
  const imgs = {};
  const IMG_SRCS = {
    h1:   'khoisan-1.svg',          h2:   'khoisan-2.svg',          h3:   'khoisan-3.svg',
    h1n:  'khoisan-1_NO_ARROW.svg', h2n:  'khoisan-2_NO_ARROW.svg', h3n:  'khoisan-3_NO_ARROW.svg',
    h1u:  'khoisan-1_up.svg',       h2u:  'khoisan-2_up.svg',       h3u:  'khoisan-3_up.svg',
    h1nu: 'khoisan-1_NO_ARROW_up.svg', h2nu: 'khoisan-2_NO_ARROW_up.svg', h3nu: 'khoisan-3_NO_ARROW_up.svg',
    e1:   'eland-1.svg',            e2:   'eland-2.svg',            e3:   'eland-3.svg',
    rock: 'rock2.webp',
    arrow:'arrow.svg',
  };
  let imagesLoaded = 0;
  const TOTAL_IMAGES = Object.keys(IMG_SRCS).length;
  Object.keys(IMG_SRCS).forEach(k => {
    const img = new Image();
    img.onload = img.onerror = () => imagesLoaded++;
    img.src = ASSET_PATH + IMG_SRCS[k];
    imgs[k] = img;
  });

  // ── SCROLLING BACKGROUND ────────────────────────────────────────────────────
  const BG_IMG_W        = 2200;
  const BG_SCROLL_SPEED = 0.7;
  let bgOffset = 0;

  function drawBg() {
    if (state === 'playing') {
      bgOffset += BG_SCROLL_SPEED;
      if (bgOffset >= BG_IMG_W) bgOffset -= BG_IMG_W;
    }

    const img = imgs.rock;
    if (img.complete && img.naturalWidth > 0) {
      const sh   = img.naturalHeight || 200;
      const srcX = Math.floor(bgOffset);

      const hScale = W / BG_IMG_W;
      const srcW1  = BG_IMG_W - srcX;
      const dstX2  = Math.round(srcW1 * hScale);
      ctx.drawImage(img, srcX, 0, srcW1, sh,  0,    0, dstX2,    H);

      if (dstX2 < W) {
        ctx.drawImage(img, 0, 0, srcX, sh,  dstX2, 0, W - dstX2, H);
      }
    } else {
      const g = ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,'#c8966a'); g.addColorStop(0.4,'#b07840'); g.addColorStop(1,'#a06030');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    }
    ctx.fillStyle = 'rgba(40,10,0,0.15)';
    ctx.fillRect(0,0,W,H);
  }

  // ── DRAW HUNTER ─────────────────────────────────────────────────────────────
  function drawHunter() {
    const fi = huntFrame;
    let key;
    if (aimHigh) {
      key = cooldown === 0 ? ['h1u','h2u','h3u'][fi] : ['h1nu','h2nu','h3nu'][fi];
    } else {
      key = cooldown === 0 ? ['h1','h2','h3'][fi]    : ['h1n','h2n','h3n'][fi];
    }
    const img = imgs[key];
    ctx.save();
    ctx.globalAlpha = 0.82;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, HX, HY, HUNTER_W_PX, HUNTER_H_PX);
    }
    ctx.restore();
  }

  // ── DRAW ELAND ───────────────────────────────────────────────────────────────
  function drawEland(e) {
    ctx.save();
    ctx.globalAlpha = e.alpha * 0.85;
    const key = ['e1','e2','e3'][e.frame];
    const img = imgs[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, e.x, e.y, e.w, e.h);
    } else {
      ctx.fillStyle = '#4d0000';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.restore();
  }

  // ── DRAW ARROW ───────────────────────────────────────────────────────────────
  function drawArrow(ar) {
    const img = imgs.arrow;
    const angle = Math.atan2(ar.vy, ar.vx);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.translate(ar.x, ar.y);
    ctx.rotate(angle);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, -4, 55, 8);
    } else {
      ctx.strokeStyle = '#4d0000'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(10,0); ctx.stroke();
      ctx.fillStyle = '#4d0000';
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(4,-4); ctx.lineTo(4,4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ── PARTICLES ────────────────────────────────────────────────────────────────
  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
      ctx.fillStyle = '#4d0000';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  function addParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random()*Math.PI*2, sp = 1.5+Math.random()*3;
      particles.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:35, maxLife:35});
    }
  }

  // ── COOLDOWN BAR ─────────────────────────────────────────────────────────────
  function drawCooldownBar() {
    if (cooldown <= 0) return;
    const pct = cooldown / COOLDOWN_F;
    const bw=44, bh=5, bx=HX+2, by=HY-14;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(bx,by,bw,bh);
    const g = Math.floor(180 + 75*(1-pct));
    ctx.fillStyle=`rgba(255,${g},80,0.88)`; ctx.fillRect(bx,by,bw*pct,bh);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────
  function drawHUD() {
    ctx.save();
    ctx.font='bold 13px "Century Gothic",CenturyGothic,AppleGothic,sans-serif'; ctx.fillStyle='#670000'; ctx.textAlign='right';
    ctx.fillText('Score: '+score, W-12, 20);
    if (hiScore>0){ ctx.font='11px "Century Gothic",CenturyGothic,AppleGothic,sans-serif'; ctx.fillStyle='#670000'; ctx.fillText('Best: '+hiScore, W-12, 36); }
    ctx.restore();
  }

  const FONT_BOLD = 'bold 22px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';
  const FONT_NORM = '15px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';

  function drawOverlay(lines) {
    ctx.save();
    let maxW = 0;
    lines.forEach(l => {
      ctx.font = l.bold ? FONT_BOLD : FONT_NORM;
      maxW = Math.max(maxW, ctx.measureText(l.t).width);
    });
    const lh=30, pad=18, boxW=Math.min(maxW+pad*2.5, W-20), boxH=lh*lines.length+pad*2-4;
    const bx=W/2-boxW/2, by=H/2-boxH/2;
    ctx.fillStyle='rgba(255,240,200,0.72)';
    ctx.beginPath(); ctx.roundRect(bx,by,boxW,boxH,8); ctx.fill();
    lines.forEach((l,i)=>{
      ctx.font = l.bold ? FONT_BOLD : FONT_NORM;
      ctx.fillStyle = '#670000';
      ctx.textAlign='center';
      ctx.fillText(l.t, W/2, by+pad+lh*i+lh*0.72);
    });
    ctx.restore();
  }

  // ── STATE ────────────────────────────────────────────────────────────────────
  let state='start', score=0, hiScore=0;
  let gameTick=0, huntFrame=0, frameTick=0, cooldown=0;
  let arrows=[], eland=[], particles=[];
  let spawnTimer=0, spawnInterval=55;
  let gameSpeed=1;
  let aimHigh=false;   // true while player is aiming the high arc shot

  function resetGame() {
    state='playing'; score=0; gameTick=0;
    huntFrame=0; frameTick=0; cooldown=0;
    arrows=[]; eland=[]; particles=[];
    spawnTimer=0; spawnInterval=55; gameSpeed=1;
    aimHigh=false;

    if (isMobile) {
      for (let i = 0; i < 2; i++) {
        spawnEland();
        eland[i].x = W * 0.65 + i * (W * 0.28);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        spawnEland();
        eland[i].x = W * 0.45 + i * (W * 0.18);
      }
    }
  }

  function spawnEland() {
    const groundY = HY + HUNTER_H_PX * 0.98;
    eland.push({
      x: W + 20,
      y: groundY - ELAND_RENDER_H,
      w: ELAND_RENDER_W,
      h: ELAND_RENDER_H,
      frame:0, frameTick:0, alpha:1, dying:false, dyingTimer:0,
    });
  }

  function shoot(high) {
    if (cooldown>0 || state!=='playing') return;
    if (high) {
      // High arc: steeper launch, slower horizontal — longer range parabola
      arrows.push({x:ARROW_SX, y:ARROW_SY, vx:8, vy:-7});
    } else {
      // Flat shot: fast horizontal, shallow drop
      arrows.push({x:ARROW_SX, y:ARROW_SY, vx:12, vy:-0.5});
    }
    cooldown = COOLDOWN_F;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  function update() {
    if (state!=='playing') return;
    gameTick++;

    frameTick++; if (frameTick>=9){frameTick=0; huntFrame=(huntFrame+1)%3;}
    if (cooldown>0) cooldown--;

    gameSpeed = 1 + gameTick*0.0009;

    const elandSpeed = 1.4 * gameSpeed;

    spawnTimer++;
    spawnInterval = Math.max(45, 95 - gameTick*0.025);
    if (spawnTimer>=spawnInterval){ spawnTimer=0; spawnEland(); }

    eland.forEach(e=>{
      if (!e.dying){
        e.x -= elandSpeed;
        e.frameTick++; if(e.frameTick>=7){e.frameTick=0; e.frame=(e.frame+1)%3;}
      }
    });

    // Move arrows — extended upper bound so high-arc arrows don't vanish at apex
    arrows = arrows.filter(ar=>{
      ar.x+=ar.vx; ar.vy+=0.1; ar.y+=ar.vy;
      return ar.x<W+30 && ar.y<H+30 && ar.y>-H;
    });

    arrows.forEach((ar,ai)=>{
      eland.forEach(e=>{
        if(e.dying) return;
        if(ar.x>e.x && ar.x<e.x+e.w && ar.y>e.y && ar.y<e.y+e.h){
          e.dying=true; e.dyingTimer=45;
          score += 10+Math.floor(gameTick/100);
          addParticles(ar.x, ar.y);
          arrows.splice(ai,1);
        }
      });
    });

    eland = eland.filter(e=>{
      if(e.dying){ e.dyingTimer--; e.alpha=e.dyingTimer/45; return e.dyingTimer>0; }
      if(e.x+e.w < 0){ state='dead'; if(score>hiScore)hiScore=score; return false; }
      if(e.x < H_COLL.x+H_COLL.w && e.x+e.w > H_COLL.x && e.y < H_COLL.y+H_COLL.h && e.y+e.h > H_COLL.y){
        state='dead'; if(score>hiScore)hiScore=score;
      }
      return true;
    });

    particles = particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.life--; return p.life>0; });
  }

  // ── LOOP ─────────────────────────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0,0,W,H);
    drawBg();
    update();
    eland.forEach(drawEland);
    arrows.forEach(drawArrow);
    drawParticles();
    drawHunter();
    drawCooldownBar();
    if(state==='playing') drawHUD();
    if(state==='start') {
      drawHUD();
      drawOverlay([
        {t:'CAN YOU SURVIVE THE KALAHARI?', bold:true},
        {t: isMobile ? 'Tap bottom to shoot flat, top to shoot high' : 'Click to shoot · Hold ↑ for high arc'},
        {t:'Tap to play'},
      ]);
    }
    if(state==='dead') {
      drawHUD();
      drawOverlay([
        {t:'The Kalahari claimed you.', bold:true},
        {t:'Score: '+score+'   Best: '+hiScore},
        {t:'Tap to try again'},
      ]);
    }
    requestAnimationFrame(loop);
  }

  // ── INPUT ────────────────────────────────────────────────────────────────────

  // Helper: get canvas-relative Y from a clientY value
  function canvasRelativeY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return clientY - rect.top;
  }

  canvas.addEventListener('click', e => {
    if (state === 'start' || state === 'dead') { resetGame(); return; }
    const high = e.offsetY < H / 2;
    shoot(high);
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state === 'start' || state === 'dead') { resetGame(); return; }
    const y = canvasRelativeY(e.touches[0].clientY);
    const high = y < H / 2;
    shoot(high);
  }, {passive: false});

  // Desktop: hold ↑ to aim high (hunter sprite switches); Space/Enter fires at current aim
  canvas.addEventListener('keydown', e => {
    if (e.code === 'ArrowUp')   { e.preventDefault(); aimHigh = true;  return; }
    if (e.code === 'ArrowDown') { e.preventDefault(); aimHigh = false; return; }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (state === 'start' || state === 'dead') { resetGame(); return; }
      shoot(aimHigh);
    }
  });

  canvas.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp') { aimHigh = false; }
  });

  // ── SCREEN READER LIVE REGION ─────────────────────────────────────────────────
  const ariaLive = document.createElement('div');
  ariaLive.setAttribute('aria-live', 'polite');
  ariaLive.setAttribute('aria-atomic', 'true');
  ariaLive.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
  canvas.parentNode.insertBefore(ariaLive, canvas.nextSibling);

  function announce(msg) {
    ariaLive.textContent = '';
    setTimeout(() => { ariaLive.textContent = msg; }, 50);
  }

  let _lastState = state, _lastScore = score;
  function checkAnnouncements() {
    if (state !== _lastState) {
      if (state === 'playing') announce('Game started. Tap or press Space to shoot. Hold up arrow for high arc.');
      if (state === 'dead')    announce('Game over. Score: ' + score + '. Best: ' + hiScore + '. Press Enter or tap to try again.');
      _lastState = state;
    }
    if (state === 'playing' && score !== _lastScore) {
      _lastScore = score;
      if (score % 50 === 0) announce('Score: ' + score);
    }
  }

  function announcingLoop() {
    checkAnnouncements();
    requestAnimationFrame(announcingLoop);
  }
  requestAnimationFrame(announcingLoop);

  // ── START ────────────────────────────────────────────────────────────────────
  function waitAndStart(){
    if(imagesLoaded>=TOTAL_IMAGES || imagesLoaded>=1) loop();
    else setTimeout(waitAndStart,50);
  }
  waitAndStart();

})();
