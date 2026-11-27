// Thème "Campagne" : granges à traverser, moulins aux ailes qui tournent, silos, chênes, peupliers,
// fermes, meules de foin, champs cultivés, prés clôturés avec vaches, moutons, cochons, poules,
// et des nuées de corbeaux à éviter.
// Tout le décor d'une case est fusionné en une seule géométrie (ctx.merge).
import { scatter, wallWithGap, mover, laneX, laneInTile, density } from '../obstacles.js';
import { mergeColored } from '../merge.js';
import { groundMaterial, detail, sowDetails } from '../ground.js';

const CROPS = [0xe9c46a, 0x9ccc65, 0xd4a373, 0xb5a1e0, 0x7cb342];
const FLOWERS = [0xffffff, 0xffeb3b, 0xe91e63, 0x9c27b0, 0xff7043];
const BARN = { w: 12, d: 12, h: 7, doorHalf: 3.4, doorH: 6 };

export default {
  name: 'country',
  label: 'Campagne',
  sky: 0xa9d8f2,
  fog: { near: 70, far: 400 },
  light: { sky: 0xfff6e0, ground: 0x5f8a3a, sun: 0xfff0c8 },

  createAssets(THREE) {
    const flatMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    // Ailes de moulin (tournent autour de Z, face au joueur)
    const blades = [{ geometry: new THREE.CylinderGeometry(0.45, 0.45, 0.8, 8).rotateX(Math.PI / 2), color: 0x5d4037 }];
    for (let k = 0; k < 4; k++) {
      blades.push({ geometry: new THREE.BoxGeometry(0.18, 6.6, 0.12).translate(0, 3.7, 0).rotateZ((k * Math.PI) / 2), color: 0x6d4c41 });
      blades.push({ geometry: new THREE.BoxGeometry(1.3, 5.2, 0.06).translate(0.75, 4.2, 0).rotateZ((k * Math.PI) / 2), color: 0xf5f0e6 });
    }
    // Nuée de corbeaux
    const flock = [];
    for (const [x, y, z] of [[0, 0, 0], [-1.4, 0.5, 0.8], [1.3, 0.3, -0.6], [-0.6, -0.6, -1.2], [0.8, 0.9, 1.3], [1.9, -0.4, 0.5]]) {
      flock.push({ geometry: new THREE.BoxGeometry(0.35, 0.25, 0.7).translate(x, y, z), color: 0x262626 });
      flock.push({ geometry: new THREE.BoxGeometry(1.4, 0.05, 0.35).translate(x, y + 0.08, z), color: 0x333333 });
      flock.push({ geometry: new THREE.ConeGeometry(0.08, 0.25, 4).rotateX(-Math.PI / 2).translate(x, y, z + 0.45), color: 0xf2a33a });
    }
    return {
      groundMat: groundMaterial(THREE, {
        base: 0x86c04e, blotches: [0x78b043, 0x95cc5c, 0xa7c95a, 0x6ea33e, 0xb3c95e], specks: [0x5c9634, 0xb5dc74, 0xd9e27a], blades: true,
      }, 53),
      flatMat,
      blades: mergeColored(THREE, blades),
      flock: mergeColored(THREE, flock),
    };
  },

  populateTile(ctx) {
    const { THREE, rng, difficulty: d, assets: a, length: L, width: W } = ctx;
    const parts = [];
    const add = (geometry, color, shade) => parts.push({ geometry, color, shade });
    const box = (w, h, dp) => new THREE.BoxGeometry(w, h, dp);
    /** Place une pièce : rotation autour de Y puis translation. */
    const put = (g, x, y, z, rot = 0) => g.rotateY(rot).translate(x, y, z);
    const bale = (x, y, z) => add(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10).rotateZ(Math.PI / 2).translate(x, y, z), 0xe3c16f, rng.range(0.92, 1.05));

    // ---------- Animaux (décor : trop bas pour gêner l'oiseau) ----------
    function cow(x, z, rot) {
      const brown = rng.chance(0.3);
      const body = brown ? 0x8d5a3b : 0xf7f5ef;
      const p = (g, px, py, pz, c) => add(put(g.translate(px, py, pz), x, 0, z, rot), c);
      p(box(1.9, 0.95, 0.9), 0, 1.15, 0, body);
      if (!brown) { p(box(0.6, 0.6, 0.94), rng.range(-0.5, 0.2), 1.25, 0, 0x2b2b2b); p(box(0.4, 0.4, 0.94), 0.55, 1.05, 0, 0x2b2b2b); }
      p(box(0.55, 0.55, 0.5), 1.2, 1.45, 0, body);
      p(box(0.25, 0.3, 0.45), 1.5, 1.3, 0, 0xf0b9a8);
      p(box(0.08, 0.2, 0.08), 1.25, 1.8, 0.2, 0xeeeeee); p(box(0.08, 0.2, 0.08), 1.25, 1.8, -0.2, 0xeeeeee);
      for (const [lx, lz] of [[-0.7, 0.3], [-0.7, -0.3], [0.7, 0.3], [0.7, -0.3]]) p(box(0.22, 0.7, 0.22), lx, 0.35, lz, body);
    }
    function sheep(x, z, rot) {
      const p = (g, px, py, pz, c) => add(put(g.translate(px, py, pz), x, 0, z, rot), c);
      p(new THREE.IcosahedronGeometry(0.62, 0).scale(1.3, 1, 1), 0, 0.95, 0, 0xf4f1ea);
      p(box(0.35, 0.4, 0.35), 0.85, 1.05, 0, 0x2b2b2b);
      for (const [lx, lz] of [[-0.4, 0.25], [-0.4, -0.25], [0.4, 0.25], [0.4, -0.25]]) p(box(0.14, 0.55, 0.14), lx, 0.28, lz, 0x2b2b2b);
    }
    function pig(x, z, rot) {
      const p = (g, px, py, pz, c) => add(put(g.translate(px, py, pz), x, 0, z, rot), c);
      p(box(1.2, 0.65, 0.7), 0, 0.7, 0, 0xf2a7b8);
      p(box(0.45, 0.45, 0.5), 0.75, 0.8, 0, 0xf2a7b8);
      p(box(0.12, 0.25, 0.3), 1.02, 0.75, 0, 0xe48aa0);
      for (const [lx, lz] of [[-0.4, 0.22], [-0.4, -0.22], [0.4, 0.22], [0.4, -0.22]]) p(box(0.16, 0.4, 0.16), lx, 0.2, lz, 0xe48aa0);
    }
    function chicken(x, z, rot) {
      const p = (g, px, py, pz, c) => add(put(g.translate(px, py, pz), x, 0, z, rot), c);
      p(box(0.4, 0.35, 0.3), 0, 0.4, 0, 0xffffff);
      p(box(0.2, 0.22, 0.2), 0.22, 0.62, 0, 0xffffff);
      p(box(0.06, 0.12, 0.08), 0.22, 0.78, 0, 0xe53935);
      p(box(0.1, 0.06, 0.08), 0.36, 0.6, 0, 0xffb300);
      p(box(0.05, 0.22, 0.05), 0, 0.11, 0, 0xffb300);
    }
    const animal = (x, z) => {
      const r = rng.next(), rot = rng.range(0, Math.PI * 2);
      if (r < 0.45) cow(x, z, rot);
      else if (r < 0.7) sheep(x, z, rot);
      else if (r < 0.85) pig(x, z, rot);
      else for (let i = 0; i < 3; i++) chicken(x + rng.range(-1.5, 1.5), z + rng.range(-1.5, 1.5), rng.range(0, 6.3));
    };

    // ---------- Clôture (basse : on la survole) ----------
    function fence(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1), rot = Math.atan2(-(z2 - z1), x2 - x1);
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      for (const y of [0.55, 1.05]) add(put(box(len, 0.12, 0.08), mx, y, mz, rot), 0xa1887f);
      for (let t = 0; t <= len; t += 3) {
        const f = len ? t / len : 0;
        add(box(0.16, 1.3, 0.16).translate(x1 + (x2 - x1) * f, 0.65, z1 + (z2 - z1) * f), 0x8d6e63);
      }
    }

    // ---------- Grange à traverser (portes avant/arrière ouvertes) ----------
    function barn(cx, cz) {
      const { w, d: dp, h, doorHalf: dh, doorH } = BARN;
      const red = 0xb5382e, white = 0xf4efe6, roof = 0x4e4e52;
      ctx.reserve(cx, cz, 10);
      for (const s of [-1, 1]) {
        add(box(0.4, h, dp).translate(cx + s * w / 2, h / 2, cz), red);
        for (let z = cz - dp / 2; z <= cz + dp / 2; z += 1.4) ctx.addCollider(cx + s * w / 2, z, 0.6);
      }
      for (const fz of [cz + dp / 2, cz - dp / 2]) {
        const pw = w / 2 - dh;
        for (const s of [-1, 1]) {
          add(box(pw, h, 0.4).translate(cx + s * (dh + pw / 2), h / 2, fz), red);
          add(box(0.3, doorH, 0.5).translate(cx + s * dh, doorH / 2, fz), white);
          add(box(0.25, doorH, 0.3).translate(cx + s * (dh + pw / 2), doorH / 2, fz), white, 0.95);
          for (let x = dh + 0.6; x <= w / 2; x += 1.2) ctx.addCollider(cx + s * x, fz, 0.6);
        }
        add(box(2 * dh + 0.3, h - doorH, 0.4).translate(cx, doorH + (h - doorH) / 2, fz), red);
        add(box(2 * dh + 0.3, 0.3, 0.5).translate(cx, doorH, fz), white);
        const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 4.2)]);
        add(new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }).translate(cx, h, fz - 0.2), red);
        add(box(1.4, 1.4, 0.45).translate(cx, h + 1.6, fz), white);
      }
      const half = w / 2 + 0.6, ang = Math.atan2(4.2, w / 2), slope = Math.hypot(half, 4.2 * half / (w / 2));
      for (const s of [-1, 1]) add(box(slope, 0.3, dp + 1.2).rotateZ(s * -ang).translate(cx + s * half / 2, h + 2.1, cz), roof);
      for (const s of [-1, 1]) {
        for (let z = cz - dp / 2 + 2; z < cz + dp / 2 - 1; z += 2.2) {
          add(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 10).rotateZ(Math.PI / 2).translate(cx + s * (w / 2 - 1.6), 0.8, z), 0xe3c16f);
        }
      }
    }

    // ---------- Granges : sur le chemin (on la traverse) et parfois ailleurs ----------
    if (!ctx.calm) {
      const cz = -rng.range(BARN.d / 2 + 4, L - BARN.d / 2 - 4);
      if (rng.chance(0.3 + d * 0.15) && laneInTile(ctx, cz, 8)) barn(laneX(ctx, cz), cz);
    }
    for (const p of scatter(ctx, rng.chance(0.3) ? 1 : 0, 10)) barn(p.x, Math.min(-BARN.d / 2 - 1, Math.max(-L + BARN.d / 2 + 1, p.z)));

    // ---------- Champs et prés (bas : décor) ----------
    for (let i = density(ctx, rng.int(2, 4)); i > 0; i--) {
      const fw = rng.range(14, 32), fl = rng.range(16, 40);
      const fx = rng.range(-W / 2, W / 2 - fw), fz = -rng.range(0, L - fl);
      if (rng.chance(0.55)) {
        const c = CROPS[rng.int(0, CROPS.length - 1)];
        for (let x = fx + 0.8; x < fx + fw; x += 1.6) add(box(1, 0.9, fl).translate(x, 0.45, fz - fl / 2), c, rng.range(0.9, 1.05));
      } else {
        fence(fx, fz, fx + fw, fz); fence(fx, fz - fl, fx + fw, fz - fl);
        fence(fx, fz, fx, fz - fl); fence(fx + fw, fz, fx + fw, fz - fl);
        for (let k = rng.int(2, 5); k > 0; k--) animal(rng.range(fx + 2, fx + fw - 2), rng.range(fz - fl + 2, fz - 2));
      }
    }

    // ---------- Obstacles ----------
    // Fermes
    for (const p of scatter(ctx, rng.chance(0.4) ? 1 : 0, 7)) {
      add(box(10, 6, 8).translate(p.x, 3, p.z), 0xf3ede1);
      add(box(7, 0.4, 8.6).rotateZ(0.6).translate(p.x - 2.6, 7.6, p.z), 0xa33a2b);
      add(box(7, 0.4, 8.6).rotateZ(-0.6).translate(p.x + 2.6, 7.6, p.z), 0xa33a2b);
      add(box(1.2, 2.2, 0.2).translate(p.x, 1.1, p.z + 4.05), 0x6d4c41);
      for (const dx of [-3, 3]) add(box(1.4, 1.3, 0.2).translate(p.x + dx, 3.6, p.z + 4.05), 0x9ec5e0);
      ctx.addCollider(p.x - 2.5, p.z, 4.2); ctx.addCollider(p.x + 2.5, p.z, 4.2);
    }
    // Moulins (seule la tour est un obstacle ; on passe sous les ailes)
    for (const p of scatter(ctx, rng.chance(0.35 + d * 0.25) ? 1 : 0, 3.2)) {
      add(new THREE.CylinderGeometry(1.8, 2.7, 11, 8).translate(p.x, 5.5, p.z), 0xefe6d2);
      add(new THREE.ConeGeometry(2.6, 3, 8).translate(p.x, 12.5, p.z), 0x6d4c41);
      add(box(1.2, 2, 0.2).translate(p.x, 1, p.z + 2.6), 0x5d4037);
      const blades = new THREE.Mesh(a.blades, a.flatMat);
      blades.position.set(p.x, 11.6, p.z + 2.6);
      blades.rotation.z = rng.range(0, Math.PI);
      ctx.group.add(blades);
      ctx.addSpinner(blades, rng.range(0.8, 1.4));
      ctx.addCollider(p.x, p.z, 2.6);
    }
    // Chênes
    for (const p of scatter(ctx, Math.round(4 + d * 8 + rng.range(0, 3)), 2.2)) {
      const s = rng.range(0.9, 1.25);
      add(new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 3 * s, 6).translate(p.x, 1.5 * s, p.z), 0x6d4c41);
      for (let i = 0; i < 3; i++) {
        add(new THREE.IcosahedronGeometry(rng.range(1.6, 2.2) * s, 0).translate(p.x + rng.range(-0.9, 0.9), (3.6 + rng.range(0, 1.4)) * s, p.z + rng.range(-0.9, 0.9)), [0x558b2f, 0x689f38, 0x4e7d2a][rng.int(0, 2)]);
      }
      ctx.addCollider(p.x, p.z, 2 * s);
    }
    // Peupliers
    for (const p of scatter(ctx, rng.int(0, 4), 1.9)) {
      add(box(0.4, 3, 0.4).translate(p.x, 1.5, p.z), 0x6d4c41);
      add(new THREE.ConeGeometry(1.8, 11, 7).translate(p.x, 8, p.z), 0x4f8a2b, rng.range(0.85, 1.1));
      ctx.addCollider(p.x, p.z, 1.6);
    }
    // Silos
    for (const p of scatter(ctx, rng.chance(0.3 + d * 0.2) ? 1 : 0, 2.4)) {
      add(new THREE.CylinderGeometry(2.1, 2.1, 12, 12).translate(p.x, 6, p.z), rng.chance(0.5) ? 0xb0bec5 : 0xc0574a);
      add(new THREE.SphereGeometry(2.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(p.x, 12, p.z), 0x90a4ae);
      ctx.addCollider(p.x, p.z, 2.2);
    }
    // Meules de foin (pyramide de bottes rondes)
    for (const p of scatter(ctx, Math.round(rng.range(1, 2.5 + d * 3)), 2.6)) {
      for (const dx of [-1.85, 0, 1.85]) bale(p.x + dx, 0.9, p.z);
      for (const dx of [-0.92, 0.92]) bale(p.x + dx, 2.5, p.z);
      bale(p.x, 4.1, p.z);
      ctx.addCollider(p.x - 1.2, p.z, 1.3); ctx.addCollider(p.x + 1.2, p.z, 1.3);
    }
    if (!ctx.calm) {
      // Rangée de bottes de foin en travers du chemin, avec un passage
      const z = -rng.range(12, L - 12);
      if (rng.chance(0.2 + d * 0.25) && laneInTile(ctx, z) && ctx.isClear(laneX(ctx, z), z, 6)) {
        for (const x of wallWithGap(ctx, z, 1.9)) {
          if (!ctx.isClear(x, z, 1)) continue;
          bale(x, 0.9, z); bale(x, 2.6, z);
          ctx.addCollider(x, z, 1);
        }
      }
      // Nuée de corbeaux qui traverse le chemin
      const zc = -rng.range(8, L - 8);
      if (d > 0.1 && rng.chance(0.25 + d * 0.4) && laneInTile(ctx, zc)) {
        const crows = new THREE.Mesh(a.flock, a.flatMat);
        crows.position.y = 3.2;
        mover(ctx, crows, { x: laneX(ctx, zc) + rng.range(-8, 8), z: zc, r: 1.7, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    }
    // Animaux qui broutent en liberté
    for (let i = density(ctx, rng.int(3, 7)); i > 0; i--) {
      const x = rng.range(-W / 2, W / 2), z = -rng.range(2, L - 2);
      if (ctx.isClear(x, z, 2)) animal(x, z);
    }

    sowDetails(ctx, parts, 160, [
      (x, z) => detail.tuft(THREE, rng, x, z, 0x5f9a35),
      (x, z) => detail.tuft(THREE, rng, x, z, 0x7ab648),
      (x, z) => detail.flower(THREE, rng, x, z, FLOWERS[rng.int(0, FLOWERS.length - 1)]),
      (x, z) => detail.flower(THREE, rng, x, z, FLOWERS[rng.int(0, FLOWERS.length - 1)]),
      (x, z) => detail.pebble(THREE, rng, x, z, 0x9e9e96),
    ]);
    ctx.merge(parts, a.flatMat);
  },
};
