// Thème "Forêt enchantée" (style enfantin) : arbres sucettes, sapins « piles d'assiettes »,
// champignons géants à pois, gros cailloux ronds, fleurs, rangées d'arbres avec un passage.
import { scatter, wallWithGap, laneInTile } from '../obstacles.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';
import { toonColors } from '../style.js';
import { lollipopTree, stackPine, mushroom, bigFlower, roundRock } from '../cute.js';

const GREENS = [0x5ad35a, 0x3fc15c, 0x86e04f, 0x2fb57a];
const BLOSSOMS = [0xff9ecf, 0xffb35c, 0xffe066];
const PETALS = [0xff6fae, 0xffd23f, 0xb388ff, 0xffffff, 0x5ec8ff];

export default {
  name: 'forest',
  label: 'Forêt',
  icon: '🌳',
  sky: 0x8fdcff,
  fog: { near: 70, far: 380 },
  light: { sky: 0xffffff, ground: 0x7fbf5a, sun: 0xfff4d6 },

  createAssets(THREE) {
    return {
      groundMat: groundMaterial(THREE, {
        base: 0x7fd65a, blotches: [0x6cc94b, 0x93e06a, 0xa8e36f, 0x63bf46], specks: [0x58b23f, 0xb9ef7f, 0xffffff], blades: true, speckCount: 4000,
      }, 11),
      mat: toonColors(),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const pick = (arr) => arr[rng.int(0, arr.length - 1)];

    const tree = (x, z, s) => {
      if (rng.chance(0.5)) parts.push(...lollipopTree(THREE, rng, x, z, s, rng.chance(0.2) ? pick(BLOSSOMS) : pick(GREENS)));
      else parts.push(...stackPine(THREE, rng, x, z, s, pick(GREENS)));
      ctx.addCollider(x, z, 1.5 * s);
    };

    for (const p of scatter(ctx, Math.round(14 + d * 22 + rng.range(0, 4)), 2.2)) tree(p.x, p.z, rng.range(0.85, 1.3));
    // Champignons géants (obstacles)
    for (const p of scatter(ctx, Math.round(rng.range(1, 3 + d * 3)), 2.8)) {
      const s = rng.range(1.2, 1.7);
      parts.push(...mushroom(THREE, rng, p.x, p.z, s, rng.chance(0.75) ? 0xff4d5e : 0xff9f1c));
      ctx.addCollider(p.x, p.z, 1.9 * s);
    }
    // Rangée d'arbres en travers du chemin, avec un seul passage
    if (!ctx.calm && rng.chance(0.25 + d * 0.35)) {
      const z = -rng.range(15, ctx.length - 15);
      if (laneInTile(ctx, z)) for (const x of wallWithGap(ctx, z, 3.4)) tree(x, z, 1);
    }
    // Gros cailloux ronds
    for (const p of scatter(ctx, Math.round(rng.range(1, 2 + d * 4)), 3)) {
      const r = rng.range(2, 2.8);
      parts.push({ geometry: new THREE.IcosahedronGeometry(r, 1).scale(1.1, 1.3, 1).translate(p.x, r * 0.9, p.z), color: 0xb9b4d6, shade: rng.range(0.95, 1.05) });
      ctx.addCollider(p.x, p.z, r * 1.05);
    }

    sowDetails(ctx, parts, 90, [
      (x, z) => detail.tuft(THREE, rng, x, z, 0x4fbf3f),
      (x, z) => bigFlower(THREE, rng, x, z, pick(PETALS)),
      (x, z) => bigFlower(THREE, rng, x, z, pick(PETALS), 0.55),
      (x, z) => mushroom(THREE, rng, x, z, 0.22),
      (x, z) => roundRock(THREE, rng, x, z, rng.range(0.2, 0.45), 0xc4c0de),
      (x, z) => detail.bush(THREE, rng, x, z, 0x47c264),
    ]);
    ctx.merge(parts, a.mat);
  },
};
