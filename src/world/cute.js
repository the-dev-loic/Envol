// Pièces de décor "mignonnes", réutilisables par tous les mondes.
// Chaque fonction renvoie des pièces { geometry, color, shade? } pour mergeColored (ctx.merge).
// Formes arrondies (beaucoup de segments) : avec l'ombrage cartoon, ça fait "dessin animé".

/** Arbre sucette : tronc + grosse boule (+ petites boules autour). */
export function lollipopTree(THREE, rng, x, z, s, color) {
  const parts = [
    { geometry: new THREE.CylinderGeometry(0.32 * s, 0.45 * s, 3.2 * s, 7).translate(x, 1.6 * s, z), color: 0x9b6a43 },
    { geometry: new THREE.SphereGeometry(2.3 * s, 10, 7).translate(x, 4.4 * s, z), color },
  ];
  for (let i = rng.int(1, 3); i > 0; i--) {
    const a = rng.range(0, Math.PI * 2);
    parts.push({ geometry: new THREE.SphereGeometry(1.2 * s, 7, 5).translate(x + Math.cos(a) * 1.7 * s, (3.6 + rng.range(0, 1.6)) * s, z + Math.sin(a) * 1.7 * s), color, shade: 1.1 });
  }
  return parts;
}

/** Sapin "pile d'assiettes" : 3 cônes arrondis empilés. */
export function stackPine(THREE, rng, x, z, s, color, capColor = null) {
  const parts = [{ geometry: new THREE.CylinderGeometry(0.3 * s, 0.42 * s, 2 * s, 7).translate(x, 1 * s, z), color: 0x9b6a43 }];
  [[2.6, 3.2, 3.2], [2.0, 2.8, 5.0], [1.3, 2.4, 6.6]].forEach(([r, h, y], i) => {
    parts.push({ geometry: new THREE.ConeGeometry(r * s, h * s, 10).translate(x, y * s, z), color, shade: 1 + i * 0.07 });
    if (capColor) parts.push({ geometry: new THREE.ConeGeometry(r * s * 0.55, h * s * 0.4, 10).translate(x, (y + h * 0.33) * s, z), color: capColor });
  });
  return parts;
}

/** Champignon à pois (géant = obstacle, petit = décor). */
export function mushroom(THREE, rng, x, z, s, capColor = 0xff4d5e) {
  const parts = [
    { geometry: new THREE.CylinderGeometry(0.55 * s, 0.75 * s, 2.2 * s, s < 0.5 ? 5 : 10).translate(x, 1.1 * s, z), color: 0xfff3dc },
    { geometry: new THREE.SphereGeometry(1.8 * s, s < 0.5 ? 7 : 12, s < 0.5 ? 3 : 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1).translate(x, 2 * s, z), color: capColor },
  ];
  for (let i = 0; i < (s < 0.5 ? 0 : 6); i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(0, 0.5), t = rng.range(0.35, 0.75);
    const px = Math.cos(a) * 1.8 * s * Math.sin(t), py = 0.8 * 1.8 * s * Math.cos(t);
    parts.push({ geometry: new THREE.IcosahedronGeometry(0.28 * s, 0).translate(x + px, 2 * s + py, z + Math.sin(a) * 1.8 * s * Math.sin(t)), color: 0xffffff });
  }
  return parts;
}

/** Grosse fleur (pétales autour d'un cœur). */
export function bigFlower(THREE, rng, x, z, color, h = 0.8) {
  // Fleur très économe : tige + corolle en étoile aplatie + cœur
  const parts = [{ geometry: new THREE.CylinderGeometry(0.05, 0.05, h, 3).translate(x, h / 2, z), color: 0x3fbf4f }];
  parts.push({ geometry: new THREE.CylinderGeometry(0.3, 0.12, 0.08, 5).translate(x, h, z), color });
  parts.push({ geometry: new THREE.OctahedronGeometry(0.1, 0).translate(x, h + 0.06, z), color: 0xffd23f });
  return parts;
}

