import { $, $$ } from './utils.js';
import { settings, saveSettings, Audio, Notify, getTotalScore, registerSW } from './settings.js';
import { WEAPONS, WEAPON_ORDER, SKINS, SKIN_ORDER } from './config.js';
import { G } from './state.js';
import { buildMaterials } from './models.js';
import { switchWeapon } from './weapons.js';
import { startGame, resumeGame, quitToMenu, toggleFullscreen } from './game.js';
import { Net } from './net.js';
import { refs } from './state.js';

export function populateWeaponPicker(){
  const el = $('#weaponPicker');
  el.innerHTML = '';
  WEAPON_ORDER.forEach(id => {
    const w = WEAPONS[id];
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerHTML = `<div style="font-weight:700">${w.icon} ${w.name}</div><div style="opacity:.4;font-size:.85em">${w.dmg}dmg · ${w.mag}/${w.res}</div>`;
    if(id === settings.startWeapon) btn.classList.add('glow');
    btn.onclick = ()=>{
      settings.startWeapon = id;
      saveSettings();
      populateWeaponPicker();
    };
    el.appendChild(btn);
  });
}

export function populateSkinPicker(){
  const el = $('#skinPicker');
  el.innerHTML = '';
  SKIN_ORDER.forEach(key => {
    const s = SKINS[key];
    const btn = document.createElement('button');
    btn.className = 'skin-swatch';
    btn.title = s.name;
    if(key === settings.skin) btn.classList.add('active');
    const p = s.primary.toString(16).padStart(6,'0');
    const a = s.accent.toString(16).padStart(6,'0');
    btn.style.background = `linear-gradient(135deg, #${p}, #${a})`;
    btn.onclick = ()=>{
      settings.skin = key;
      G.playerSkin = key;
      saveSettings();
      buildMaterials(key);
      populateSkinPicker();
    };
    el.appendChild(btn);
  });
}

export function populateWeaponStrip(){
  const el = $('#weaponStrip');
  el.innerHTML = '';
  WEAPON_ORDER.forEach((id, i) => {
    const w = WEAPONS[id];
    const slot = document.createElement('div');
    slot.className = 'wslot';
    slot.dataset.w = id;
    slot.textContent = (i+1);
    slot.title = w.name;
    slot.onclick = ()=> switchWeapon(id);
    el.appendChild(slot);
  });
}

export function openSettings(){
  const S = settings;
  $('#sSens').value = S.sensitivity; $('#vSens').textContent = S.sensitivity.toFixed(2);
  $('#sFov').value = S.fov; $('#vFov').textContent = S.fov;
  $('#sTouch').value = S.touchSens; $('#vTouch').textContent = S.touchSens.toFixed(2);
  $('#sInvert').checked = S.invertY;
  $('#sMaster').value = S.master; $('#vMaster').textContent = S.master.toFixed(2);
  $('#sSfx').value = S.sfx; $('#vSfx').textContent = S.sfx.toFixed(2);
  $('#sShadows').checked = S.shadows;
  $('#sFps').checked = S.fps;
  $('#sMinimap').checked = S.minimap;
  $('#sScale').value = S.scale; $('#vScale').textContent = S.scale.toFixed(2);
  $('#sChColor').value = S.crosshairColor;
  $('#sVibe').checked = S.vibe;
  $('#sNotif').checked = S.notif;
  const el = $('#settings');
  el.classList.remove('hidden');
  el.style.display = 'flex';
}

export function closeSettingsPanel(){
  const el = $('#settings');
  el.classList.add('hidden');
  el.style.display = '';
  if(G.state === 'paused'){
    const p = $('#pause');
    p.classList.remove('hidden');
    p.style.display = 'flex';
  }
}

