const STORAGE_KEY = 'fz_profile';

function hash(str){
  let h = 5381;
  for(let i=0;i<str.length;i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export function generateSecret(){
  const parts = [];
  for(let i=0;i<4;i++) parts.push(Math.random().toString(36).slice(2,6).toUpperCase());
  return parts.join('');
}

export function secretToPeerId(secret){
  return 'fz-' + hash(secret).padStart(10,'0').slice(0,10);
}

export function formatRecovery(secret){
  const s = (secret || '').toUpperCase();
  return 'FZ-' + s.match(/.{1,4}/g).join('-');
}

export function parseRecovery(code){
  return (code || '').toUpperCase().replace(/^FZ-/, '').replace(/-/g, '');
}

export function loadProfile(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const p = JSON.parse(raw);
    if(!p.secret || !p.username) return null;
    return p;
  }catch(e){ return null; }
}

export function saveProfile(p){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }catch(e){}
}

export function createProfile(username, secret){
  const now = Date.now();
  const p = {
    username,
    secret: secret || generateSecret(),
    sparks: 500,
    embers: 3,
    ownedWeapons: ['pistol','smg','rifle'],
    ownedSkins: ['default'],
    equippedSkin: 'default',
    loadout: 'rifle',
    grenades: { frag: 2, smoke: 1, flash: 0, molotov: 0 },
    ores: { common: 0, rare: 0, epic: 0, legendary: 0 },
    gifts: [],
    createdAt: now
  };
  saveProfile(p);
  return p;
}

export function clearProfile(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
}

export function validateUsername(name){
  if(!name) return 'Enter a callsign';
  if(name.length < 3) return 'At least 3 characters';
  if(name.length > 16) return 'At most 16 characters';
  if(!/^[A-Za-z0-9_]+$/.test(name)) return 'Letters, numbers, underscore only';
  return null;
}