import * as THREE from 'three';
import { $, clamp, rand, TAU, nowMs } from './utils.js';
import { WEAPONS, WEAPON_ORDER } from './config.js';
import { G, enemies, obstacles, refs, playerLook } from './state.js';
import { Audio, Haptics } from './settings.js';
import { spawnTracer, spawnImpact } from './engine.js';
import { updateAmmoHUD, updateWeaponHUD, showHitmarker, addKillFeed } from './hud.js';

const raycaster = new THREE.Raycaster();
let firing = false, fireInterval = null;

function buildGun(kind){
  const grp = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.5, metalness: 0.8 });
  const mid  = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.6, metalness: 0.6 });
  const acc  = new THREE.MeshStandardMaterial({ color: 0xff6a2a, emissive: 0xff3d00, emissiveIntensity: 0.8, roughness: 0.4 });
  const glove= new THREE.MeshStandardMaterial({ color: 0x223042, roughness: 0.85, metalness: 0.1 });

  const bx = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; grp.add(m); return m;
  };
  const cy = (r, h, mat, x = 0, y = 0, z = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
    m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; grp.add(m); return m;
  };

  const isPistol  = kind === 'pistol' || kind === 'magnum';
  const isShotgun = kind === 'shotgun';
  const isSniper  = kind === 'sniper';
  const isRpg     = kind === 'rpg';
  const isLmg     = kind === 'lmg';

  if(isPistol){
    bx(0.075, 0.10, 0.30, dark, 0, 0, -0.08);
    bx(0.085, 0.055, 0.32, mid, 0, 0.075, -0.09);
    bx(0.07, 0.18, 0.10, mid, 0, -0.14, 0.04);
    bx(0.045, 0.02, 0.07, acc, 0, -0.005, -0.22);
  } else if(isShotgun){
    bx(0.10, 0.12, 0.55, dark, 0, 0, -0.15);
    cy(0.033, 0.55, dark, 0, 0.045, -0.65, Math.PI / 2);
    bx(0.09, 0.09, 0.16, mid, 0, -0.05, -0.58);
    bx(0.075, 0.14, 0.30, mid, 0, -0.04, 0.32);
    bx(0.06, 0.02, 0.10, acc, 0, 0.078, -0.20);
  } else if(isSniper){
    bx(0.075, 0.10, 0.85, dark, 0, 0, -0.30);
    cy(0.020, 0.55, dark, 0, 0.015, -1.02, Math.PI / 2);
    cy(0.045, 0.36, mid, 0, 0.14, -0.35, Math.PI / 2);
    bx(0.02, 0.10, 0.03, dark, 0, 0.085, -0.25);
    bx(0.02, 0.10, 0.03, dark, 0, 0.085, -0.45);
    bx(0.055, 0.15, 0.075, mid, 0, -0.13, 0.04);
  } else if(isRpg){
    cy(0.055, 0.85, dark, 0, 0, -0.30, Math.PI / 2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.24, 12), mid);
    cone.position.set(0, 0, -0.75); cone.rotation.x = -Math.PI / 2; cone.castShadow = true;
    grp.add(cone);
    bx(0.06, 0.16, 0.07, mid, 0, -0.14, 0.02);
    bx(0.04, 0.02, 0.06, acc, 0, 0.075, -0.10);
  } else if(isLmg){
    bx(0.11, 0.14, 0.60, dark, 0, 0, -0.20);
    cy(0.026, 0.55, dark, 0, 0.02, -0.75, Math.PI / 2);
    bx(0.16, 0.20, 0.22, mid, 0, -0.18, -0.05);
    bx(0.06, 0.13, 0.26, mid, 0, -0.02, 0.30);
    bx(0.06, 0.03, 0.12, acc, 0, 0.095, -0.05);
  } else {
    bx(0.085, 0.11, 0.55, dark, 0, 0, -0.22);
    cy(0.021, 0.42, dark, 0, 0.01, -0.72, Math.PI / 2);
    bx(0.075, 0.085, 0.28, mid, 0, -0.01, -0.55);
    bx(0.07, 0.22, 0.11, mid, 0, -0.14, 0.02);
    bx(0.06, 0.13, 0.28, mid, 0, -0.02, 0.32);
    bx(0.06, 0.03, 0.14, acc, 0, 0.075, -0.05);
  }

  bx(0.11, 0.13, 0.14, glove, 0, -0.10, 0.02);
  const lh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.14), glove);
  lh.position.set(0, -0.10, isPistol ? 0.10 : -0.45);
  lh.castShadow = true;
  grp.add(lh);

  return grp;
}

export function initWeapons(){
  const camera = refs.camera;
  if(!camera) return;
  if(refs.gunGroup) camera.remove(refs.gunGroup);

  const grp = new THREE.Group();
  grp.add(buildGun(G.currentWeapon));
  grp.position.set(0.20, -0.20, -0.42);
  camera.add(grp);
  refs.gunGroup = grp;

  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  grd.addColorStop(0, 'rgba(255,255,220,1)');
  grd.addColorStop(0.35, 'rgba(255,180,60,0.85)');
  grd.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, s, s);

  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  flash.scale.set(0.5, 0.5, 0.5);
  flash.position.set(0, 0.02, -0.85);
  flash.visible = false;
  grp.add(flash);
  refs.muzzleFlash = flash;

  const light = new THREE.PointLight(0xffb040, 0, 9, 2);
  light.position.set(0, 0.02, -0.9);
  grp.add(light);
  refs.muzzleLight = light;
}

