// Thème "Pays de neige" (style enfantin) : montagnes coiffées de neige, sapins enneigés,
// bonshommes de neige, colonnes de glace en rangées, pingouins, boules de neige qui roulent.
import { scatter, wallWithGap, mover, laneX, laneInTile } from '../obstacles.js';
import { groundMaterial, sowDetails, detail } from '../ground.js';
import { toon, toonColors } from '../style.js';
import { stackPine, snowman, penguin, roundRock } from '../cute.js';

const PINES = [0x2bb58f, 0x22a88a, 0x3cc39a];
const ICE = [0x9be7ff, 0xb9f0ff, 0x8fd3ff];

export default {
  name: 'snow',
  label: 'Montagnes enneigées',
  icon: '⛄',
  sky: 0xbfe6ff,
  precipitation: 'snow',
  fog: { near: 50, far: 320 },
  light: { sky: 0xffffff, ground: 0xb8d4f0, sun: 0xf4f9ff },

  createAssets(THREE) {
    return {
      groundMat: groundMaterial(THREE, {
        base: 0xf4f9ff, blotches: [0xe4f0fd, 0xffffff, 0xd9e9fb, 0xeaf4ff], specks: [0xcfe3fb, 0xffffff, 0xe0ecff], speckCount: 2500,
      }, 37),
      mat: toonColors(),
      ball: new THREE.SphereGeometry(1.6, 16, 12),
      ballMat: toon({ color: 0xffffff }),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const pick = (arr) => arr[rng.int(0, arr.length - 1)];
    const icePillar = (x, z, s, sy) => {
      const c = pick(ICE);
      parts.push({ geometry: new THREE.CylinderGeometry(0.9 * s, 1 * s, 6 * sy, 10).translate(x, 3 * sy, z), color: c });
      parts.push({ geometry: new THREE.ConeGeometry(0.9 * s, 2.2 * sy, 10).translate(x, 7.1 * sy, z), color: c, shade: 1.08 });
      ctx.addCollider(x, z, 1.05 * s);
    };

    // Montagnes rondes coiffées de neige
    for (const p of scatter(ctx, rng.int(0, 1), 26)) {
      const r = rng.range(18, 26), h = rng.range(36, 60);
      parts.push({ geometry: new THREE.ConeGeometry(r, h, 12).translate(p.x, h / 2, p.z), color: 0xa8b8f0 });
      parts.push({ geometry: new THREE.ConeGeometry(r * 0.45, h * 0.45, 12).translate(p.x, h * 0.775 + 0.1, p.z), color: 0xffffff });
      ctx.addCollider(p.x, p.z, r * 0.9);
    }
    // Sapins enneigés
    for (const p of scatter(ctx, Math.round(10 + d * 18 + rng.range(0, 4)), 2.4)) {
      const s = rng.range(0.85, 1.3);
      parts.push(...stackPine(THREE, rng, p.x, p.z, s, pick(PINES), 0xffffff));
      ctx.addCollider(p.x, p.z, 1.55 * s);
    }
    // Bonshommes de neige
    for (const p of scatter(ctx, Math.round(rng.range(1, 2 + d * 3)), 2.3)) {
      parts.push(...snowman(THREE, rng, p.x, p.z, rng.range(0.9, 1.15)));
      ctx.addCollider(p.x, p.z, 2.2);
    }

    if (!ctx.calm) {
      // Rangée de colonnes de glace avec un passage
      const z = -rng.range(15, ctx.length - 15);
      if (rng.chance(0.3 + d * 0.3) && laneInTile(ctx, z)) {
        for (const x of wallWithGap(ctx, z, 2.4)) icePillar(x, z, 1, rng.range(0.85, 1.15));
      }
      // Boules de neige qui roulent autour du chemin
      const balls = d > 0.15 ? rng.int(0, 1 + Math.round(d)) : 0;
      for (let i = 0; i < balls; i++) {
        const zb = -rng.range(8, ctx.length - 8);
        if (!laneInTile(ctx, zb)) continue;
        const ball = new THREE.Mesh(a.ball, a.ballMat);
        ball.position.y = 1.6;
        mover(ctx, ball, { x: laneX(ctx, zb) + rng.range(-10, 10), z: zb, r: 1.5, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    }

    sowDetails(ctx, parts, 55, [
      (x, z) => detail.mound(THREE, rng, x, z),
      (x, z) => detail.mound(THREE, rng, x, z),
      (x, z) => penguin(THREE, rng, x, z),
      (x, z) => roundRock(THREE, rng, x, z, rng.range(0.2, 0.4), 0x9fb3d9),
    ]);
    ctx.merge(parts, a.mat);
  },
};
