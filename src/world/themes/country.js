// Thème "Campagne" : granges à traverser, moulins aux ailes qui tournent, silos, chênes,
// meules de foin, champs cultivés, prés clôturés avec vaches, moutons, cochons, poules,
// et des nuées de corbeaux à éviter.
// Presque tout le décor d'un tronçon est fusionné en une seule géométrie (merge.js).
import { ground, scatter, wallWithGap, mover, safeX } from '../obstacles.js';
import { mergeColored } from '../merge.js';

const CROPS = [0xe9c46a, 0x9ccc65, 0xd4a373, 0xb5a1e0, 0x7cb342];
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
      groundMat: new THREE.MeshLambertMaterial({ color: 0x8cc152 }),
      flatMat,
      blades: mergeColored(THREE, blades),
      flock: mergeColored(THREE, flock),
    };
  },

  populateChunk(ctx) {
    const { THREE, rng, difficulty: d, assets: a, length: L, halfWidth: hw } = ctx;
    ground(ctx, a.groundMat);
    const parts = [];
    const add = (geometry, color, shade) => parts.push({ geometry, color, shade });
    const box = (w, h, dp) => new THREE.BoxGeometry(w, h, dp);
    /** Place une pièce : rotation autour de Y puis translation. */
    const put = (g, x, y, z, rot = 0) => g.rotateY(rot).translate(x, y, z);
    const reserved = []; // zones déjà occupées (granges) : { x, z, r }
    const clear = (p, r) => reserved.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.r + r);
    const spots = (n, r) => scatter(ctx, n * 2, r).filter((p) => clear(p, r)).slice(0, n);

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

    // ---------- Clôture ----------
    function fence(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1), rot = Math.atan2(-(z2 - z1), x2 - x1);
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      for (const y of [0.55, 1.05]) add(put(box(len, 0.12, 0.08), mx, y, mz, rot), 0xa1887f);
      for (let t = 0; t <= len; t += 3) {
        const f = len ? t / len : 0;
        add(box(0.16, 1.3, 0.16).translate(x1 + (x2 - x1) * f, 0.65, z1 + (z2 - z1) * f), 0x8d6e63);
      }
    }

    // ---------- Grange à traverser (centrée sur le couloir sûr) ----------
    function barn(cx, cz) {
      const { w, d: dp, h, doorHalf: dh, doorH } = BARN;
      const red = 0xb5382e, white = 0xf4efe6, roof = 0x4e4e52;
      // Murs latéraux
      for (const s of [-1, 1]) {
        add(box(0.4, h, dp).translate(cx + s * w / 2, h / 2, cz), red);
        for (let z = cz - dp / 2; z <= cz + dp / 2; z += 1.4) ctx.addCollider(cx + s * w / 2, z - 0, 0.6);
      }
      // Façades avant/arrière avec grande porte ouverte
      for (const fz of [cz + dp / 2, cz - dp / 2]) {
        const pw = w / 2 - dh;
        for (const s of [-1, 1]) {
          add(box(pw, h, 0.4).translate(cx + s * (dh + pw / 2), h / 2, fz), red);
          add(box(0.3, doorH, 0.5).translate(cx + s * dh, doorH / 2, fz), white);                 // montant
          add(box(0.25, doorH, 0.3).translate(cx + s * (dh + pw / 2), doorH / 2, fz), white, 0.95); // planche décorative
          for (let x = dh + 0.6; x <= w / 2; x += 1.2) ctx.addCollider(cx + s * x, fz, 0.6);
        }
        add(box(2 * dh + 0.3, h - doorH, 0.4).translate(cx, doorH + (h - doorH) / 2, fz), red);  // linteau
        add(box(2 * dh + 0.3, 0.3, 0.5).translate(cx, doorH, fz), white);
        // Pignon triangulaire
        const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 4.2)]);
        add(new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }).translate(cx, h, fz - 0.2), red);
        add(box(1.4, 1.4, 0.45).translate(cx, h + 1.6, fz), white);                               // lucarne
      }
      // Toit à deux pans
      const half = w / 2 + 0.6, ang = Math.atan2(4.2, w / 2), slope = Math.hypot(half, 4.2 * half / (w / 2));
      for (const s of [-1, 1]) {
        add(box(slope, 0.3, dp + 1.2).rotateZ(s * -ang).translate(cx + s * half / 2, h + 2.1, cz), roof);
      }
      // Bottes de paille à l'intérieur
      for (const s of [-1, 1]) {
        for (let z = cz - dp / 2 + 2; z < cz + dp / 2 - 1; z += 2.2) {
          add(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 10).rotateZ(Math.PI / 2).translate(cx + s * (w / 2 - 1.6), 0.8, z), 0xe3c16f);
        }
      }
    }

    // ---------- Décor des bords : haies, champs, prés, fermes ----------
    for (const side of [-1, 1]) {
      add(box(1.4, 1.3, L).translate(side * (hw + 1), 0.65, -L / 2), 0x5e8c31);           // haie
      // Champs cultivés en rangées
      let z = 0;
      while (z > -L) {
        const len = rng.range(18, 34), x0 = hw + 3, wdt = rng.range(18, 40);
        const zEnd = Math.max(-L, z - len);
        if (z - zEnd < 4) { z = zEnd - 1; continue; }
        if (rng.chance(0.55)) {
          const c = CROPS[rng.int(0, CROPS.length - 1)];
          for (let x = x0 + 1; x < x0 + wdt; x += 1.6) add(box(1, 0.9, z - zEnd - 1).translate(side * x, 0.45, (z + zEnd) / 2), c, rng.range(0.9, 1.05));
        } else {
          // Pré clôturé avec des animaux
          const xa = side * x0, xb = side * (x0 + wdt);
          fence(xa, z - 0.5, xb, z - 0.5); fence(xa, zEnd + 0.5, xb, zEnd + 0.5);
          fence(xb, z - 0.5, xb, zEnd + 0.5);
          for (let i = rng.int(2, 5); i > 0; i--) animal(side * rng.range(x0 + 2, x0 + wdt - 2), rng.range(zEnd + 2, z - 2));
        }
        z = zEnd - 1;
      }
      // Ferme au loin
      if (rng.chance(0.35)) {
        const x = side * rng.range(hw + 50, hw + 75), z0 = -rng.range(10, L - 10);
        add(box(10, 6, 8).translate(x, 3, z0), 0xf3ede1);
        add(box(7, 0.4, 8.6).rotateZ(0.6).translate(x - 2.6, 7.6, z0), 0xa33a2b);
        add(box(7, 0.4, 8.6).rotateZ(-0.6).translate(x + 2.6, 7.6, z0), 0xa33a2b);
      }
      // Peupliers
      for (let zz = -rng.range(0, 10); zz > -L; zz -= rng.range(10, 22)) {
        const x = side * rng.range(hw + 45, hw + 90);
        add(box(0.4, 3, 0.4).translate(x, 1.5, zz), 0x6d4c41);
        add(new THREE.ConeGeometry(1.8, 11, 7).translate(x, 8, zz), 0x4f8a2b, rng.range(0.85, 1.1));
      }
    }

    if (!ctx.calm) {
      // Grange à traverser
      if (rng.chance(0.3 + d * 0.15)) {
        const cz = -rng.range(BARN.d / 2 + 4, L - BARN.d / 2 - 4);
        const cx = safeX(ctx.distanceAt(cz));
        barn(cx, cz);
        reserved.push({ x: cx, z: cz, r: 10 });
      }
      // Moulin (les ailes tournent ; seule la tour est un obstacle)
      for (const p of spots(rng.chance(0.25 + d * 0.25) ? 1 : 0, 3.2)) {
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
      for (const p of spots(Math.round(2 + d * 5 + rng.range(0, 2)), 2.2)) {
        const s = rng.range(0.9, 1.25);
        add(new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 3 * s, 6).translate(p.x, 1.5 * s, p.z), 0x6d4c41);
        for (let i = 0; i < 3; i++) {
          add(new THREE.IcosahedronGeometry(rng.range(1.6, 2.2) * s, 0).translate(p.x + rng.range(-0.9, 0.9), (3.6 + rng.range(0, 1.4)) * s, p.z + rng.range(-0.9, 0.9)), [0x558b2f, 0x689f38, 0x4e7d2a][rng.int(0, 2)]);
        }
        ctx.addCollider(p.x, p.z, 2 * s);
      }
      // Silos
      for (const p of spots(rng.chance(0.3 + d * 0.2) ? 1 : 0, 2.4)) {
        const c = rng.chance(0.5) ? 0xb0bec5 : 0xc0574a;
        add(new THREE.CylinderGeometry(2.1, 2.1, 12, 12).translate(p.x, 6, p.z), c);
        add(new THREE.SphereGeometry(2.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(p.x, 12, p.z), 0x90a4ae);
        ctx.addCollider(p.x, p.z, 2.2);
      }
      // Meules de foin (pyramide de bottes rondes)
      for (const p of spots(Math.round(rng.range(0, 1.5 + d * 2)), 2.4)) {
        const bale = (x, y, z) => add(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10).rotateZ(Math.PI / 2).translate(x, y, z), 0xe3c16f, rng.range(0.92, 1.05));
        for (const dx of [-1.85, 0, 1.85]) bale(p.x + dx, 0.9, p.z);
        for (const dx of [-0.92, 0.92]) bale(p.x + dx, 2.5, p.z);
        bale(p.x, 4.1, p.z);
        ctx.addCollider(p.x - 1.2, p.z, 1.3); ctx.addCollider(p.x + 1.2, p.z, 1.3);
      }
      // Rangée de bottes de foin en travers, avec un passage
      if (rng.chance(0.2 + d * 0.25)) {
        const z = -rng.range(12, L - 12);
        if (reserved.every((o) => Math.abs(o.z - z) > o.r + 2)) {
          for (const x of wallWithGap(ctx, z, 1.9)) {
            for (const y of [0.9, 2.6]) add(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10).rotateZ(Math.PI / 2).translate(x, y, z), 0xe3c16f, rng.range(0.92, 1.05));
            ctx.addCollider(x, z, 1);
          }
        }
      }
      // Animaux qui broutent dans le couloir (décor)
      for (let i = rng.int(2, 6); i > 0; i--) {
        const p = { x: rng.range(-hw + 2, hw - 2), z: -rng.range(2, L - 2) };
        if (clear(p, 2)) animal(p.x, p.z);
      }
      // Nuée de corbeaux qui traverse
      if (d > 0.1 && rng.chance(0.25 + d * 0.4)) {
        const crows = new THREE.Mesh(a.flock, a.flatMat);
        crows.position.y = 3.2;
        mover(ctx, crows, { x: rng.range(-12, 12), z: -rng.range(8, L - 8), r: 1.7, amplitude: rng.range(8, 16), speed: rng.range(0.9, 1.5 + d) });
      }
    } else {
      for (let i = rng.int(2, 4); i > 0; i--) animal(rng.range(-hw + 2, hw - 2), -rng.range(2, L - 2));
    }

    const mesh = new THREE.Mesh(mergeColored(THREE, parts), a.flatMat);
    ctx.group.add(mesh);
    ctx.track(mesh.geometry);
  },
};
