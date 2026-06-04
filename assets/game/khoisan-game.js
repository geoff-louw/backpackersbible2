(function () {
  'use strict';

  const ASSET_PATH = '/assets/game/';
  const CANVAS_H   = 200;
  const COOLDOWN_F = 72;

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
  const SCALE_MOD = isMobile ? 0.72 : 1.0;

  const HX = W * (isMobile ? 0.05 : 0.10);
  const HY = H * (isMobile ? 0.18 : 0.10);

  // Hunter SVGs are now 100×100 (square)
  const HUNTER_H_PX = H * (isMobile ? 0.72 : 0.80);
  const HUNTER_W_PX = HUNTER_H_PX; // 1:1 aspect ratio

  // Arrow launch point — tip of bow (centred vertically on the raised bow)
  const ARROW_SX = HX + HUNTER_W_PX * 0.92;
  const ARROW_SY = HY + HUNTER_H_PX * 0.28;

  // Hunter collision box
  const H_COLL = { x: HX + HUNTER_W_PX*0.1, y: HY + HUNTER_H_PX*0.1,
                   w: HUNTER_W_PX * 0.55,    h: HUNTER_H_PX * 0.85 };

  // Eland: aspect ratio 61.02 × 27.16mm
  const ELAND_RENDER_H = H * 0.34 * SCALE_MOD;
  const ELAND_RENDER_W = ELAND_RENDER_H * (61.02 / 27.16);

  // Rhino: SVG viewBox 80×50, so aspect = 1.6
  const RHINO_RENDER_H = isMobile ? H * 0.38 : H * 0.58;
  const RHINO_RENDER_W = RHINO_RENDER_H * (80 / 50);

  // ── IMAGES ──────────────────────────────────────────────────────────────────
  const imgs = {};
  const IMG_SRCS = {
    h1:   'khoisan-1.svg',          h2:   'khoisan-2.svg',          h3:   'khoisan-3.svg',
    h1n:  'khoisan-1_no-arrow.svg', h2n:  'khoisan-2_no-arrow.svg', h3n:  'khoisan-3_no-arrow.svg',
    h1u:  'khoisan-1_up.svg',       h2u:  'khoisan-2_up.svg',       h3u:  'khoisan-3_up.svg',
    h1nu: 'khoisan-1_up_no-arrow.svg', h2nu: 'khoisan-2_up_no-arrow.svg', h3nu: 'khoisan-3_up_no-arrow.svg',
    e1:   'eland-1.svg',            e2:   'eland-2.svg',            e3:   'eland-3.svg',
    r1:   'rhino-1.svg',            r2:   'rhino-2.svg',            r3:   'rhino-3.svg',
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
      // On narrow screens the image would be squashed — instead scroll at natural
      // aspect ratio and tile multiple times if canvas is narrower than image
      const naturalScale = H / sh;          // scale to fill canvas height
      const tileW = BG_IMG_W * naturalScale; // how wide one full tile is on canvas
      const srcX  = Math.floor(bgOffset);

      // Draw as many tiles as needed to fill W
      let destX = -((srcX * naturalScale) % tileW);
      while (destX < W) {
        ctx.drawImage(img, 0, 0, BG_IMG_W, sh, destX, 0, tileW, H);
        destX += tileW;
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
    ctx.globalAlpha = 0.88;
    if (img && img.complete && img.naturalWidth > 0)
      ctx.drawImage(img, HX, HY, HUNTER_W_PX, HUNTER_H_PX);
    ctx.restore();
  }

  // ── DRAW ELAND ───────────────────────────────────────────────────────────────
  function drawEland(e) {
    ctx.save();
    ctx.globalAlpha = e.alpha * 0.85;
    const key = ['e1','e2','e3'][e.frame];
    const img = imgs[key];
    if (img && img.complete && img.naturalWidth > 0)
      ctx.drawImage(img, e.x, e.y, e.w, e.h);
    else {
      ctx.fillStyle = '#4d0000';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.restore();
  }

  // ── DRAW RHINO ───────────────────────────────────────────────────────────────
  function drawRhino(r) {
    ctx.save();
    // Flash white when hit
    if (r.hitFlash > 0) {
      ctx.filter = 'brightness(3)';
      ctx.globalAlpha = 0.9;
    } else {
      ctx.globalAlpha = r.alpha * 0.88;
    }
    const key = ['r1','r2','r3'][r.frame];
    const img = imgs[key];
    if (img && img.complete && img.naturalWidth > 0)
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
    else {
      ctx.fillStyle = '#4d0000';
      ctx.fillRect(r.x, r.y, r.w, r.h);
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
    if (img && img.complete && img.naturalWidth > 0)
      ctx.drawImage(img, 0, -4, 55, 8);
    else {
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
      ctx.fillStyle = p.color || '#4d0000';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size||2.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  function addParticles(x, y, count, color, size) {
    for (let i = 0; i < (count||10); i++) {
      const a = Math.random()*Math.PI*2, sp = 1.5+Math.random()*3;
      particles.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
                      life:35, maxLife:35, color:color||'#4d0000', size:size||2.5});
    }
  }

  // ── COOLDOWN BAR ─────────────────────────────────────────────────────────────
  function drawCooldownBar() {
    if (cooldown <= 0) return;
    const pct = cooldown / COOLDOWN_F;
    const bw=44, bh=5, bx=HX+2, by=HY-10;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(bx,by,bw,bh);
    const g = Math.floor(180 + 75*(1-pct));
    ctx.fillStyle=`rgba(255,${g},80,0.88)`; ctx.fillRect(bx,by,bw*pct,bh);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────
  function drawHUD() {
    ctx.save();
    ctx.font='bold 13px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';
    ctx.fillStyle='#670000'; ctx.textAlign='right';
    ctx.fillText('Score: '+score, W-12, 20);
    if (hiScore>0) {
      ctx.font='11px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';
      ctx.fillText('Best: '+hiScore, W-12, 36);
    }
    ctx.restore();
  }

  const FONT_BOLD = 'bold 20px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';
  const FONT_NORM = '14px "Century Gothic",CenturyGothic,AppleGothic,sans-serif';

  function drawOverlay(lines, lh) {
    lh = lh || 28;
    ctx.save();
    let maxW = 0;
    lines.forEach(l => {
      ctx.font = l.bold ? FONT_BOLD : FONT_NORM;
      maxW = Math.max(maxW, ctx.measureText(l.t).width);
    });
    const pad=14, boxW=Math.min(maxW+pad*2.5, W-20), boxH=lh*lines.length+pad*2-4;
    const bx=W/2-boxW/2, by=H/2-boxH/2;
    ctx.fillStyle='rgba(255,240,200,0.80)';
    ctx.beginPath(); ctx.roundRect(bx,by,boxW,boxH,8); ctx.fill();
    lines.forEach((l,i) => {
      ctx.font = l.bold ? FONT_BOLD : FONT_NORM;
      ctx.fillStyle = '#670000'; ctx.textAlign='center';
      ctx.fillText(l.t, W/2, by+pad+lh*i+lh*0.75);
    });
    ctx.restore();
  }

  // ── STATE ────────────────────────────────────────────────────────────────────
  let state='start', score=0, hiScore=0;
  let gameTick=0, huntFrame=0, frameTick=0, cooldown=0;
  let arrows=[], eland=[], rhinos=[], particles=[];
  let spawnTimer=0, spawnInterval=55;
  let gameSpeed=1;
  let aimHigh=false;

  // Wave system: eland wave → rhino → repeat, escalating
  let waveElandCount=0;   // eland left to spawn in current wave
  let waveElandSpawned=0; // eland spawned so far in current wave
  let waveRhinoPending=false; // rhino due after this wave clears
  let waveNum=0;          // which wave we're on

  function startNextWave() {
    waveNum++;
    // Wave 1: 3 eland. Wave 2: 4. Wave 3+: 5, escalating
    waveElandCount = Math.min(5 + waveNum, 10);  // wave 1=6, 2=7, ... cap at 10
    waveElandSpawned = 0;
    waveRhinoPending = waveNum > 1; // rhino appears before each wave from wave 2 onward
  }

  function resetGame() {
    state='playing'; score=0; gameTick=0;
    huntFrame=0; frameTick=0; cooldown=0;
    arrows=[]; eland=[]; rhinos=[]; particles=[];
    spawnTimer=0; spawnInterval=55; gameSpeed=1;
    waveNum=0; waveElandCount=0; waveElandSpawned=0; waveRhinoPending=false;
    aimHigh=false;
    startNextWave();

    if (!isMobile) {
      // Desktop: pre-place first wave's eland across the middle so game feels instant
      for (let i = 0; i < waveElandCount; i++) {
        spawnEland();
        eland[i].x = W * 0.50 + i * (W * 0.16);
        waveElandSpawned++;
      }
    }
    // Mobile: eland arrive from off-screen right — wave system handles it
  }

  function spawnEland() {
    const groundY = HY + HUNTER_H_PX * 0.96;
    eland.push({
      x: W + 20,
      y: groundY - ELAND_RENDER_H,
      w: ELAND_RENDER_W, h: ELAND_RENDER_H,
      frame:0, frameTick:0, alpha:1, dying:false, dyingTimer:0,
    });
  }

  function spawnRhino() {
    const groundY = HY + HUNTER_H_PX * 0.96;  // same floor as eland
    rhinos.push({
      x: W + 20,
      y: groundY - RHINO_RENDER_H,
      w: RHINO_RENDER_W, h: RHINO_RENDER_H,
      frame:0, frameTick:0,
      hp: 2,          // two hits to kill
      hitFlash: 0,    // flash timer on hit
      alpha: 1,
      dying: false, dyingTimer: 0,
    });
  }

  function shoot(high) {
    if (cooldown>0 || state!=='playing') return;
    if (high) {
      // Lob: peaks near canvas top, lands ~2x further than flat shot
      arrows.push({x:ARROW_SX, y:ARROW_SY, vx:11, vy:-3.4, gravity:0.11});
    } else {
      arrows.push({x:ARROW_SX, y:ARROW_SY, vx:12, vy:-0.5, gravity:0.10});
    }
    cooldown = COOLDOWN_F;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  function update() {
    if (state!=='playing') return;
    gameTick++;

    frameTick++; if (frameTick>=9){frameTick=0; huntFrame=(huntFrame+1)%3;}
    if (cooldown>0) cooldown--;

    gameSpeed = 1 + gameTick*0.0004;  // slower speed ramp so game stays playable longer

    // ── Wave-based spawn
    const elandSpeed = 1.4 * gameSpeed;
    spawnTimer++;
    spawnInterval = Math.max(35, 70 - gameTick*0.015);  // faster spawn, gentler ramp

    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;

      if (waveElandSpawned < waveElandCount) {
        // Still spawning eland in this wave
        spawnEland();
        waveElandSpawned++;
        // Send rhino after half the eland are on screen (from wave 2 onward)
        if (waveRhinoPending && waveElandSpawned === Math.ceil(waveElandCount / 2)) {
          waveRhinoPending = false;
          spawnRhino();
        }
      } else if (eland.length === 0 && rhinos.length === 0) {
        // All eland and rhino cleared — start next wave after a short breath
        startNextWave();
      }
    }

    eland.forEach(e => {
      if (!e.dying) {
        e.x -= elandSpeed;
        e.frameTick++; if(e.frameTick>=7){e.frameTick=0; e.frame=(e.frame+1)%3;}
      }
    });

    // ── Rhino move
    const rhinoSpeed = 2.2 * gameSpeed;
    rhinos.forEach(r => {
      if (!r.dying) {
        r.x -= rhinoSpeed;
        r.frameTick++; if(r.frameTick>=6){r.frameTick=0; r.frame=(r.frame+1)%3;}
        if (r.hitFlash>0) r.hitFlash--;
      }
    });

    // ── Move arrows (each arrow carries its own gravity)
    arrows = arrows.filter(ar => {
      ar.x+=ar.vx; ar.vy+=(ar.gravity||0.10); ar.y+=ar.vy;
      return ar.x<W+30 && ar.y<H+30 && ar.y>-H;
    });

    // ── Arrow vs eland
    arrows.forEach((ar,ai) => {
      eland.forEach(e => {
        if (e.dying) return;
        if (ar.x>e.x && ar.x<e.x+e.w && ar.y>e.y && ar.y<e.y+e.h) {
          e.dying=true; e.dyingTimer=45;
          score += 10 + Math.floor(gameTick/100);
          addParticles(ar.x, ar.y);
          arrows.splice(ai, 1);
        }
      });
    });

    // ── Arrow vs rhino
    arrows.forEach((ar,ai) => {
      rhinos.forEach(r => {
        if (r.dying) return;
        if (ar.x>r.x && ar.x<r.x+r.w && ar.y>r.y && ar.y<r.y+r.h) {
          r.hp--;
          r.hitFlash = 12;
          addParticles(ar.x, ar.y, 14, '#8B0000', 3.5);
          arrows.splice(ai, 1);
          if (r.hp <= 0) {
            r.dying=true; r.dyingTimer=55;
            score += 30 + Math.floor(gameTick/50);
            addParticles(r.x+r.w*0.5, r.y+r.h*0.5, 20, '#8B0000', 4);
          }
        }
      });
    });

    // ── Eland lifecycle
    eland = eland.filter(e => {
      if (e.dying) { e.dyingTimer--; e.alpha=e.dyingTimer/45; return e.dyingTimer>0; }
      if (e.x+e.w < 0) { state='dead'; if(score>hiScore)hiScore=score; return false; }
      if (e.x < H_COLL.x+H_COLL.w && e.x+e.w > H_COLL.x &&
          e.y < H_COLL.y+H_COLL.h && e.y+e.h > H_COLL.y) {
        state='dead'; if(score>hiScore)hiScore=score;
      }
      return true;
    });

    // ── Rhino lifecycle
    rhinos = rhinos.filter(r => {
      if (r.dying) { r.dyingTimer--; r.alpha=r.dyingTimer/55; return r.dyingTimer>0; }
      if (r.x+r.w < 0) { state='dead'; if(score>hiScore)hiScore=score; return false; }
      // Rhino collision — instant death
      if (r.x < H_COLL.x+H_COLL.w && r.x+r.w > H_COLL.x &&
          r.y < H_COLL.y+H_COLL.h && r.y+r.h > H_COLL.y) {
        state='dead'; if(score>hiScore)hiScore=score;
      }
      return true;
    });

    particles = particles.filter(p => { p.x+=p.vx; p.y+=p.vy; p.life--; return p.life>0; });
  }

  // ── LOOP ─────────────────────────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0,0,W,H);
    drawBg();
    update();
    eland.forEach(drawEland);
    rhinos.forEach(drawRhino);
    arrows.forEach(drawArrow);
    drawParticles();
    drawHunter();
    drawCooldownBar();
    if (state==='playing') drawHUD();
    if (state==='start') {
      drawHUD();
      drawOverlay([
        {t:'CAN YOU SURVIVE THE KALAHARI?', bold:true},
        {t: isMobile ? 'Tap top to shoot high · bottom to shoot flat' : 'Click to shoot · hold ↑ for high arc'},
        {t:'Tap to play'},
      ], 26);
    }
    if (state==='dead') {
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
  canvas.setAttribute('tabindex', '0');

  canvas.addEventListener('click', e => {
    if (state==='start' || state==='dead') { resetGame(); return; }
    const rect = canvas.getBoundingClientRect();
    const high = (e.clientY - rect.top) < rect.height / 2;
    shoot(high);
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state==='start' || state==='dead') { resetGame(); return; }
    const rect = canvas.getBoundingClientRect();
    const y = e.touches[0].clientY - rect.top;
    shoot(y < rect.height / 2);
  }, {passive: false});

  canvas.style.touchAction = 'none';
  let canvasInView = false;
  new IntersectionObserver(entries => {
    canvasInView = entries[0].isIntersecting;
  }).observe(canvas);

  // Dedicated passive:false listener solely to block browser scroll on arrow keys
  window.addEventListener('keydown', e => {
    if ((e.code==='ArrowUp' || e.code==='ArrowDown') && canvasInView) {
      e.preventDefault();
    }
  }, {passive: false});

  window.addEventListener('keydown', e => {
    if (e.code==='ArrowUp') {
      if (!canvasInView) return;
      e.preventDefault();
      if (state==='start' || state==='dead') { resetGame(); return; }
      aimHigh = true;
      shoot(true);   // ↑ key fires a high arc shot directly
      return;
    }
    if (e.code==='ArrowDown') {
      if (!canvasInView) return;
      e.preventDefault();
      return;
    }
    if (e.code==='Space' || e.code==='Enter') {
      if (!canvasInView) return;
      e.preventDefault();
      if (state==='start' || state==='dead') { resetGame(); return; }
      shoot(false);  // Space/Enter fires flat
    }
  }, {capture: true});

  window.addEventListener('keyup', e => {
    if (e.code==='ArrowUp') aimHigh = false;
  });

  // ── SCREEN READER LIVE REGION ─────────────────────────────────────────────────
  const ariaLive = document.createElement('div');
  ariaLive.setAttribute('aria-live','polite');
  ariaLive.setAttribute('aria-atomic','true');
  ariaLive.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
  canvas.parentNode.insertBefore(ariaLive, canvas.nextSibling);

  function announce(msg) { ariaLive.textContent=''; setTimeout(()=>{ariaLive.textContent=msg;},50); }

  let _lastState=state, _lastScore=score;
  function checkAnnouncements() {
    if (state!==_lastState) {
      if (state==='playing') announce('Game started. Tap or press Space to shoot. Hold up arrow for high arc.');
      if (state==='dead')    announce('Game over. Score: '+score+'. Best: '+hiScore+'. Tap or press Enter to try again.');
      _lastState=state;
    }
    if (state==='playing' && score!==_lastScore) {
      _lastScore=score;
      if (score%50===0) announce('Score: '+score);
    }
  }
  function announcingLoop(){ checkAnnouncements(); requestAnimationFrame(announcingLoop); }
  requestAnimationFrame(announcingLoop);

  // ── START ────────────────────────────────────────────────────────────────────
  function waitAndStart(){
    if (imagesLoaded>=TOTAL_IMAGES || imagesLoaded>=1) loop();
    else setTimeout(waitAndStart, 50);
  }
  waitAndStart();

})();
