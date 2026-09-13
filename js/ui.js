import { $, $$, show, hide } from './utils.js';
import { settings, saveSettings, Audio, applySettingsToDOM } from './settings.js';
import { WEAPONS, WEAPON_ORDER, SKINS, SKIN_ORDER, WEAPON_PRICES, GRENADE_PRICES, ORE_PRICES } from './config.js';
import { G } from './state.js';
import * as Identity from './identity.js';
import * as Econ from './economy.js';
import { wireDeviceButtons } from './device.js';

let onStartGame = null;
export function setGameHandlers(start){ onStartGame = start; }

let toastTimer = null;
export function toast(text, kind){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = text;
  el.className = 'toast show ' + (kind || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast ' + (kind || ''); }, 2200);
}

function bind(id, event, handler){
  const el = document.getElementById(id.replace('#',''));
  if(!el){ console.warn('[ui] missing element:', id); return null; }
  el.addEventListener(event, handler);
  return el;
}
function setText(id, val){
  const el = document.getElementById(id.replace('#',''));
  if(el) el.textContent = val;
  return el;
}

export function refreshWallet(){
  const p = Econ.getProfile();
  if(!p) return;
  const s = p.sparks || 0, e = p.embers || 0;
  setText('#hubSparks', '⚡ ' + s);
  setText('#hubEmbers', '🔥 ' + e);
  setText('#hudSparks', '⚡ ' + s);
  setText('#hudEmbers', '🔥 ' + e);
  setText('#shopSparks', '⚡ ' + s);
  setText('#shopEmbers', '🔥 ' + e);
  setText('#profSparks', '⚡ ' + s);
  setText('#profEmbers', '🔥 ' + e);
}

function bindHub(){
  bind('#btnSingle', 'click', () => { Audio.ui(); if(onStartGame) onStartGame('single'); });
  bind('#btnBackpack', 'click', () => { Audio.ui(); openBackpack(); });
  bind('#btnShop', 'click', () => { Audio.ui(); openShop(); });
  bind('#btnProfile', 'click', () => { Audio.ui(); openProfile(); });
  bind('#btnSettings', 'click', () => { Audio.ui(); openSettings(); });
  bind('#btnInstall', 'click', () => alert('Use browser menu → Install app'));
  bind('#btnReset', 'click', () => {
    if(confirm('Reset account? All progress will be lost.')){
      Identity.clearProfile();
      location.reload();
    }
  });
}

export function openSettings(){
  const S = settings;
  const setInput = (id, v) => { const el = document.getElementById(id.replace('#','')); if(el) el.value = v; };
  const setCheck = (id, v) => { const el = document.getElementById(id.replace('#','')); if(el) el.checked = v; };

  setInput('#sSens', S.sensitivity); setText('#vSens', S.sensitivity.toFixed(2));
  setInput('#sFov', S.fov); setText('#vFov', String(S.fov));
  setInput('#sTouch', S.touchSens); setText('#vTouch', S.touchSens.toFixed(2));
  setCheck('#sInvert', S.invertY);
  setCheck('#sLefty', S.lefty);
  setInput('#sMaster', S.master); setText('#vMaster', S.master.toFixed(2));
  setInput('#sSfx', S.sfx); setText('#vSfx', S.sfx.toFixed(2));
  setCheck('#sShadows', S.shadows);
  setCheck('#sFps', S.fps);
  setCheck('#sMinimap', S.minimap);
  setInput('#sScale', S.scale); setText('#vScale', S.scale.toFixed(2));
  setInput('#sChColor', S.crosshairColor);
  setCheck('#sVibe', S.vibe);
  setCheck('#sNotif', S.notif);
  show($('#settings'));
}

function bindSettingsControls(){
  const bindSlider = (id, key, fn, labelId, fmt) => {
    const el = document.getElementById(id.replace('#',''));
    if(!el){ console.warn('[ui] missing slider:', id); return; }
    el.addEventListener('input', e => {
      const v = fn(e.target.value);
      settings[key] = v;
      if(labelId) setText(labelId, fmt ? fmt(v) : String(v));
    });
  };
  bindSlider('#sSens', 'sensitivity', parseFloat, '#vSens', v => v.toFixed(2));
  bindSlider('#sFov', 'fov', parseFloat, '#vFov', v => String(Math.round(v)));
  bindSlider('#sTouch', 'touchSens', parseFloat, '#vTouch', v => v.toFixed(2));
  bindSlider('#sMaster', 'master', parseFloat, '#vMaster', v => v.toFixed(2));
  bindSlider('#sSfx', 'sfx', parseFloat, '#vSfx', v => v.toFixed(2));
  bindSlider('#sScale', 'scale', parseFloat, '#vScale', v => v.toFixed(2));

  bind('#sInvert', 'change', e => settings.invertY = e.target.checked);
  bind('#sLefty', 'change', e => { settings.lefty = e.target.checked; applySettingsToDOM(); });
  bind('#sShadows', 'change', e => settings.shadows = e.target.checked);
  bind('#sFps', 'change', e => { settings.fps = e.target.checked; applySettingsToDOM(); });
  bind('#sMinimap', 'change', e => { settings.minimap = e.target.checked; applySettingsToDOM(); });
  bind('#sVibe', 'change', e => settings.vibe = e.target.checked);
  bind('#sNotif', 'change', e => settings.notif = e.target.checked);
  bind('#sChColor', 'input', e => {
    settings.crosshairColor = e.target.value;
    applySettingsToDOM();
  });
  bind('#saveSettings', 'click', () => {
    saveSettings();
    Audio.applyVolumes();
    applySettingsToDOM();
    hide($('#settings'));
  });
  bind('#closeSettings', 'click', () => hide($('#settings')));
}

let packTab = 'weapons';
export function openBackpack(){
  packTab = 'weapons';
  $$('.pack-tabs .tabbtn').forEach(b => b.classList.toggle('active', b.dataset.tab === packTab));
  renderPack();
  show($('#backpack'));
}

function renderPack(){
  const p = Econ.getProfile();
  if(!p) return;
  const grid = document.getElementById('packGrid'); if(!grid) return;
  grid.innerHTML = '';
  const items = [];

  if(packTab === 'weapons'){
    for(const id of WEAPON_ORDER){
      const owned = p.ownedWeapons.includes(id);
      items.push({
        icon: WEAPONS[id].icon, name: WEAPONS[id].name,
        meta: owned ? (p.loadout === id ? 'EQUIPPED' : 'Owned') : 'Locked',
        locked: !owned, equipped: p.loadout === id,
        onClick: () => {
          if(!owned){ toast('Buy in shop', 'err'); return; }
          Econ.equipLoadout(id);
          toast('Equipped ' + WEAPONS[id].name, 'ok');
          renderPack();
        }
      });
    }
  } else if(packTab === 'skins'){
    for(const id of SKIN_ORDER){
      const owned = p.ownedSkins.includes(id);
      items.push({
        icon: '👤', name: SKINS[id].name,
        meta: owned ? (p.equippedSkin === id ? 'EQUIPPED' : 'Owned') : 'Locked',
        locked: !owned, equipped: p.equippedSkin === id,
        onClick: () => {
          if(!owned){ toast('Buy in shop', 'err'); return; }
          Econ.equipSkin(id);
          toast('Equipped ' + SKINS[id].name, 'ok');
          renderPack();
        }
      });
    }
  } else if(packTab === 'grenades'){
    const g = p.grenades || {};
    for(const kind of ['frag','smoke','flash','molotov']){
      items.push({
        icon: { frag:'💣', smoke:'🌫️', flash:'⚡', molotov:'🔥' }[kind],
        name: kind.toUpperCase(),
        meta: (g[kind] || 0) + ' owned',
        locked: (g[kind] || 0) === 0
      });
    }
  } else if(packTab === 'ores'){
    const o = p.ores || {};
    for(const kind of ['common','rare','epic','legendary']){
      items.push({
        icon: { common:'🪨', rare:'💎', epic:'🔮', legendary:'⭐' }[kind],
        name: kind.toUpperCase(),
        meta: (o[kind] || 0) + ' owned',
        locked: (o[kind] || 0) === 0
      });
    }
  } else if(packTab === 'gifts'){
    items.push({ icon: '🎁', name: 'EMPTY', meta: 'Phase 2' });
  }

  for(const it of items){
    const el = document.createElement('div');
    el.className = 'pack-slot' + (it.locked ? ' locked' : '') + (it.equipped ? ' equipped' : '');
    el.innerHTML = '<div class="icon">' + it.icon + '</div><div class="name">' + it.name + '</div><div class="meta">' + it.meta + '</div>';
    if(it.onClick) el.onclick = it.onClick;
    grid.appendChild(el);
  }
}

function bindBackpack(){
  bind('#closeBackpack', 'click', () => hide($('#backpack')));
  $$('.pack-tabs .tabbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      packTab = btn.dataset.tab;
      $$('.pack-tabs .tabbtn').forEach(b => b.classList.toggle('active', b === btn));
      renderPack();
    });
  });
}

