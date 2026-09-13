export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
export const rand = (a,b) => a + Math.random()*(b-a);
export const randi = (a,b) => Math.floor(rand(a,b+1));
export const lerp = (a,b,t) => a + (b-a)*t;
export const TAU = Math.PI*2;
export const nowMs = () => performance.now();
export const IS_TOUCH = document.documentElement.classList.contains('touch');
export const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);

export function show(el){ if(el){ el.classList.remove('hidden'); el.style.display = ''; } }
export function hide(el){ if(el){ el.classList.add('hidden'); } }

export function nextLayoutFrame(){
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)));
  });
}