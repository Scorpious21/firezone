import * as THREE from 'three';
import { clamp } from './utils.js';
import { G, keys, obstacles, playerPos, playerLook, refs } from './state.js';
import { ARENA } from './engine.js';
import { Haptics } from './settings.js';

export const PLAYER = {
  pos: new THREE.Vector3(0, 0, 8),
  velY: 0, grounded: true,
  radius: 0.4, height: 1.7, eye: 1.55,
  speed: 5.5, sprintMul: 1.6, crouchMul: 0.5, jumpVel: 7.5, gravity: -24
};

export function getYaw(){ return playerLook.yaw; }
export function getPitch(){ return playerLook.pitch; }

export function addLook(dy, dp){
  playerLook.yaw += dy;
  playerLook.pitch = clamp(playerLook.pitch + dp, -1.45, 1.45);
}

function collidesXZ(x, z){
  const r = PLAYER.radius;
  for(const ob of obstacles){
    if(PLAYER.pos.y + PLAYER.height <= ob.min.y) continue;
    if(PLAYER.pos.y >= ob.max.y) continue;
    const cx = clamp(x, ob.min.x, ob.max.x);
    const cz = clamp(z, ob.min.z, ob.max.z);
    const dx = x - cx, dz = z - cz;
    if(dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function resolveVertical(){
  const r = PLAYER.radius;
  for(const ob of obstacles){
    const cx = clamp(PLAYER.pos.x, ob.min.x, ob.max.x);
    const cz = clamp(PLAYER.pos.z, ob.min.z, ob.max.z);
    const dx = PLAYER.pos.x - cx, dz = PLAYER.pos.z - cz;
    if(dx * dx + dz * dz < r * r){
      if(PLAYER.pos.y < ob.max.y && PLAYER.pos.y > ob.max.y - 0.6 && PLAYER.velY <= 0){
        PLAYER.pos.y = ob.max.y;
        PLAYER.velY = 0;
        PLAYER.grounded = true;
      }
    }
  }
}

export function movePlayer(dt, touchMove){
  let fwd = 0, side = 0;
  if(keys.w) fwd += 1;
  if(keys.s) fwd -= 1;
  if(keys.d) side += 1;
  if(keys.a) side -= 1;
  if(touchMove){ fwd -= touchMove.y; side += touchMove.x; }

  const len = Math.hypot(fwd, side);
  if(len > 1){ fwd /= len; side /= len; }

  const yaw = playerLook.yaw;
  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  const wx = (-sinY * fwd) + (cosY * side);
  const wz = (-cosY * fwd) + (-sinY * side);

  const sprinting = keys.shift && !keys.ctrl;
  const crouching = keys.ctrl;
  let speed = PLAYER.speed;
  if(sprinting) speed *= PLAYER.sprintMul;
  if(crouching) speed *= PLAYER.crouchMul;
  if(G.reloading) speed *= 0.75;

  PLAYER.velY += PLAYER.gravity * dt;
  if(keys.space && PLAYER.grounded){
    PLAYER.velY = PLAYER.jumpVel;
    PLAYER.grounded = false;
    Haptics.buzz(10);
  }

  const dx = wx * speed * dt, dz = wz * speed * dt;
  const nx = PLAYER.pos.x + dx;
  if(!collidesXZ(nx, PLAYER.pos.z)) PLAYER.pos.x = nx;
  const nz = PLAYER.pos.z + dz;
  if(!collidesXZ(PLAYER.pos.x, nz)) PLAYER.pos.z = nz;

  PLAYER.pos.x = clamp(PLAYER.pos.x, -ARENA + PLAYER.radius, ARENA - PLAYER.radius);
  PLAYER.pos.z = clamp(PLAYER.pos.z, -ARENA + PLAYER.radius, ARENA - PLAYER.radius);

  PLAYER.pos.y += PLAYER.velY * dt;
  if(PLAYER.pos.y <= 0){ PLAYER.pos.y = 0; PLAYER.velY = 0; PLAYER.grounded = true; }
  else PLAYER.grounded = false;

  resolveVertical();

  playerPos.x = PLAYER.pos.x;
  playerPos.y = PLAYER.pos.y;
  playerPos.z = PLAYER.pos.z;

  const camera = refs.camera;
  if(camera){
    const eyeH = crouching ? PLAYER.eye - 0.5 : PLAYER.eye;
    camera.position.set(PLAYER.pos.x, PLAYER.pos.y + eyeH, PLAYER.pos.z);
    camera.rotation.y = yaw;
    camera.rotation.x = playerLook.pitch;
  }
}

export function resetPlayer(){
  PLAYER.pos.set(0, 0, 8);
  PLAYER.velY = 0;
  PLAYER.grounded = true;
  playerLook.yaw = Math.PI;
  playerLook.pitch = 0;
  playerPos.x = PLAYER.pos.x;
  playerPos.y = PLAYER.pos.y;
  playerPos.z = PLAYER.pos.z;
  const camera = refs.camera;
  if(camera){
    camera.position.set(PLAYER.pos.x, PLAYER.eye, PLAYER.pos.z);
    camera.rotation.y = playerLook.yaw;
    camera.rotation.x = 0;
  }
}