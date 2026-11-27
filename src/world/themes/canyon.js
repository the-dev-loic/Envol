// Thème "Canyon" : piliers de roche, arches à franchir, rochers qui roulent.
import { ground, instances, scatter, borders, mover, safeX } from '../obstacles.js';
import { CONFIG } from '../../config.js';

const ROCKS = [0xc1693c, 0xb35a30, 0xd27d4a, 0xa94f2a];

export default {
  name: 'canyon',
  label: 'Canyon',
  sky: 0xf3c99a,
  fog: { near: 50, far: 340 },
  light: { sky: 0xfff0dc, ground: 0x9a5a34, sun: 0xffd2a0 },

  createAssets(THREE) {
    return {
      pillar: new THREE.CylinderGeometry(1.5, 2.2, 14, 7).translate(0, 7, 0),
      mesa: new THREE.CylinderGeometry(9, 12, 34, 6).translate(0, 17, 0),
      lintel: new THREE.BoxGeometry(1, 2.2, 3).translate(0, 9, 0),
      boulder: new THREE.IcosahedronGeometry(1.8, 0),
      groundMat: new THREE.MeshLambertMaterial({ color: 0xd99a5f }),
      rockMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      boulderMat: new THREE.MeshLambertMaterial({ color: 0x8a4b2a, flatShading: true }),
    };
  },

  populateChunk(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const rock = () => ROCKS[rng.int(0, ROCKS.length - 1)];
    ground(ctx, a.groundMat);

    const mesas = borders(ctx, 10, 6, 70).map((p) => ({ ...p, sx: rng.range(0.6, 1.3), sy: rng.range(0.5, 1.4), color: rock() }));
    const pillars = [];
    const lintels = [];

    if (!ctx.calm) {
      // Piliers
      for (const p of scatter(ctx, Math.round(4 + d * 12 + rng.range(0, 2)), 2.2)) {
        const s = rng.range(0.8, 1.3);
        pillars.push({ ...p, sx: s, sy: rng.range(0.8, 1.3), color: rock() });
        ctx.addCollider(p.x, p.z, 1.9 * s);
      }
      // Arche au-dessus du couloir sûr : passer entre les deux piliers
      if (rng.chance(0.45)) {
        const z = -rng.range(12, ctx.length - 12);
        const cx = safeX(ctx.distanceAt(z));
        const half = CONFIG.safeLane.halfWidthEasy + 2.4 - d * 0.8;
        for (const x of [cx - half, cx + half]) {
          pillars.push({ x, z, sx: 1, rotY: 0, color: rock() });
          ctx.addCollider(x, z, 1.9);
        }
        lintels.push({ x: cx, z, sx: half * 2 + 3, sy: 1, sz: 1, rotY: 0, color: rock() });
      }
      // Rochers qui roulent de gauche à droite
      if (d > 0.1 && rng.chance(0.3 + d * 0.5)) {
        const z = -rng.range(10, ctx.length - 10);
        const ball = new THREE.Mesh(a.boulder, a.boulderMat);
        ball.position.y = 1.8;
        mover(ctx, ball, { x: rng.range(-10, 10), z, r: 1.7, amplitude: rng.range(8, 15), speed: rng.range(0.8, 1.4 + d) });
      }
    }

    instances(ctx, a.mesa, a.rockMat, mesas);
    instances(ctx, a.pillar, a.rockMat, pillars);
    instances(ctx, a.lintel, a.rockMat, lintels);
  },
};
