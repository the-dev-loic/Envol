// Thème "Canyon" : mesas géantes, piliers de roche, arches à franchir, rochers qui roulent.
import { scatter, mover, laneX, laneInTile } from '../obstacles.js';
import { CONFIG } from '../../config.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';

const ROCKS = [0xc1693c, 0xb35a30, 0xd27d4a, 0xa94f2a];

export default {
  name: 'canyon',
  label: 'Canyon',
  sky: 0xf3c99a,
  fog: { near: 50, far: 340 },
  light: { sky: 0xfff0dc, ground: 0x9a5a34, sun: 0xffd2a0 },

  createAssets(THREE) {
    return {
      groundMat: groundMaterial(THREE, {
        base: 0xd69a62, blotches: [0xc4844e, 0xe2b07a, 0xb9703f, 0xd8a46c], specks: [0x9e5f33, 0xf0c792, 0xb87a48], cracks: 28,
      }, 23),
      mat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      boulder: new THREE.IcosahedronGeometry(1.8, 0),
      boulderMat: new THREE.MeshLambertMaterial({ color: 0x8a4b2a, flatShading: true }),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const rock = () => ROCKS[rng.int(0, ROCKS.length - 1)];
    const pillar = (x, z, s, sy = 1) => {
      parts.push({ geometry: new THREE.CylinderGeometry(1.5 * s, 2.2 * s, 14 * sy, 7).translate(x, 7 * sy, z), color: rock(), shade: rng.range(0.9, 1.05) });
      ctx.addCollider(x, z, 1.9 * s);
    };

    // Mesas géantes
    for (const p of scatter(ctx, rng.int(1, 2), 12)) {
      const s = rng.range(0.7, 1), h = rng.range(18, 40);
      parts.push({ geometry: new THREE.CylinderGeometry(9 * s, 12 * s, h, 6).translate(p.x, h / 2, p.z), color: rock() });
      parts.push({ geometry: new THREE.CylinderGeometry(9.3 * s, 9 * s, 1.2, 6).translate(p.x, h, p.z), color: 0xa94f2a });
      ctx.addCollider(p.x, p.z, 11 * s);
    }
    // Piliers
    for (const p of scatter(ctx, Math.round(8 + d * 16 + rng.range(0, 3)), 2.4)) pillar(p.x, p.z, rng.range(0.8, 1.3), rng.range(0.8, 1.3));

    if (!ctx.calm) {
      // Arche au-dessus du chemin : passer entre les deux piliers
      const z = -rng.range(12, ctx.length - 12);
      if (rng.chance(0.45) && laneInTile(ctx, z, 10)) {
        const cx = laneX(ctx, z);
        const half = CONFIG.safeLane.halfWidthEasy + 2.4 - d * 0.8;
        pillar(cx - half, z, 1); pillar(cx + half, z, 1);
        parts.push({ geometry: new THREE.BoxGeometry(half * 2 + 3, 2.2, 3).translate(cx, 9, z), color: rock() });
      }
      // Rochers qui roulent autour du chemin
      const zb = -rng.range(10, ctx.length - 10);
      if (d > 0.1 && rng.chance(0.3 + d * 0.5) && laneInTile(ctx, zb)) {
        const ball = new THREE.Mesh(a.boulder, a.boulderMat);
        ball.position.y = 1.8;
        mover(ctx, ball, { x: laneX(ctx, zb) + rng.range(-8, 8), z: zb, r: 1.7, amplitude: rng.range(8, 15), speed: rng.range(0.8, 1.4 + d) });
      }
    }

    sowDetails(ctx, parts, 90, [
      (x, z) => detail.pebble(THREE, rng, x, z, 0xa8693e),
      (x, z) => detail.pebble(THREE, rng, x, z, 0x8a5636),
      (x, z) => detail.cactus(THREE, rng, x, z),
      (x, z) => detail.bush(THREE, rng, x, z, 0x9a7b4f),
    ]);
    ctx.merge(parts, a.mat);
  },
};