let shopTab = 'weapons';
let shopSelected = null;
export function openShop(){
  shopTab = 'weapons';
  shopSelected = null;
  $$('.shop-tabs .tabbtn').forEach(b => b.classList.toggle('active', b.dataset.tab === shopTab));
  renderShop();
  renderShopDetails();
  refreshWallet();
  show($('#shop'));
}

function renderShop(){
  const grid = document.getElementById('shopGrid'); if(!grid) return;
  grid.innerHTML = '';
  const p = Econ.getProfile(); if(!p) return;
  const items = [];

  if(shopTab === 'weapons'){
    for(const id of WEAPON_ORDER){
      items.push({ id, icon: WEAPONS[id].icon, name: WEAPONS[id].name, price: WEAPON_PRICES[id], owned: p.ownedWeapons.includes(id) });
    }
  } else if(shopTab === 'skins'){
    for(const id of SKIN_ORDER){
      items.push({ id, icon: '👤', name: SKINS[id].name, price: SKINS[id].price, owned: p.ownedSkins.includes(id) });
    }
  } else if(shopTab === 'grenades'){
    for(const kind of ['frag','smoke','flash','molotov']){
      items.push({ id: kind, icon: { frag:'💣', smoke:'🌫️', flash:'⚡', molotov:'🔥' }[kind], name: kind.toUpperCase(), price: GRENADE_PRICES[kind], owned: false });
    }
  } else if(shopTab === 'ores'){
    for(const kind of ['common','rare','epic','legendary']){
      items.push({ id: kind, icon: { common:'🪨', rare:'💎', epic:'🔮', legendary:'⭐' }[kind], name: kind.toUpperCase(), price: ORE_PRICES[kind], owned: false });
    }
  }

  for(const it of items){
    const el = document.createElement('div');
    el.className = 'shop-item' + (it.owned ? ' owned' : '') + (shopSelected === it.id ? ' selected' : '');
    el.innerHTML = '<div class="icon">' + it.icon + '</div><div class="name">' + it.name + '</div>'
      + (it.owned ? '<div class="owned">OWNED</div>' : '<div class="price">⚡ ' + it.price + '</div>');
    el.onclick = () => { shopSelected = it.id; renderShop(); renderShopDetails(); };
    grid.appendChild(el);
  }
}

