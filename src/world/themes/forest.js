// Thème "Forêt" : sapins partout, gros rochers, rangées d'arbres avec un passage sur le chemin.
import { scatter, wallWithGap, laneInTile } from '../obstacles.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';

const GREENS = [0x2f7d32, 0x388e3c, 0x43a047, 0x1b5e20, 0x558b2f];

export default {
  name: 'forest',
  label: 'Forêt',
  sky: 0xbfe3f2,
  fog: { near: 60, far: 380 },
  light: { sky: 0xeaf6ff, ground: 0x4a6b3a, sun: 0xfff2d6 },

  createAssets(THREE) {
    return {
      groundMat: groundMaterial(THREE, {
        base: 0x6f9e3e, blotches: [0x5c8a32, 0x7fae4a, 0x8a7a45, 0x4f7a2c, 0x6b5a35], specks: [0x3f6a24, 0x9cc45c, 0x8b6b3e], blades: true,
      }, 11),
      mat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const parts = [];
    const green = () => GREENS[rng.int(0, GREENS.length - 1)];

    const tree = (x, z, s) => {
      const h = rng.range(0.9, 1.25);
      parts.push({ geometry: new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 3 * s, 6).translate(x, 1.5 * s, z), color: 0x6d4c41 });
      parts.push({ geometry: new THREE.ConeGeometry(2.4 * s, 7.5 * s * h, 7).translate(x, 2 * s + 3.75 * s * h, z), color: green(), shade: rng.range(0.85, 1.1) });
      ctx.addCollider(x, z, 1.25 * s);
    };

    // Sapins sur toute la case
    for (const p of scatter(ctx, Math.round(16 + d * 26 + rng.range(0, 5)), 2)) tree(p.x, p.z, rng.range(0.8, 1.4));
    // Grands sapins
    for (const p of scatter(ctx, rng.int(2, 6), 3.2)) tree(p.x, p.z, rng.range(1.5, 2));
    // Rangée d'arbres en travers du chemin, avec un seul passage
    if (!ctx.calm && rng.chance(0.25 + d * 0.35)) {
      const z = -rng.range(15, ctx.length - 15);
      if (laneInTile(ctx, z)) for (const x of wallWithGap(ctx, z, 3.2)) tree(x, z, 1.1);
    }
    // Gros rochers
    for (const p of scatter(ctx, Math.round(rng.range(1, 3 + d * 5)), 3)) {
      const s = rng.range(0.9, 1.4);
      parts.push({ geometry: new THREE.DodecahedronGeometry(2.2 * s, 0).scale(1, 1.5, 1).translate(p.x, 1, p.z), color: 0x8d8d86, shade: rng.range(0.85, 1.05) });
      ctx.addCollider(p.x, p.z, 2 * s);
    }
    // Troncs couchés (décor bas, on passe au-dessus)
    for (let i = rng.int(0, 2); i > 0; i--) {
      const x = rng.range(-ctx.width / 2, ctx.width / 2), z = -rng.range(5, 55);
      parts.push({ geometry: new THREE.CylinderGeometry(0.35, 0.4, rng.range(4, 7), 7).rotateZ(Math.PI / 2).rotateY(rng.range(0, 3)).translate(x, 0.35, z), color: 0x6d4c41 });
    }

    sowDetails(ctx, parts, 150, [
      (x, z) => detail.tuft(THREE, rng, x, z, 0x4f8a2b),
      (x, z) => detail.tuft(THREE, rng, x, z, 0x6a9f3a),
      (x, z) => detail.bush(THREE, rng, x, z, 0x3f7a2a),
      (x, z) => detail.mushroom(THREE, rng, x, z),
      (x, z) => detail.pebble(THREE, rng, x, z, 0x8d8d86),
      (x, z) => detail.flower(THREE, rng, x, z, rng.chance(0.5) ? 0xffffff : 0xffd54f),
    ]);
    ctx.merge(parts, a.mat);
  },
};
