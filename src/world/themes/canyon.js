// Thème "Canyon bonbon" (style enfantin) : mesas à rayures, piliers ronds rayés,
// cactus géants à fleur rose, arches à franchir, rochers qui roulent.
import { scatter, mover, laneX, laneInTile } from '../obstacles.js';
import { CONFIG } from '../../config.js';
import { groundMaterial, sowDetails } from '../ground.js';
import { toon, toonColors } from '../style.js';
import { cactus, roundRock, bigFlower } from '../cute.js';

const ROCKS = [0xff9f6b, 0xff8a7a, 0xffb36b, 0xf7a6a0];
const STRIPES = [0xffd9a8, 0xffffff, 0xffc4c4];

export default {
  name: 'canyon',
  label: 'Canyon',
  icon: '🌵',
  sky: 0xffd7a8,
  fog: { near: 60, far: 340 },
  light: { sky: 0xfff4e6, ground: 0xe0906a, sun: 0xffe2bf },

  createAssets(THREE) {
    return {
      groundMat: groundMaterial(THREE, {
        base: 0xffc58f, blotches: [0xffb87a, 0xffd3a3, 0xf5a87c, 0xffcf9a], specks: [0xe8946a, 0xfff0d6, 0xd98563], cracks: 12,
      }, 23),
      mat: toonColors(),
      boulder: new THREE.IcosahedronGeometry(1.8, 1),
      boulderMat: toon({ color: 0xd9734e }),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const pick = (arr) => arr[rng.int(0, arr.length - 1)];
    /** Colonne arrondie à rayures. */
    const column = (x, z, rBot, rTop, h, segs = 10) => {
      const base = pick(ROCKS), stripe = pick(STRIPES);
      const bands = 4;
      for (let i = 0; i < bands; i++) {
        const y0 = (h / bands) * i, y1 = (h / bands) * (i + 1);
        const r0 = rBot + (rTop - rBot) * (i / bands), r1 = rBot + (rTop - rBot) * ((i + 1) / bands);
        parts.push({ geometry: new THREE.CylinderGeometry(r1, r0, y1 - y0, segs).translate(x, (y0 + y1) / 2, z), color: i % 2 ? stripe : base, shade: i % 2 ? 0.95 : 1 });
      }
      parts.push({ geometry: new THREE.SphereGeometry(rTop, segs, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1).translate(x, h, z), color: base });
    };

    // Mesas géantes
    for (const p of scatter(ctx, rng.int(1, 2), 12)) {
      const s = rng.range(0.7, 1);
      column(p.x, p.z, 12 * s, 9.5 * s, rng.range(16, 32), 14);
      ctx.addCollider(p.x, p.z, 11.3 * s);
    }
    // Piliers rayés
    for (const p of scatter(ctx, Math.round(6 + d * 12 + rng.range(0, 3)), 2.4)) {
      const s = rng.range(0.85, 1.3);
      column(p.x, p.z, 2.1 * s, 1.5 * s, rng.range(9, 15) * s);
      ctx.addCollider(p.x, p.z, 1.9 * s);
    }
    // Cactus géants
    for (const p of scatter(ctx, Math.round(rng.range(2, 4 + d * 4)), 2.2)) {
      const s = rng.range(1, 1.4);
      parts.push(...cactus(THREE, rng, p.x, p.z, s));
      ctx.addCollider(p.x, p.z, 1.2 * s);
      ctx.addCollider(p.x - 1.7 * s, p.z, 0.6 * s); ctx.addCollider(p.x + 1.7 * s, p.z, 0.6 * s);
    }

    if (!ctx.calm) {
      // Arche au-dessus du chemin
      const z = -rng.range(12, ctx.length - 12);
      if (rng.chance(0.45) && laneInTile(ctx, z, 10)) {
        const cx = laneX(ctx, z);
        const half = CONFIG.safeLane.halfWidthEasy + 2.4 - d * 0.8;
        for (const s of [-1, 1]) { column(cx + s * half, z, 1.9, 1.6, 9); ctx.addCollider(cx + s * half, z, 1.9); }
        parts.push({ geometry: new THREE.CapsuleGeometry(1.3, half * 2 + 1, 6, 14).rotateZ(Math.PI / 2).translate(cx, 9.6, z), color: pick(ROCKS) });
      }
      // Rochers qui roulent autour du chemin
      const zb = -rng.range(10, ctx.length - 10);
      if (d > 0.1 && rng.chance(0.3 + d * 0.5) && laneInTile(ctx, zb)) {
        const ball = new THREE.Mesh(a.boulder, a.boulderMat);
        ball.position.y = 1.8;
        mover(ctx, ball, { x: laneX(ctx, zb) + rng.range(-8, 8), z: zb, r: 1.7, amplitude: rng.range(8, 15), speed: rng.range(0.8, 1.4 + d) });
      }
    }

    sowDetails(ctx, parts, 60, [
      (x, z) => roundRock(THREE, rng, x, z, rng.range(0.25, 0.6), 0xe58f6a),
      (x, z) => roundRock(THREE, rng, x, z, rng.range(0.2, 0.4), 0xffb38a),
      (x, z) => cactus(THREE, rng, x, z, 0.3),
      (x, z) => bigFlower(THREE, rng, x, z, 0xff6fae, 0.35),
    ]);
    ctx.merge(parts, a.mat);
  },
};