function renderShopDetails(){
  const el = document.getElementById('shopDetails'); if(!el) return;
  if(!shopSelected){ el.innerHTML = '<div class="placeholder-title">Select an item</div>'; return; }
  const p = Econ.getProfile(); if(!p) return;
  let item = null;

  if(shopTab === 'weapons'){
    const w = WEAPONS[shopSelected];
    item = { id: shopSelected, name: w.name, icon: w.icon, price: WEAPON_PRICES[shopSelected], owned: p.ownedWeapons.includes(shopSelected), type: 'weapon',
      stats: { dmg: w.dmg, rpm: w.rpm, mag: w.mag, reload: w.reload } };
  } else if(shopTab === 'skins'){
    const s = SKINS[shopSelected];
    item = { id: shopSelected, name: s.name, icon: '👤', price: s.price, owned: p.ownedSkins.includes(shopSelected), type: 'skin' };
  } else if(shopTab === 'grenades'){
    item = { id: shopSelected, name: shopSelected.toUpperCase(), icon: '💣', price: GRENADE_PRICES[shopSelected], owned: false, type: 'grenade' };
  } else if(shopTab === 'ores'){
    item = { id: shopSelected, name: shopSelected.toUpperCase(), icon: '🪨', price: ORE_PRICES[shopSelected], owned: false, type: 'ore' };
  }

  let html = '<h3>' + item.icon + ' ' + item.name + '</h3>';
  if(item.stats){
    html += '<div class="row"><span>DAMAGE</span><b>' + item.stats.dmg + '</b></div>';
    html += '<div class="row"><span>RPM</span><b>' + item.stats.rpm + '</b></div>';
    html += '<div class="row"><span>MAG</span><b>' + item.stats.mag + '</b></div>';
    html += '<div class="row"><span>RELOAD</span><b>' + item.stats.reload + 's</b></div>';
  }
  html += item.owned
    ? '<div style="margin-top:12px;color:#10b981;font-weight:800;letter-spacing:.2em">OWNED</div>'
    : '<button id="shopBuy" class="btn primary-btn" style="margin-top:12px">BUY ⚡ ' + item.price + '</button>';
  el.innerHTML = html;

  const buy = document.getElementById('shopBuy');
  if(buy){
    buy.onclick = () => {
      let res;
      if(item.type === 'weapon') res = Econ.buyWeapon(item.id);
      else if(item.type === 'skin') res = Econ.buySkin(item.id);
      else if(item.type === 'grenade') res = Econ.buyGrenade(item.id, 1);
      else if(item.type === 'ore') res = Econ.buyOre(item.id, 1);
      if(res && res.ok){
        toast('Purchased ' + item.name, 'ok');
        refreshWallet(); renderShop(); renderShopDetails();
      } else toast((res && res.reason) || 'Purchase failed', 'err');
    };
  }
}

