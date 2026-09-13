/* Shared mutable state. No THREE.js, no DOM. */

export const G = {
  state:'menu', mode:'single',
  health:100, armor:0,
  score:0, kills:0, headshots:0, wave:0,
  enemiesAlive:0,
  currentWeapon:'rifle',
  ammo:{
    pistol:{mag:12,res:96}, smg:{mag:30,res:180}, rifle:{mag:30,res:180},
    burst:{mag:30,res:180}, shotgun:{mag:6,res:48}, sniper:{mag:5,res:30},
    lmg:{mag:100,res:300}, magnum:{mag:6,res:36}, rpg:{mag:1,res:5}
  },
  fireCooldown:0, burstLeft:0,
  reloading:false, reloadT:0, reloadDur:0,
  combo:0, comboT:0,
  playerSkin:'default'
};

export const keys = { w:false, a:false, s:false, d:false, shift:false, ctrl:false, space:false };

/* Shared containers (mutated, never reassigned). */
export const obstacles = [];
export const enemies = [];
export const tracers = [];
export const particles = [];
export const remotePlayers = new Map();

/* Player transform readable by any module without circular imports. */
export const playerPos = { x:0, y:0, z:0 };
export const playerLook = { yaw:Math.PI, pitch:0 };

/* Engine references set by engine.js after boot. */
export const refs = { renderer:null, scene:null, camera:null, clock:null, sunLight:null };