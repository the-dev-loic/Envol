// Thème "Neige" : sapins enneigés, pics de glace en rangées, boules de neige mobiles.
import { ground, instances, scatter, wallWithGap, borders, mover } from '../obstacles.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';
import { mergeColored } from '../merge.js';

const PINES = [0x1f4d3a, 0x24543f, 0x2c5e47];

export default {
  name: 'snow',
  label: 'Montagnes enneigées',
  sky: 0xdce8f2,
  precipitation: 'snow',
  fog: { near: 40, far: 300 },
  light: { sky: 0xffffff, ground: 0x9fb4c8, sun: 0xf0f6ff },

  createAssets(THREE) {
    return {
      trunk: new THREE.CylinderGeometry(0.3, 0.45, 2.4, 6).translate(0, 1.2, 0),
      crown: new THREE.ConeGeometry(2.1, 7, 7).translate(0, 5.5, 0),
      cap: new THREE.ConeGeometry(1.05, 2.4, 7).translate(0, 8.05, 0),
      spike: new THREE.ConeGeometry(1, 9, 5).translate(0, 4.5, 0),
      mountain: new THREE.ConeGeometry(28, 70, 6).translate(0, 35, 0),
      ball: new THREE.IcosahedronGeometry(1.6, 1),
      groundMat: groundMaterial(THREE, {
        base: 0xeef3f8, blotches: [0xdfe8f1, 0xffffff, 0xd3deea, 0xe8eef6], specks: [0xc8d6e6, 0xffffff, 0xb9cadc], speckCount: 3000,
      }, 37),
      detailMat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      trunkMat: new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
      crownMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      snowMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      iceMat: new THREE.MeshLambertMaterial({ color: 0x9fd8f0, flatShading: true }),
      mountainMat: new THREE.MeshLambertMaterial({ color: 0xe9f0f6, flatShading: true }),
    };
  },

  populateChunk(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const pine = () => PINES[rng.int(0, PINES.length - 1)];
    ground(ctx, a.groundMat);

    const mountains = borders(ctx, 6, 20, 90).map((p) => ({ ...p, sx: rng.range(0.6, 1.2), sy: rng.range(0.6, 1.3) }));
    const trees = borders(ctx, 18, 1, 25).map((p) => ({ ...p, sx: rng.range(1, 1.6), color: pine() }));
    const spikes = [];

    if (!ctx.calm) {
      for (const p of scatter(ctx, Math.round(3 + d * 11 + rng.range(0, 3)), 2)) {
        const s = rng.range(0.8, 1.3);
        trees.push({ ...p, sx: s, color: pine() });
        ctx.addCollider(p.x, p.z, 1.15 * s);
      }
      // Rangée de pics de glace avec un passage
      if (rng.chance(0.3 + d * 0.3)) {
        const z = -rng.range(15, ctx.length - 15);
        for (const x of wallWithGap(ctx, z, 2.4)) {
          spikes.push({ x, z, sx: 1, sy: rng.range(0.8, 1.2) });
          ctx.addCollider(x, z, 1.05);
        }
      }
      // Pics isolés
      for (const p of scatter(ctx, Math.round(rng.range(0, 2 + d * 4)), 1.2)) {
        spikes.push({ ...p, sx: rng.range(0.8, 1.2), sy: rng.range(0.7, 1.3) });
        ctx.addCollider(p.x, p.z, 1);
      }
      // Boules de neige qui glissent
      const balls = d > 0.15 ? rng.int(0, 1 + Math.round(d)) : 0;
      for (let i = 0; i < balls; i++) {
        const ball = new THREE.Mesh(a.ball, a.snowMat);
        ball.position.y = 1.6;
        mover(ctx, ball, { x: rng.range(-12, 12), z: -rng.range(8, ctx.length - 8), r: 1.5, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    }

    instances(ctx, a.mountain, a.mountainMat, mountains);
    instances(ctx, a.trunk, a.trunkMat, trees.map(({ color, ...t }) => t));
    instances(ctx, a.crown, a.crownMat, trees);
    instances(ctx, a.cap, a.snowMat, trees.map(({ color, ...t }) => t));
    instances(ctx, a.spike, a.iceMat, spikes);

    // Détails au sol (fusionnés : 1 seul appel de rendu)
    const det = [];
    const { THREE: T } = ctx;
    sowDetails(ctx, det, 60, [
      (x, z) => detail.mound(T, rng, x, z),
      (x, z) => detail.mound(T, rng, x, z),
      (x, z) => detail.pebble(T, rng, x, z, 0x6d7680),
      (x, z) => detail.bush(T, rng, x, z, 0x2c5e47),
    ]);
    const detMesh = new T.Mesh(mergeColored(T, det), a.detailMat);
    ctx.group.add(detMesh);
    ctx.track(detMesh.geometry);

  },
};