/** Caillou tout rond. */
export function roundRock(THREE, rng, x, z, r, color) {
  return [{ geometry: new THREE.IcosahedronGeometry(r, r > 0.6 ? 1 : 0).scale(1.2, 0.75, 1).translate(x, r * 0.45, z), color, shade: rng.range(0.92, 1.08) }];
}

/** Bonhomme de neige (obstacle) avec nez carotte, yeux, écharpe et chapeau. */
export function snowman(THREE, rng, x, z, s = 1) {
  const scarf = [0xff4d6d, 0x4dabf7, 0xffd23f, 0x9b5de5][rng.int(0, 3)];
  const rot = rng.range(-0.6, 0.6);
  const p = (g, color) => ({ geometry: g.rotateY(rot).translate(x, 0, z), color });
  return [
    p(new THREE.SphereGeometry(2.1 * s, 12, 8).translate(0, 1.9 * s, 0), 0xffffff),
    p(new THREE.SphereGeometry(1.55 * s, 12, 8).translate(0, 4.6 * s, 0), 0xffffff),
    p(new THREE.SphereGeometry(1.1 * s, 12, 8).translate(0, 6.8 * s, 0), 0xffffff),
    p(new THREE.ConeGeometry(0.22 * s, 1.1 * s, 10).rotateX(Math.PI / 2).translate(0, 6.8 * s, 1.5 * s), 0xff8c1a),
    p(new THREE.SphereGeometry(0.14 * s, 8, 6).translate(-0.4 * s, 7.1 * s, 0.95 * s), 0x222222),
    p(new THREE.SphereGeometry(0.14 * s, 8, 6).translate(0.4 * s, 7.1 * s, 0.95 * s), 0x222222),
    p(new THREE.TorusGeometry(1.15 * s, 0.3 * s, 8, 16).rotateX(Math.PI / 2).translate(0, 5.8 * s, 0), scarf),
    p(new THREE.CylinderGeometry(0.95 * s, 0.95 * s, 0.15 * s, 14).translate(0, 7.75 * s, 0), 0x333344),
    p(new THREE.CylinderGeometry(0.65 * s, 0.7 * s, 1.1 * s, 14).translate(0, 8.35 * s, 0), 0x333344),
    p(new THREE.SphereGeometry(0.22 * s, 8, 6).translate(0, 4.8 * s, 1.5 * s), 0x222222),
    p(new THREE.SphereGeometry(0.22 * s, 8, 6).translate(0, 4.1 * s, 1.45 * s), 0x222222),
  ];
}

/** Pingouin (décor, trop bas pour gêner). */
export function penguin(THREE, rng, x, z) {
  const rot = rng.range(0, Math.PI * 2);
  const p = (g, color) => ({ geometry: g.rotateY(rot).translate(x, 0, z), color });
  return [
    p(new THREE.SphereGeometry(0.5, 8, 6).scale(1, 1.4, 0.9).translate(0, 0.7, 0), 0x2b2d42),
    p(new THREE.SphereGeometry(0.38, 8, 6).scale(1, 1.3, 0.6).translate(0, 0.65, 0.22), 0xffffff),
    p(new THREE.SphereGeometry(0.33, 8, 6).translate(0, 1.4, 0), 0x2b2d42),
    p(new THREE.ConeGeometry(0.09, 0.25, 8).rotateX(Math.PI / 2).translate(0, 1.38, 0.38), 0xff9f1c),
    p(new THREE.SphereGeometry(0.06, 6, 5).translate(-0.12, 1.5, 0.28), 0xffffff),
    p(new THREE.SphereGeometry(0.06, 6, 5).translate(0.12, 1.5, 0.28), 0xffffff),
    p(new THREE.BoxGeometry(0.22, 0.06, 0.3).translate(-0.18, 0.03, 0.1), 0xff9f1c),
    p(new THREE.BoxGeometry(0.22, 0.06, 0.3).translate(0.18, 0.03, 0.1), 0xff9f1c),
  ];
}

