import * as THREE from 'three';
import { nowMs } from './utils.js';
import { G, remotePlayers, refs, playerLook, playerPos } from './state.js';
import { buildRemotePlayer } from './models.js';
import { Audio } from './settings.js';
import { addKillFeed } from './hud.js';
import { spawnTracer } from './weapons.js';
import { $ } from './utils.js';

let peerInstance = null;
let peerConns = [];
let peerIsHost = false;
let peerMyId = '';
let netSyncTimer = null;

export const Net = {
  get active(){ return peerInstance !== null && G.mode !== 'single'; },
  get myId(){ return peerMyId; },

  async _loadPeer(){
    if(typeof window.Peer !== 'undefined') return;
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  },

  async host(){
    await this._loadPeer();
    if(typeof window.Peer === 'undefined'){ alert('PeerJS failed to load'); return; }
    peerIsHost = true;
    peerMyId = 'FZ' + Math.random().toString(36).substring(2,7).toUpperCase();
    peerInstance = new window.Peer(peerMyId, { debug: 0 });
    peerInstance.on('open', id => {
      peerMyId = id;
      $('#netLabel').textContent = 'ROOM: ' + id;
      $('#modalTitle').textContent = 'ROOM CODE';
      $('#modalText').textContent = 'Share this with a friend:';
      $('#modalInput').value = id;
      $('#modalInput').readOnly = true;
      $('#modalCancel').style.display = 'none';
      $('#modalOk').textContent = 'START GAME';
      $('#modal').classList.remove('hidden');
      $('#modal').style.display = 'flex';
    });
    peerInstance.on('connection', conn => {
      peerConns.push(conn);
      _setupConn(conn);
      conn.on('open', ()=>{ addKillFeed('PLAYER JOINED', 0, '#35d1ff'); });
    });
    peerInstance.on('error', e => console.warn('Peer error:', e));
  },

  async join(code){
    await this._loadPeer();
    if(typeof window.Peer === 'undefined'){ alert('PeerJS failed to load'); return; }
    peerIsHost = false;
    peerMyId = 'FZ' + Math.random().toString(36).substring(2,7).toUpperCase();
    peerInstance = new window.Peer(peerMyId, { debug: 0 });
    peerInstance.on('open', () => {
      const conn = peerInstance.connect(code.toUpperCase(), { reliable: true });
      _setupConn(conn);
      conn.on('open', ()=>{
        peerConns.push(conn);
        addKillFeed('CONNECTED', 0, '#35d1ff');
        window.__fz_startMultiplayer?.('client');
      });
      conn.on('error', e => { alert('Connection failed: ' + e); });
    });
    peerInstance.on('error', e => console.warn('Peer error:', e));
  },

  send(msg){
    for(const c of peerConns) if(c.open) try{ c.send(msg); }catch(e){}
  },

  stop(){
    if(netSyncTimer){ clearInterval(netSyncTimer); netSyncTimer = null; }
    if(peerInstance){ try{ peerInstance.destroy(); }catch(e){} peerInstance = null; }
    peerConns = [];
    const scene = refs.scene;
    for(const rp of remotePlayers.values()){ if(scene) scene.remove(rp.mesh); }
    remotePlayers.clear();
    const el = $('#netLabel'); if(el) el.textContent = '';
  }
};

export function startNetSync(){
  if(netSyncTimer) clearInterval(netSyncTimer);
  netSyncTimer = setInterval(()=>{
    if(!Net.active || G.state !== 'playing') return;
    Net.send({
      t:'state', id: peerMyId, skin: G.playerSkin,
      p: [playerPos.x, playerPos.y, playerPos.z],
      y: playerLook.yaw
    });
  }, 66);
}

function _setupConn(conn){
  conn.on('data', data => _handleNetMsg(data, conn));
  conn.on('close', ()=>{
    addKillFeed('PLAYER LEFT', 0, '#888');
    const scene = refs.scene;
    for(const [id, rp] of remotePlayers){
      if(id === conn.peer){ if(scene) scene.remove(rp.mesh); remotePlayers.delete(id); }
    }
    peerConns = peerConns.filter(c => c !== conn);
  });
}

function _handleNetMsg(d, from){
  if(!d || !d.t) return;
  if(peerIsHost){
    for(const c of peerConns) if(c !== from && c.open) try{ c.send(d); }catch(e){}
  }
  switch(d.t){
    case 'state': {
      let rp = remotePlayers.get(d.id);
      if(!rp){
        const mesh = buildRemotePlayer(d.skin || 'default');
        if(refs.scene) refs.scene.add(mesh);
        rp = { mesh, hitMesh: mesh.children[0], id: d.id, skin: d.skin || 'default', lastUpdate: nowMs() };
        remotePlayers.set(d.id, rp);
      }
      rp.mesh.position.set(d.p[0], d.p[1], d.p[2]);
      rp.mesh.rotation.y = d.y || 0;
      rp.lastUpdate = nowMs();
      break;
    }
    case 'shot': {
      const from3 = new THREE.Vector3(d.from[0], d.from[1], d.from[2]);
      const dir = new THREE.Vector3(d.to[0], d.to[1], d.to[2]).normalize();
      spawnTracer(from3, from3.clone().addScaledVector(dir, 60));
      Audio.shot(d.w || 'rifle', 0.35);
      break;
    }
  }
}