// Monde infini découpé en tronçons ("chunks") le long de -Z.
// Les tronçons sont créés devant le joueur et détruits derrière lui.
// Le CONTENU d'un tronçon est délégué au thème (src/world/themes/*.js).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createRng, hash } from '../core/rng.js';

export class World {
  constructor(scene, theme, seed = 1) {
    this.scene = scene;
    this.theme = theme;
    this.seed = seed;
    this.chunks = new Map();   // index -> { group, colliders, disposables }
    this.shift = 0;            // décalage cumulé d'origine (voir rebase)
    this.assets = theme.createAssets(THREE);
    this.applyAtmosphere();
  }

  applyAtmosphere() {
    const t = this.theme;
    this.scene.background = new THREE.Color(t.sky);
    this.scene.fog = new THREE.Fog(t.sky, t.fog.near, t.fog.far);
    for (const l of t.createLights(THREE)) this.scene.add(l);
  }

  reset() {
    for (const i of [...this.chunks.keys()]) this.removeChunk(i);
    this.shift = 0;
  }

  /** Index du tronçon à une position z locale. */
  indexAt(z) {
    return Math.floor((this.shift - z) / CONFIG.world.chunkLength);
  }

  update(playerZ) {
    const { chunksAhead, chunksBehind } = CONFIG.world;
    const cur = this.indexAt(playerZ);
    for (let i = cur - chunksBehind; i <= cur + chunksAhead; i++) {
      if (i >= 0 && !this.chunks.has(i)) this.createChunk(i);
    }
    for (const i of this.chunks.keys()) {
      if (i < cur - chunksBehind || i > cur + chunksAhead) this.removeChunk(i);
    }
  }

  createChunk(index) {
    const { chunkLength: L, halfWidth } = CONFIG.world;
    const group = new THREE.Group();
    group.position.z = -index * L + this.shift;
    const chunk = { group, colliders: [], disposables: [] };
    this.theme.populateChunk({
      THREE,
      group,
      index,
      length: L,
      halfWidth,
      rng: createRng(hash(this.seed, index)),
      difficulty: Math.min(1, index / 90),
      assets: this.assets,
      // x, z locaux au tronçon (z entre -L et 0), r = rayon
      addCollider: (x, z, r) => chunk.colliders.push({ x, z, r }),
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