export function switchWeapon(id){
  if(!WEAPONS[id] || id === G.currentWeapon) return;
  G.currentWeapon = id;
  Audio.ui();
  initWeapons();
  updateWeaponHUD();
  updateAmmoHUD();
  G.fireCooldown = 0.25;
}

export function cycleWeapon(dir){
  const i = WEAPON_ORDER.indexOf(G.currentWeapon);
  const n = (i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
  switchWeapon(WEAPON_ORDER[n]);
}

export function startFiring(){
  firing = true;
  const W = WEAPONS[G.currentWeapon];
  if(W.auto){
    if(fireInterval) clearInterval(fireInterval);
    fireInterval = setInterval(() => { if(firing && G.state === 'playing') tryFire(); }, 60 / W.rpm * 1000);
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
  const camera = refs.camera;
  if(!camera) return;
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  if(!ammo) return;
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

  const flash = refs.muzzleFlash, light = refs.muzzleLight;
  if(flash){
    flash.visible = true;
    flash.material.rotation = Math.random() * TAU;
    flash.scale.setScalar(rand(0.32, 0.52));
    setTimeout(() => { if(flash) flash.visible = false; }, 45);
  }
  if(light){
    light.intensity = 14;
    setTimeout(() => { if(light) light.intensity = 0; }, 55);
  }

  playerLook.pitch = clamp(playerLook.pitch + W.recoil, -1.45, 1.45);
  playerLook.yaw += rand(-1, 1) * W.recoil * 0.3;

  const origin = camera.position.clone();
  const dirBase = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const fromPos = flash ? (() => { const v = new THREE.Vector3(); flash.getWorldPosition(v); return v; })() : origin.clone();

  const targets = [];
  for(const e of enemies) if(!e.dead) targets.push(e.torso, e.head);
  for(const ob of obstacles) targets.push(ob.mesh);

  let anyHit = false;
  for(let p = 0; p < W.pellets; p++){
    const dir = dirBase.clone();
    dir.x += rand(-1, 1) * W.spread;
    dir.y += rand(-1, 1) * W.spread;
    dir.z += rand(-1, 1) * W.spread;
    dir.normalize();
    raycaster.set(origin, dir);
    raycaster.far = W.range;
    const hits = raycaster.intersectObjects(targets, true);

    if(hits.length){
      const h = hits[0];
      spawnTracer(fromPos, h.point);
      spawnImpact(h.point, h.face ? h.face.normal : new THREE.Vector3(0, 1, 0));
      let obj = h.object;
      while(obj && !obj.userData.enemy) obj = obj.parent;
      if(obj && obj.userData.enemy && !obj.userData.enemy.dead){
        const isHead = h.object.userData.part === 'head';
        const dmg = W.dmg * (isHead ? 2.6 : 1) * (1 - clamp(h.distance / W.range, 0, 1) * 0.28);
        obj.userData.enemy.damage(dmg, isHead);
        anyHit = true;
      }
    } else {
      spawnTracer(fromPos, origin.clone().addScaledVector(dir, W.range));
    }
  }
  if(anyHit) showHitmarker();
  updateAmmoHUD();

  if(ammo.mag === 0) setTimeout(startReload, 120);
}

export function startReload(){
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  if(!ammo || G.reloading || ammo.mag >= W.mag || ammo.res <= 0) return;
  G.reloading = true;
  G.reloadDur = W.reload;
  G.reloadT = 0;
  Audio.reload();
  const hint = $('#reloadHint'); if(hint) hint.textContent = 'RELOADING…';
  const bar = $('#reloadBarWrap'); if(bar) bar.classList.remove('hidden');
}

export function finishReload(){
  const W = WEAPONS[G.currentWeapon];
  const ammo = G.ammo[G.currentWeapon];
  if(!ammo) return;
  const need = W.mag - ammo.mag;
  const take = Math.min(need, ammo.res);
  ammo.mag += take;
  ammo.res -= take;
  G.reloading = false;
  const hint = $('#reloadHint'); if(hint) hint.textContent = '';
  const bar = $('#reloadBarWrap'); if(bar) bar.classList.add('hidden');
  const rb = $('#reloadBar'); if(rb) rb.style.width = '0%';
  updateAmmoHUD();
}

let recoilZ = 0, bobAmt = 0;
export function updateViewModel(dt, isMoving){
  const grp = refs.gunGroup;
  if(!grp) return;
  recoilZ = Math.max(0, recoilZ - dt * 1.2);
  bobAmt += ((isMoving ? 1 : 0) - bobAmt) * dt * 8;
  const tsec = nowMs() * 0.001;
  const bobX = Math.sin(tsec * 9) * 0.012 * bobAmt;
  const bobY = Math.abs(Math.cos(tsec * 9)) * 0.010 * bobAmt;
  grp.position.x = 0.20 + bobX;
  grp.position.y = -0.20 - bobY - (G.reloading ? 0.14 : 0);
  grp.position.z = -0.42 + recoilZ;
}