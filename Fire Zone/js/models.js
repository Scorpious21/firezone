import * as THREE from 'three';
import { getSkin } from './config.js';

/* Materials rebuilt when the player changes skin. */
export let MATS = {};

export function buildMaterials(skinKey){
  const s = getSkin(skinKey);
  MATS = {
    gunDark : new THREE.MeshStandardMaterial({ color:0x1a1e24, roughness:.5, metalness:.8 }),
    gunMid  : new THREE.MeshStandardMaterial({ color:0x2b3038, roughness:.6, metalness:.6 }),
    gunAcc  : new THREE.MeshStandardMaterial({ color:s.accent, emissive:s.accent, emissiveIntensity:.7, roughness:.4 }),
    glove   : new THREE.MeshStandardMaterial({ color:s.primary, roughness:.85, metalness:.1 }),
    gloveL  : new THREE.MeshStandardMaterial({ color:s.secondary, roughness:.85, metalness:.1 }),
    enemyBody : new THREE.MeshStandardMaterial({ color:0x8b2e2e, roughness:.7, metalness:.2 }),
    enemyDark : new THREE.MeshStandardMaterial({ color:0x1c222a, roughness:.85, metalness:.25 }),
    enemyVisor: new THREE.MeshBasicMaterial({ color:0xff2a2a }),
    crate   : new THREE.MeshStandardMaterial({ color:0x37475a, roughness:.85, metalness:.15 }),
    crate2  : new THREE.MeshStandardMaterial({ color:0x4a3f36, roughness:.85, metalness:.15 }),
    crate3  : new THREE.MeshStandardMaterial({ color:0x2f3d33, roughness:.85, metalness:.15 }),
    crate4  : new THREE.MeshStandardMaterial({ color:0x453a4d, roughness:.85, metalness:.15 }),
    metal   : new THREE.MeshStandardMaterial({ color:0x2b3644, roughness:.7, metalness:.5 })
  };
  return MATS;
}
buildMaterials('default');

/* ---------- helpers ---------- */
export function box(w,h,d,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz); m.castShadow = true;
  return m;
}
export function cyl(rt,rb,h,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,seg=8){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz); m.castShadow = true;
  return m;
}

