import { $, nextLayoutFrame, IS_TOUCH } from './utils.js';
import { G, refs, enemies, resetAmmo, keys } from './state.js';
import { Audio, settings } from './settings.js';
import { WEAPONS, WEAPON_ORDER } from './config.js';
import * as Identity from './identity.js';
import * as Econ from './economy.js';
import { initEngine, loadMap, updateEffects } from './engine.js';
import { initWeapons, updateViewModel, finishReload, stopFiring } from './weapons.js';
import { movePlayer, resetPlayer } from './player.js';
import { updateWaves, updateBetween, resetWaves, startWave, setDeathHandler } from './enemy.js';
import { initInput, getJoyMove } from './input.js';
import { updateHealthHUD, updateScoreHUD, updateWeaponHUD, updateAmmoHUD, updateEnemiesHUD, drawMinimap } from './hud.js';
import * as UI from './ui.js';
import { showError } from './error-overlay.js';

let loopRunning = false;
let lastFpsT = 0, frameCount = 0;
let gameMode = 'single';

function setLoad(pct, text){
  const b = document.getElementById('loadBar'); if(b) b.style.width = pct + '%';
  const t = document.getElementById('loadText'); if(t && text) t.textContent = text;
}

export async function boot(){
  try{
    setLoad(5, 'WAITING FOR LAYOUT…');
    await nextLayoutFrame();

    setLoad(15, 'INITIALIZING ENGINE…');
    await initEngine();

    setLoad(35, 'LOADING MAP…');
    await loadMap('arena');

    setLoad(55, 'EQUIPPING…');
    resetAmmo(WEAPONS, WEAPON_ORDER);
    G.currentWeapon = 'rifle';
    initWeapons();
    updateAmmoHUD();
    updateWeaponHUD();

    setLoad(70, 'WIRING INPUT…');
    initInput();
    UI.initUI();
    UI.refreshWallet();

    setLoad(85, 'CHECKING PROFILE…');
    const profile = Identity.loadProfile();
    if(!profile){
      UI.showUsernameModal();
      UI.bindIdentityModals(() => { UI.refreshWallet(); });
    }

    setDeathHandler(onPlayerDeath);
    UI.setGameHandlers(startGame);
    window.__fz_resume = resumeGame;
    window.__fz_quit = quitToMenu;
    window.__fz_retry = () => startGame(gameMode);
    window.__fz_menu = quitToMenu;

    setLoad(100, 'READY');
    setTimeout(() => {
      const L = document.getElementById('loading');
      if(L){ L.style.opacity = '0'; setTimeout(() => L.classList.add('hidden'), 460); }
    }, 200);

    if(!loopRunning){ loopRunning = true; requestAnimationFrame(loop); }

    const unlock = () => { Audio.init(); Audio.resume(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }catch(e){
    showError('BOOT', e);
    setLoad(0, 'BOOT FAILED — see error above');
  }
}

function startGame(mode){
  gameMode = mode || 'single';
  Audio.init(); Audio.resume();

  import('./device.js').then(m => m.Landscape.lock()).catch(() => {});

  G.state = 'playing';
  G.health = 100; G.armor = 0;
  G.score = 0; G.kills = 0; G.headshots = 0; G.wave = 0;
  G.enemiesAlive = 0; G.combo = 0; G.comboT = 0;
  G.reloading = false; G.fireCooldown = 0;
  resetAmmo(WEAPONS, WEAPON_ORDER);
  G.currentWeapon = Econ.getLoadout() || 'rifle';

  while(enemies.length) enemies[0].die(false);

  resetPlayer();
  initWeapons();
  resetWaves();
  updateHealthHUD(); updateScoreHUD(); updateWeaponHUD(); updateAmmoHUD(); updateEnemiesHUD();

  UI.hideHub(); UI.hideGameOver(); UI.hidePause();
  const hud = document.getElementById('hud'); if(hud) hud.classList.remove('hidden');
  const touchUI = document.getElementById('touchUI'); if(touchUI) touchUI.classList.remove('hidden');
  UI.refreshWallet();

  if(!IS_TOUCH){
    const dom = refs.renderer && refs.renderer.domElement;
    if(dom && dom.requestPointerLock) dom.requestPointerLock();
  }

  startWave(1);
}

export function pauseFromInput(){
  if(G.state !== 'playing') return;
  G.state = 'paused';
  stopFiring();
  if(document.pointerLockElement) document.exitPointerLock && document.exitPointerLock();
  UI.showPause();
}

function resumeGame(){
  if(G.state !== 'paused') return;
  G.state = 'playing';
  UI.hidePause();
  if(!IS_TOUCH){
    const dom = refs.renderer && refs.renderer.domElement;
    if(dom && dom.requestPointerLock) dom.requestPointerLock();
  }
}

function quitToMenu(){
  G.state = 'menu';
  stopFiring();
  if(document.pointerLockElement) document.exitPointerLock && document.exitPointerLock();
  const hud = document.getElementById('hud'); if(hud) hud.classList.add('hidden');
  const touchUI = document.getElementById('touchUI'); if(touchUI) touchUI.classList.add('hidden');
  UI.hidePause(); UI.hideGameOver(); UI.showHub();
  resetWaves();
  while(enemies.length) enemies[0].die(false);
}

function onPlayerDeath(){
  G.state = 'dead';
  stopFiring();
  if(document.pointerLockElement) document.exitPointerLock && document.exitPointerLock();

  const earnedSparks = Math.floor(G.score * 0.4);
  const earnedEmbers = Math.floor(G.wave / 3);
  Econ.addSparks(earnedSparks);
  if(earnedEmbers > 0) Econ.addEmbers(earnedEmbers);
  UI.refreshWallet();

  const hud = document.getElementById('hud'); if(hud) hud.classList.add('hidden');
  const touchUI = document.getElementById('touchUI'); if(touchUI) touchUI.classList.add('hidden');
  UI.showGameOver(G.score, G.kills, G.wave, earnedSparks, earnedEmbers);
}

function loop(){
  requestAnimationFrame(loop);
  const renderer = refs.renderer, camera = refs.camera, scene = refs.scene, clock = refs.clock;
  if(!renderer || !camera || !scene || !clock) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = performance.now();

  frameCount++;
  if(t - lastFpsT > 500){
    const fps = Math.round(frameCount * 1000 / (t - lastFpsT));
    frameCount = 0; lastFpsT = t;
    if(settings.fps){ const el = document.getElementById('fpsLabel'); if(el) el.textContent = fps + ' FPS'; }
  }

  if(G.state === 'playing'){
    if(G.fireCooldown > 0) G.fireCooldown -= dt;
    if(G.reloading){
      G.reloadT += dt;
      const rb = document.getElementById('reloadBar');
      if(rb) rb.style.width = Math.min(100, (G.reloadT / G.reloadDur) * 100) + '%';
      if(G.reloadT >= G.reloadDur) finishReload();
    }

    const move = IS_TOUCH ? getJoyMove() : null;
    movePlayer(dt, move);
    const moving = !!(keys.w || keys.a || keys.s || keys.d || (move && (move.x || move.y)));
    updateViewModel(dt, moving);

    for(let i = enemies.length - 1; i >= 0; i--) enemies[i].update(dt);

    updateWaves(dt);
    updateBetween(dt);
    updateEnemiesHUD();

    if(G.comboT > 0){ G.comboT -= dt; if(G.comboT <= 0) G.combo = 0; }
  }

  updateEffects(dt);
  if(settings.minimap) drawMinimap();
  renderer.render(scene, camera);
}