/** Cactus tout rond (obstacle si grand), avec une fleur rose sur la tête. */
export function cactus(THREE, rng, x, z, s = 1) {
  const g = 0x3fbf6a;
  if (s < 0.5) return [{ geometry: new THREE.CapsuleGeometry(0.7 * s, 4 * s, 2, 6).translate(x, 2.7 * s, z), color: g }]; // petit = simple
  const parts = [
    { geometry: new THREE.CapsuleGeometry(0.7 * s, 4 * s, 4, 10).translate(x, 2.7 * s, z), color: g },
    { geometry: new THREE.SphereGeometry(0.35 * s, 8, 6).translate(x, 5.4 * s, z), color: 0xff6fae },
  ];
  for (const side of [-1, 1]) {
    if (!rng.chance(0.75)) continue;
    const y = rng.range(1.8, 3) * s;
    parts.push({ geometry: new THREE.CapsuleGeometry(0.4 * s, 1.1 * s, 4, 10).rotateZ(Math.PI / 2).translate(x + side * 1 * s, y, z), color: g });
    parts.push({ geometry: new THREE.CapsuleGeometry(0.4 * s, 1.2 * s, 4, 10).translate(x + side * 1.7 * s, y + 0.8 * s, z), color: g });
  }
  return parts;
}

/**
 * Nuée d'oiseaux mignons, bien visibles (gros, colorés, yeux, bec), qui regardent le joueur.
 * Géométries à créer UNE fois (createAssets) avec flockGeometries(), puis makeFlock() pour chaque nuée.
 * Les ailes forment un seul objet : on les fait battre en changeant son échelle verticale
 * (tous les oiseaux sont à la même hauteur, ailes relevées en V).
 */
const FLOCK_SPOTS = [[0, 0], [-2.4, 1.5], [2.4, 1.3], [-1.3, -1.8], [1.4, -2]];
export function flockGeometries(THREE, mergeColored, { body, wing, belly = 0xffffff, beak = 0xffb000, scale = 1.3 }) {
  const bodies = [], wings = [];
  for (const [x, z] of FLOCK_SPOTS) {
    const s = scale;
    bodies.push(
      { geometry: new THREE.SphereGeometry(0.55 * s, 10, 8).scale(1, 0.85, 1.1).translate(x, 0, z), color: body },
      { geometry: new THREE.SphereGeometry(0.4 * s, 8, 6).scale(0.9, 0.7, 0.6).translate(x, -0.12 * s, z + 0.32 * s), color: belly },
      { geometry: new THREE.SphereGeometry(0.4 * s, 10, 8).translate(x, 0.38 * s, z + 0.45 * s), color: body },
      { geometry: new THREE.ConeGeometry(0.13 * s, 0.38 * s, 8).rotateX(Math.PI / 2).translate(x, 0.3 * s, z + 0.95 * s), color: beak },
      { geometry: new THREE.ConeGeometry(0.28 * s, 0.6 * s, 6).rotateX(-Math.PI / 2).translate(x, 0.05 * s, z - 0.8 * s), color: wing },
    );
    for (const side of [-1, 1]) {
      bodies.push({ geometry: new THREE.SphereGeometry(0.12 * s, 8, 6).translate(x + side * 0.17 * s, 0.5 * s, z + 0.8 * s), color: 0xffffff });
      bodies.push({ geometry: new THREE.SphereGeometry(0.07 * s, 6, 5).translate(x + side * 0.17 * s, 0.5 * s, z + 0.9 * s), color: 0x222233 });
      wings.push({ geometry: new THREE.SphereGeometry(0.6 * s, 10, 6).scale(1.7, 0.14, 0.75).rotateZ(side * 0.35).translate(x + side * 0.95 * s, 0.32 * s, z), color: wing });
    }
  }
  return { bodies: mergeColored(THREE, bodies), wings: mergeColored(THREE, wings) };
}

export function makeFlock(THREE, geos, material) {
  const flock = new THREE.Group();
  flock.add(new THREE.Mesh(geos.bodies, material));
  const wings = new THREE.Mesh(geos.wings, material);
  flock.add(wings);
  const phase = Math.random() * 6;
  // Appelé à chaque image par World (obstacles mobiles) : battement d'ailes
  flock.userData.animate = (t) => { wings.scale.y = Math.sin(t * 11 + phase) * 1.1; };
  return flock;
}
