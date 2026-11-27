// Sol des mondes : texture procédurale (pas d'image à télécharger) + petits détails posés au sol.
// Les détails sont fusionnés avec le reste du décor via mergeColored (merge.js).

/**
 * Texture de sol qui se répète sans couture (une tuile = `tile` mètres).
 * spec: { base, blotches: [couleurs], specks: [couleurs], cracks?: nb de fissures, stripes?: bool }
 */
export function groundTexture(THREE, spec, seed = 1) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  // Dessine en tenant compte du bord (copies décalées) pour que la tuile se raccorde.
  const wrapped = (x, y, r, draw) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
      draw(x + dx, y + dy);
    }
  };

  g.fillStyle = hex(spec.base);
  g.fillRect(0, 0, size, size);
  // Grandes taches douces (variations de couleur)
  for (let i = 0; i < (spec.blotchCount ?? 150); i++) {
    const x = rnd() * size, y = rnd() * size, r = 18 + rnd() * 70;
    const col = hex(pick(spec.blotches));
    wrapped(x, y, r, (px, py) => {
      const grd = g.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, col + '66');
      grd.addColorStop(1, col + '00');
      g.fillStyle = grd;
      g.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
  // Fissures (bitume, terre sèche)
  g.lineWidth = 1.5;
  for (let i = 0; i < (spec.cracks ?? 0); i++) {
    let x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2;
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
    g.stroke();
  }
  // Petits points (brins, grains, gravillons)
  for (let i = 0; i < (spec.speckCount ?? 6000); i++) {
    g.fillStyle = hex(pick(spec.specks)) + (rnd() < 0.5 ? 'aa' : '66');
    const w = 1 + rnd() * (spec.speckSize ?? 2.2);
    g.fillRect(rnd() * size, rnd() * size, w, spec.blades ? w * 2.5 : w);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const tile = spec.tile ?? 15;
  t.repeat.set(260 / tile, 60 / tile);
  return t;
}

export function groundMaterial(THREE, spec, seed) {
  return new THREE.MeshLambertMaterial({ map: groundTexture(THREE, spec, seed) });
}

// ---------- Petits détails au sol (renvoient des pièces pour mergeColored) ----------
export const detail = {
  tuft(THREE, rng, x, z, color) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const h = rng.range(0.35, 0.8);
      const g = new THREE.ConeGeometry(0.09, h, 3).translate(0, h / 2, 0)
        .rotateZ(rng.range(-0.4, 0.4)).rotateX(rng.range(-0.4, 0.4))
        .translate(x + rng.range(-0.25, 0.25), 0, z + rng.range(-0.25, 0.25));
      out.push({ geometry: g, color, shade: rng.range(0.8, 1.15) });
    }
    return out;
  },
  flower(THREE, rng, x, z, color) {
    const h = rng.range(0.3, 0.55);
    return [
      { geometry: new THREE.BoxGeometry(0.04, h, 0.04).translate(x, h / 2, z), color: 0x4f8a2b },
      { geometry: new THREE.OctahedronGeometry(0.12, 0).translate(x, h, z), color },
    ];
  },
  pebble(THREE, rng, x, z, color) {
    const r = rng.range(0.12, 0.4);
    return [{ geometry: new THREE.DodecahedronGeometry(r, 0).scale(1, 0.6, 1).translate(x, r * 0.3, z), color, shade: rng.range(0.85, 1.1) }];
  },
  mushroom(THREE, rng, x, z) {
    return [
      { geometry: new THREE.CylinderGeometry(0.06, 0.08, 0.3, 5).translate(x, 0.15, z), color: 0xf3ead8 },
      { geometry: new THREE.SphereGeometry(0.18, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.28, z), color: rng.chance(0.6) ? 0xd84332 : 0xc8a27a },
    ];
  },
  cactus(THREE, rng, x, z) {
    const h = rng.range(0.8, 1.6);
    const out = [{ geometry: new THREE.CylinderGeometry(0.18, 0.2, h, 6).translate(x, h / 2, z), color: 0x5b8c3a }];
    if (rng.chance(0.6)) out.push({ geometry: new THREE.CylinderGeometry(0.11, 0.11, 0.5, 5).translate(x + 0.28, h * 0.55, z), color: 0x5b8c3a });
    return out;
  },
  bush(THREE, rng, x, z, color) {
    const r = rng.range(0.3, 0.6);
    return [{ geometry: new THREE.IcosahedronGeometry(r, 0).scale(1.2, 0.8, 1.2).translate(x, r * 0.5, z), color, shade: rng.range(0.85, 1.1) }];
  },
  mound(THREE, rng, x, z) {
    const r = rng.range(0.5, 1.3);
    return [{ geometry: new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.45, 1).translate(x, 0, z), color: 0xffffff, shade: rng.range(0.93, 1) }];
  },
  manhole(THREE, rng, x, z) {
    return [{ geometry: new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12).translate(x, 0.02, z), color: 0x2b2d31 }];
  },
};

/** Sème `count` détails sur le sol du tronçon (couloir + abords). makers: [(x, z) => parts[]] */
export function sowDetails(ctx, parts, count, makers, spread = 30) {
  const { rng, halfWidth: hw, length: L } = ctx;
  for (let i = 0; i < count; i++) {
    const x = rng.range(-hw - spread, hw + spread), z = -rng.range(0, L);
    parts.push(...makers[rng.int(0, makers.length - 1)](x, z));
  }
}
