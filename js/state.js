export const G = {
  state:'menu', mode:'single',
  health:100, armor:0,
  score:0, kills:0, headshots:0, wave:0,
  enemiesAlive:0,
  currentWeapon:'rifle',
  ammo:{},
  fireCooldown:0,
  reloading:false, reloadT:0, reloadDur:0,
  combo:0, comboT:0
};
export const keys = { w:false, a:false, s:false, d:false, shift:false, ctrl:false, space:false };
export const obstacles = [];
export const enemies = [];
export const tracers = [];
export const particles = [];
export const playerPos  = { x:0, y:0, z:0 };
export const playerLook = { yaw:Math.PI, pitch:0 };
export const refs = {
  renderer:null, scene:null, camera:null, clock:null,
  sunLight:null, gunGroup:null, muzzleFlash:null, muzzleLight:null
};
export function resetAmmo(WEAPONS, WEAPON_ORDER){
  G.ammo = {};
  for(const id of WEAPON_ORDER) G.ammo[id] = { mag: WEAPONS[id].mag, res: WEAPONS[id].res };
}