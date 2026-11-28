// Monde OUVERT et infini : une grille de cases (ix, iz) générées autour de l'oiseau.
//   - iz = rangée le long de la course (vers -Z), ix = colonne (gauche/droite, sans limite).
//   - Les cases sont créées devant / sur les côtés et détruites quand elles sont loin.
// Le plan (stages.js) dit quel thème utiliser pour chaque rangée ;
// le CONTENU d'une case est délégué au thème (src/world/themes/*.js).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createRng, hash } from '../core/rng.js';
import { getTheme } from './themes/index.js';
import { Sky } from './sky.js';
import { mergeColored } from './merge.js';
import { GROUND_WIDTH } from './ground.js';
import { setLaneSeed } from './obstacles.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.seed = 1;
    this.tiles = new Map();    // "ix,iz" -> { ix, iz, group, colliders, movers, spinners, disposables }
    this.rows = new Map();     // iz -> sol de la rangée (une grande bande qui suit l'oiseau en X)
    this.shift = 0;            // décalage cumulé d'origine (voir rebase)
    this.time = 0;
    this.assets = new Map();   // thème -> assets (créés à la 1re utilisation)
    const L = CONFIG.world.chunkLength;
    this.groundGeo = new THREE.PlaneGeometry(GROUND_WIDTH, L, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -L / 2);

    // Ambiance commune, dont les couleurs glissent d'un thème à l'autre.
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    scene.add(this.hemi, this.sun);
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0xffffff, 60, 380);
    // Ambiance "de base" du thème courant, puis ciel/heure/météo par-dessus (sky.js).
    this.base = {
      sky: new THREE.Color(), near: 60, far: 380, hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(), sunColor: new THREE.Color(), precipitation: 'rain',
    };
    this.sky = new Sky(scene, this.hemi, this.sun);
    this.speed = 0;
  }

  setCamera(camera) {
    this.sky.camera = camera;
  }

  setPlan(plan) {
    this.plan = plan;
  }

  /** Nouvelle partie : nouvelle graine → nouveau monde et nouveau tracé du chemin sûr. */
  reset(seed = this.seed) {
    this.seed = seed;
    setLaneSeed(seed);
    for (const k of [...this.tiles.keys()]) this.removeTile(k);
    for (const iz of [...this.rows.keys()]) this.removeRow(iz);
    this.shift = 0;
    this.time = 0;
    this.sky.reset();
    this.updateAtmosphere(0, 1, 0);
  }

  /** Rangée (iz) à une position z locale. */
  indexAt(z) {
    return Math.floor((this.shift - z) / CONFIG.world.chunkLength);
  }

  columnAt(x) {
    return Math.round(x / CONFIG.world.tileWidth);
  }

  stageAt(z) {
    return this.plan.stageAt(Math.max(0, this.indexAt(z)));
  }

  /** force = tout construire d'un coup (début de partie) ; sinon quelques cases par image. */
  update(playerX, playerZ, dt, speed = 0, force = false) {
    this.speed = speed;
    const { chunksAhead, chunksBehind, tilesSide, buildPerFrame } = CONFIG.world;
    const cz = this.indexAt(playerZ), cx = this.columnAt(playerX);

    // Cases à créer, les plus proches d'abord
    const todo = [];
    for (let iz = Math.max(0, cz - chunksBehind); iz <= cz + chunksAhead; iz++) {
      if (!this.rows.has(iz)) this.createRow(iz);
      for (let ix = cx - tilesSide; ix <= cx + tilesSide; ix++) {
        if (!this.tiles.has(`${ix},${iz}`)) todo.push([ix, iz, Math.abs(iz - cz) + Math.abs(ix - cx) * 1.5]);
      }
    }
    todo.sort((a, b) => a[2] - b[2]);
    for (const [ix, iz] of force ? todo : todo.slice(0, buildPerFrame)) this.createTile(ix, iz);

    for (const [k, t] of this.tiles) {
      if (t.iz < cz - chunksBehind || t.iz > cz + chunksAhead || Math.abs(t.ix - cx) > tilesSide + 1) this.removeTile(k);
    }
    for (const iz of this.rows.keys()) {
      if (iz < cz - chunksBehind || iz > cz + chunksAhead) this.removeRow(iz);
    }
    // Le sol suit l'oiseau en X, par pas égaux à la taille des motifs (le motif reste fixe au monde).
    const gx = Math.round(playerX / 60) * 60;
    for (const row of this.rows.values()) row.position.x = gx;

    this.time += dt;
    for (const [name, assets] of this.assets) getTheme(name).animate?.(assets, this.time); // ex. vagues
    this.updateMovers(dt);
    this.updateAtmosphere(playerZ, Math.min(1, dt * 0.8), dt);
  }

  updateMovers(dt) {
    for (const t of this.tiles.values()) {
      for (const sp of t.spinners) sp.object.rotation[sp.axis] += sp.speed * dt;
      for (const m of t.movers) {
        const x = m.x0 + Math.sin(this.time * m.speed + m.phase) * m.amplitude;
        m.object.position.x = x;
        m.collider.x = x;
        m.object.userData.animate?.(this.time); // ex. battement d'ailes
      }
    }
  }

  updateAtmosphere(playerZ, t, dt) {
    const theme = getTheme(this.stageAt(playerZ).theme);
    const b = this.base;
    b.sky.lerp(tmp.setHex(theme.sky), t);
    b.near += (theme.fog.near - b.near) * t;
    b.far += (theme.fog.far - b.far) * t;
    b.hemiSky.lerp(tmp.setHex(theme.light.sky), t);
    b.hemiGround.lerp(tmp.setHex(theme.light.ground), t);
    b.sunColor.lerp(tmp.setHex(theme.light.sun), t);
    b.precipitation = theme.precipitation ?? 'rain';
    this.sky.update(dt, b, this.speed);
  }

  assetsFor(theme) {
    if (!this.assets.has(theme.name)) this.assets.set(theme.name, theme.createAssets(THREE));
    return this.assets.get(theme.name);
  }

  createRow(iz) {
    const theme = getTheme(this.plan.stageAt(iz).theme);
    const mesh = new THREE.Mesh(this.groundGeo, this.assetsFor(theme).groundMat);
    mesh.position.z = -iz * CONFIG.world.chunkLength + this.shift;
    this.scene.add(mesh);
    this.rows.set(iz, mesh);
  }

  removeRow(iz) {
    this.scene.remove(this.rows.get(iz));
    this.rows.delete(iz);
  }

  createTile(ix, iz) {
    const { chunkLength: L, tileWidth: W, calmMargin } = CONFIG.world;
    const stage = this.plan.stageAt(iz);
    const theme = getTheme(stage.theme);
    const group = new THREE.Group();
    const offsetX = ix * W;
    group.position.set(offsetX, 0, -iz * L + this.shift);
    const tile = { ix, iz, group, colliders: [], movers: [], spinners: [], disposables: [] };
    const reserved = [];
    // Pas d'obstacle près du chemin au départ ni sur la 1re rangée d'une étape (respiration).
    const calm = iz < 2 || iz === stage.startIndex;
    const ctx = {
      THREE,
      group,
      index: iz,
      ix,
      width: W,
      length: L,
      offsetX,
      rng: createRng(hash(this.seed, ix, iz)),
      difficulty: Math.min(1, iz / CONFIG.difficulty.rampChunks),
      calm,
      laneMargin: calm ? calmMargin : 0,
      assets: this.assetsFor(theme),
      distanceAt: (z) => iz * L - z,
      // x, z locaux à la case (z entre -L et 0), r = rayon
      addCollider: (x, z, r) => tile.colliders.push({ x, z, r }),
      addMover: (m) => {
        m.collider = { x: m.x0, z: m.z, r: m.r };
        tile.colliders.push(m.collider);
        tile.movers.push(m);
      },
      // Objet décoratif qui tourne sur lui-même (ailes de moulin…) : axis 'x' | 'y' | 'z', vitesse en rad/s
      addSpinner: (object, speed, axis = 'z') => tile.spinners.push({ object, speed, axis }),
      // Zones réservées (grange…) que scatter() évite
      reserve: (x, z, r) => reserved.push({ x, z, r }),
      isClear: (x, z, r) => reserved.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + r),
      // Fusionne des pièces colorées en un seul objet (1 appel de rendu)
      merge: (parts, material) => {
        if (!parts.length) return null;
        const mesh = new THREE.Mesh(mergeColored(THREE, parts), material);
        group.add(mesh);
        tile.disposables.push(mesh.geometry);
        return mesh;
      },
      track: (obj) => tile.disposables.push(obj),
    };
    theme.populateTile(ctx);
    this.scene.add(group);
    this.tiles.set(`${ix},${iz}`, tile);
  }

  removeTile(key) {
    const t = this.tiles.get(key);
    if (!t) return;
    this.scene.remove(t.group);
    for (const d of t.disposables) d.dispose?.();
    this.tiles.delete(key);
  }

  collides(x, z, r) {
    const cz = this.indexAt(z), cx = this.columnAt(x);
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        const t = this.tiles.get(`${ix},${iz}`);
        if (!t) continue;
        const lx = x - t.group.position.x, lz = z - t.group.position.z;
        for (const o of t.colliders) {
          const dx = lx - o.x, dz = lz - o.z, rr = r + o.r;
          if (dx * dx + dz * dz < rr * rr) return true;
        }
      }
    }
    return false;
  }

  /** Recentre tout vers l'origine (en Z) pour garder la précision des flottants. */
  rebase(offset) {
    this.shift += offset;
    for (const t of this.tiles.values()) t.group.position.z += offset;
    for (const r of this.rows.values()) r.position.z += offset;
  }
}

const tmp = new THREE.Color();
