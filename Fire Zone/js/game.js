import { $ } from './utils.js';
import { G, enemies, refs } from './state.js';
import { settings, saveSettings, Audio, Notify } from './settings.js';
import { WEAPONS } from './config.js';
import { buildMaterials } from './models.js';
import { resetPlayer, PLAYER } from './player.js';
import { buildViewModel, resetAmmo, stopFiring } from './weapons.js';
import { resetWaves } from './waves.js';
import { updateHealthHUD, updateScoreHUD, updateWeaponHUD, updateAmmoHUD, updateEnemiesHUD } from './hud.js';
import { Net, startNetSync } from './net.js';
import { Pointer } from './input.js';
import { IS_TOUCH } from './utils.js';

export function startGame(mode){
  Audio.init(); Audio.resume();
  G.mode = mode || 'single';

  buildMaterials(G.playerSkin || settings.skin);

  G.health = 100; G.armor = 0;
  G.score = 0; G.kills = 0; G.headshots = 0; G.wave = 0;
  G.enemiesAlive = 0; G.combo = 0; G.comboT = 0;
  G.reloading = false; G.fireCooldown = 0; G.burstLeft = 0;
  G.currentWeapon = settings.startWeapon || 'rifle';
  G.playerSkin = settings.skin || 'default';
  resetAmmo();

  // clear enemies
  while(enemies.length) enemies[0].die(false);
  // clear effects arrays
  const { tracers, particles } = { tracers: [], particles: [] }; // noop fallback
  import('./state.js').then(s => {
    while(s.tracers.length){ refs.scene.remove(s.tracers[0].line); s.tracers.shift(); }
    while(s.particles.length){ refs.scene.remove(s.particles[0].mesh); s.particles.shift(); }
  });

  resetPlayer();
  buildViewModel();
  updateHealthHUD(); updateScoreHUD(); updateWeaponHUD(); updateAmmoHUD(); updateEnemiesHUD();
  $('#killFeed').innerHTML = '';
  $('#menu').classList.add('hidden');
  $('#gameover').classList.add('hidden');
  $('#gameover').style.display = '';
  $('#pause').classList.add('hidden');
  $('#pause').style.display = '';
  $('#hud').classList.remove('hidden');

  G.state = 'playing';
  resetWaves();
  import('./waves.js').then(w => { w.waveState.betweenTimer = 2; });

  if(!IS_TOUCH) Pointer.request();
  if(mode === 'host' || mode === 'client') startNetSync();
  Notify.show('🎮 Fire Zone', 'Good luck, soldier.');
}

export function pauseGame(){
  if(G.state !== 'playing') return;
  G.state = 'paused';
  stopFiring();
  if(document.pointerLockElement) document.exitPointerLock?.();
  const p = $('#pause');
  p.classList.remove('hidden');
  p.style.display = 'flex';
}

export function resumeGame(){
  if(G.state !== 'paused') return;
  G.state = 'playing';
  const p = $('#pause');
  p.classList.add('hidden');
  p.style.display = '';
  if(!IS_TOUCH) Pointer.request();
}

export function quitToMenu(){
  G.state = 'menu';
  stopFiring();
  if(document.pointerLockElement) document.exitPointerLock?.();
  if(G.mode !== 'single') Net.stop();
  G.mode = 'single';
  $('#hud').classList.add('hidden');
  const p = $('#pause'); p.classList.add('hidden'); p.style.display = '';
  const go = $('#gameover'); go.classList.add('hidden'); go.style.display = '';
  $('#menu').classList.remove('hidden');
  $('#menuScore').textContent = Number(localStorage.getItem('fz_score')||0);
  while(enemies.length) enemies[0].die(false);
  resetWaves();
}

export function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen?.()
      .then(()=> screen.orientation?.lock?.('landscape').catch(()=>{}))
      .catch(()=>{});
  } else {
    document.exitFullscreen?.();
  }
}