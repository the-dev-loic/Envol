// Thème "Ville" : un grand boulevard au coucher du soleil.
// Façades avec fenêtres (certaines allumées), immeubles alignés le long des trottoirs,
// marquages au sol, lampadaires, arbres en bac, panneaux publicitaires, drones.
// Tout le décor fixe d'un tronçon est fusionné en quelques géométries (merge.js) → peu d'appels de rendu.
import { ground, instances, scatter, wallWithGap, mover } from '../obstacles.js';
import { mergeColored } from '../merge.js';

const FACADES = [0xf1e3cf, 0xe0a98f, 0xb5c4d4, 0xd8d0c2, 0x9fb7ae, 0xf2cf91, 0xc9b6d6];
const ADS = [0xff5e5b, 0x2ec4b6, 0xffd23f, 0x7b61ff, 0xff8c42];
const TILE = 12;          // une répétition de la texture de fenêtres = 12 m × 12 m (4 × 4 fenêtres)
const SIDEWALK = 7;       // largeur des trottoirs, au-delà du couloir jouable

/** Texture de façade : murs blancs (teintés par la couleur de l'immeuble), fenêtres sombres ou allumées. */
function facadeTextures(THREE) {
  const size = 256, cell = size / 4;
  const map = document.createElement('canvas');
  const glow = document.createElement('canvas');
  map.width = map.height = glow.width = glow.height = size;
  const m = map.getContext('2d'), g = glow.getContext('2d');
  m.fillStyle = '#ffffff'; m.fillRect(0, 0, size, size);
  g.fillStyle = '#000000'; g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * cell + 14, y = row * cell + 12, w = cell - 28, h = cell - 26;
      m.fillStyle = '#d9d4cc'; m.fillRect(col * cell, row * cell + cell - 6, cell, 3); // corniche d'étage
      const lit = rnd() < 0.38;
      m.fillStyle = lit ? '#ffd889' : '#33475b';
      m.fillRect(x, y, w, h);
      m.fillStyle = 'rgba(255,255,255,0.25)'; m.fillRect(x, y, w, 4);          // reflet
      m.fillStyle = '#c9c3b8'; m.fillRect(x + w / 2 - 1, y, 2, h);              // meneau
      if (lit) { g.fillStyle = '#ffc861'; g.fillRect(x, y, w, h); }
    }
  }
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(map), glow: tex(glow) };
}

/**
 * Bloc d'immeuble placé (x, z au pied), UV de façade à l'échelle (fenêtres de taille constante),
 * toit uni (UV sur un pixel de mur, sommets assombris).
 */
