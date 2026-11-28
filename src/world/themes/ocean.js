// Thème "Océan" (style enfantin) : on survole la mer.
// Îles de sable à palmiers, rochers dans l'eau, phares rayés, bateau pirate, voiliers qui naviguent,
// arches rocheuses à traverser, rangées de pilotis avec un passage, mouettes, baleines et dauphins.
import { scatter, wallWithGap, mover, laneX, laneInTile } from '../obstacles.js';
import { mergeColored } from '../merge.js';
import { groundMaterial, sowDetails } from '../ground.js';
import { toonColors } from '../style.js';
import { flockGeometries, makeFlock } from '../cute.js';
import { CONFIG } from '../../config.js';

const SAILS = [0xffffff, 0xff6fae, 0xffd23f, 0x5ec8ff, 0xff8c42];
const ROCK = [0xb9b4d6, 0xa9a3cc, 0xc7c2e0];

export default {
  name: 'ocean',
  label: 'Océan',
  icon: '🌊',
  sky: 0x7fd8ff,
  fog: { near: 80, far: 420 },
  light: { sky: 0xffffff, ground: 0x6fc7ff, sun: 0xfff6dc },

  createAssets(THREE) {
    const groundMat = groundMaterial(THREE, {
      base: 0x3fb8ff, blotches: [0x2fa6f0, 0x5cc8ff, 0x27a0e8, 0x6fd3ff], specks: [0xffffff, 0xbfeaff, 0x8fdcff],
      blades: true, speckCount: 3500, speckSize: 2.6,
    }, 61);
    const flatMat = toonColors();
    // Voilier (une seule géométrie, réutilisée par tous les voiliers ; la voile est colorée par bateau)
    const boat = (sail) => mergeColored(THREE, [
      { geometry: new THREE.CapsuleGeometry(1, 3.6, 4, 10).rotateX(Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.5, 0), color: 0xffffff },
      { geometry: new THREE.BoxGeometry(1.9, 0.25, 4.6).translate(0, 0.95, 0), color: 0xc98a5a },
      { geometry: new THREE.CylinderGeometry(0.12, 0.12, 7, 6).translate(0, 4.4, 0), color: 0x8d6e63 },
      { geometry: new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 6), new THREE.Vector2(3, 0)]), { depth: 0.08, bevelEnabled: false }).rotateY(Math.PI / 2).translate(0, 1.4, 0.2), color: sail },
      { geometry: new THREE.BoxGeometry(0.05, 0.6, 1).translate(0, 7.9, -0.5), color: 0xff4d6d },
    ]);
    return {
      groundMat,
      flatMat,
      boats: SAILS.map(boat),
      gulls: flockGeometries(THREE, mergeColored, { body: 0xffffff, wing: 0x5b6b8f, belly: 0xffffff, beak: 0xff9f1c }),
    };
  },

  /** Les vagues bougent : on fait glisser la texture de la mer. */
  animate(assets, time) {
    const map = assets.groundMat.map;
    map.offset.set(Math.sin(time * 0.15) * 0.08, time * 0.02);
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a, length: L } = ctx;
    const parts = [];
    const add = (geometry, color, shade) => parts.push({ geometry, color, shade });
    const pick = (arr) => arr[rng.int(0, arr.length - 1)];

    /** Palmier penché avec noix de coco. */
    const palm = (x, z, s) => {
      const lean = rng.range(-0.35, 0.35), rot = rng.range(0, Math.PI * 2);
      let px = x, py = 0;
      for (let i = 0; i < 5; i++) { // tronc en anneaux
        const seg = new THREE.CylinderGeometry(0.28 * s, 0.34 * s, 1.25 * s, 7).rotateZ(lean * (i / 5)).translate(px, py + 0.62 * s, z);
        add(seg, i % 2 ? 0xc98a5a : 0xb57a4c);
        px += -Math.sin(lean * (i / 5)) * 1.2 * s; py += 1.18 * s;
      }
      for (let k = 0; k < 6; k++) { // feuilles
        const ang = (k / 6) * Math.PI * 2 + rot;
        add(new THREE.SphereGeometry(1, 8, 4).scale(2.3 * s, 0.18 * s, 0.6 * s).rotateZ(-0.45).rotateY(ang).translate(px + Math.cos(ang) * 1.5 * s, py - 0.25 * s, z - Math.sin(ang) * 1.5 * s), k % 2 ? 0x3fc15c : 0x5ad35a);
      }
      for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.25 * s, 7, 5).translate(px + Math.cos(k * 2.1) * 0.35 * s, py - 0.35 * s, z + Math.sin(k * 2.1) * 0.35 * s), 0x7a4b2a);
      ctx.addCollider(x, z, 1.1 * s);
      ctx.addCollider(px, z, 1.6 * s); // couronne de feuilles
    };

    // Îles de sable à palmiers
    for (const p of scatter(ctx, Math.round(rng.range(1, 2.5)), 11)) { // rayon large : les palmiers restent hors du chemin
      const r = rng.range(6, 10);
      add(new THREE.CylinderGeometry(r, r + 1.2, 0.8, 18).translate(p.x, 0.2, p.z), 0xffe0a3);
      add(new THREE.CylinderGeometry(r + 1.2, r + 2.2, 0.3, 18).translate(p.x, 0.05, p.z), 0x9ee7ff); // eau claire autour
      for (let k = rng.int(1, 3); k > 0; k--) {
        const a2 = rng.range(0, 6.3), rr = rng.range(0, r - 2);
        palm(p.x + Math.cos(a2) * rr, p.z + Math.sin(a2) * rr, rng.range(0.9, 1.25));
      }
      if (rng.chance(0.4)) add(new THREE.BoxGeometry(1.2, 0.8, 0.8).translate(p.x + 1, 1, p.z - 1), 0xa0522d); // coffre au trésor
    }
    // Rochers dans l'eau
    for (const p of scatter(ctx, Math.round(rng.range(3, 5 + d * 7)), 2.6)) {
      const r = rng.range(1.8, 2.8), h = rng.range(1.6, 2.6);
      add(new THREE.IcosahedronGeometry(r, 1).scale(1, h, 1).translate(p.x, r * h * 0.45, p.z), pick(ROCK), rng.range(0.95, 1.05));
      add(new THREE.SphereGeometry(r * 0.55, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(p.x, r * h * 0.85, p.z), 0xffffff); // neige… de mouettes 🙂
      add(new THREE.CylinderGeometry(r * 1.25, r * 1.4, 0.15, 14).translate(p.x, 0.08, p.z), 0xe6f8ff); // écume
      ctx.addCollider(p.x, p.z, r * 1.05);
    }
    // Phares rayés
    for (const p of scatter(ctx, rng.chance(0.3) ? 1 : 0, 3)) {
      add(new THREE.CylinderGeometry(3, 3.4, 1.5, 14).translate(p.x, 0.5, p.z), 0xa9a3cc);
      for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(1.7 - i * 0.12, 1.82 - i * 0.12, 2.2, 14).translate(p.x, 2.3 + i * 2.2, p.z), i % 2 ? 0xffffff : 0xff4d5e);
      add(new THREE.CylinderGeometry(1.3, 1.3, 1.6, 12).translate(p.x, 13.6, p.z), 0xfff3a0);
      add(new THREE.ConeGeometry(1.6, 1.6, 12).translate(p.x, 15.2, p.z), 0xff4d5e);
      ctx.addCollider(p.x, p.z, 2.2);
    }
    // Bateau pirate (loin du chemin)
    for (const p of scatter(ctx, rng.chance(0.25) ? 1 : 0, 8)) {
      add(new THREE.CapsuleGeometry(2.6, 9, 4, 12).rotateX(Math.PI / 2).scale(1, 0.6, 1).translate(p.x, 1.4, p.z), 0x8a5a3b);
      add(new THREE.BoxGeometry(4.6, 0.4, 11).translate(p.x, 2.9, p.z), 0xb07a4f);
      add(new THREE.BoxGeometry(4.2, 2.2, 3).translate(p.x, 4, p.z - 4.2), 0x8a5a3b);
      for (const [mz, h] of [[-1.5, 12], [3, 10]]) {
        add(new THREE.CylinderGeometry(0.2, 0.25, h, 6).translate(p.x, 3 + h / 2, p.z + mz), 0x5d4037);
        add(new THREE.BoxGeometry(5, h * 0.45, 0.15).translate(p.x, 3 + h * 0.55, p.z + mz), 0x2b2d42);
        add(new THREE.SphereGeometry(0.6, 8, 6).translate(p.x, 3 + h * 0.6, p.z + mz + 0.1), 0xffffff); // tête de mort (simplifiée)
      }
      add(new THREE.BoxGeometry(0.05, 1, 1.6).translate(p.x, 15.3, p.z - 1.5 - 0.8), 0x2b2d42); // drapeau
      for (const dz of [-4, 0, 4]) ctx.addCollider(p.x, p.z + dz, 2.8);
    }

    if (!ctx.calm) {
      // Arche rocheuse au-dessus du chemin
      const z = -rng.range(12, L - 12);
      if (rng.chance(0.4) && laneInTile(ctx, z, 10)) {
        const cx = laneX(ctx, z), half = CONFIG.safeLane.halfWidthEasy + 2.6 - d * 0.8;
        for (const s of [-1, 1]) {
          add(new THREE.CapsuleGeometry(1.8, 7, 4, 10).translate(cx + s * half, 4.5, z), pick(ROCK));
          ctx.addCollider(cx + s * half, z, 1.9);
        }
        add(new THREE.CapsuleGeometry(1.5, half * 2 + 1, 4, 12).rotateZ(Math.PI / 2).translate(cx, 9.5, z), pick(ROCK));
        add(new THREE.SphereGeometry(1.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(2, 1, 1).translate(cx, 10.8, z), 0x5ad35a); // herbe sur l'arche
      }
      // Rangée de pilotis avec un passage
      const zw = -rng.range(15, L - 15);
      if (rng.chance(0.25 + d * 0.3) && laneInTile(ctx, zw)) {
        for (const x of wallWithGap(ctx, zw, 2.6)) {
          add(new THREE.CylinderGeometry(0.55, 0.65, 7, 8).translate(x, 3.5, zw), 0xa0724a);
          add(new THREE.CylinderGeometry(0.62, 0.62, 0.4, 8).translate(x, 6.9, zw), 0x8a5a3b);
          ctx.addCollider(x, zw, 0.95);
        }
      }
      // Voilier qui navigue en travers du chemin
      const zb = -rng.range(10, L - 10);
      if (d > 0.05 && rng.chance(0.25 + d * 0.4) && laneInTile(ctx, zb)) {
        const boat = new THREE.Mesh(pick(a.boats), a.flatMat);
        mover(ctx, boat, { x: laneX(ctx, zb) + rng.range(-8, 8), z: zb, r: 2.2, amplitude: rng.range(8, 14), speed: rng.range(0.6, 1.1 + d * 0.6) });
      }
      // Mouettes
      const zg = -rng.range(8, L - 8);
      if (d > 0.15 && rng.chance(0.2 + d * 0.35) && laneInTile(ctx, zg)) {
        const gulls = makeFlock(THREE, a.gulls, a.flatMat);
        gulls.position.y = 3.2;
        mover(ctx, gulls, { x: laneX(ctx, zg) + rng.range(-8, 8), z: zg, r: 2.8, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    }

    // Décor (bas : on passe au-dessus) : écume, bouées, baleines, dauphins
    sowDetails(ctx, parts, 40, [
      (x, z) => [{ geometry: new THREE.SphereGeometry(rng.range(0.6, 1.4), 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 0.15, 1).translate(x, 0, z), color: 0xffffff }],
      (x, z) => [{ geometry: new THREE.SphereGeometry(rng.range(0.6, 1.4), 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 0.15, 1).translate(x, 0, z), color: 0xdff6ff }],
      (x, z) => [
        { geometry: new THREE.CylinderGeometry(0.35, 0.5, 1.1, 8).translate(x, 0.55, z), color: 0xff4d5e },
        { geometry: new THREE.CylinderGeometry(0.36, 0.36, 0.25, 8).translate(x, 0.6, z), color: 0xffffff },
      ],
    ]);
    for (let i = rng.int(0, 1); i > 0; i--) { // baleine
      const x = rng.range(-ctx.width / 2, ctx.width / 2), z = -rng.range(5, L - 5);
      if (!ctx.isClear(x, z, 4)) continue;
      add(new THREE.SphereGeometry(2.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 0.55, 1).translate(x, 0, z), 0x4f6bd8);
      add(new THREE.ConeGeometry(0.9, 1.4, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.3).translate(x - 5.6, 0.6, z), 0x4f6bd8);
      add(new THREE.SphereGeometry(0.18, 6, 4).translate(x + 3.4, 0.85, z + 0.9), 0x222233);
      add(new THREE.ConeGeometry(0.5, 1.6, 8).rotateX(Math.PI).translate(x + 1.5, 2.2, z), 0xe8f8ff); // jet d'eau
    }
    for (let i = rng.int(0, 2); i > 0; i--) { // dauphin qui saute
      const x = rng.range(-ctx.width / 2, ctx.width / 2), z = -rng.range(5, L - 5);
      add(new THREE.CapsuleGeometry(0.35, 1.6, 4, 8).rotateZ(Math.PI / 2 - 0.6).translate(x, 1.1, z), 0x6fa3ff);
      add(new THREE.ConeGeometry(0.2, 0.5, 4).translate(x - 0.1, 1.75, z), 0x6fa3ff);
    }
    ctx.merge(parts, a.flatMat);
  },
};
