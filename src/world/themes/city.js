// Thème "Ville" : un quadrillage infini d'avenues (le long de la course) et de rues transversales,
// avec des pâtés d'immeubles entre les deux. On peut changer d'avenue aux carrefours.
// Façades à fenêtres (certaines allumées), trottoirs, lampadaires, arbres, panneaux, drones.
// Le chemin sûr traverse la ville en diagonale : les immeubles sur sa route laissent place à des placettes.
import { mover, isFree } from '../obstacles.js';
import { mergeColored } from '../merge.js';
import { groundMaterial, detail } from '../ground.js';

const FACADES = [0xf1e3cf, 0xe0a98f, 0xb5c4d4, 0xd8d0c2, 0x9fb7ae, 0xf2cf91, 0xc9b6d6];
const ADS = [0xff5e5b, 0x2ec4b6, 0xffd23f, 0x7b61ff, 0xff8c42];
const TILE = 12;      // une répétition de la texture de fenêtres = 12 m × 12 m (4 × 4 fenêtres)
const AVE = 40;       // écart entre deux avenues (mètres, en X monde)
const AVE_HALF = 6;   // demi-largeur d'une avenue
const CROSS = 12;     // largeur de la rue transversale, au début de chaque case (z ∈ [-12, 0])
const LIT_UV = [0.125, 0.879]; // un pixel de fenêtre toujours allumée (sert aux têtes de lampadaires)

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
      const lit = (row === 0 && col === 0) || rnd() < 0.38;
      m.fillStyle = lit ? '#ffd889' : '#33475b';
      m.fillRect(x, y, w, h);
      m.fillStyle = 'rgba(255,255,255,0.25)'; m.fillRect(x, y, w, 4);          // reflet
      m.fillStyle = '#c9c3b8'; m.fillRect(x + w / 2 - 1, y + 8, 2, h - 8);      // meneau
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

/** Bloc d'immeuble placé (x, z au pied), fenêtres à l'échelle, toit uni. */
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