/* ---------- first-person weapon ---------- */
export function buildWeaponModel(kind){
  const g = new THREE.Group();
  const GD = MATS.gunDark, GM = MATS.gunMid, GA = MATS.gunAcc;
  const GL = MATS.glove, GL2 = MATS.gloveL;

  const rightHand = new THREE.Group();
  rightHand.add(box(.11,.13,.14, GL, 0,0,0));
  rightHand.add(box(.045,.10,.06, GL, -.06,-.02,.05));
  rightHand.add(box(.04,.10,.06, GL,  .05,-.06,-.02));
  rightHand.add(box(.04,.10,.06, GL,  .05,-.06,.04));
  rightHand.add(box(.04,.08,.05, GL,  .05,-.05,.10));

  const leftHand = new THREE.Group();
  leftHand.add(box(.11,.13,.14, GL2, 0,0,0));
  leftHand.add(box(.045,.10,.06, GL2, .06,-.02,-.05));
  leftHand.add(box(.04,.10,.06, GL2, -.05,-.06,.02));
  leftHand.add(box(.04,.10,.06, GL2, -.05,-.06,-.04));

  switch(kind){
    case 'pistol':
      g.add(box(.075,.10,.30, GD, 0, 0, -.08));
      g.add(box(.085,.055,.32, GM, 0, .075, -.09));
      g.add(cyl(.022,.022,.06, GD, 0, .04, -.28, Math.PI/2, 0, 0, 8));
      g.add(box(.07,.18,.10, GM, 0, -.14, .04, -.22, 0, 0));
      g.add(box(.055,.03,.10, GD, 0, -.075, .04));
      g.add(box(.045,.02,.07, GA, 0, -.005, -.22));
      rightHand.position.set(0, -.14, .06);
      leftHand.position.set(0, -.15, .12);
      leftHand.rotation.set(-.4, .1, 0);
      break;
    case 'smg':
      g.add(box(.075,.11,.42, GD, 0, 0, -.14));
      g.add(cyl(.021,.021,.28, GD, 0, .01, -.55, Math.PI/2, 0, 0, 8));
      g.add(box(.065,.085,.24, GM, 0, -.01, -.42));
      g.add(box(.05,.05,.20, GD, 0, .085, -.30));
      g.add(box(.06,.28,.09, GM, 0, -.19, .03, .15, 0, 0));
      g.add(box(.06,.20,.09, GM, 0, -.36, .07, .35, 0, 0));
      g.add(box(.05,.14,.06, GM, 0, -.13, -.28, -.10, 0, 0));
      g.add(box(.055,.11,.24, GM, 0, -.02, .28));
      g.add(box(.045,.03,.10, GA, 0, .075, -.14));
      rightHand.position.set(0, -.16, .14);
      leftHand.position.set(0, -.16, -.26);
      leftHand.rotation.set(-.3, .1, 0);
      break;
    case 'rifle':
      g.add(box(.085,.11,.55, GD, 0, 0, -.22));
      g.add(cyl(.021,.021,.42, GD, 0, .01, -.72, Math.PI/2, 0, 0, 8));
      g.add(box(.075,.085,.28, GM, 0, -.01, -.55));
      g.add(cyl(.014,.014,.28, GM, 0, .055, -.55, Math.PI/2, 0, 0, 8));
      g.add(box(.02,.08,.02, GD, 0, .09, -.70));
      g.add(box(.05,.02,.04, GD, 0, .085, -.10));
      g.add(box(.07,.22,.11, GM, 0, -.14, .02));
      g.add(box(.07,.14,.11, GM, 0, -.30, .05, .35, 0, 0));
      g.add(box(.06,.16,.08, GM, 0, -.13, .16, -.28, 0, 0));
      g.add(box(.06,.13,.28, GM, 0, -.02, .32));
      g.add(box(.06,.03,.14, GA, 0, .075, -.05));
      rightHand.position.set(0, -.12, .14);
      leftHand.position.set(0, -.08, -.44);
      leftHand.rotation.set(-.15, .1, 0);
      break;
    case 'burst':
      g.add(box(.075,.11,.50, GD, 0, 0, -.20));
      g.add(cyl(.019,.019,.40, GD, 0, .01, -.66, Math.PI/2, 0, 0, 8));
      g.add(box(.07,.09,.30, GM, 0, -.005, -.50));
      g.add(box(.04,.04,.26, GD, 0, .10, -.20));
      g.add(box(.05,.05,.04, GD, 0, .13, -.15));
      g.add(box(.06,.20,.09, GM, 0, -.16, .00));
      g.add(box(.06,.10,.09, GM, 0, -.28, .02, .15, 0, 0));
      g.add(box(.055,.14,.07, GM, 0, -.13, .14, -.20, 0, 0));
      g.add(box(.055,.12,.26, GM, 0, -.02, .30));
      g.add(box(.045,.03,.10, GA, 0, .075, -.05));
      rightHand.position.set(0, -.12, .12);
      leftHand.position.set(0, -.09, -.38);
      leftHand.rotation.set(-.15, .1, 0);
      break;
    case 'shotgun':
      g.add(box(.10,.12,.55, GD, 0, 0, -.15));
      g.add(cyl(.033,.033,.55, GD, 0, .045, -.65, Math.PI/2, 0, 0, 10));
      g.add(cyl(.024,.024,.45, GM, 0, -.02, -.60, Math.PI/2, 0, 0, 8));
      g.add(box(.09,.09,.16, GM, 0, -.05, -.58));
      g.add(box(.07,.02,.20, GM, 0, .075, -.10));
      g.add(box(.075,.14,.30, GM, 0, -.04, .32, -.12, 0, 0));
      g.add(box(.055,.13,.07, GM, 0, -.12, .05, -.20, 0, 0));
      g.add(box(.06,.02,.10, GA, 0, .078, -.20));
      rightHand.position.set(0, -.12, .08);
      leftHand.position.set(0, -.06, -.55);
      leftHand.rotation.set(-.15, .12, 0);
      break;
    case 'sniper': {
      g.add(box(.075,.10,.85, GD, 0, 0, -.30));
      g.add(cyl(.018,.022,.55, GD, 0, .015, -1.02, Math.PI/2, 0, 0, 10));
      g.add(cyl(.028,.028,.09, GM, 0, .015, -1.32, Math.PI/2, 0, 0, 10));
      const scope = new THREE.Group();
      scope.add(cyl(.045,.045,.36, GM, 0, 0, 0, Math.PI/2, 0, 0, 12));
      scope.add(cyl(.05,.05,.06, GD, 0, 0, -.20, Math.PI/2, 0, 0, 12));
      scope.add(cyl(.05,.05,.06, GD, 0, 0, .20, Math.PI/2, 0, 0, 12));
      scope.add(cyl(.012,.012,.02, GA, 0, 0, .23, Math.PI/2, 0, 0, 8));
      scope.position.set(0, .14, -.35);
      g.add(scope);
      g.add(box(.02,.10,.03, GD, 0, .085, -.25));
      g.add(box(.02,.10,.03, GD, 0, .085, -.45));
      g.add(cyl(.014,.014,.10, GM, .06, .04, -.18, 0, 0, Math.PI/3, 8));
      g.add(cyl(.012,.012,.22, GM, -.05, -.13, -.85, 0, 0, .35, 6));
      g.add(cyl(.012,.012,.22, GM,  .05, -.13, -.85, 0, 0, -.35, 6));
      g.add(box(.055,.15,.075, GM, 0, -.13, .04, -.20, 0, 0));
      g.add(box(.06,.04,.22, GM, 0, .075, .25));
      rightHand.position.set(0, -.13, .08);
      leftHand.position.set(0, -.05, -.55);
      leftHand.rotation.set(-.20, .15, 0);
      break;
    }
    case 'lmg':
      g.add(box(.11,.14,.60, GD, 0, 0, -.20));
      g.add(cyl(.026,.026,.55, GD, 0, .02, -.75, Math.PI/2, 0, 0, 10));
      g.add(box(.09,.09,.32, GM, 0, -.01, -.55));
      g.add(box(.16,.20,.22, GM, 0, -.18, -.05));
      g.add(box(.05,.05,.20, GD, 0, .12, -.15));
      g.add(cyl(.012,.012,.24, GM, -.06, -.13, -.85, 0, 0, .35, 6));
      g.add(cyl(.012,.012,.24, GM,  .06, -.13, -.85, 0, 0, -.35, 6));
      g.add(box(.06,.13,.26, GM, 0, -.02, .30));
      g.add(box(.06,.03,.12, GA, 0, .095, -.05));
      rightHand.position.set(0, -.13, .18);
      leftHand.position.set(0, -.12, -.52);
      leftHand.rotation.set(-.20, .10, 0);
      break;
    case 'magnum':
      g.add(box(.08,.11,.30, GD, 0, 0, -.08));
      g.add(cyl(.055,.055,.10, GM, 0, .01, -.02, 0, 0, Math.PI/2, 12));
      g.add(box(.06,.05,.26, GD, 0, .075, -.12));
      g.add(cyl(.024,.024,.14, GD, 0, .04, -.30, Math.PI/2, 0, 0, 8));
      g.add(box(.06,.20,.10, GM, 0, -.15, .05, -.30, 0, 0));
      g.add(box(.05,.03,.10, GD, 0, -.075, .05));
      g.add(box(.05,.02,.05, GA, 0, .10, -.12));
      rightHand.position.set(0, -.15, .07);
      leftHand.position.set(0, -.14, .14);
      leftHand.rotation.set(-.5, .1, 0);
      break;
    case 'rpg': {
      g.add(cyl(.055,.055,.85, GD, 0, 0, -.30, Math.PI/2, 0, 0, 12));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.10,.24,12), GM);
      cone.position.set(0, 0, -.75); cone.rotation.x = -Math.PI/2; cone.castShadow = true;
      g.add(cone);
      g.add(cyl(.07,.07,.08, GD, 0, 0, -.62, Math.PI/2, 0, 0, 12));
      for(let i=0;i<4;i++) g.add(box(.02,.02,.05, GM, .075, -.02, -.20 - i*.10));
      g.add(cyl(.075,.055,.10, GM, 0, 0, .18, Math.PI/2, 0, 0, 12));
      g.add(box(.06,.16,.07, GM, 0, -.14, .02, -.20, 0, 0));
      g.add(box(.03,.06,.10, GD, .07, .07, -.20));
      g.add(box(.04,.02,.06, GA, 0, .075, -.10));
      rightHand.position.set(0, -.14, .06);
      leftHand.position.set(0, -.05, -.42);
      leftHand.rotation.set(-.15, .10, 0);
      break;
    }
  }
  g.add(rightHand);
  g.add(leftHand);
  return g;
}

