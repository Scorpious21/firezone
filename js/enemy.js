import * as THREE from 'three';
import { clamp, rand, TAU, nowMs } from './utils.js';
import { G, enemies, obstacles, refs, playerPos } from './state.js';
import { Audio, Haptics } from './settings.js';
import { buildEnemyModel } from './models.js';
import { ARENA } from './engine.js';
import { addKillFeed, updateScoreHUD } from './hud.js';
import { damagePlayer } from './damage.js';
import { spawnTracer } from './weapons.js';

const raycaster = new THREE.Raycaster();

export function enemyCollides(x, z){
  const r = .45;
  for(const ob of obstacles){
    const cx = clamp(x, ob.min.x, ob.max.x);
    const cz = clamp(z, ob.min.z, ob.max.z);
    const dx = x - cx, dz = z - cz;
    if(dx*dx + dz*dz < r*r) return true;
  }
  return false;
}

export class Enemy {
  constructor(pos, tier = 1){
    this.dead = false;
    this.hp = 70 + tier*28;
    this.maxHp = this.hp;
    this.speed = 2.6 + Math.min(tier*.22, 2.2);
    this.dmg = 7 + tier*1.6;
    this.fireCd = rand(.6, 1.8);
    this.fireRate = Math.max(.45, 1.5 - tier*.07);
    this.accuracy = clamp(.16 + tier*.014, .1, .52);
    this.pos = pos.clone();
    this.strafeDir = Math.random() < .5 ? 1 : -1;
    this.strafeT = rand(1, 3);
    this.tier = tier;
    this.walkPhase = 0;

    const built = buildEnemyModel();
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
    this.hbSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map:this.hbTex, transparent:true, depthTest:false
    }));
    this.hbSprite.scale.set(1.1, .14, 1);
    this.hbSprite.position.y = 2.35;
    this.mesh.add(this.hbSprite);
    this.drawHealthBar();

    refs.scene.add(this.mesh);
  }

  drawHealthBar(){
    const c = this.hbCanvas, g = c.getContext('2d');
    g.clearRect(0,0,c.width,c.height);
    g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0,2,c.width,c.height-4);
    const p = clamp(this.hp/this.maxHp, 0, 1);
    const grd = g.createLinearGradient(0,0,c.width,0);
    grd.addColorStop(0,'#ff3b30'); grd.addColorStop(1,'#ff9500');
    g.fillStyle = grd; g.fillRect(2,4,(c.width-4)*p, c.height-8);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    g.strokeRect(1.5,3.5,c.width-3,c.height-7);
    this.hbTex.needsUpdate = true;
  }

  damage(amount, head=false){
    if(this.dead) return;
    this.hp -= amount;
    this.drawHealthBar();
    Audio.hit(head); Haptics.hit();
    if(head){ G.combo++; G.comboT = 2.2; G.score += 25; }
    if(this.hp <= 0) this.die(head);
    else {
      this.torso.material.emissive = new THREE.Color(0x881111);
      setTimeout(()=>{ if(this.torso.material) this.torso.material.emissive = new THREE.Color(0x000000); }, 90);
    }
  }

  die(head=false){
    if(this.dead) return;
    this.dead = true;
    G.kills++;
    if(head) G.headshots++;
    const base = head ? 150 : 100;
    const comboBonus = Math.min(G.combo, 10) * 10;
    G.score += base + comboBonus + this.tier*15;
    G.enemiesAlive = Math.max(0, G.enemiesAlive - 1);
    Audio.kill(); Haptics.kill();
    addKillFeed(head ? 'HEADSHOT' : 'ELIMINATED', base);
    updateScoreHUD();
    refs.scene.remove(this.mesh);
    this.mesh.traverse(o => {
      if(o.geometry) o.geometry.dispose();
      if(o.material) Array.isArray(o.material) ? o.material.forEach(m=>m.dispose()) : o.material.dispose();
    });
    this.hbTex.dispose();
    const i = enemies.indexOf(this);
    if(i>=0) enemies.splice(i,1);
  }

  hasLOS(playerPos3){
    const from = this.pos.clone().add(new THREE.Vector3(0,1.5,0));
    const to = playerPos3.clone();
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    raycaster.set(from, dir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(obstacles.map(o=>o.mesh), true);
    return hits.length === 0;
  }

  shoot(){
    const px = playerPos.x, py = playerPos.y, pz = playerPos.z;
    const player3 = new THREE.Vector3(px, py + 1.5, pz);
    const dist = this.pos.distanceTo(player3);
    Audio.enemyShot(clamp(1 - dist/60, .12, .45));
    const from = this.pos.clone().add(new THREE.Vector3(0,1.35,0));
    const aim = player3.clone();
    aim.x += rand(-1,1)*this.accuracy*14;
    aim.y += rand(-1,1)*this.accuracy*10;
    aim.z += rand(-1,1)*this.accuracy*14;
    spawnTracer(from, aim);
    const hitChance = clamp(.85 - dist*.011 - this.accuracy*.6, .12, .8);
    if(Math.random() < hitChance) damagePlayer(this.dmg, this.pos.clone());
  }

  update(dt){
    if(this.dead) return;
    const player3 = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);
    const toP = player3.clone().sub(this.pos);
    toP.y = 0;
    const dist = toP.length();
    const dirN = dist > .001 ? toP.clone().normalize() : new THREE.Vector3();

    const targetRot = Math.atan2(-dirN.x, -dirN.z);
    let diff = targetRot - this.mesh.rotation.y;
    while(diff > Math.PI) diff -= TAU;
    while(diff < -Math.PI) diff += TAU;
    this.mesh.rotation.y += clamp(diff, -6*dt, 6*dt);

    const los = dist < 42 ? this.hasLOS(player3) : false;
    const chasing = dist > 16 || !los;

    if(chasing){
      const step = this.speed * dt;
      const dx = dirN.x*step, dz = dirN.z*step;
      if(!enemyCollides(this.pos.x+dx, this.pos.z)) this.pos.x += dx;
      if(!enemyCollides(this.pos.x, this.pos.z+dz)) this.pos.z += dz;
      this.walkPhase += dt*9;
    } else {
      this.strafeT -= dt;
      if(this.strafeT <= 0){ this.strafeT = rand(.9,2.2); this.strafeDir *= -1; }
      const rightV = new THREE.Vector3(-dirN.z, 0, dirN.x);
      const step = this.strafeDir * this.speed * .55 * dt;
      if(!enemyCollides(this.pos.x+rightV.x*step, this.pos.z)) this.pos.x += rightV.x*step;
      if(!enemyCollides(this.pos.x, this.pos.z+rightV.z*step)) this.pos.z += rightV.z*step;
      this.walkPhase += dt*6;
      this.fireCd -= dt;
      if(this.fireCd <= 0 && los){
        this.shoot();
        this.fireCd = this.fireRate * rand(.8, 1.25);
      }
    }

    // separation
    for(const o of enemies){
      if(o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx*dx + dz*dz;
      if(d2 < 1.1 && d2 > 1e-6){
        const d = Math.sqrt(d2);
        this.pos.x += dx/d*(1.05-d)*.5;
        this.pos.z += dz/d*(1.05-d)*.5;
      }
    }

    this.pos.x = clamp(this.pos.x, -ARENA+1.2, ARENA-1.2);
    this.pos.z = clamp(this.pos.z, -ARENA+1.2, ARENA-1.2);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);

    const sw = Math.sin(this.walkPhase) * .5;
    this.legL.rotation.x = sw;
    this.legR.rotation.x = -sw;
    this.armL.rotation.x = -sw * .6;
    this.armR.rotation.x = sw * .15;

    const cam = refs.camera;
    if(cam) this.hbSprite.quaternion.copy(cam.quaternion);
  }
}