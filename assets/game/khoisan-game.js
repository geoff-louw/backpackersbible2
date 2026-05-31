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
    h1:   'khoisan-1.svg',    h2:   'khoisan-2.svg',    h3:   'khoisan-3.svg',
    h1n:  'khoisan-1_NO_ARROW.svg', h2n: 'khoisan-2_NO_ARROW.svg', h3n: 'khoisan-3_NO_ARROW.svg',
    e1:   'eland-1.svg',      e2:   'eland-2.svg',      e3:   'eland-3.svg',
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
  // rock2.webp is 2200px wide (seamless loop: original + h-flipped copy)
  // We scroll it leftward and reset when one full width has passed
  const BG_IMG_W        = 2200;  // actual pixel width of rock2.webp
  const BG_SCROLL_SPEED = 1.1;   // px/frame — slower, more natural
  let bgOffset = 0;              // scrolled px, 0..BG_LOOP_AT

  function drawBg() {
    // Only scroll when game is active
    if (state === 'playing') {
      bgOffset += BG_SCROLL_SPEED;
      if (bgOffset >= BG_IMG_W) bgOffset -= BG_IMG_W;
    }

    const img = imgs.rock;
    if (img.complete && img.naturalWidth > 0) {
      const sh = img.naturalHeight || 200;
      const scale = H / sh;
      // Draw the full 2200px image as one strip, shifted left by bgOffset
      // dw is the full destination width of the image at canvas scale
      const dw = Math.ceil(BG_IMG_W * scale);
      const dx = -Math.floor(bgOffset * scale);
      ctx.drawImage(img, 0, 0, BG_IMG_W, sh, dx, 0, dw, H);
      // Second copy immediately to the right to fill any gap after wrap
      if (dx + dw < W) {
        ctx.drawImage(img, 0, 0, BG_IMG_W, sh, dx + dw, 0, dw, H);
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
    const fi  = huntFrame;
    const key = cooldown === 0 ? ['h1','h2','h3'][fi] : ['h1n','h2n','h3n'][fi];
    const img = imgs[key];
    ctx.save();
    ctx.globalAlpha = 0.82;   // slight transparency so rock texture shows through
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
    ctx.font='bold 13px Georgia,serif'; ctx.fillStyle='rgba(255,220,150,0.92)'; ctx.textAlign='right';
    ctx.fillText('Score: '+score, W-12, 20);
    if (hiScore>0){ ctx.font='11px Georgia,serif'; ctx.fillStyle='rgba(255,210,130,0.72)'; ctx.fillText('Best: '+hiScore, W-12, 36); }
    ctx.restore();
  }

  // ── OVERLAY ──────────────────────────────────────────────────────────────────
  function drawOverlay(lines) {
    ctx.save();
    let maxW = 0;
    lines.forEach(l => {
      ctx.font = l.bold ? 'bold 22px Georgia,serif' : '15px Georgia,serif';
      maxW = Math.max(maxW, ctx.measureText(l.t).width);
    });
    const lh=30, pad=18, boxW=Math.min(maxW+pad*2.5, W-20), boxH=lh*lines.length+pad*2-4;
    const bx=W/2-boxW/2, by=H/2-boxH/2;
    ctx.fillStyle='rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.roundRect(bx,by,boxW,boxH,8); ctx.fill();
    lines.forEach((l,i)=>{
      ctx.font = l.bold ? 'bold 22px Georgia,serif' : '15px Georgia,serif';
      ctx.fillStyle = l.col||'rgba(255,220,150,0.97)';
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

  function resetGame() {
    state='playing'; score=0; gameTick=0;
    huntFrame=0; frameTick=0; cooldown=0;
    arrows=[]; eland=[]; particles=[];
    spawnTimer=0; spawnInterval=55; gameSpeed=1;

    // Pre-populate eland so game starts immediately
    if (isMobile) {
      // Mobile: 2 eland, further right so player has time to react
      for (let i = 0; i < 2; i++) {
        spawnEland();
        eland[i].x = W * 0.65 + i * (W * 0.28);
      }
    } else {
      // Desktop: 3 eland spread across middle of screen
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

  function shoot() {
    if (cooldown>0 || state!=='playing') return;
    arrows.push({x:ARROW_SX, y:ARROW_SY, vx:12, vy:-0.5});
    cooldown = COOLDOWN_F;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  function update() {
    if (state!=='playing') return;
    gameTick++;

    frameTick++; if (frameTick>=9){frameTick=0; huntFrame=(huntFrame+1)%3;}
    if (cooldown>0) cooldown--;

    gameSpeed = 1 + gameTick*0.0009;

    // Eland move leftward (fleeing, but slower than hunter's apparent run)
    const elandSpeed = 1.4 * gameSpeed;

    // Spawn
    spawnTimer++;
    spawnInterval = Math.max(45, 95 - gameTick*0.025);
    if (spawnTimer>=spawnInterval){ spawnTimer=0; spawnEland(); }

    // Move & animate eland
    eland.forEach(e=>{
      if (!e.dying){
        e.x -= elandSpeed;
        e.frameTick++; if(e.frameTick>=7){e.frameTick=0; e.frame=(e.frame+1)%3;}
      }
    });

    // Move arrows
    arrows = arrows.filter(ar=>{
      ar.x+=ar.vx; ar.vy+=0.1; ar.y+=ar.vy;
      return ar.x<W+30 && ar.y<H+30 && ar.y>-20;
    });

    // Arrow–eland collision
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

    // Eland lifecycle
    eland = eland.filter(e=>{
      if(e.dying){ e.dyingTimer--; e.alpha=e.dyingTimer/45; return e.dyingTimer>0; }
      // Eland reaches left edge — escaped, game over
      if(e.x+e.w < 0){ state='dead'; if(score>hiScore)hiScore=score; return false; }
      // Collision with hunter
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
        {t:'Tap to play', col:'rgba(255,210,130,0.85)'},
      ]);
    }
    if(state==='dead') {
      drawHUD();
      drawOverlay([
        {t:'The Kalahari claimed you.', bold:true, col:'rgba(255,190,110,0.97)'},
        {t:'Score: '+score+'   Best: '+hiScore, col:'rgba(255,220,150,0.9)'},
        {t:'Tap to try again', col:'rgba(255,210,130,0.75)'},
      ]);
    }
    requestAnimationFrame(loop);
  }

  // ── INPUT ────────────────────────────────────────────────────────────────────
  function handleTap(){
    if(state==='start'||state==='dead') resetGame(); else shoot();
  }
  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', e=>{ e.preventDefault(); handleTap(); }, {passive:false});

  // ── START ────────────────────────────────────────────────────────────────────
  function waitAndStart(){
    if(imagesLoaded>=TOTAL_IMAGES || imagesLoaded>=1) loop();
    else setTimeout(waitAndStart,50);
  }
  waitAndStart();

})();
