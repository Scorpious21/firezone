export const WEAPONS = {
  pistol : { name:'G-PISTOL', dmg:26, rpm:420, mag:12, res:96,  reload:1.1, auto:false, burst:0, spread:.013, pellets:1, recoil:.016, range:120, sound:'pistol', icon:'🔫' },
  smg    : { name:'MP5',      dmg:15, rpm:800, mag:30, res:180, reload:1.8, auto:true,  burst:0, spread:.028, pellets:1, recoil:.012, range:100, sound:'smg',    icon:'💥' },
  rifle  : { name:'AK-47',    dmg:20, rpm:600, mag:30, res:180, reload:2.0, auto:true,  burst:0, spread:.021, pellets:1, recoil:.019, range:160, sound:'rifle',  icon:'⚡' },
  burst  : { name:'M16A4',    dmg:24, rpm:850, mag:30, res:180, reload:2.0, auto:false, burst:3, spread:.014, pellets:1, recoil:.018, range:180, sound:'rifle',  icon:'🎯' },
  shotgun: { name:'M1014',    dmg:13, rpm:80,  mag:6,  res:48,  reload:2.6, auto:false, burst:0, spread:.075, pellets:9, recoil:.052, range:38,  sound:'shotgun',icon:'💣' },
  sniper : { name:'AWM',      dmg:115,rpm:45,  mag:5,  res:30,  reload:3.0, auto:false, burst:0, spread:.0018,pellets:1, recoil:.075, range:400, sound:'sniper', icon:'🎯' },
  lmg    : { name:'M249',     dmg:22, rpm:700, mag:100,res:300, reload:4.5, auto:true,  burst:0, spread:.038, pellets:1, recoil:.022, range:150, sound:'rifle',  icon:'🔩' },
  magnum : { name:'.44 MAG',  dmg:62, rpm:120, mag:6,  res:36,  reload:2.4, auto:false, burst:0, spread:.008, pellets:1, recoil:.060, range:140, sound:'pistol', icon:'⭐' },
  rpg    : { name:'RPG-7',    dmg:180,rpm:30,  mag:1,  res:5,   reload:4.0, auto:false, burst:0, spread:.005, pellets:1, recoil:.090, range:200, sound:'sniper', icon:'🚀' }
};
export const WEAPON_ORDER = ['pistol','smg','rifle','burst','shotgun','sniper','lmg','magnum','rpg'];

export const SKINS = {
  default : { name:'Default', primary:0x223042, secondary:0x2c3d54, accent:0x00ff9d, body:0x8b2e2e },
  neon    : { name:'Neon',    primary:0xff00aa, secondary:0x00ffff, accent:0xffff00, body:0xff00ff },
  desert  : { name:'Desert',  primary:0xc49a7a, secondary:0x8b7355, accent:0xffaa44, body:0xb08a5c },
  arctic  : { name:'Arctic',  primary:0xe8eef6, secondary:0x9fb3c8, accent:0x66ccff, body:0xa8c8e8 },
  crimson : { name:'Crimson', primary:0x8b0000, secondary:0x3d0000, accent:0xff3333, body:0xff3b30 },
  gold    : { name:'Gold',    primary:0xffd700, secondary:0x8b6914, accent:0xffffff, body:0xd4a017 }
};
export const SKIN_ORDER = ['default','neon','desert','arctic','crimson','gold'];
export const getSkin = k => SKINS[k] || SKINS.default;

export const DEFAULTS = {
  sensitivity:1.0, fov:78, invertY:false, touchSens:1.2,
  master:0.7, sfx:0.9, shadows:true, fps:true, minimap:true,
  scale:1.0, crosshairColor:'#00ff9d', vibe:true, notif:false,
  startWeapon:'rifle', skin:'default'
};