function bindShop(){
  bind('#closeShop', 'click', () => hide($('#shop')));
  $$('.shop-tabs .tabbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      shopTab = btn.dataset.tab;
      shopSelected = null;
      $$('.shop-tabs .tabbtn').forEach(b => b.classList.toggle('active', b === btn));
      renderShop(); renderShopDetails();
    });
  });
}

export function openProfile(){
  const p = Econ.getProfile(); if(!p) return;
  setText('#profName', p.username);
  setText('#profPeerId', Identity.secretToPeerId(p.secret));
  setText('#profCreated', new Date(p.createdAt).toLocaleDateString());
  refreshWallet();
  show($('#profile'));
}

function bindProfile(){
  bind('#closeProfile', 'click', () => hide($('#profile')));
  bind('#viewRecovery', 'click', () => {
    const p = Econ.getProfile(); if(!p) return;
    const code = document.getElementById('recoveryCode'); if(code) code.textContent = Identity.formatRecovery(p.secret);
    hide($('#profile'));
    show($('#recoveryModal'));
  });
}

export function bindIdentityModals(onComplete){
  bind('#usernameConfirm', 'click', () => {
    const input = document.getElementById('usernameInput'); if(!input) return;
    const name = input.value.trim();
    const err = Identity.validateUsername(name);
    const errEl = document.getElementById('usernameError');
    if(err){ if(errEl) errEl.textContent = err; return; }
    const profile = Identity.createProfile(name);
    if(errEl) errEl.textContent = '';
    hide($('#usernameModal'));
    const code = document.getElementById('recoveryCode');
    if(code) code.textContent = Identity.formatRecovery(profile.secret);
    show($('#recoveryModal'));
  });
  bind('#recoveryConfirm', 'click', () => {
    hide($('#recoveryModal'));
    refreshWallet();
    if(onComplete) onComplete();
  });
  bind('#copyRecovery', 'click', async () => {
    const codeEl = document.getElementById('recoveryCode');
    const text = codeEl ? codeEl.textContent : '';
    try { await navigator.clipboard.writeText(text); toast('Recovery code copied', 'ok'); }
    catch(e){ toast('Copy failed', 'err'); }
  });
}

export function showUsernameModal(){
  show($('#usernameModal'));
  setTimeout(() => { const i = document.getElementById('usernameInput'); if(i) i.focus(); }, 100);
}

export function showPause(){ show($('#pause')); }
export function hidePause(){ hide($('#pause')); }
export function hideHub(){ hide($('#hub')); }
export function showHub(){ show($('#hub')); }
export function hideGameOver(){ hide($('#gameover')); }

export function showGameOver(score, kills, wave, earnedSparks, earnedEmbers){
  setText('#goScore', score);
  setText('#goKills', kills);
  setText('#goWave', wave);
  setText('#goSub', 'YOU SURVIVED ' + wave + ' WAVE' + (wave === 1 ? '' : 'S'));
  setText('#goEarned', '+⚡ ' + earnedSparks + '   +🔥 ' + earnedEmbers);
  show($('#gameover'));
}

export function bindGameButtons(){
  bind('#btnResume', 'click', () => { if(window.__fz_resume) window.__fz_resume(); });
  bind('#btnQuit', 'click', () => { if(window.__fz_quit) window.__fz_quit(); });
  bind('#btnRetry', 'click', () => { if(window.__fz_retry) window.__fz_retry(); });
  bind('#btnMenu2', 'click', () => { if(window.__fz_menu) window.__fz_menu(); });
}

export function initUI(){
  bindHub();
  bindSettingsControls();
  bindBackpack();
  bindShop();
  bindProfile();
  bindGameButtons();
  applySettingsToDOM();
  refreshWallet();
  wireDeviceButtons(toast);
}