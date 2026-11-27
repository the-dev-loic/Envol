// Thème "Ville" : immeubles, ruelles, lampadaires, drones qui patrouillent.
import { ground, instances, scatter, wallWithGap, borders, mover } from '../obstacles.js';

const FACADES = [0x9aa5b1, 0xc9b79c, 0x7d8ea3, 0xb0866a, 0xd8d2c4, 0x6f7f8f];

export default {
  name: 'city',
  label: 'Ville',
  sky: 0xf0b8a0,
  fog: { near: 50, far: 360 },
  light: { sky: 0xffe2d0, ground: 0x4a4e58, sun: 0xffc9a8 },

  createAssets(THREE) {
    return {
      box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      pole: new THREE.CylinderGeometry(0.15, 0.2, 6, 5).translate(0, 3, 0),
      drone: new THREE.BoxGeometry(2.2, 0.5, 2.2),
      groundMat: new THREE.MeshLambertMaterial({ color: 0x5b5f66 }),
      buildingMat: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      poleMat: new THREE.MeshLambertMaterial({ color: 0x30343a }),
      droneMat: new THREE.MeshLambertMaterial({ color: 0xe53935, emissive: 0x551010 }),
    };
  },

  populateChunk(ctx) {
    const { THREE, rng, difficulty: d, assets: a } = ctx;
    const facade = () => FACADES[rng.int(0, FACADES.length - 1)];
    ground(ctx, a.groundMat);

    const buildings = borders(ctx, 16, 4, 50).map((p) => {
      const w = rng.range(6, 12);
      return { ...p, sx: w, sy: rng.range(15, 55), sz: w, rotY: 0, color: facade() };
    });
    const poles = [];

    if (!ctx.calm) {
      // Petits immeubles dans le couloir
      for (const p of scatter(ctx, Math.round(2 + d * 7 + rng.range(0, 2)), 3.5)) {
        const w = rng.range(4, 6.5);
        buildings.push({ ...p, sx: w, sy: rng.range(8, 22), sz: w, rotY: 0, color: facade() });
        ctx.addCollider(p.x, p.z, 0.62 * w);
      }
      // Pâté de maisons en travers, avec une ruelle
      if (rng.chance(0.3 + d * 0.3)) {
        const z = -rng.range(15, ctx.length - 15);
        for (const x of wallWithGap(ctx, z, 5)) {
          buildings.push({ x, z, sx: 5, sy: rng.range(7, 16), sz: 5, rotY: 0, color: facade() });
          ctx.addCollider(x, z, 3);
        }
      }
      // Lampadaires
      for (const p of scatter(ctx, Math.round(rng.range(1, 3 + d * 4)), 0.6)) {
        poles.push({ ...p, sx: 1 });
        ctx.addCollider(p.x, p.z, 0.5);
      }
      // Drones à hauteur de vol
      const drones = d > 0.05 ? rng.int(0, 1 + Math.round(d * 2)) : 0;
      for (let i = 0; i < drones; i++) {
        const drone = new THREE.Mesh(a.drone, a.droneMat);
        drone.position.y = 3.2;
        mover(ctx, drone, { x: rng.range(-12, 12), z: -rng.range(8, ctx.length - 8), r: 1.4, amplitude: rng.range(6, 14), speed: rng.range(1.2, 2 + d) });
      }
    }

    instances(ctx, a.box, a.buildingMat, buildings);
    instances(ctx, a.pole, a.poleMat, poles);
  },
};
