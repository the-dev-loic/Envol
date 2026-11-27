// Thème "Neige" : montagnes, sapins enneigés, pics de glace en rangées, boules de neige mobiles.
import { scatter, wallWithGap, mover, laneX, laneInTile } from '../obstacles.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';

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
      groundMat: groundMaterial(THREE, {
        base: 0xeef3f8, blotches: [0xdfe8f1, 0xffffff, 0xd3deea, 0xe8eef6], specks: [0xc8d6e6, 0xffffff, 0xb9cadc], speckCount: 3000,
      }, 37),
      mat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      ball: new THREE.IcosahedronGeometry(1.6, 1),
      ballMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const pine = (x, z, s) => {
      parts.push({ geometry: new THREE.CylinderGeometry(0.3 * s, 0.45 * s, 2.4 * s, 6).translate(x, 1.2 * s, z), color: 0x5d4037 });
      parts.push({ geometry: new THREE.ConeGeometry(2.1 * s, 7 * s, 7).translate(x, 5.5 * s, z), color: PINES[rng.int(0, 2)] });
      parts.push({ geometry: new THREE.ConeGeometry(1.05 * s, 2.4 * s, 7).translate(x, 8.05 * s, z), color: 0xffffff });
      ctx.addCollider(x, z, 1.15 * s);
    };
    const spike = (x, z, s, sy) => {
      parts.push({ geometry: new THREE.ConeGeometry(1 * s, 9 * sy, 5).translate(x, 4.5 * sy, z), color: 0x9fd8f0 });
      ctx.addCollider(x, z, 1.05 * s);
    };

    // Montagnes
    for (const p of scatter(ctx, rng.int(0, 1), 26)) {
      const r = rng.range(18, 26), h = rng.range(40, 70);
      parts.push({ geometry: new THREE.ConeGeometry(r, h, 6).translate(p.x, h / 2, p.z), color: 0xe9f0f6 });
      parts.push({ geometry: new THREE.ConeGeometry(r * 0.35, h * 0.35, 6).translate(p.x, h * 0.825 + 0.2, p.z), color: 0xffffff });
      ctx.addCollider(p.x, p.z, r * 0.9);
    }
    // Sapins enneigés
    for (const p of scatter(ctx, Math.round(12 + d * 20 + rng.range(0, 4)), 2)) pine(p.x, p.z, rng.range(0.8, 1.4));
    // Pics de glace isolés
    for (const p of scatter(ctx, Math.round(rng.range(1, 3 + d * 6)), 1.2)) spike(p.x, p.z, rng.range(0.8, 1.2), rng.range(0.7, 1.3));

    if (!ctx.calm) {
      // Rangée de pics de glace avec un passage
      const z = -rng.range(15, ctx.length - 15);
      if (rng.chance(0.3 + d * 0.3) && laneInTile(ctx, z)) {
        for (const x of wallWithGap(ctx, z, 2.4)) spike(x, z, 1, rng.range(0.8, 1.2));
      }
      // Boules de neige qui glissent autour du chemin
      const balls = d > 0.15 ? rng.int(0, 1 + Math.round(d)) : 0;
      for (let i = 0; i < balls; i++) {
        const zb = -rng.range(8, ctx.length - 8);
        if (!laneInTile(ctx, zb)) continue;
        const ball = new THREE.Mesh(a.ball, a.ballMat);
        ball.position.y = 1.6;
        mover(ctx, ball, { x: laneX(ctx, zb) + rng.range(-10, 10), z: zb, r: 1.5, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    }

    sowDetails(ctx, parts, 70, [
      (x, z) => detail.mound(THREE, rng, x, z),
      (x, z) => detail.mound(THREE, rng, x, z),
      (x, z) => detail.pebble(THREE, rng, x, z, 0x6d7680),
      (x, z) => detail.bush(THREE, rng, x, z, 0x2c5e47),
    ]);
    ctx.merge(parts, a.mat);
  },
};