/* ---------- enemy ---------- */
export function buildEnemyModel(){
  const g = new THREE.Group();
  const EB = MATS.enemyBody, ED = MATS.enemyDark, EV = MATS.enemyVisor;

  const torso = box(.62,.75,.34, EB, 0, 1.28, 0);
  torso.userData.part = 'body';
  g.add(torso);
  g.add(box(.58,.35,.10, ED, 0, 1.40, -.14));
  g.add(box(.20,.04,.02, MATS.gunAcc, 0, 1.45, -.20));
  g.add(box(.5,.28,.30, ED, 0, .92, 0));
  g.add(box(.22,.16,.32, ED, -.42, 1.52, 0));
  g.add(box(.22,.16,.32, ED,  .42, 1.52, 0));

  const armL = new THREE.Group(); armL.position.set(-.45, 1.42, 0);
  armL.add(box(.16,.42,.18, ED, 0, -.22, 0));
  armL.add(box(.15,.40,.17, ED, 0, -.62, 0));
  armL.add(box(.14,.16,.16, EB, 0, -.88, 0));
  g.add(armL);

  const armR = new THREE.Group(); armR.position.set(.45, 1.42, 0);
  armR.add(box(.16,.42,.18, ED, 0, -.22, 0));
  armR.add(box(.15,.40,.17, ED, 0, -.62, 0));
  armR.add(box(.14,.16,.16, EB, 0, -.88, 0));
  g.add(armR);

  const legL = new THREE.Group(); legL.position.set(-.16, .80, 0);
  legL.add(box(.20,.42,.24, ED, 0, -.22, 0));
  legL.add(box(.18,.40,.22, ED, 0, -.62, 0));
  legL.add(box(.22,.10,.30, ED, 0, -.86, -.05));
  g.add(legL);

  const legR = new THREE.Group(); legR.position.set(.16, .80, 0);
  legR.add(box(.20,.42,.24, ED, 0, -.22, 0));
  legR.add(box(.18,.40,.22, ED, 0, -.62, 0));
  legR.add(box(.22,.10,.30, ED, 0, -.86, -.05));
  g.add(legR);

  g.add(cyl(.09,.09,.12, ED, 0, 1.71, 0, 0,0,0, 8));
  const head = box(.34,.34,.32, EB, 0, 1.94, 0);
  head.userData.part = 'head';
  g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.28,.08,.04), EV);
  visor.position.set(0, 1.96, -.17);
  g.add(visor);
  g.add(box(.05,.14,.24, ED, -.19, 1.94, 0));
  g.add(box(.05,.14,.24, ED,  .19, 1.94, 0));
  g.add(box(.36,.06,.30, ED, 0, 2.14, 0));

  const eGun = new THREE.Group();
  eGun.add(box(.06,.08,.42, MATS.gunDark, 0,0,0));
  eGun.add(box(.05,.06,.14, MATS.gunDark, 0,-.06,.14));
  eGun.position.set(.55, 1.05, -.25);
  eGun.rotation.y = -.1;
  g.add(eGun);

  return { mesh:g, head, torso, armL, armR, legL, legR };
}

/* ---------- remote player ---------- */
export function buildRemotePlayer(skinKey){
  const s = getSkin(skinKey);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color:s.primary, roughness:.7, metalness:.2 });
  const headMat = new THREE.MeshStandardMaterial({ color:s.body, roughness:.8 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.35,.85,4,10), bodyMat);
  torso.position.y = .95; torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), headMat);
  head.position.y = 1.72; head.castShadow = true;
  g.add(head);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(.4, .03, 6, 20),
    new THREE.MeshBasicMaterial({ color:s.accent })
  );
  ring.rotation.x = Math.PI/2; ring.position.y = .15;
  g.add(ring);
  return g;
}