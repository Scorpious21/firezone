import { $, clamp } from './utils.js';
import { DEFAULTS } from './config.js';

export const settings = { ...DEFAULTS };
let totalScore = 0;
try{
  Object.assign(settings, JSON.parse(localStorage.getItem('fz_settings')||'{}'));
  totalScore = parseInt(localStorage.getItem('fz_score')||'0',10) || 0;
}catch(e){}

export const saveSettings = () => {
  try{ localStorage.setItem('fz_settings', JSON.stringify(settings)); }catch(e){}
};
export const getTotalScore = () => totalScore;
export const bumpScore = v => {
  if(v > totalScore){
    totalScore = v;
    try{ localStorage.setItem('fz_score', String(totalScore)); }catch(e){}
  }
};

/* ---------- Web Audio ---------- */
export const Audio = {
  ctx:null, master:null, sfxGain:null, noiseBuf:null, ready:false,
  init(){
    if(this.ctx){ this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
    this.noiseBuf = buf;
    this.applyVolumes();
    this.ready = true;
  },
  resume(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  applyVolumes(){
    if(!this.ctx) return;
    this.master.gain.value = settings.master;
    this.sfxGain.gain.value = settings.sfx;
  },
  noise(dur, f0, f1, gain, type='lowpass', q=1){
    if(!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter(); filt.type = type; filt.Q.value = q;
    filt.frequency.setValueAtTime(f0, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40,f1), t+dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t+dur);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(t); src.stop(t+dur+0.03);
  },
  tone(f0, f1, dur, gain, type='sine', delay=0){
    if(!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1), t+dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t+dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t); o.stop(t+dur+0.02);
  },
  shot(kind='rifle', vol=1){
    const P = {
      pistol :[4200,380,.13,.42,170,45,.10], smg:[3800,420,.10,.35,190,55,.08],
      rifle  :[3600,300,.16,.50,200,50,.12], shotgun:[2200,120,.34,.80,150,32,.20],
      sniper :[5200,170,.42,.85,130,28,.26]
    }[kind] || [3600,300,.16,.5,200,50,.12];
    this.noise(P[2], P[0], P[1], P[3]*vol, 'lowpass', 1.1);
    this.tone(P[4], P[5], P[6], 0.55*vol, 'sine');
  },
  enemyShot(vol=.35){ this.noise(.16, 2400, 260, vol, 'lowpass', 1); this.tone(140, 45, .1, vol*.6, 'sine'); },
  hit(head=false){ head ? (this.tone(1400,900,.09,.35,'square'), this.tone(2100,1500,.06,.2,'sine',.02)) : this.tone(880,620,.07,.28,'square'); },
  hurt(){ this.noise(.22, 700, 120, .5, 'lowpass', 1.5); this.tone(220, 80, .2, .28, 'sawtooth'); },
  reload(){ this.noise(.05,3000,900,.3,'bandpass',3); this.noise(.06,1800,700,.28,'bandpass',3); },
  empty(){ this.noise(.04,4000,1800,.22,'bandpass',6); },
  ui(){ this.tone(660,990,.07,.12,'triangle'); },
  kill(){ this.tone(520,1200,.16,.22,'triangle'); this.tone(780,1600,.14,.15,'sine',.06); },
  wave(){ this.tone(220,440,.5,.22,'sawtooth'); this.tone(330,660,.5,.16,'sine',.08); },
  death(){ this.tone(400,60,.9,.35,'sawtooth'); this.noise(.7,900,90,.4,'lowpass',1.2); }
};

/* ---------- Haptics ---------- */
export const Haptics = {
  supported: 'vibrate' in navigator,
  buzz(p){ if(settings.vibe && this.supported){ try{ navigator.vibrate(p); }catch(e){} } },
  shoot(){ this.buzz(10); }, hit(){ this.buzz(22); }, kill(){ this.buzz([15,35,22]); },
  hurt(){ this.buzz([40,25,55]); }, death(){ this.buzz([110,55,160,55,280]); }
};

/* ---------- Notifications ---------- */
export const Notify = {
  async request(){
    if(!('Notification' in window)) return false;
    if(Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  },
  show(title, body){
    if(!settings.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
    try{ const n = new Notification(title,{ body, silent:true, tag:'fz' }); setTimeout(()=>n.close(), 4500); }catch(e){}
  }
};

/* ---------- PWA registration ---------- */
export function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js')
    .then(()=>{ const el = $('#pwaStatus'); if(el) el.textContent = 'PWA: offline ready ✓'; })
    .catch(()=>{ const el = $('#pwaStatus'); if(el) el.textContent = 'PWA: installable'; });
}