import { $, clamp, TAU } from './utils.js';
import { settings } from './settings.js';
import { WEAPONS } from './config.js';
import { G, enemies, obstacles, remotePlayers, playerPos, playerLook } from './state.js';

export function updateHealthHUD(){
  $('#hpText').textContent = Math.max(0, Math.ceil(G.health));
  $('#hpBar').style.width = clamp(G.health,0,100) + '%';
  $('#armorText').textContent = Math.max(0, Math.ceil(G.armor));
  $('#armorBar').style.width = clamp(G.armor,0,100) + '%';
  const hp = $('#hpBar');
  if(G.health > 60) hp.style.background = 'linear-gradient(90deg,#10b981,#6ee7b7)';
  else if(G.health > 30) hp.style.background = 'linear-gradient(90deg,#f59e0b,#fde047)';
  else hp.style.background = 'linear-gradient(90deg,#dc2626,#f87171)';
}

export function updateScoreHUD(){ $('#scoreLabel').textContent = G.score; }
export function updateAmmoHUD(){
  const a = G.ammo[G.currentWeapon];
  if(!a) return;
  $('#ammoText').textContent = a.mag;
  $('#magText').textContent = '/ ' + a.res;
  $('#ammoText').style.color = a.mag === 0 ? '#ff4444' : (a.mag <= WEAPONS[G.currentWeapon].mag*.25 ? '#ffaa44' : '#fff');
}
export function updateWeaponHUD(){
  $('#weaponName').textContent = WEAPONS[G.currentWeapon].name;
  document.querySelectorAll('.wslot').forEach(el => el.classList.toggle('active', el.dataset.w === G.currentWeapon));
}
export function updateEnemiesHUD(){ $('#enemiesLeft').textContent = 'ENEMIES ' + G.enemiesAlive; }

export function addKillFeed(text, points, color){
  const el = document.createElement('div');
  el.className = 'killfeed-item';
  el.innerHTML = `<span style="color:${color||'#ff9f43'};font-weight:800">${text}</span>${points?` <span style="color:#ffd54f">+${points}</span>`:''}`;
  const feed = $('#killFeed');
  feed.appendChild(el);
  setTimeout(()=>{ el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(()=>el.remove(), 420); }, 2400);
  while(feed.children.length > 5) feed.firstChild.remove();
}

export function showHitmarker(){
  const hm = $('#hitmarker');
  hm.classList.remove('on'); void hm.offsetWidth; hm.classList.add('on');
}

let minimapCtx = null;
export function drawMinimap(){
  if(!settings.minimap) return;
  const canvas = $('#minimap');
  if(!canvas) return;
  if(!minimapCtx) minimapCtx = canvas.getContext('2d');
  const c = minimapCtx, W = 264, H = 264;
  c.clearRect(0,0,W,H);
  c.fillStyle = 'rgba(10,15,22,.75)';
  c.fillRect(0,0,W,H);
  const range = 70, scale = W / (range*2);

  c.fillStyle = 'rgba(120,150,190,.55)';
  for(const ob of obstacles){
    const x = W/2 + (ob.center.x - playerPos.x) * scale;
    const y = H/2 + (ob.center.z - playerPos.z) * scale;
    const w = ob.half.x * 2 * scale, h = ob.half.z * 2 * scale;
    if(x+w < 0 || x-w > W || y+h < 0 || y-h > H) continue;
    c.fillRect(x - w/2, y - h/2, w, h);
  }
  for(const e of enemies){
    if(e.dead) continue;
    const x = W/2 + (e.pos.x - playerPos.x) * scale;
    const y = H/2 + (e.pos.z - playerPos.z) * scale;
    c.fillStyle = '#ff3b30';
    c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
  }
  for(const rp of remotePlayers.values()){
    const x = W/2 + (rp.mesh.position.x - playerPos.x) * scale;
    const y = H/2 + (rp.mesh.position.z - playerPos.z) * scale;
    c.fillStyle = '#35d1ff';
    c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
  }
  c.fillStyle = '#00ff9d';
  c.beginPath(); c.arc(W/2, H/2, 5, 0, TAU); c.fill();

  const ang = Math.atan2(-Math.sin(playerLook.yaw), -Math.cos(playerLook.yaw)) + Math.PI/2;
  c.save();
  c.translate(W/2, H/2); c.rotate(ang);
  c.fillStyle = 'rgba(0,255,157,.25)';
  c.beginPath(); c.moveTo(0,0); c.arc(0,0,42,-.6,.6); c.closePath(); c.fill();
  c.restore();

  c.strokeStyle = 'rgba(255,255,255,.08)';
  c.lineWidth = 2;
  c.strokeRect(1,1,W-2,H-2);
}