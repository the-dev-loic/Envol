// Briques réutilisables par les thèmes pour poser décor et obstacles.
// Toutes reçoivent le "ctx" fourni par World.populate (voir CLAUDE.md, contrat d'un thème).
import { CONFIG } from '../config.js';

/** Centre du couloir sûr à une distance donnée (z "global", positif vers l'avant). */
export function safeX(distance) {
  const { amplitude, wavelength } = CONFIG.safeLane;
  const k = (Math.PI * 2) / wavelength;
  // Deux sinusoïdes pour un tracé moins prévisible, pente toujours franchissable.
  return amplitude * (0.75 * Math.sin(distance * k) + 0.25 * Math.sin(distance * k * 2.3 + 1.7));
}

/** Une position est-elle libre pour un obstacle fixe de rayon r (hors couloir sûr) ? */
export function isFree(ctx, x, z, r) {
  const { halfWidthEasy, halfWidthHard } = CONFIG.safeLane;
  const lane = halfWidthEasy + (halfWidthHard - halfWidthEasy) * ctx.difficulty;
  return Math.abs(x - safeX(ctx.distanceAt(z))) > lane + r;
}

/** Sol du tronçon (géométrie partagée). */
export function ground(ctx, material) {
  ctx.group.add(new ctx.THREE.Mesh(ctx.shared.ground, material));
}

/**
 * Pose N instances d'une même géométrie en un seul appel de rendu.
 * items: [{ x, y=0, z, sx=1, sy=sx, sz=sx, rotY=rnd, color? }]
 */
export function instances(ctx, geometry, material, items) {
  if (!items.length) return null;
  const { THREE } = ctx;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0), color = new THREE.Color();
  items.forEach((it, i) => {
    const sx = it.sx ?? 1;
    q.setFromAxisAngle(axis, it.rotY ?? ctx.rng.range(0, Math.PI * 2));
    m.compose(p.set(it.x, it.y ?? 0, it.z), q, s.set(sx, it.sy ?? sx, it.sz ?? sx));
    mesh.setMatrixAt(i, m);
    if (it.color != null) mesh.setColorAt(i, color.setHex(it.color));
  });
  ctx.group.add(mesh);
  ctx.track(mesh);
  return mesh;
}

/** Points aléatoires dans le couloir, hors couloir sûr. */
export function scatter(ctx, count, radius) {
  const out = [];
  const hw = ctx.halfWidth - 1;
  for (let tries = 0; out.length < count && tries < count * 6; tries++) {
    const x = ctx.rng.range(-hw, hw);
    const z = -ctx.rng.range(2, ctx.length - 2);
    if (isFree(ctx, x, z, radius)) out.push({ x, z });
  }
  return out;
}

/** Positions X d'un mur en travers du couloir, avec un trou centré sur le couloir sûr. */
export function wallWithGap(ctx, z, spacing) {
  const xs = [];
  for (let x = -ctx.halfWidth + spacing / 2; x < ctx.halfWidth; x += spacing) {
    if (isFree(ctx, x, z, spacing * 0.45)) xs.push(x);
  }
  return xs;
}

/** Décor de bord (hors zone jouable), des deux côtés. */
export function borders(ctx, count, minOut, maxOut) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    out.push({ x: side * ctx.rng.range(ctx.halfWidth + minOut, ctx.halfWidth + maxOut), z: -ctx.rng.range(0, ctx.length) });
  }
  return out;
}

/**
 * Obstacle mobile : un objet qui va et vient latéralement (il peut croiser le couloir sûr,
 * c'est voulu : il faut viser le bon moment).
 */
export function mover(ctx, object, { x, z, r, amplitude, speed }) {
  object.position.set(x, object.position.y, z);
  ctx.group.add(object);
  ctx.addMover({ object, x0: x, z, r, amplitude, speed, phase: ctx.rng.range(0, Math.PI * 2) });
}