function bindSettingsControls(){
  const bind = (id, key, fn, labelId, fmt) => {
    $(id).addEventListener('input', e=>{
      const v = fn(e.target.value);
      settings[key] = v;
      if(labelId) $(labelId).textContent = fmt ? fmt(v) : v;
    });
  };
  bind('#sSens','sensitivity', parseFloat, '#vSens', v=>v.toFixed(2));
  bind('#sFov','fov', parseFloat, '#vFov', v=>Math.round(v));
  bind('#sTouch','touchSens', parseFloat, '#vTouch', v=>v.toFixed(2));
  bind('#sMaster','master', parseFloat, '#vMaster', v=>v.toFixed(2));
  bind('#sSfx','sfx', parseFloat, '#vSfx', v=>v.toFixed(2));
  bind('#sScale','scale', parseFloat, '#vScale', v=>v.toFixed(2));
  $('#sInvert').addEventListener('change', e => settings.invertY = e.target.checked);
  $('#sShadows').addEventListener('change', e => settings.shadows = e.target.checked);
  $('#sFps').addEventListener('change', e => { settings.fps = e.target.checked; $('#fpsLabel').style.display = settings.fps?'block':'none'; });
  $('#sMinimap').addEventListener('change', e => { settings.minimap = e.target.checked; $('#minimapWrap').style.display = settings.minimap?'block':'none'; });
  $('#sVibe').addEventListener('change', e => settings.vibe = e.target.checked);
  $('#sNotif').addEventListener('change', async e => {
    if(e.target.checked){
      const ok = await Notify.request();
      settings.notif = ok;
      if(!ok) e.target.checked = false;
    } else settings.notif = false;
  });
  $('#sChColor').addEventListener('input', e => {
    settings.crosshairColor = e.target.value;
    document.documentElement.style.setProperty('--chc', e.target.value);
  });
  $('#saveSettings').addEventListener('click', ()=>{
    saveSettings();
    Audio.applyVolumes();
    const cam = refs.camera;
    if(cam){ cam.fov = settings.fov; cam.updateProjectionMatrix(); }
    const r = refs.renderer;
    if(r){
      r.shadowMap.enabled = settings.shadows;
      r.setPixelRatio(Math.min(devicePixelRatio, 2) * settings.scale);
    }
    document.documentElement.style.setProperty('--chc', settings.crosshairColor);
    closeSettingsPanel();
  });
  $('#closeSettings').addEventListener('click', closeSettingsPanel);
}

export function bindUI(){
  $('#btnSingle').onclick = ()=> startGame('single');
  $('#btnHost').onclick = ()=> Net.host();
  $('#btnJoin').onclick = ()=>{
    $('#modalTitle').textContent = 'JOIN ROOM';
    $('#modalText').textContent = 'Enter the room code:';
    $('#modalInput').value = '';
    $('#modalInput').readOnly = false;
    $('#modalCancel').style.display = 'block';
    $('#modalOk').textContent = 'JOIN';
    const el = $('#modal');
    el.classList.remove('hidden');
    el.style.display = 'flex';
  };
  $('#modalOk').onclick = ()=>{
    const val = $('#modalInput').value.trim().toUpperCase();
    const el = $('#modal');
    el.classList.add('hidden');
    el.style.display = '';
    if($('#modalTitle').textContent === 'ROOM CODE'){
      startGame('host');
    } else if(val){
      Net.join(val);
    }
  };
  $('#modalCancel').onclick = ()=>{
    const el = $('#modal');
    el.classList.add('hidden');
    el.style.display = '';
    Net.stop();
  };
  $('#btnSettings').onclick = openSettings;
  $('#btnFullscreen').onclick = toggleFullscreen;
  $('#btnInstall').onclick = ()=> alert('Use browser menu → Install app');
  $('#btnNotify').onclick = async ()=>{
    const ok = await Notify.request();
    settings.notif = ok;
    saveSettings();
    alert(ok ? 'Notifications enabled' : 'Notifications denied');
  };
  $('#btnReset').onclick = ()=>{
    if(confirm('Reset all save data?')){
      localStorage.removeItem('fz_settings');
      localStorage.removeItem('fz_score');
      location.reload();
    }
  };
  $('#btnResume').onclick = resumeGame;
  $('#btnPauseSettings').onclick = ()=>{
    const p = $('#pause'); p.classList.add('hidden'); p.style.display = '';
    openSettings();
  };
  $('#btnQuit').onclick = quitToMenu;
  $('#btnRetry').onclick = ()=> startGame(G.mode);
  $('#btnMenu2').onclick = quitToMenu;
  $('#menuScore').textContent = getTotalScore();

  bindSettingsControls();
  registerSW();

  // hook for net.js to trigger multiplayer start
  window.__fz_startMultiplayer = mode => startGame(mode);
}