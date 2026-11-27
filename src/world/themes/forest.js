// Thème "Forêt" : sapins, gros rochers, rangées d'arbres avec un passage.
import { ground, instances, scatter, wallWithGap, borders } from '../obstacles.js';

const GREENS = [0x2f7d32, 0x388e3c, 0x43a047, 0x1b5e20, 0x558b2f];

export default {
  name: 'forest',
  label: 'Forêt',
  sky: 0xbfe3f2,
  fog: { near: 60, far: 380 },
  light: { sky: 0xeaf6ff, ground: 0x4a6b3a, sun: 0xfff2d6 },

  createAssets(THREE) {
    const trunk = new THREE.CylinderGeometry(0.35, 0.5, 3, 6).translate(0, 1.5, 0);
    const crown = new THREE.ConeGeometry(2.4, 7.5, 7).translate(0, 5.75, 0);
    const rock = new THREE.DodecahedronGeometry(2.2, 0);
    return {
      trunk, crown, rock,
      groundMat: new THREE.MeshLambertMaterial({ color: 0x7cb342 }),
      trunkMat: new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true }),
      crownMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      rockMat: new THREE.MeshLambertMaterial({ color: 0x8d8d86, flatShading: true }),
    };
  },

  populateChunk(ctx) {
    const { rng, difficulty: d, assets: a } = ctx;
    const green = () => GREENS[rng.int(0, GREENS.length - 1)];
    ground(ctx, a.groundMat);

    const trees = borders(ctx, 26, 1, 60).map((p) => ({ ...p, sx: rng.range(1, 1.8), color: green() }));
    const rocks = [];

    if (!ctx.calm) {
      // Sapins isolés
      for (const p of scatter(ctx, Math.round(4 + d * 14 + rng.range(0, 3)), 2)) {
        const s = rng.range(0.8, 1.4);
        trees.push({ ...p, sx: s, sy: s * rng.range(0.9, 1.25), color: green() });
        ctx.addCollider(p.x, p.z, 1.25 * s);
      }
      // Rangée d'arbres en travers, avec un seul passage
      if (rng.chance(0.25 + d * 0.35)) {
        const z = -rng.range(15, ctx.length - 15);
        for (const x of wallWithGap(ctx, z, 3.2)) {
          trees.push({ x, z, sx: 1.1, color: green() });
          ctx.addCollider(x, z, 1.4);
        }
      }
      // Gros rochers
      for (const p of scatter(ctx, Math.round(rng.range(0, 1 + d * 4)), 3)) {
        const s = rng.range(0.9, 1.4);
        rocks.push({ ...p, y: 1, sx: s, sy: s * 1.5 });
        ctx.addCollider(p.x, p.z, 2 * s);
      }
    }

    instances(ctx, a.trunk, a.trunkMat, trees.map(({ color, ...t }) => t));
    instances(ctx, a.crown, a.crownMat, trees);
    instances(ctx, a.rock, a.rockMat, rocks);
  },
};
