// Briques réutilisables par les thèmes pour poser décor et obstacles dans une CASE du monde ouvert.
// Toutes reçoivent le "ctx" fourni par World (voir CLAUDE.md, contrat d'un thème).
// Coordonnées locales à la case : x ∈ [-width/2, width/2], z ∈ [-length, 0].
import { CONFIG } from '../config.js';
import { createRng } from '../core/rng.js';

let phase = [0, 0];

/** Change le tracé du chemin sûr (appelé à chaque nouvelle partie avec une graine aléatoire). */
export function setLaneSeed(seed) {
  const r = createRng(seed);
  phase = [r.range(0, Math.PI * 2), r.range(0, Math.PI * 2)];
}

/** Position X (MONDE) du chemin sûr à une distance donnée. */
export function safeX(distance) {
  const { amplitude, wavelength } = CONFIG.safeLane;
  const k = (Math.PI * 2) / wavelength;
  // Deux sinusoïdes, décalées selon la graine : tracé différent à chaque partie,
  // pente toujours rattrapable par l'oiseau.
  return amplitude * (0.75 * Math.sin(distance * k + phase[0]) + 0.25 * Math.sin(distance * k * 2.3 + phase[1]));
}

/** Position X (LOCALE à la case) du chemin sûr à la profondeur z de la case. */
export function laneX(ctx, z) {
  return safeX(ctx.distanceAt(z)) - ctx.offsetX;
}

/** Le chemin sûr traverse-t-il cette case à la profondeur z ? */
export function laneInTile(ctx, z, margin = 0) {
  return Math.abs(laneX(ctx, z)) < ctx.width / 2 - margin;
}

/** Une position est-elle libre pour un obstacle fixe de rayon r (hors chemin sûr) ? */
export function isFree(ctx, x, z, r) {
  const { halfWidthEasy, halfWidthHard } = CONFIG.safeLane;
  const lane = halfWidthEasy + (halfWidthHard - halfWidthEasy) * ctx.difficulty + ctx.laneMargin;
  return Math.abs(x - laneX(ctx, z)) > lane + r;
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

/** Ajuste une quantité donnée pour une case de 100 m à la largeur réelle de la case. */
export function density(ctx, count) {
  const n = count * ctx.width / 100;
  return Math.floor(n) + (ctx.rng.next() < n % 1 ? 1 : 0);
}

/** Points aléatoires dans la case, hors chemin sûr (et hors zones réservées par le thème). */
export function scatter(ctx, count, radius) {
  count = density(ctx, count);
  const out = [];
  const hw = ctx.width / 2;
  for (let tries = 0; out.length < count && tries < count * 6; tries++) {
    const x = ctx.rng.range(-hw, hw);
    const z = -ctx.rng.range(1, ctx.length - 1);
    if (isFree(ctx, x, z, radius) && ctx.isClear(x, z, radius)) out.push({ x, z });
  }
  return out;
}

/**
 * Rangée d'obstacles en travers du chemin sûr, avec un seul passage (le chemin).
 * Renvoie les positions X locales. À n'appeler que si laneInTile(ctx, z).
 */
export function wallWithGap(ctx, z, spacing, halfLength = 24) {
  const c = laneX(ctx, z);
  const xs = [];
  for (let x = c - halfLength; x <= c + halfLength; x += spacing) {
    if (isFree(ctx, x, z, spacing * 0.45)) xs.push(x);
  }
  return xs;
}

/**
 * Obstacle mobile : un objet qui va et vient latéralement (il peut croiser le chemin sûr,
 * c'est voulu : il faut viser le bon moment).
 */
export function mover(ctx, object, { x, z, r, amplitude, speed }) {
  object.position.set(x, object.position.y, z);
  ctx.group.add(object);
  ctx.addMover({ object, x0: x, z, r, amplitude, speed, phase: ctx.rng.range(0, Math.PI * 2) });
}
