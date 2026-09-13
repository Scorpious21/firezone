import { $, clamp, IS_TOUCH } from './utils.js';
import { settings } from './settings.js';
import { G, keys, playerLook, refs } from './state.js';
import { WEAPON_ORDER } from './config.js';
import { startFiring, stopFiring, startReload, switchWeapon, cycleWeapon } from './weapons.js';

const joy = {
  active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0,
  init(){
    const base = document.getElementById('joyBase');
    const knob = document.getElementById('joyKnob');
    if(!base || !knob) return;

    const showJoy = (x, y) => {
      const size = base.offsetWidth || 170;
      base.style.left = (x - size / 2) + 'px';
      base.style.top = (y - size / 2) + 'px';
      base.style.bottom = 'auto';
      base.classList.add('show');
    };
    const hideJoy = () => {
      base.classList.remove('show');
      base.style.left = ''; base.style.top = ''; base.style.bottom = '';
      knob.style.transform = 'translate(-50%,-50%)';
    };

    window.addEventListener('touchstart', e => {
      if(G.state !== 'playing') return;
      for(const t of e.changedTouches){
        if(this.active) continue;
        if(t.clientX < innerWidth * 0.45){
          this.active = true;
          this.id = t.identifier;
          this.baseX = t.clientX;
          this.baseY = t.clientY;
          showJoy(t.clientX, t.clientY);
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if(!this.active) return;
      for(const t of e.changedTouches){
        if(t.identifier !== this.id) continue;
        let dx = t.clientX - this.baseX;
        let dy = t.clientY - this.baseY;
        const max = (base.offsetWidth || 170) * 0.35;
        const dist = Math.hypot(dx, dy);
        if(dist > max){ dx = dx / dist * max; dy = dy / dist * max; }
        knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
        const dead = 0.12;
        const nx = dx / max, ny = dy / max;
        this.dx = Math.abs(nx) < dead ? 0 : nx;
        this.dy = Math.abs(ny) < dead ? 0 : ny;
      }
    }, { passive: true });

    const end = e => {
      if(!this.active) return;
      for(const t of e.changedTouches){
        if(t.identifier !== this.id) continue;
        this.active = false; this.id = null;
        this.dx = 0; this.dy = 0;
        hideJoy();
      }
    };
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', end, { passive: true });
  },
  move(){ return { x: this.dx, y: this.dy }; }
};

const look = {
  active: false, id: null, lx: 0, ly: 0,
  init(){
    window.addEventListener('touchstart', e => {
      if(G.state !== 'playing') return;
      for(const t of e.changedTouches){
        if(this.active) continue;
        if(t.clientX >= innerWidth * 0.45){
          const el = document.elementFromPoint(t.clientX, t.clientY);
          if(el && el.closest && el.closest('.actBtn')) continue;
          this.active = true;
          this.id = t.identifier;
          this.lx = t.clientX;
          this.ly = t.clientY;
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if(!this.active) return;
      for(const t of e.changedTouches){
        if(t.identifier !== this.id) continue;
        const dx = t.clientX - this.lx;
        const dy = t.clientY - this.ly;
        this.lx = t.clientX;
        this.ly = t.clientY;
        const s = settings.touchSens * 0.0055;
        playerLook.yaw -= dx * s;
        playerLook.pitch = clamp(playerLook.pitch - dy * s * (settings.invertY ? -1 : 1), -1.45, 1.45);
      }
    }, { passive: true });

    const end = e => {
      if(!this.active) return;
      for(const t of e.changedTouches){
        if(t.identifier !== this.id) continue;
        this.active = false; this.id = null;
      }
    };
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', end, { passive: true });
  }
};

function bindHold(el, onDown, onUp){
  if(!el) return;
  let activeId = null;
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    if(activeId !== null) return;
    activeId = e.changedTouches[0].identifier;
    el.classList.add('pressed');
    if(onDown) onDown();
  }, { passive: false });
  const up = e => {
    if(activeId === null) return;
    for(const t of e.changedTouches){
      if(t.identifier === activeId){
        activeId = null;
        el.classList.remove('pressed');
        if(onUp) onUp();
      }
    }
  };
  el.addEventListener('touchend', up, { passive: false });
  el.addEventListener('touchcancel', up, { passive: false });
}

export function initInput(){
  window.addEventListener('keydown', e => {
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
    if(k === 'f'){
      if(!document.fullscreenElement){ document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); }
      else { document.exitFullscreen && document.exitFullscreen(); }
    }
    if(k === 'escape'){
      import('./boot.js').then(m => m.pauseFromInput());
    }
    const n = parseInt(e.key, 10);
    if(!isNaN(n) && n >= 1 && n <= WEAPON_ORDER.length) switchWeapon(WEAPON_ORDER[n - 1]);
    if(k === 'e') cycleWeapon(1);
    if(k === 'q') cycleWeapon(-1);
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if(k === 'w') keys.w = false;
    if(k === 'a') keys.a = false;
    if(k === 's') keys.s = false;
    if(k === 'd') keys.d = false;
    if(e.key === 'Shift') keys.shift = false;
    if(e.key === 'Control') keys.ctrl = false;
    if(e.code === 'Space') keys.space = false;
  });

  let pointerLocked = false;
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === (refs.renderer && refs.renderer.domElement);
  });
  window.addEventListener('mousemove', e => {
    if(!pointerLocked || G.state !== 'playing') return;
    const s = settings.sensitivity * 0.0022;
    playerLook.yaw -= e.movementX * s;
    playerLook.pitch = clamp(playerLook.pitch - e.movementY * s * (settings.invertY ? -1 : 1), -1.45, 1.45);
  });
  window.addEventListener('mousedown', e => {
    if(G.state !== 'playing') return;
    if(e.button === 0){
      if(!IS_TOUCH && !pointerLocked){
        const dom = refs.renderer && refs.renderer.domElement;
        if(dom && dom.requestPointerLock) dom.requestPointerLock();
        return;
      }
      startFiring();
    }
  });
  window.addEventListener('mouseup', e => { if(e.button === 0) stopFiring(); });
  window.addEventListener('contextmenu', e => { if(G.state === 'playing') e.preventDefault(); });
  window.addEventListener('wheel', e => {
    if(G.state !== 'playing') return;
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  joy.init();
  look.init();

  bindHold(document.getElementById('btnFire'), () => startFiring(), () => stopFiring());
  bindHold(document.getElementById('btnJump'), () => { keys.space = true; }, () => { keys.space = false; });
  bindHold(document.getElementById('btnCrouch'), () => { keys.ctrl = true; }, () => { keys.ctrl = false; });
  bindHold(document.getElementById('btnReload'), () => startReload());
  bindHold(document.getElementById('btnGrenade'), () => {});
  bindHold(document.getElementById('btnAbility'), () => {});
}

export function getJoyMove(){ return joy.move(); }