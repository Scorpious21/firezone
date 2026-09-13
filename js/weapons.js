import * as THREE from 'three';
import { clamp, rand, TAU, nowMs, IS_TOUCH } from './utils.js';
import { WEAPONS, WEAPON_ORDER } from './config.js';
import { G, enemies, obstacles, remotePlayers, refs, playerPos, playerLook } from './state.js';
import { Audio, Haptics } from './settings.js';
import { MATS, buildWeaponModel, box, cyl } from './models.js';
import { updateAmmoHUD, updateWeaponHUD, showHitmarker, addKillFeed } from './hud.js';
import { damagePlayer } from './damage.js';
import { $, $$ } from './utils.js';

let gunGroup = null, muzzleFlash = null, muzzleLight = null;
let recoilZ = 0, recoilRot = 0, bobAmt = 0;
let firing = false, fireInterval = null;

const raycaster = new THREE.Raycaster();

export function getGunGroup(){ return gunGroup; }

export function buildViewModel(){
  const { camera } = refs;
  if(!camera) return;
  if(gunGroup) camera.remove(gunGroup);

  gunGroup = new THREE.Group();
  gunGroup.add(buildWeaponModel(G.currentWeapon));
  gunGroup.position.set(0.20, -0.20, -0.42);
  gunGroup.rotation.set(0, -0.06, 0);
  camera.add(gunGroup);

  // muzzle flash sprite
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(255,255,220,1)');
  grd.addColorStop(.35,'rgba(255,180,60,.85)');
  grd.addColorStop(1,'rgba(255,90,0,0)');
  g.fillStyle = grd; g.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(c);

  muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false
  }));
  muzzleFlash.scale.set(.5,.5,.5);
  muzzleFlash.position.set(0, .02, -.85);
  muzzleFlash.visible = false;
  gunGroup.add(muzzleFlash);

  muzzleLight = new THREE.PointLight(0xffb040, 0, 9, 2);
  muzzleLight.position.set(0, .02, -.9);
  gunGroup.add(muzzleLight);
}

export function swapWeaponModel(){
  if(!gunGroup) return;
  while(gunGroup.children.length){
    const c = gunGroup.children.pop();
    if(c === muzzleFlash || c === muzzleLight) continue;
    c.traverse(o => { if(o.geometry) o.geometry.dispose(); });
  }
  gunGroup.add(buildWeaponModel(G.currentWeapon));
  gunGroup.add(muzzleFlash);
  gunGroup.add(muzzleLight);
  gunGroup.position.set(0.20, -0.32, -0.42);
  gunGroup.rotation.set(-0.25, -0.06, 0);
}

export function updateViewModel(dt){
  if(!gunGroup) return;
  recoilZ = Math.max(0, recoilZ - dt*1.2);
  recoilRot = Math.max(0, recoilRot - dt*1.2);
  const moving = (require_keys_moving()) && true;
  const sprinting = false;
  bobAmt = bobAmt + ((moving ? 1 : 0) - bobAmt) * dt * 8;
  const tsec = nowMs() * .001;
  const bobSpeed = 9;
  const bobX = Math.sin(tsec*bobSpeed) * .012 * bobAmt;
  const bobY = Math.abs(Math.cos(tsec*bobSpeed)) * .010 * bobAmt;
  gunGroup.position.x = 0.20 + bobX;
  gunGroup.position.y = -0.20 - bobY - (G.reloading ? 0.14 : 0);
  gunGroup.position.z = -0.42 + recoilZ;
  gunGroup.rotation.x = recoilRot + (G.reloading ? 0.5 : 0);
}

function require_keys_moving(){
  // avoid circular import: use player state indirectly
  return false;
}

export function muzzleWorld(){
  if(muzzleFlash){
    const v = new THREE.Vector3();
    muzzleFlash.getWorldPosition(v);
    return v;
  }
  const { camera } = refs;
  return camera ? camera.position.clone() : new THREE.Vector3();
}

export function startFiring(){
  firing = true;
  const W = WEAPONS[G.currentWeapon];
  if(W.auto){
    if(fireInterval) clearInterval(fireInterval);
    fireInterval = setInterval(()=>{ if(firing && G.state==='playing') tryFire(); }, 60 / W.rpm * 1000);
    tryFire();
  } else {
    tryFire();
  }
}

export function stopFiring(){
  firing = false;
  if(fireInterval){ clearInterval(fireInterval); fireInterval = null; }
}

