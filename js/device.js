import { settings, saveSettings, Haptics } from './settings.js';

export const Fullscreen = {
  isOn(){ return !!document.fullscreenElement; },
  async toggle(){
    try{
      if(!document.fullscreenElement){
        const el = document.documentElement;
        await (el.requestFullscreen?.({ navigationUI:'hide' }) || el.webkitRequestFullscreen?.());
        try{ await screen.orientation?.lock?.('landscape'); }catch(e){}
      } else {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
      return this.isOn();
    }catch(e){ return false; }
  },
  async on(){
    try{
      if(!document.fullscreenElement){
        const el = document.documentElement;
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.());
      }
    }catch(e){}
  }
};

export const Notify = {
  supported(){ return 'Notification' in window; },
  async request(){
    if(!this.supported()) return false;
    if(Notification.permission === 'granted') return true;
    const p = await Notification.requestPermission();
    return p === 'granted';
  },
  show(title, body){
    if(!settings.notif) return;
    if(!this.supported() || Notification.permission !== 'granted') return;
    try{
      const n = new Notification(title, { body, silent:true, tag:'fz' });
      setTimeout(() => n.close(), 4500);
    }catch(e){}
  }
};

export const Vibrate = {
  supported(){ return 'vibrate' in navigator; },
  test(){ if(!this.supported()) return false; try{ navigator.vibrate([60,40,60]); return true; }catch(e){ return false; } }
};

export const Landscape = {
  isLandscape(){ return window.matchMedia('(orientation: landscape)').matches; },
  async lock(){
    try{
      if(!document.fullscreenElement) await Fullscreen.on();
      await screen.orientation?.lock?.('landscape');
      return true;
    }catch(e){ return false; }
  },
  unlock(){ try{ screen.orientation?.unlock?.(); }catch(e){} }
};

export function wireDeviceButtons(toast){
  const bFull = document.getElementById('btnFullscreen');
  if(bFull) bFull.addEventListener('click', async () => {
    const on = await Fullscreen.toggle();
    if(toast) toast(on ? 'Fullscreen on' : 'Fullscreen off');
  });

  const bNotif = document.getElementById('btnNotify');
  if(bNotif) bNotif.addEventListener('click', async () => {
    const ok = await Notify.request();
    settings.notif = ok;
    saveSettings();
    const sNotif = document.getElementById('sNotif');
    if(sNotif) sNotif.checked = ok;
    if(toast) toast(ok ? 'Notifications enabled' : 'Notifications denied', ok ? 'ok' : 'err');
  });

  const bVib = document.getElementById('btnVibrate');
  if(bVib) bVib.addEventListener('click', () => {
    if(!Vibrate.supported()){ if(toast) toast('Vibration not supported', 'err'); return; }
    Vibrate.test();
    if(toast) toast('Vibration test sent', 'ok');
  });

  const bLand = document.getElementById('btnLandscape');
  if(bLand) bLand.addEventListener('click', async () => {
    const ok = await Landscape.lock();
    if(toast) toast(ok ? 'Landscape locked' : 'Rotate device manually', ok ? 'ok' : 'err');
  });
}
