import * as THREE from 'three';

function box(scene, w, h, d, color, x, y, z, registerObstacle, emissive){
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.15 });
  if(emissive){ mat.emissive = new THREE.Color(emissive); mat.emissiveIntensity = 1.4; }
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  if(registerObstacle) registerObstacle(m, new THREE.Vector3(w, h, d));
  return m;
}

function groundTexture(){
  const s = 512;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#151b23'; g.fillRect(0, 0, s, s);
  for(let i = 0; i < 2200; i++){
    g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.035) + ')';
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  g.strokeStyle = 'rgba(120,180,255,0.12)'; g.lineWidth = 2;
  for(let i = 0; i <= 4; i++){
    const p = i * (s / 4);
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

export default {
  id: 'arena',
  name: 'Arena',
  size: 55,
  build(scene, registerObstacle){
    const S = this.size;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(S * 2, S * 2),
      new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.96, metalness: 0.05, color: 0x9aa7b8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallH = 8;
    box(scene, S * 2, wallH, 1, 0x2b3644, 0, wallH / 2, -S, registerObstacle);
    box(scene, S * 2, wallH, 1, 0x2b3644, 0, wallH / 2,  S, registerObstacle);
    box(scene, 1, wallH, S * 2, 0x2b3644, -S, wallH / 2, 0, registerObstacle);
    box(scene, 1, wallH, S * 2, 0x2b3644,  S, wallH / 2, 0, registerObstacle);

    box(scene, 10, 4.4, 10, 0x2b3644, 0, 2.2, 0, registerObstacle);

    const colors = [0x37475a, 0x4a3f36, 0x2f3d33, 0x453a4d];
    for(let i = 0; i < 22; i++){
      const w = 2 + Math.random() * 5;
      const h = 1.6 + Math.random() * 3.9;
      const d = 2 + Math.random() * 5;
      const ang = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * (S - 19);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      box(scene, w, h, d, colors[Math.floor(Math.random() * colors.length)], x, h / 2, z, registerObstacle);
    }

    for(let i = 0; i < 12; i++){
      const ang = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * (S - 20);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1b2733, emissive: 0x2a6cff, emissiveIntensity: 1.4, roughness: 0.4 })
      );
      p.position.set(x, 3, z);
      p.castShadow = true;
      scene.add(p);
      if(registerObstacle) registerObstacle(p, new THREE.Vector3(0.4, 6, 0.4));
    }
  }
};