export function tryFire(){
  const { camera } = refs;
  if(!camera) return;
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  if(G.reloading || G.fireCooldown > 0) return;
  if(ammo.mag <= 0){
    Audio.empty();
    G.fireCooldown = 0.25;
    if(ammo.res > 0) startReload();
    return;
  }

  ammo.mag--;
  G.fireCooldown = 60 / W.rpm;
  Audio.shot(W.sound, 1);
  Haptics.shoot();

  if(muzzleFlash){
    muzzleFlash.visible = true;
    muzzleFlash.material.rotation = Math.random()*TAU;
    muzzleFlash.scale.setScalar(rand(.32,.52));
    setTimeout(()=>{ if(muzzleFlash) muzzleFlash.visible = false; }, 45);
  }
  if(muzzleLight){
    muzzleLight.intensity = 14;
    setTimeout(()=>{ if(muzzleLight) muzzleLight.intensity = 0; }, 55);
  }

  recoilZ = 0.085; recoilRot = 0.14;
  playerLook.pitch = clamp(playerLook.pitch + W.recoil, -1.45, 1.45);
  playerLook.yaw += rand(-1,1) * W.recoil * 0.3;

  const origin = camera.position.clone();
  const dirBase = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);

  const targets = [];
  for(const e of enemies) if(!e.dead) targets.push(e.torso, e.head);
  for(const ob of obstacles) targets.push(ob.mesh);
  for(const rp of remotePlayers.values()) targets.push(rp.hitMesh);

  let anyHit = false;
  for(let p=0; p<W.pellets; p++){
    const dir = dirBase.clone();
    dir.x += rand(-1,1)*W.spread;
    dir.y += rand(-1,1)*W.spread;
    dir.z += rand(-1,1)*W.spread;
    dir.normalize();
    raycaster.set(origin, dir);
    raycaster.far = W.range;
    const hits = raycaster.intersectObjects(targets, true);

    if(hits.length){
      const h = hits[0];
      spawnTracer(muzzleWorld(), h.point);
      spawnImpact(h.point, h.face ? h.face.normal : new THREE.Vector3(0,1,0));
      let obj = h.object;
      while(obj && !obj.userData.enemy) obj = obj.parent;
      if(obj && obj.userData.enemy && !obj.userData.enemy.dead){
        const isHead = h.object.userData.part === 'head';
        const dmg = W.dmg * (isHead ? 2.6 : 1) * (1 - clamp(h.distance/W.range,0,1)*.28);
        obj.userData.enemy.damage(dmg, isHead);
        anyHit = true;
      }
    } else {
      spawnTracer(muzzleWorld(), origin.clone().addScaledVector(dir, W.range));
    }
  }
  if(anyHit) showHitmarker();
  updateAmmoHUD();

  // broadcast in multiplayer
  if(window.__fz_net && window.__fz_net.active){
    window.__fz_net.send({
      t:'shot',
      from:[origin.x,origin.y,origin.z],
      to:[dirBase.x,dirBase.y,dirBase.z],
      w:G.currentWeapon
    });
  }

  if(ammo.mag === 0) setTimeout(startReload, 120);
}

/* Effects stored here to keep imports simple. */
import { tracers, particles } from './state.js';
import { refs as engineRefs } from './state.js';

export function spawnTracer(from, to){
  const scene = engineRefs.scene;
  if(!scene) return;
  const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const mat = new THREE.LineBasicMaterial({ color:0xffe08a, transparent:true, opacity:.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  tracers.push({ line, life:.07, max:.07 });
}

export function spawnImpact(pos, normal){
  const scene = engineRefs.scene;
  if(!scene) return;
  const n = IS_TOUCH ? 3 : 5;
  for(let i=0;i<n;i++){
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(.035, 4, 4),
      new THREE.MeshBasicMaterial({ color:0xffcc66, transparent:true })
    );
    p.position.copy(pos);
    scene.add(p);
    particles.push({
      mesh:p, life:.35, max:.35,
      vel: normal.clone().multiplyScalar(rand(1,3))
        .add(new THREE.Vector3(rand(-1,1),rand(-1,1),rand(-1,1)))
    });
  }
}

export function updateEffects(dt){
  const scene = engineRefs.scene;
  for(let i=tracers.length-1;i>=0;i--){
    const t = tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life/t.max) * .9;
    if(t.life <= 0){
      scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      tracers.splice(i,1);
    }
  }
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= dt; p.vel.y -= 14*dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = Math.max(0, p.life/p.max);
    if(p.life <= 0){
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i,1);
    }
  }
}

export function startReload(){
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  if(G.reloading || ammo.mag >= W.mag || ammo.res <= 0) return;
  G.reloading = true;
  G.reloadDur = W.reload;
  G.reloadT = 0;
  Audio.reload();
  $('#reloadHint').textContent = 'RELOADING…';
  $('#reloadBarWrap').classList.remove('hidden');
}

export function finishReload(){
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  const need = W.mag - ammo.mag;
  const take = Math.min(need, ammo.res);
  ammo.mag += take; ammo.res -= take;
  G.reloading = false;
  $('#reloadHint').textContent = '';
  $('#reloadBarWrap').classList.add('hidden');
  $('#reloadBar').style.width = '0%';
  updateAmmoHUD();
}

export function switchWeapon(id){
  if(!WEAPONS[id] || id === G.currentWeapon || G.reloading) return;
  G.currentWeapon = id;
  Audio.ui();
  swapWeaponModel();
  updateWeaponHUD();
  updateAmmoHUD();
  G.fireCooldown = 0.25;
}

export function cycleWeapon(dir){
  const i = WEAPON_ORDER.indexOf(G.currentWeapon);
  const n = (i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
  switchWeapon(WEAPON_ORDER[n]);
}

export function resetAmmo(){
  G.ammo = {};
  for(const id of WEAPON_ORDER){
    G.ammo[id] = { mag: WEAPONS[id].mag, res: WEAPONS[id].res };
  }
}