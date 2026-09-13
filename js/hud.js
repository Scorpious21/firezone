import { $, clamp, TAU } from './utils.js';
import { settings } from './settings.js';
import { WEAPONS } from './config.js';
import { G, enemies, obstacles, playerPos, playerLook } from './state.js';

export function updateHealthHUD(){
  const hpText = $('#hpText'), hpBar = $('#hpBar');
  const armorText = $('#armorText'), armorBar = $('#armorBar');
  if(hpText) hpText.textContent = Math.max(0, Math.ceil(G.health));
  if(hpBar) hpBar.style.width = clamp(G.health, 0, 100) + '%';
  if(armorText) armorText.textContent = Math.max(0, Math.ceil(G.armor));
  if(armorBar) armorBar.style.width = clamp(G.armor, 0, 100) + '%';
  if(hpBar){
    if(G.health > 60) hpBar.style.background = 'linear-gradient(90deg,#10b981,#6ee7b7)';
    else if(G.health > 30) hpBar.style.background = 'linear-gradient(90deg,#f59e0b,#fde047)';
    else hpBar.style.background = 'linear-gradient(90deg,#dc2626,#f87171)';
  }
}

export function updateScoreHUD(){
  const el = $('#scoreLabel'); if(el) el.textContent = G.score;
}

export function updateAmmoHUD(){
  const a = G.ammo[G.currentWeapon];
  if(!a) return;
  const at = $('#ammoText'), mt = $('#magText');
  if(at) at.textContent = a.mag;
  if(mt) mt.textContent = '/ ' + a.res;
  if(at) at.style.color = a.mag === 0 ? '#ff4444' : (a.mag <= WEAPONS[G.currentWeapon].mag * 0.25 ? '#ffaa44' : '#fff');
}

export function updateWeaponHUD(){
  const el = $('#weaponName');
  if(el) el.textContent = WEAPONS[G.currentWeapon].name;
}

export function updateEnemiesHUD(){
  const el = $('#enemiesLeft');
  if(el) el.textContent = 'ENEMIES ' + G.enemiesAlive;
}

export function addKillFeed(text, points, color){
  const feed = $('#killFeed');
  if(!feed) return;
  const el = document.createElement('div');
  el.className = 'killfeed-item';
  el.innerHTML = '<span style="color:' + (color || '#ff9f43') + ';font-weight:800">' + text + '</span>'
    + (points ? ' <span style="color:#ffd54f">+' + points + '</span>' : '');
  feed.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 420);
  }, 2400);
  while(feed.children.length > 5) feed.firstChild.remove();
}

export function showHitmarker(){
  const hm = $('#hitmarker');
  if(!hm) return;
  hm.classList.remove('on');
  void hm.offsetWidth;
  hm.classList.add('on');
}

let minimapCtx = null;
export function drawMinimap(){
  if(!settings.minimap) return;
  const canvas = $('#minimap');
  if(!canvas) return;
  if(!minimapCtx) minimapCtx = canvas.getContext('2d');
  const c = minimapCtx, W = 264, H = 264;
  c.clearRect(0, 0, W, H);
  c.fillStyle = 'rgba(10,15,22,0.75)';
  c.fillRect(0, 0, W, H);
  const range = 70, scale = W / (range * 2);

  c.fillStyle = 'rgba(120,150,190,0.55)';
  for(const ob of obstacles){
    const x = W/2 + (ob.center.x - playerPos.x) * scale;
    const y = H/2 + (ob.center.z - playerPos.z) * scale;
    const w = ob.half.x * 2 * scale, h = ob.half.z * 2 * scale;
    if(x + w < 0 || x - w > W || y + h < 0 || y - h > H) continue;
    c.fillRect(x - w/2, y - h/2, w, h);
  }
  for(const e of enemies){
    if(e.dead) continue;
    const x = W/2 + (e.pos.x - playerPos.x) * scale;
    const y = H/2 + (e.pos.z - playerPos.z) * scale;
    c.fillStyle = '#ff3b30';
    c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
  }
  c.fillStyle = '#00ff9d';
  c.beginPath(); c.arc(W/2, H/2, 5, 0, TAU); c.fill();

  const ang = Math.atan2(-Math.sin(playerLook.yaw), -Math.cos(playerLook.yaw)) + Math.PI / 2;
  c.save();
  c.translate(W/2, H/2);
  c.rotate(ang);
  c.fillStyle = 'rgba(0,255,157,0.25)';
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 42, -0.6, 0.6); c.closePath(); c.fill();
  c.restore();
}