import { $, clamp } from './utils.js';
import { G } from './state.js';
import { Audio, Haptics, Notify, bumpScore } from './settings.js';
import { updateHealthHUD } from './hud.js';
import { stopFiring } from './weapons.js';

export function damagePlayer(amount, fromPos){
  if(G.state !== 'playing') return false;
  const armorTake = Math.min(G.armor, amount * .6);
  G.armor -= armorTake;
  G.health -= amount - armorTake;
  Audio.hurt(); Haptics.hurt();

  const vig = $('#vignette');
  if(vig){ vig.style.opacity = '.85'; setTimeout(()=>{ vig.style.opacity = '0'; }, 250); }
  const lowhp = $('#lowhp');
  if(lowhp) lowhp.style.opacity = G.health < 35 ? '1' : '0';

  updateHealthHUD();

  if(G.health <= 0){
    G.health = 0;
    updateHealthHUD();
    triggerGameOver();
    return true;
  }
  return false;
}

function triggerGameOver(){
  G.state = 'dead';
  stopFiring();
  Audio.death(); Haptics.death();
  if(document.pointerLockElement) document.exitPointerLock?.();
  bumpScore(G.score);
  Notify.show('💀 Eliminated', `Score: ${G.score} · Wave ${G.wave}`);

  $('#goScore').textContent = G.score;
  $('#goKills').textContent = G.kills;
  $('#goWave').textContent = G.wave;
  $('#goSub').textContent = `YOU SURVIVED ${G.wave} WAVE${G.wave===1?'':'S'}`;
  $('#hud').classList.add('hidden');
  const go = $('#gameover');
  go.classList.remove('hidden');
  go.style.display = 'flex';
}