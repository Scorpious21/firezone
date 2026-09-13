import { $, clamp, IS_TOUCH } from './utils.js';
import { settings } from './settings.js';
import { G, keys, playerLook, refs } from './state.js';
import { WEAPON_ORDER } from './config.js';
import { startFiring, stopFiring, startReload, switchWeapon, cycleWeapon } from './weapons.js';
import { pauseGame, resumeGame, toggleFullscreen } from './game.js';

export const Touch = {
  joy:{ active:false, id:null, cx:0, cy:0, dx:0, dy:0 },
  look:{ active:false, id:null, lx:0, ly:0 },
  init(){
    if(!IS_TOUCH) return;
    const zone = $('#lookZone');
    const joyBase = $('#joyBase');
    const joyKnob = $('#joyKnob');
    const showJoy = (x,y) => {
      joyBase.style.left = (x - joyBase.offsetWidth/2) + 'px';
      joyBase.style.top = (y - joyBase.offsetHeight/2) + 'px';
      joyBase.classList.add('show');
    };
    const hideJoy = () => {
      joyBase.classList.remove('show');
      joyKnob.style.transform = 'translate(-50%,-50%)';
    };

    window.addEventListener('touchstart', (e)=>{
      if(G.state !== 'playing') return;
      for(const t of e.changedTouches){
        if(t.clientX < innerWidth*.45 && !this.joy.active){
          this.joy.active = true; this.joy.id = t.identifier;
          this.joy.cx = t.clientX; this.joy.cy = t.clientY;
          showJoy(t.clientX, t.clientY);
        } else if(t.clientX >= innerWidth*.45 && !this.look.active &&
                  document.elementFromPoint(t.clientX,t.clientY) === zone){
          this.look.active = true; this.look.id = t.identifier;
          this.look.lx = t.clientX; this.look.ly = t.clientY;
        }
      }
    }, { passive:true });

    window.addEventListener('touchmove', (e)=>{
      if(G.state !== 'playing') return;
      for(const t of e.changedTouches){
        if(this.joy.active && t.identifier === this.joy.id){
          let dx = t.clientX - this.joy.cx, dy = t.clientY - this.joy.cy;
          const d = Math.hypot(dx,dy), max = joyBase.offsetWidth*.35;
          if(d > max){ dx = dx/d*max; dy = dy/d*max; }
          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
          this.joy.dx = dx / max; this.joy.dy = dy / max;
        } else if(this.look.active && t.identifier === this.look.id){
          const dx = t.clientX - this.look.lx, dy = t.clientY - this.look.ly;
          this.look.lx = t.clientX; this.look.ly = t.clientY;
          const s = settings.touchSens * .0055;
          playerLook.yaw -= dx * s;
          playerLook.pitch = clamp(playerLook.pitch - dy * s * (settings.invertY ? -1 : 1), -1.45, 1.45);
        }
      }
    }, { passive:true });

    const endT = (e)=>{
      for(const t of e.changedTouches){
        if(t.identifier === this.joy.id){
          this.joy.active = false; this.joy.id = null;
          this.joy.dx = 0; this.joy.dy = 0;
          hideJoy();
        }
        if(t.identifier === this.look.id){
          this.look.active = false; this.look.id = null;
        }
      }
    };
    window.addEventListener('touchend', endT, { passive:true });
    window.addEventListener('touchcancel', endT, { passive:true });

    const bindHold = (el, down, up)=>{
      el.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive:false });
      el.addEventListener('touchend',   e => { e.preventDefault(); up&&up(); }, { passive:false });
      el.addEventListener('touchcancel',e => { e.preventDefault(); up&&up(); }, { passive:false });
    };
    bindHold($('#btnFire'),  ()=> startFiring(), ()=> stopFiring());
    bindHold($('#btnJump'),  ()=> { keys.space = true; }, ()=> { keys.space = false; });
    bindHold($('#btnCrouch'),()=> { keys.ctrl = true; }, ()=> { keys.ctrl = false; });
    bindHold($('#btnReload'),()=> startReload());
  }
};

export const Pointer = {
  locked:false,
  request(){ refs.renderer?.domElement?.requestPointerLock?.(); },
  exit(){ if(document.pointerLockElement) document.exitPointerLock?.(); },
  init(){
    document.addEventListener('pointerlockchange', ()=>{
      this.locked = document.pointerLockElement === refs.renderer?.domElement;
      if(!this.locked && G.state === 'playing' && !IS_TOUCH) pauseGame();
    });
    window.addEventListener('mousemove', (e)=>{
      if(G.state !== 'playing' || !this.locked) return;
      const s = settings.sensitivity * .0022;
      playerLook.yaw -= e.movementX * s;
      playerLook.pitch = clamp(playerLook.pitch - e.movementY * s * (settings.invertY ? -1 : 1), -1.45, 1.45);
    });
  }
};

export function initInput(){
  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    if(k === 'w') keys.w = true;
    if(k === 'a') keys.a = true;
    if(k === 's') keys.s = true;
    if(k === 'd') keys.d = true;
    if(e.key === 'Shift') keys.shift = true;
    if(e.key === 'Control') keys.ctrl = true;
    if(e.code === 'Space'){ keys.space = true; if(G.state === 'playing') e.preventDefault(); }

    if(G.state !== 'playing') return;
    if(k === 'r') startReload();
    if(k === 'f') toggleFullscreen();
    if(k === 'escape') pauseGame();
    const n = parseInt(e.key, 10);
    if(!isNaN(n) && n >= 1 && n <= WEAPON_ORDER.length) switchWeapon(WEAPON_ORDER[n-1]);
    if(k === 'e') cycleWeapon(1);
    if(k === 'q') cycleWeapon(-1);
  });
  window.addEventListener('keyup', (e)=>{
    const k = e.key.toLowerCase();
    if(k === 'w') keys.w = false;
    if(k === 'a') keys.a = false;
    if(k === 's') keys.s = false;
    if(k === 'd') keys.d = false;
    if(e.key === 'Shift') keys.shift = false;
    if(e.key === 'Control') keys.ctrl = false;
    if(e.code === 'Space') keys.space = false;
  });
  window.addEventListener('mousedown', (e)=>{
    if(G.state !== 'playing') return;
    if(e.button === 0){
      if(!IS_TOUCH && !Pointer.locked){ Pointer.request(); return; }
      startFiring();
    }
  });
  window.addEventListener('mouseup', (e)=>{ if(e.button === 0) stopFiring(); });
  window.addEventListener('contextmenu', e => { if(G.state === 'playing') e.preventDefault(); });
  window.addEventListener('wheel', (e)=>{
    if(G.state !== 'playing') return;
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
  }, { passive:true });
}