function building(THREE, rng, w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  const uv = g.attributes.uv;
  const shade = new Float32Array(uv.count * 3).fill(1);
  const ou = rng.int(0, 3) / 4, ov = rng.int(0, 3) / 4; // décalage → motif de fenêtres différent
  // Ordre des faces d'une BoxGeometry : +x, -x, +y, -y, +z, -z (4 sommets chacune)
  for (let f = 0; f < 6; f++) {
    for (let k = f * 4; k < f * 4 + 4; k++) {
      if (f === 2 || f === 3) {
        uv.setXY(k, 0.01, 0.01);
        shade.fill(f === 2 ? 0.62 : 0.4, k * 3, k * 3 + 3);
      } else {
        const span = f < 2 ? d : w;
        uv.setXY(k, uv.getX(k) * span / TILE + ou, uv.getY(k) * h / TILE + ov);
      }
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(shade, 3));
  return g;
}

/** Immeuble complet : corps + étage en retrait pour les grands + petits équipements de toit. */
function tower(THREE, rng, parts, x, z, w, h, color) {
  parts.push({ geometry: building(THREE, rng, w, h, w, x, 0, z), color });
  let top = h;
  if (h > 30 && rng.chance(0.7)) {
    const w2 = w * rng.range(0.55, 0.75), h2 = h * rng.range(0.15, 0.3);
    parts.push({ geometry: building(THREE, rng, w2, h2, w2, x, h, z), color, shade: 0.92 });
    top += h2;
  }
  for (let i = rng.int(0, 2); i > 0; i--) {
    const s = rng.range(1, 2.2);
    const g = new THREE.BoxGeometry(s, s * 0.7, s).translate(x + rng.range(-w / 4, w / 4), top + s * 0.35, z + rng.range(-w / 4, w / 4));
    parts.push({ geometry: g, color: 0x8d9299 });
  }
}

/** Rangée continue d'immeubles le long d'un trottoir. */
function streetWall(THREE, rng, parts, side, offset, length, hMin, hMax) {
  for (let z = -rng.range(0, 4); z > -length - 6;) {
    const w = rng.range(7, 13);
    const zc = z - w / 2;
    tower(THREE, rng, parts, side * (offset + w / 2), zc, w, rng.range(hMin, hMax), FACADES[rng.int(0, FACADES.length - 1)]);
    z -= w + rng.range(0.4, 2.5);
  }
}

export default {
  name: 'city',
  label: 'Ville',
  sky: 0xf3a37c,
  fog: { near: 45, far: 340 },
  light: { sky: 0xffe0cc, ground: 0x3b3f4c, sun: 0xffb98c },

  createAssets(THREE) {
    const { map, glow } = facadeTextures(THREE);
    return {
      groundMat: new THREE.MeshLambertMaterial({ color: 0x45484f }),
      buildingMat: new THREE.MeshLambertMaterial({ map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0.85, vertexColors: true }),
      flatMat: new THREE.MeshLambertMaterial({ vertexColors: true }),
      lampHead: new THREE.BoxGeometry(0.9, 0.25, 0.5),
      lampMat: new THREE.MeshLambertMaterial({ color: 0xfff1c9, emissive: 0xffd98a, emissiveIntensity: 1 }),
      droneGeo: mergeColored(THREE, [
        { geometry: new THREE.BoxGeometry(1.4, 0.35, 1.4), color: 0x2d3436 },
        ...[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z]) => ({
          geometry: new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10).translate(x, 0.25, z), color: 0xb2bec3,
        })),
      ]),
      droneLight: new THREE.SphereGeometry(0.18, 8, 6),
      droneLightMat: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
    };
  },

  populateChunk(ctx) {
    const { THREE, rng, difficulty: d, assets: a, length: L, halfWidth: hw } = ctx;
    ground(ctx, a.groundMat);

    const street = [];    // sol : trottoirs, marquages, passages piétons
    const props = [];     // mobilier : lampadaires, arbres, panneaux
    const buildings = [];
    const lampHeads = [];
    const box = (w, h, dp, x, y, z) => new THREE.BoxGeometry(w, h, dp).translate(x, y, z);

    // --- Rue ---
    for (const side of [-1, 1]) {
      street.push({ geometry: box(SIDEWALK, 0.25, L, side * (hw + SIDEWALK / 2), 0.12, -L / 2), color: 0x9c9a94 });
      street.push({ geometry: box(0.35, 0.3, L, side * (hw + 0.18), 0.15, -L / 2), color: 0xc9c6bd });   // bordure
      street.push({ geometry: box(0.25, 0.02, L, side * 0.3, 0.02, -L / 2), color: 0xf2c94c });          // double ligne jaune
    }
    for (const lane of [-hw / 2, hw / 2]) {
      for (let z = -1; z > -L; z -= 9) street.push({ geometry: box(0.25, 0.02, 3.5, lane, 0.02, z - 1.75), color: 0xe9e6dd });
    }
    if (rng.chance(0.35)) {
      const z = -rng.range(10, L - 10);
      for (let x = -hw + 1; x < hw; x += 1.6) street.push({ geometry: box(0.8, 0.02, 4, x, 0.02, z), color: 0xe9e6dd });
    }

    // --- Immeubles des deux côtés (première rangée + ligne d'horizon derrière) ---
    for (const side of [-1, 1]) {
      streetWall(THREE, rng, buildings, side, hw + SIDEWALK, L, 12, 40);
      streetWall(THREE, rng, buildings, side, hw + SIDEWALK + 16, L, 30, 75);
      // Lampadaires de trottoir (décor)
      for (let z = -rng.range(2, 8); z > -L; z -= 15) lamp(side * (hw + 1.2), z, -side);
    }

    function lamp(x, z, dir, solid = false) {
      props.push({ geometry: new THREE.CylinderGeometry(0.1, 0.14, 7, 6).translate(x, 3.5, z), color: 0x2f3237 });
      props.push({ geometry: box(1.6, 0.12, 0.12, x + dir * 0.8, 7, z), color: 0x2f3237 });
      lampHeads.push({ x: x + dir * 1.5, y: 6.82, z, rotY: 0 });
      if (solid) ctx.addCollider(x, z, 0.45);
    }

    if (!ctx.calm) {
      // Arbres en bac
      for (const p of scatter(ctx, Math.round(2 + d * 5 + rng.range(0, 2)), 1.8)) {
        props.push({ geometry: box(2.2, 0.8, 2.2, p.x, 0.4, p.z), color: 0x8a8378 });
        props.push({ geometry: new THREE.CylinderGeometry(0.18, 0.25, 3, 6).translate(p.x, 2, p.z), color: 0x6b4f3a });
        const s = rng.range(1.5, 1.9);
        props.push({ geometry: new THREE.IcosahedronGeometry(s, 0).translate(p.x, 3.9, p.z), color: [0x4caf50, 0x66bb6a, 0x7cb342][rng.int(0, 2)] });
        ctx.addCollider(p.x, p.z, s * 0.9);
      }
      // Lampadaires au milieu de la rue
      for (const p of scatter(ctx, Math.round(rng.range(1, 2 + d * 3)), 1.6)) lamp(p.x, p.z, rng.chance(0.5) ? 1 : -1, true);
      // Panneaux publicitaires en travers (à hauteur de vol)
      for (const p of scatter(ctx, Math.round(rng.range(0, 1.5 + d * 2.5)), 3.4)) {
        const color = ADS[rng.int(0, ADS.length - 1)];
        for (const dx of [-2.4, 2.4]) props.push({ geometry: box(0.25, 5.6, 0.25, p.x + dx, 2.8, p.z), color: 0x3a3d42 });
        props.push({ geometry: box(6, 3, 0.35, p.x, 4.2, p.z), color: 0x2b2e33 });
        props.push({ geometry: box(5.6, 2.6, 0.4, p.x, 4.2, p.z), color });
        props.push({ geometry: box(3.2, 0.5, 0.45, p.x - 0.6, 4.6, p.z), color: 0xffffff, shade: 0.95 });
        props.push({ geometry: box(2.2, 0.35, 0.45, p.x - 1.1, 3.8, p.z), color: 0xffffff, shade: 0.85 });
        for (let dx = -2.4; dx <= 2.4; dx += 1.2) ctx.addCollider(p.x + dx, p.z, 0.75);
      }
      // Petits immeubles dans la rue
      for (const p of scatter(ctx, Math.round(rng.range(0, 1 + d * 3)), 3.6)) {
        const w = rng.range(4.5, 6.5);
        tower(THREE, rng, buildings, p.x, p.z, w, rng.range(9, 20), FACADES[rng.int(0, FACADES.length - 1)]);
        ctx.addCollider(p.x, p.z, 0.62 * w);
      }
      // Pâté de maisons en travers, avec une ruelle
      if (rng.chance(0.25 + d * 0.3)) {
        const z = -rng.range(15, L - 15);
        for (const x of wallWithGap(ctx, z, 5)) {
          tower(THREE, rng, buildings, x, z, 5, rng.range(8, 16), FACADES[rng.int(0, FACADES.length - 1)]);
          ctx.addCollider(x, z, 3);
        }
      }
      // Drones à hauteur de vol
      const drones = d > 0.05 ? rng.int(0, 1 + Math.round(d * 2)) : 0;
      for (let i = 0; i < drones; i++) {
        const drone = new THREE.Mesh(a.droneGeo, a.flatMat);
        const light = new THREE.Mesh(a.droneLight, a.droneLightMat);
        light.position.y = -0.25;
        drone.add(light);
        drone.position.y = 3.2;
        mover(ctx, drone, { x: rng.range(-12, 12), z: -rng.range(8, L - 8), r: 1.3, amplitude: rng.range(6, 14), speed: rng.range(1.2, 2 + d) });
      }
    }

    for (const [parts, mat] of [[street, a.flatMat], [props, a.flatMat], [buildings, a.buildingMat]]) {
      if (!parts.length) continue;
      const mesh = new THREE.Mesh(mergeColored(THREE, parts), mat);
      ctx.group.add(mesh);
      ctx.track(mesh.geometry);
    }
    instances(ctx, a.lampHead, a.lampMat, lampHeads);
  },
};