/** Immeuble complet : corps + étage en retrait pour les grands + équipements de toit. */
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
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.01, 0.01);
    parts.push({ geometry: g, color: 0x8d9299 });
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
      groundMat: groundMaterial(THREE, {
        base: 0x46494f, blotches: [0x3c3f45, 0x52555c, 0x41444a, 0x37393e], specks: [0x5c5f66, 0x34363b, 0x6a6d73],
        cracks: 30, speckCount: 9000, speckSize: 1.4, tile: 12,
      }, 41),
      buildingMat: new THREE.MeshLambertMaterial({ map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0.85, vertexColors: true }),
      flatMat: new THREE.MeshLambertMaterial({ vertexColors: true }),
      droneGeo: mergeColored(THREE, [
        { geometry: new THREE.BoxGeometry(1.4, 0.35, 1.4), color: 0x2d3436 },
        ...[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z]) => ({
          geometry: new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10).translate(x, 0.25, z), color: 0xb2bec3,
        })),
        { geometry: new THREE.SphereGeometry(0.2, 8, 6).translate(0, -0.25, 0), color: 0x00e5ff },
      ]),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a, length: L, width: W, offsetX } = ctx;
    const flat = [];      // sol, trottoirs, mobilier
    const bld = [];       // immeubles + têtes de lampadaires (matériau à fenêtres lumineuses)
    const box = (w, h, dp, x, y, z) => new THREE.BoxGeometry(w, h, dp).translate(x, y, z);
    const facade = () => FACADES[rng.int(0, FACADES.length - 1)];
    const local = (wx) => wx - offsetX;
    const blockLen = L - CROSS;

    function lamp(x, z, dir) {
      if (!isFree(ctx, x, z, 0.5)) return;
      flat.push({ geometry: new THREE.CylinderGeometry(0.1, 0.14, 7, 6).translate(x, 3.5, z), color: 0x2f3237 });
      flat.push({ geometry: box(1.6, 0.12, 0.12, x + dir * 0.8, 7, z), color: 0x2f3237 });
      const head = box(0.9, 0.25, 0.5, x + dir * 1.5, 6.85, z);
      const uv = head.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, LIT_UV[0], LIT_UV[1]);
      bld.push({ geometry: head, color: 0xffffff });
      ctx.addCollider(x, z, 0.45);
    }
    function tree(x, z) {
      if (!isFree(ctx, x, z, 1.8)) return;
      flat.push({ geometry: box(2.2, 0.8, 2.2, x, 0.4, z), color: 0x8a8378 });
      flat.push({ geometry: new THREE.CylinderGeometry(0.18, 0.25, 3, 6).translate(x, 2, z), color: 0x6b4f3a });
      const s = rng.range(1.5, 1.9);
      flat.push({ geometry: new THREE.IcosahedronGeometry(s, 0).translate(x, 3.9, z), color: [0x4caf50, 0x66bb6a, 0x7cb342][rng.int(0, 2)] });
      ctx.addCollider(x, z, s * 0.9);
    }

    // ---------- Avenues dont le centre est dans cette case ----------
    for (let k = Math.ceil((offsetX - W / 2) / AVE); k * AVE < offsetX + W / 2; k++) {
      const c = local(k * AVE);
      // Marquage central et passage piéton avant le carrefour
      for (let z = -CROSS - 2; z > -L; z -= 9) flat.push({ geometry: box(0.25, 0.02, 3.5, c, 0.02, z - 1.75), color: 0xe9e6dd });
      for (let x = c - AVE_HALF + 0.8; x < c + AVE_HALF; x += 1.4) flat.push({ geometry: box(0.7, 0.02, 3.5, x, 0.02, -CROSS - 2.2), color: 0xe9e6dd });
      // Lampadaires des deux côtés
      for (const side of [-1, 1]) {
        for (let z = -CROSS - rng.range(3, 8); z > -L + 2; z -= 15) lamp(c + side * (AVE_HALF - 0.6), z, -side);
      }
      if (!ctx.calm) {
        // Arbres en bac au bord de l'avenue
        for (let i = rng.int(0, 2); i > 0; i--) tree(c + (rng.chance(0.5) ? -1 : 1) * 3.2, -rng.range(CROSS + 3, L - 3));
        // Panneau publicitaire sur une moitié de l'avenue (à hauteur de vol)
        if (rng.chance(0.3 + d * 0.3)) {
          const side = rng.chance(0.5) ? -1 : 1, px = c + side * 2.9, pz = -rng.range(CROSS + 4, L - 4);
          if (isFree(ctx, px, pz, 3.2)) {
            const color = ADS[rng.int(0, ADS.length - 1)];
            for (const dx of [-2.4, 2.4]) flat.push({ geometry: box(0.25, 5.6, 0.25, px + dx, 2.8, pz), color: 0x3a3d42 });
            flat.push({ geometry: box(6, 3, 0.35, px, 4.2, pz), color: 0x2b2e33 });
            flat.push({ geometry: box(5.6, 2.6, 0.4, px, 4.2, pz), color });
            flat.push({ geometry: box(3.2, 0.5, 0.45, px - 0.6, 4.6, pz), color: 0xffffff, shade: 0.95 });
            flat.push({ geometry: box(2.2, 0.35, 0.45, px - 1.1, 3.8, pz), color: 0xffffff, shade: 0.85 });
            for (let dx = -2.4; dx <= 2.4; dx += 1.2) ctx.addCollider(px + dx, pz, 0.75);
          }
        }
        // Drone qui patrouille en travers de l'avenue
        if (d > 0.05 && rng.chance(0.08 + d * 0.22)) {
          const drone = new THREE.Mesh(a.droneGeo, a.flatMat);
          drone.position.y = 3.2;
          mover(ctx, drone, { x: c, z: -rng.range(CROSS + 4, L - 4), r: 1.3, amplitude: AVE_HALF - 1.5, speed: rng.range(1.2, 2 + d) });
        }
      }
    }

    // ---------- Rue transversale (z ∈ [-CROSS, 0]) ----------
    for (let x = -W / 2 + 1; x < W / 2; x += 9) flat.push({ geometry: box(3.5, 0.02, 0.25, x + 1.75, 0.02, -CROSS / 2), color: 0xe9e6dd });
    for (let i = rng.int(1, 3); i > 0; i--) flat.push(...detail.manhole(THREE, rng, rng.range(-W / 2, W / 2), -rng.range(2, L - 2)));

    // ---------- Pâtés de maisons dont le centre est dans cette case ----------
    const blockW = AVE - 2 * AVE_HALF;
    for (let k = Math.ceil((offsetX - W / 2 - AVE / 2) / AVE); k * AVE + AVE / 2 < offsetX + W / 2; k++) {
      const bc = local(k * AVE + AVE / 2);
      if (bc < -W / 2) continue;
      // Trottoir
      flat.push({ geometry: box(blockW, 0.25, blockLen, bc, 0.12, -CROSS - blockLen / 2), color: 0x9c9a94 });
      // 2 × 3 parcelles
      for (let ci = 0; ci < 2; ci++) {
        for (let ri = 0; ri < 3; ri++) {
          const lx = bc - blockW / 4 + ci * (blockW / 2), lz = -CROSS - blockLen / 6 - ri * (blockLen / 3);
          const s = rng.range(9, 12.5);
          if (rng.chance(0.1) || !isFree(ctx, lx, lz, 0.72 * s)) {
            // Placette / square : herbe ou dalles, un arbre si possible
            flat.push({ geometry: box(blockW / 2 - 1, 0.3, blockLen / 3 - 1, lx, 0.15, lz), color: rng.chance(0.6) ? 0x6fa84a : 0xb9b2a5 });
            tree(lx + rng.range(-3, 3), lz + rng.range(-3, 3));
            continue;
          }
          const h = 10 + rng.next() ** 1.6 * 55;
          tower(THREE, rng, bld, lx, lz, s, h, facade());
          ctx.addCollider(lx, lz, 0.68 * s);
        }
      }
    }

    ctx.merge(flat, a.flatMat);
    ctx.merge(bld, a.buildingMat);
  },
};
