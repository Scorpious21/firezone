import { loadProfile, saveProfile } from './identity.js';
import { WEAPONS, WEAPON_ORDER, WEAPON_PRICES, SKINS, GRENADE_PRICES, ORE_PRICES } from './config.js';

export function getProfile(){
  const p = loadProfile();
  if(!p) return null;
  if(!p.sparks && p.sparks !== 0) p.sparks = 500;
  if(!p.embers && p.embers !== 0) p.embers = 0;
  if(!p.ownedWeapons) p.ownedWeapons = ['pistol','smg','rifle'];
  if(!p.ownedSkins) p.ownedSkins = ['default'];
  if(!p.grenades) p.grenades = { frag:0, smoke:0, flash:0, molotov:0 };
  if(!p.ores) p.ores = { common:0, rare:0, epic:0, legendary:0 };
  return p;
}

function mutate(fn){
  const p = getProfile();
  if(!p) return null;
  fn(p);
  saveProfile(p);
  return p;
}

export function getSparks(){ const p = getProfile(); return p ? p.sparks : 0; }
export function getEmbers(){ const p = getProfile(); return p ? p.embers : 0; }

export function addSparks(n){ return mutate(p => { p.sparks = Math.max(0, (p.sparks||0) + n); }); }
export function addEmbers(n){ return mutate(p => { p.embers = Math.max(0, (p.embers||0) + n); }); }
export function spendSparks(n){ const p = getProfile(); if(!p || p.sparks < n) return false; mutate(q => { q.sparks -= n; }); return true; }
export function spendEmbers(n){ const p = getProfile(); if(!p || p.embers < n) return false; mutate(q => { q.embers -= n; }); return true; }

export function ownsWeapon(id){ const p = getProfile(); return p ? p.ownedWeapons.includes(id) : false; }
export function ownsSkin(id){ const p = getProfile(); return p ? p.ownedSkins.includes(id) : false; }

export function buyWeapon(id){
  const p = getProfile(); if(!p) return { ok:false, reason:'No profile' };
  if(p.ownedWeapons.includes(id)) return { ok:false, reason:'Already owned' };
  const price = WEAPON_PRICES[id] || 0;
  if(p.sparks < price) return { ok:false, reason:'Not enough Sparks' };
  mutate(q => { q.sparks -= price; q.ownedWeapons.push(id); });
  return { ok:true };
}

export function buySkin(id){
  const p = getProfile(); if(!p) return { ok:false, reason:'No profile' };
  if(p.ownedSkins.includes(id)) return { ok:false, reason:'Already owned' };
  const price = (SKINS[id] && SKINS[id].price) || 0;
  if(p.sparks < price) return { ok:false, reason:'Not enough Sparks' };
  mutate(q => { q.sparks -= price; q.ownedSkins.push(id); });
  return { ok:true };
}

export function equipSkin(id){ if(!ownsSkin(id)) return false; mutate(p => { p.equippedSkin = id; }); return true; }
export function equipLoadout(id){ if(!ownsWeapon(id)) return false; mutate(p => { p.loadout = id; }); return true; }
export function getLoadout(){ const p = getProfile(); return p ? p.loadout : 'rifle'; }
export function getEquippedSkin(){ const p = getProfile(); return p ? p.equippedSkin : 'default'; }

export function buyGrenade(kind, qty=1){
  const p = getProfile(); if(!p) return { ok:false, reason:'No profile' };
  const price = (GRENADE_PRICES[kind] || 0) * qty;
  if(p.sparks < price) return { ok:false, reason:'Not enough Sparks' };
  mutate(q => { q.sparks -= price; if(!q.grenades) q.grenades = {}; q.grenades[kind] = (q.grenades[kind] || 0) + qty; });
  return { ok:true };
}

export function buyOre(kind, qty=1){
  const p = getProfile(); if(!p) return { ok:false, reason:'No profile' };
  const price = (ORE_PRICES[kind] || 0) * qty;
  if(p.sparks < price) return { ok:false, reason:'Not enough Sparks' };
  mutate(q => { q.sparks -= price; if(!q.ores) q.ores = {}; q.ores[kind] = (q.ores[kind] || 0) + qty; });
  return { ok:true };
}