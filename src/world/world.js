// Monde infini découpé en tronçons ("chunks") le long de -Z.
// Les tronçons sont créés devant le joueur et détruits derrière lui.
// Le plan (stages.js) dit quel thème utiliser pour chaque tronçon ;
// le CONTENU d'un tronçon est délégué au thème (src/world/themes/*.js).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createRng, hash } from '../core/rng.js';
import { getTheme } from './themes/index.js';

export class World {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.seed = seed;
    this.chunks = new Map();   // index -> { group, colliders, movers, disposables }
    this.shift = 0;            // décalage cumulé d'origine (voir rebase)
    this.time = 0;
    this.assets = new Map();   // thème -> assets (créés à la 1re utilisation)
    const ground = new THREE.PlaneGeometry(260, CONFIG.world.chunkLength, 1, 1);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, 0, -CONFIG.world.chunkLength / 2);
    this.shared = { ground };

    // Ambiance commune, dont les couleurs glissent d'un thème à l'autre.
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sun.position.set(-40, 80, 30);
    scene.add(this.hemi, this.sun);
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0xffffff, 60, 380);
  }

  setPlan(plan) {
    this.plan = plan;
  }

  reset() {
    for (const i of [...this.chunks.keys()]) this.removeChunk(i);
    this.shift = 0;
    this.time = 0;
    this.updateAtmosphere(0, 1);
  }

  /** Index du tronçon à une position z locale. */
  indexAt(z) {
    return Math.floor((this.shift - z) / CONFIG.world.chunkLength);
  }

  stageAt(z) {
    return this.plan.stageAt(Math.max(0, this.indexAt(z)));
  }

  update(playerZ, dt) {
    const { chunksAhead, chunksBehind } = CONFIG.world;
    const cur = this.indexAt(playerZ);
    for (let i = cur - chunksBehind; i <= cur + chunksAhead; i++) {
      if (i >= 0 && !this.chunks.has(i)) this.createChunk(i);
    }
    for (const i of this.chunks.keys()) {
      if (i < cur - chunksBehind || i > cur + chunksAhead) this.removeChunk(i);
    }
    this.time += dt;
    this.updateMovers();
    this.updateAtmosphere(playerZ, Math.min(1, dt * 0.8));
  }

  updateMovers() {
    const lim = CONFIG.world.halfWidth - 1;
    for (const c of this.chunks.values()) {
      for (const m of c.movers) {
        const x = Math.max(-lim, Math.min(lim, m.x0 + Math.sin(this.time * m.speed + m.phase) * m.amplitude));
        m.object.position.x = x;
        m.collider.x = x;
      }
    }
  }

  updateAtmosphere(playerZ, t) {
    const theme = getTheme(this.stageAt(playerZ).theme);
    const s = this.scene;
    s.background.lerp(tmp.setHex(theme.sky), t);
    s.fog.color.copy(s.background);
    s.fog.near += (theme.fog.near - s.fog.near) * t;
    s.fog.far += (theme.fog.far - s.fog.far) * t;
    this.hemi.color.lerp(tmp.setHex(theme.light.sky), t);
    this.hemi.groundColor.lerp(tmp.setHex(theme.light.ground), t);
    this.sun.color.lerp(tmp.setHex(theme.light.sun), t);
  }

  assetsFor(theme) {
    if (!this.assets.has(theme.name)) this.assets.set(theme.name, theme.createAssets(THREE));
    return this.assets.get(theme.name);
  }

  createChunk(index) {
    const { chunkLength: L, halfWidth } = CONFIG.world;
    const stage = this.plan.stageAt(index);
    const theme = getTheme(stage.theme);
    const group = new THREE.Group();
    group.position.z = -index * L + this.shift;
    const chunk = { group, colliders: [], movers: [], disposables: [] };
    theme.populateChunk({
      THREE,
      group,
      index,
      length: L,
      halfWidth,
      rng: createRng(hash(this.seed, index)),
      difficulty: Math.min(1, index / CONFIG.difficulty.rampChunks),
      // Pas d'obstacle au départ ni sur le 1er tronçon d'une étape (respiration).
      calm: index < 2 || index === stage.startIndex,
      assets: this.assetsFor(theme),
      shared: this.shared,
      distanceAt: (z) => index * L - z,
      // x, z locaux au tronçon (z entre -L et 0), r = rayon
      addCollider: (x, z, r) => chunk.colliders.push({ x, z, r }),
      addMover: (m) => {
        m.collider = { x: m.x0, z: m.z, r: m.r };
        chunk.colliders.push(m.collider);
        chunk.movers.push(m);
      },
      track: (obj) => chunk.disposables.push(obj),
    });
    this.scene.add(group);
    this.chunks.set(index, chunk);
  }

  removeChunk(index) {
    const c = this.chunks.get(index);
    if (!c) return;
    this.scene.remove(c.group);
    for (const d of c.disposables) d.dispose?.();
    this.chunks.delete(index);
  }

  collides(x, z, r) {
    const cur = this.indexAt(z);
    for (const i of [cur - 1, cur, cur + 1]) {
      const c = this.chunks.get(i);
      if (!c) continue;
      const lz = z - c.group.position.z;
      for (const o of c.colliders) {
        const dx = x - o.x, dz = lz - o.z, rr = r + o.r;
        if (dx * dx + dz * dz < rr * rr) return true;
      }
    }
    return false;
  }

  /** Recentre tout vers l'origine pour garder la précision des flottants. */
  rebase(offset) {
    this.shift += offset;
    for (const c of this.chunks.values()) c.group.position.z += offset;
  }
}

const tmp = new THREE.Color();
