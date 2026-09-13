import * as THREE from 'three';
import { $, rand, IS_TOUCH, nextLayoutFrame } from './utils.js';
import { settings } from './settings.js';
import { refs, obstacles, tracers, particles } from './state.js';

export let ARENA = 55;
export function setArena(n){ ARENA = n; }

export async function initEngine(){
  const wrap = $('#canvasWrap');
  await nextLayoutFrame();

  const rect = wrap.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width || window.innerWidth || 800));
  const h = Math.max(1, Math.round(rect.height || window.innerHeight || 600));

  const renderer = new THREE.WebGLRenderer({
    antialias: !IS_TOUCH,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.0) * settings.scale);
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = IS_TOUCH ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  wrap.appendChild(renderer.domElement);
  refs.renderer = renderer;

  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    const el = $('#glLost'); if(el) el.classList.remove('hidden');
  }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    const el = $('#glLost'); if(el) el.classList.add('hidden');
  }, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f16);
  scene.fog = new THREE.Fog(0x0a0f16, 45, 165);
  refs.scene = scene;

  const camera = new THREE.PerspectiveCamera(settings.fov, w/h, 0.05, 600);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.5, 8);
  scene.add(camera);
  refs.camera = camera;

  refs.clock = new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x1a1f28, 0.85));

  const sun = new THREE.DirectionalLight(0xffd9a0, 1.4);
  sun.position.set(40, 60, 28);
  sun.castShadow = settings.shadows;
  sun.shadow.mapSize.set(IS_TOUCH ? 512 : 1024, IS_TOUCH ? 512 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 190;
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 });
  sun.shadow.bias = -0.0009;
  scene.add(sun);
  refs.sunLight = sun;

  const fill = new THREE.DirectionalLight(0x5f8fff, 0.35);
  fill.position.set(-35, 30, -30);
  scene.add(fill);

  window.addEventListener('resize', onResize);
  if(window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

  renderer.render(scene, camera);
}

export function onResize(){
  const renderer = refs.renderer, camera = refs.camera;
  if(!renderer || !camera) return;
  const wrap = $('#canvasWrap');
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width || window.innerWidth || 800));
  const h = Math.max(1, Math.round(rect.height || window.innerHeight || 600));
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.0) * settings.scale);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function registerObstacle(mesh, size){
  const half = size.clone().multiplyScalar(0.5);
  const center = mesh.position.clone();
  obstacles.push({ mesh, half, center, min: center.clone().sub(half), max: center.clone().add(half) });
}

export async function loadMap(id){
  const scene = refs.scene;
  for(const ob of obstacles){
    if(ob.mesh && ob.mesh.parent) scene.remove(ob.mesh);
    if(ob.mesh && ob.mesh.traverse){
      ob.mesh.traverse(o => {
        if(o.geometry) o.geometry.dispose();
        if(o.material){
          if(Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else if(o.material.dispose) o.material.dispose();
        }
      });
    }
  }
  obstacles.length = 0;
  if(refs.gunGroup && refs.camera) refs.camera.remove(refs.gunGroup);

  const mod = await import('./maps/' + id + '.js');
  const map = mod.default;
  if(!map) throw new Error('Map not found: ' + id);
  setArena(map.size || 55);
  map.build(scene, registerObstacle);
  return map;
}

export function spawnTracer(from, to){
  const scene = refs.scene; if(!scene) return;
  const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  tracers.push({ line, life: 0.07, max: 0.07 });
}

export function spawnImpact(pos, normal){
  const scene = refs.scene; if(!scene) return;
  const n = IS_TOUCH ? 3 : 5;
  for(let i = 0; i < n; i++){
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true })
    );
    p.position.copy(pos);
    scene.add(p);
    particles.push({
      mesh: p, life: 0.35, max: 0.35,
      vel: normal.clone().multiplyScalar(rand(1,3)).add(new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1)))
    });
  }
}

export function updateEffects(dt){
  const scene = refs.scene; if(!scene) return;
  for(let i = tracers.length - 1; i >= 0; i--){
    const t = tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / t.max) * 0.9;
    if(t.life <= 0){
      scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      tracers.splice(i, 1);
    }
  }
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= 14 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = Math.max(0, p.life / p.max);
    if(p.life <= 0){
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}