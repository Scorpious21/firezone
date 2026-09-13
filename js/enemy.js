import * as THREE from 'three';
import { $, clamp, rand, TAU } from './utils.js';
import { G, enemies, obstacles, refs, playerPos } from './state.js';
import { Audio, Haptics } from './settings.js';
import { ARENA, spawnTracer } from './engine.js';
import { addKillFeed, updateScoreHUD, updateHealthHUD } from './hud.js';

const raycaster = new THREE.Raycaster();
let onPlayerDeath = () => {};
export function setDeathHandler(fn){ onPlayerDeath = fn; }

function makeEnemyMesh(){
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x8b2e2e, roughness: 0.7, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c222a, roughness: 0.85, metalness: 0.25 });
  const visor = new THREE.MeshBasicMaterial({ color: 0xff2a2a });

  const mk = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh;
  };

  const torso = mk(0.62, 0.75, 0.34, body, 0, 1.28, 0);
  torso.userData.part = 'body';
  mk(0.5, 0.28, 0.30, dark, 0, 0.92, 0);
  mk(0.22, 0.16, 0.32, dark, -0.42, 1.52, 0);
  mk(0.22, 0.16, 0.32, dark, 0.42, 1.52, 0);

  const armL = mk(0.16, 0.42, 0.18, dark, -0.45, 1.20, 0);
  const armR = mk(0.16, 0.42, 0.18, dark,  0.45, 1.20, 0);
  const legL = mk(0.20, 0.55, 0.24, dark, -0.16, 0.55, 0);
  const legR = mk(0.20, 0.55, 0.24, dark,  0.16, 0.55, 0);

  const head = mk(0.34, 0.34, 0.32, body, 0, 1.94, 0);
  head.userData.part = 'head';

  const v = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), visor);
  v.position.set(0, 1.96, -0.17);
  g.add(v);

  return { mesh: g, torso, head, armL, armR, legL, legR };
}

