import * as THREE from 'three';
import { $ } from './utils.js';
import { settings } from './settings.js';
import { MATS, box, cyl } from './models.js';
import { obstacles, refs } from './state.js';

export const ARENA = 55;

export function initEngine(isTouch){
  const renderer = new THREE.WebGLRenderer({ antialias:!isTouch, powerPreference:'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  const maxPR = isTouch ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPR) * settings.scale);
  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = isTouch ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  $('#canvasWrap').appendChild(renderer.domElement);
  refs.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f16);
  scene.fog = new THREE.Fog(0x0a0f16, 45, 165);
  refs.scene = scene;

  const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth/innerHeight, .05, 600);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.5, 0);
  scene.add(camera);
  refs.camera = camera;

  refs.clock = new THREE.Clock();

  buildWorld(scene, isTouch);
}

export function onResize(isTouch){
  const { renderer, camera } = refs;
  if(!renderer || !camera) return;
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  const maxPR = isTouch ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPR) * settings.scale);
}

export function registerObstacle(mesh, size){
  const half = size.clone().multiplyScalar(.5);
  const center = mesh.position.clone();
  obstacles.push({ mesh, half, center, min: center.clone().sub(half), max: center.clone().add(half) });
}

function makeGroundTexture(renderer){
  const s = 512;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#151b23'; g.fillRect(0,0,s,s);
  for(let i=0;i<2200;i++){
    g.fillStyle = `rgba(255,255,255,${Math.random()*.035})`;
    g.fillRect(Math.random()*s, Math.random()*s, 2, 2);
  }
  g.strokeStyle = 'rgba(120,180,255,.12)'; g.lineWidth = 2;
  for(let i=0;i<=4;i++){
    const p = i*(s/4);
    g.beginPath(); g.moveTo(p,0); g.lineTo(p,s); g.stroke();
    g.beginPath(); g.moveTo(0,p); g.lineTo(s,p); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ARENA/4, ARENA/4);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function buildWorld(scene, isTouch){
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x1a1f28, .85));

  const sunLight = new THREE.DirectionalLight(0xffd9a0, 1.4);
  sunLight.position.set(40, 60, 28);
  sunLight.castShadow = settings.shadows;
  sunLight.shadow.mapSize.set(isTouch?512:1024, isTouch?512:1024);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 190;
  Object.assign(sunLight.shadow.camera, { left:-60, right:60, top:60, bottom:-60 });
  sunLight.shadow.bias = -0.0009;
  scene.add(sunLight);
  refs.sunLight = sunLight;

  const fill = new THREE.DirectionalLight(0x5f8fff, .35);
  fill.position.set(-35, 30, -30);
  scene.add(fill);

  const gTex = makeGroundTexture(refs.renderer);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA*2, ARENA*2),
    new THREE.MeshStandardMaterial({ map:gTex, roughness:.96, metalness:.05, color:0x9aa7b8 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const wallH = 8;
  const walls = [
    [0, wallH/2, -ARENA, ARENA*2, wallH, 1],
    [0, wallH/2,  ARENA, ARENA*2, wallH, 1],
    [-ARENA, wallH/2, 0, 1, wallH, ARENA*2],
    [ ARENA, wallH/2, 0, 1, wallH, ARENA*2]
  ];
  for(const [x,y,z,w,h,d] of walls){
    const m = box(w,h,d, MATS.metal, x,y,z);
    scene.add(m);
    registerObstacle(m, new THREE.Vector3(w,h,d));
  }

  const crateMats = [MATS.crate, MATS.crate2, MATS.crate3, MATS.crate4];
  const count = isTouch ? 18 : 26;
  for(let i=0;i<count;i++){
    const w = 2 + Math.random()*5, h = 1.6 + Math.random()*3.9, d = 2 + Math.random()*5;
    const ang = Math.random()*Math.PI*2, r = 10 + Math.random()*(ARENA-19);
    const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
    const mat = crateMats[Math.floor(Math.random()*crateMats.length)];
    const crate = new THREE.Group();
    crate.add(box(w,h,d, mat));
    const trimMat = new THREE.MeshStandardMaterial({ color: mat.color.getHex(), roughness:.4, metalness:.5 });
    crate.add(box(w+.04,.06,d+.04, trimMat, 0,  h/2-.02, 0));
    crate.add(box(w+.04,.06,d+.04, trimMat, 0, -h/2+.02, 0));
    const accent = new THREE.MeshBasicMaterial({ color: Math.random()<.5 ? 0xff6a2a : 0x35d1ff });
    crate.add(box(w+.05,.05,d+.05, accent));
    crate.position.set(x, h/2, z);
    crate.castShadow = true;
    scene.add(crate);
    registerObstacle(crate, new THREE.Vector3(w,h,d));
  }

  const bunker = box(10, 4.4, 10, MATS.metal, 0, 2.2, 0);
  scene.add(bunker);
  registerObstacle(bunker, new THREE.Vector3(10, 4.4, 10));

  const pylons = isTouch ? 8 : 12;
  for(let i=0;i<pylons;i++){
    const ang = Math.random()*Math.PI*2, r = 14 + Math.random()*(ARENA-20);
    const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
    const p = cyl(.14,.14,6, MATS.metal, x, 3, z);
    p.material = new THREE.MeshStandardMaterial({ color:0x1b2733, emissive:0x2a6cff, emissiveIntensity:1.4, roughness:.4 });
    scene.add(p);
    registerObstacle(p, new THREE.Vector3(.4, 6, .4));
  }
}