import * as THREE from 'three';
import { $ } from './utils.js';
import { Audio, Haptics, Notify } from './settings.js';
import { G, enemies, refs, playerPos } from './state.js';
import { Enemy } from './enemy.js';
import { addKillFeed, updateScoreHUD } from './hud.js';
import { ARENA } from './engine.js';

export const waveState = { active:false, toSpawn:0, spawnTimer:0, betweenTimer:0 };

export function startWave(n){
  G.wave = n;
  waveState.active = true;
  waveState.toSpawn = 3 + Math.floor(n * 1.7);
  waveState.spawnTimer = 0;
  $('#waveLabel').textContent = `WAVE ${n}`;
  Audio.wave();
  Notify.show('🌊 Wave ' + n, `${waveState.toSpawn} hostiles inbound`);
  addKillFeed(`WAVE ${n}`, 0, '#ff9f43');
  if(n % 3 === 0) Haptics.buzz([30,50,30]);
}

export function spawnEnemy(){
  const tier = 1 + Math.floor(G.wave * .6);
  let pos = null;
  for(let attempt=0; attempt<24; attempt++){
    const ang = Math.random()*Math.PI*2;
    const r = ARENA*.55 + Math.random()*(ARENA - ARENA*.55 - 4);
    const p = new THREE.Vector3(Math.cos(ang)*r, 0, Math.sin(ang)*r);
    const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
    if(Math.sqrt(dx*dx + dz*dz) < 18) continue;
    pos = p; break;
  }
  if(!pos) pos = new THREE.Vector3((Math.random()-.5)*80, 0, (Math.random()-.5)*80);

  const e = new Enemy(pos, tier);
  enemies.push(e);
  G.enemiesAlive++;

  // spawn ring effect
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(.2, .4, 20),
    new THREE.MeshBasicMaterial({ color:0xff3b30, transparent:true, side:THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.set(pos.x, .06, pos.z);
  refs.scene.add(ring);
  let t = 0;
  const anim = setInterval(()=>{
    t += .05;
    ring.scale.setScalar(1 + t*4);
    ring.material.opacity = Math.max(0, 1 - t*3);
    if(t > .4){
      clearInterval(anim);
      refs.scene.remove(ring);
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
      waveState.spawnTimer = Math.max(.25, .9 - G.wave*.04);
      spawnEnemy();
      waveState.toSpawn--;
    }
  } else if(G.enemiesAlive === 0){
    waveState.active = false;
    waveState.betweenTimer = 4;
    addKillFeed(`WAVE ${G.wave} CLEAR`, 500, '#00ff9d');
    G.score += 500;
    updateScoreHUD();
    Notify.show('✅ Wave Cleared', `Wave ${G.wave} complete · +500`);
  }
}

export function updateBetween(dt){
  if(waveState.active || waveState.betweenTimer <= 0) return;
  waveState.betweenTimer -= dt;
  if(waveState.betweenTimer <= 0) startWave(G.wave + 1);
  else $('#waveLabel').textContent = `NEXT WAVE ${G.wave+1} IN ${Math.ceil(waveState.betweenTimer)}`;
}

export function resetWaves(){
  waveState.active = false;
  waveState.toSpawn = 0;
  waveState.betweenTimer = 0;
}