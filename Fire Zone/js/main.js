import { $, IS_TOUCH } from './utils.js';
import { settings, Audio } from './settings.js';
import { G, enemies, refs, playerPos } from './state.js';
import { initEngine, onResize } from './engine.js';
import { movePlayer } from './player.js';
import { updateViewModel, finishReload, updateEffects, stopFiring } from './weapons.js';
import { updateWaves, updateBetween } from './waves.js';
import { updateEnemiesHUD, drawMinimap } from './hud.js';
import { initInput, Touch, Pointer } from './input.js';
import { bindUI, populateWeaponPicker, populateSkinPicker, populateWeaponStrip } from './ui.js';
import { clamp } from './utils.js';
import * as Net from './net.js';

window.__fz_net = Net.Net;

let lastFpsT = 0, frameCount = 0;

function setLoad(pct, text){
  const b = $('#loadBar'); if(b) b.style.width = pct + '%';
  const t = $('#loadText'); if(t && text) t.textContent = text;
}

function animate(){
  requestAnimationFrame(animate);
  if(!refs.renderer) return;
  const dt = Math.min(refs.clock.getDelta(), .05);
  const t = performance.now();

  frameCount++;
  if(t - lastFpsT > 500){
    const fps = Math.round(frameCount * 1000 / (t - lastFpsT));
    frameCount = 0; lastFpsT = t;
    if(settings.fps){ const el = $('#fpsLabel'); if(el) el.textContent = fps + ' FPS'; }
  }

  if(G.state === 'playing'){
    if(G.fireCooldown > 0) G.fireCooldown -= dt;
    if(G.reloading){
      G.reloadT += dt;
      const rb = $('#reloadBar');
      if(rb) rb.style.width = clamp((G.reloadT/G.reloadDur)*100, 0, 100) + '%';
      if(G.reloadT >= G.reloadDur) finishReload();
    }

    movePlayer(dt, IS_TOUCH ? Touch.joy : null);
    updateViewModel(dt);

    for(let i = enemies.length - 1; i >= 0; i--) enemies[i].update(dt);

    updateWaves(dt);
    updateBetween(dt);
    updateEnemiesHUD();

    if(G.comboT > 0){ G.comboT -= dt; if(G.comboT <= 0) G.combo = 0; }
  }

  updateEffects(dt);
  if(settings.minimap) drawMinimap();
  refs.renderer.render(refs.scene, refs.camera);
}

async function boot(){
  try{
    document.documentElement.style.setProperty('--chc', settings.crosshairColor);
    const mm = $('#minimapWrap'); if(mm) mm.style.display = settings.minimap ? 'block' : 'none';
    const fps = $('#fpsLabel'); if(fps) fps.style.display = settings.fps ? 'block' : 'none';

    setLoad(15, 'INITIALIZING RENDERER…');
    initEngine(IS_TOUCH);

    setLoad(50, 'BUILDING WORLD…');
    await new Promise(r => setTimeout(r, 30));

    setLoad(75, 'LOADING MODELS…');
    const { buildViewModel } = await import('./weapons.js');
    buildViewModel();

    setLoad(90, 'WIRING UI…');
    initInput();
    Pointer.init();
    bindUI();
    populateWeaponPicker();
    populateSkinPicker();
    populateWeaponStrip();
    Touch.init();

    window.addEventListener('resize', ()=> onResize(IS_TOUCH));
    window.addEventListener('orientationchange', ()=> setTimeout(()=> onResize(IS_TOUCH), 300));

    const resumeAudio = ()=>{ Audio.init(); Audio.resume(); };
    window.addEventListener('pointerdown', resumeAudio, { once:true });
    window.addEventListener('touchstart', resumeAudio, { once:true });
    window.addEventListener('keydown', resumeAudio, { once:true });

    setLoad(100, 'READY');
    setTimeout(()=>{
      const L = $('#loading');
      if(!L) return;
      L.style.opacity = '0';
      setTimeout(()=> L.classList.add('hidden'), 460);
    }, 200);

    animate();
  }catch(e){
    console.error('BOOT ERROR:', e);
    const t = $('#loadText');
    if(t){ t.textContent = 'ERROR: ' + e.message; t.style.color = '#ff4444'; }
  }
}

boot();