function enemyCollides(x, z){
  const r = 0.45;
  for(const ob of obstacles){
    const cx = clamp(x, ob.min.x, ob.max.x);
    const cz = clamp(z, ob.min.z, ob.max.z);
    const dx = x - cx, dz = z - cz;
    if(dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function damagePlayer(amount){
  if(G.state !== 'playing') return;
  G.health -= amount;
  Audio.hurt(); Haptics.hurt();
  const vig = $('#vignette');
  if(vig){ vig.style.opacity = '0.85'; setTimeout(() => { vig.style.opacity = '0'; }, 250); }
  const low = $('#lowhp'); if(low) low.style.opacity = G.health < 35 ? '1' : '0';
  updateHealthHUD();
  if(G.health <= 0){ G.health = 0; updateHealthHUD(); onPlayerDeath(); }
}

export class Enemy {
  constructor(pos, tier = 1){
    this.dead = false;
    this.hp = 70 + tier * 28;
    this.maxHp = this.hp;
    this.speed = 2.6 + Math.min(tier * 0.22, 2.2);
    this.dmg = 7 + tier * 1.6;
    this.fireCd = rand(0.6, 1.8);
    this.fireRate = Math.max(0.45, 1.5 - tier * 0.07);
    this.accuracy = clamp(0.16 + tier * 0.014, 0.1, 0.52);
    this.pos = pos.clone();
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = rand(1, 3);
    this.tier = tier;
    this.walkPhase = 0;

    const built = makeEnemyMesh();
    this.mesh = built.mesh;
    this.head = built.head;
    this.torso = built.torso;
    this.armL = built.armL; this.armR = built.armR;
    this.legL = built.legL; this.legR = built.legR;
    this.mesh.position.copy(this.pos);
    this.mesh.traverse(o => { o.userData.enemy = this; });

    const hbC = document.createElement('canvas'); hbC.width = 128; hbC.height = 16;
    this.hbCanvas = hbC;
    this.hbTex = new THREE.CanvasTexture(hbC);
    this.hbSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.hbTex, transparent: true, depthTest: false }));
    this.hbSprite.scale.set(1.1, 0.14, 1);
    this.hbSprite.position.y = 2.35;
    this.mesh.add(this.hbSprite);
    this.drawHealthBar();

    if(refs.scene) refs.scene.add(this.mesh);
  }

  drawHealthBar(){
    const c = this.hbCanvas, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, 2, c.width, c.height - 4);
    const p = clamp(this.hp / this.maxHp, 0, 1);
    const grd = g.createLinearGradient(0, 0, c.width, 0);
    grd.addColorStop(0, '#ff3b30'); grd.addColorStop(1, '#ff9500');
    g.fillStyle = grd; g.fillRect(2, 4, (c.width - 4) * p, c.height - 8);
    this.hbTex.needsUpdate = true;
  }

  damage(amount, head = false){
    if(this.dead) return;
    this.hp -= amount;
    this.drawHealthBar();
    Audio.hit(head); Haptics.hit();
    if(head){ G.combo++; G.comboT = 2.2; G.score += 25; }
    if(this.hp <= 0) this.die(head);
    else {
      this.torso.material.emissive = new THREE.Color(0x881111);
      setTimeout(() => { if(this.torso.material) this.torso.material.emissive = new THREE.Color(0x000000); }, 90);
    }
  }

  die(head = false){
    if(this.dead) return;
    this.dead = true;
    G.kills++;
    if(head) G.headshots++;
    const base = head ? 150 : 100;
    const comboBonus = Math.min(G.combo, 10) * 10;
    G.score += base + comboBonus + this.tier * 15;
    G.enemiesAlive = Math.max(0, G.enemiesAlive - 1);
    Audio.kill(); Haptics.kill();
    addKillFeed(head ? 'HEADSHOT' : 'ELIMINATED', base);
    updateScoreHUD();
    if(refs.scene) refs.scene.remove(this.mesh);
    this.mesh.traverse(o => {
      if(o.geometry) o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    if(this.hbTex) this.hbTex.dispose();
    const i = enemies.indexOf(this);
    if(i >= 0) enemies.splice(i, 1);
  }

  hasLOS(player3){
    const from = this.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
    const dir = player3.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    raycaster.set(from, dir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(obstacles.map(o => o.mesh), true);
    return hits.length === 0;
  }

  shoot(player3){
    const dist = this.pos.distanceTo(player3);
    Audio.enemyShot(clamp(1 - dist / 60, 0.12, 0.45));
    const from = this.pos.clone().add(new THREE.Vector3(0, 1.35, 0));
    const aim = player3.clone();
    aim.x += rand(-1, 1) * this.accuracy * 14;
    aim.y += rand(-1, 1) * this.accuracy * 10;
    aim.z += rand(-1, 1) * this.accuracy * 14;
    spawnTracer(from, aim);
    const hitChance = clamp(0.85 - dist * 0.011 - this.accuracy * 0.6, 0.12, 0.8);
    if(Math.random() < hitChance) damagePlayer(this.dmg);
  }

  update(dt){
    if(this.dead) return;
    const player3 = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);
    const toP = player3.clone().sub(this.pos);
    toP.y = 0;
    const dist = toP.length();
    const dirN = dist > 0.001 ? toP.clone().normalize() : new THREE.Vector3();

    const targetRot = Math.atan2(-dirN.x, -dirN.z);
    let diff = targetRot - this.mesh.rotation.y;
    while(diff > Math.PI) diff -= TAU;
    while(diff < -Math.PI) diff += TAU;
    this.mesh.rotation.y += clamp(diff, -6 * dt, 6 * dt);

    const los = dist < 42 ? this.hasLOS(player3) : false;
    const chasing = dist > 16 || !los;

    if(chasing){
      const step = this.speed * dt;
      const dx = dirN.x * step, dz = dirN.z * step;
      if(!enemyCollides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
      if(!enemyCollides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
      this.walkPhase += dt * 9;
    } else {
      this.strafeT -= dt;
      if(this.strafeT <= 0){ this.strafeT = rand(0.9, 2.2); this.strafeDir *= -1; }
      const rightV = new THREE.Vector3(-dirN.z, 0, dirN.x);
      const step = this.strafeDir * this.speed * 0.55 * dt;
      if(!enemyCollides(this.pos.x + rightV.x * step, this.pos.z)) this.pos.x += rightV.x * step;
      if(!enemyCollides(this.pos.x, this.pos.z + rightV.z * step)) this.pos.z += rightV.z * step;
      this.walkPhase += dt * 6;
      this.fireCd -= dt;
      if(this.fireCd <= 0 && los){
        this.shoot(player3);
        this.fireCd = this.fireRate * rand(0.8, 1.25);
      }
    }

    for(const o of enemies){
      if(o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if(d2 < 1.1 && d2 > 1e-6){
        const d = Math.sqrt(d2);
        this.pos.x += dx / d * (1.05 - d) * 0.5;
        this.pos.z += dz / d * (1.05 - d) * 0.5;
      }
    }

    this.pos.x = clamp(this.pos.x, -ARENA + 1.2, ARENA - 1.2);
    this.pos.z = clamp(this.pos.z, -ARENA + 1.2, ARENA - 1.2);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);

    const sw = Math.sin(this.walkPhase) * 0.5;
    this.legL.rotation.x = sw;
    this.legR.rotation.x = -sw;
    this.armL.rotation.x = -sw * 0.6;
    this.armR.rotation.x = sw * 0.15;
    const camera = refs.camera;
    if(camera) this.hbSprite.quaternion.copy(camera.quaternion);
  }
}

const waveState = { active: false, toSpawn: 0, spawnTimer: 0, betweenTimer: 0 };

export function startWave(n){
  G.wave = n;
  waveState.active = true;
  waveState.toSpawn = 3 + Math.floor(n * 1.7);
  waveState.spawnTimer = 0;
  const el = $('#waveLabel'); if(el) el.textContent = 'WAVE ' + n;
  Audio.wave();
  addKillFeed('WAVE ' + n, 0, '#ff9f43');
}

function spawnEnemy(){
  const tier = 1 + Math.floor(G.wave * 0.6);
  let pos = null;
  for(let a = 0; a < 24; a++){
    const ang = Math.random() * TAU;
    const r = ARENA * 0.55 + Math.random() * (ARENA * 0.45 - 4);
    const p = new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
    if(Math.sqrt(dx * dx + dz * dz) < 18) continue;
    pos = p; break;
  }
  if(!pos) pos = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);

  const e = new Enemy(pos, tier);
  enemies.push(e);
  G.enemiesAlive++;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.4, 20),
    new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.06, pos.z);
  if(refs.scene) refs.scene.add(ring);
  let t = 0;
  const anim = setInterval(() => {
    t += 0.05;
    ring.scale.setScalar(1 + t * 4);
    ring.material.opacity = Math.max(0, 1 - t * 3);
    if(t > 0.4){
      clearInterval(anim);
      if(refs.scene) refs.scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    }
  }, 40);
}

export function updateWaves(dt){
  if(!waveState.active) return;
  if(waveState.toSpawn > 0){
    waveState.spawnTimer -= dt;
    if(waveState.spawnTimer <= 0){
      waveState.spawnTimer = Math.max(0.25, 0.9 - G.wave * 0.04);
      spawnEnemy();
      waveState.toSpawn--;
    }
  } else if(G.enemiesAlive === 0){
    waveState.active = false;
    waveState.betweenTimer = 4;
    addKillFeed('WAVE ' + G.wave + ' CLEAR', 500, '#00ff9d');
    G.score += 500;
    updateScoreHUD();
  }
}

export function updateBetween(dt){
  if(waveState.active || waveState.betweenTimer <= 0) return;
  waveState.betweenTimer -= dt;
  if(waveState.betweenTimer <= 0) startWave(G.wave + 1);
  else {
    const el = $('#waveLabel');
    if(el) el.textContent = 'NEXT WAVE ' + (G.wave + 1) + ' IN ' + Math.ceil(waveState.betweenTimer);
  }
}

export function resetWaves(){
  waveState.active = false;
  waveState.toSpawn = 0;
  waveState.betweenTimer = 0;
}