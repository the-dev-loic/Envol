// Entrée de direction : renvoie une valeur entre -1 (gauche) et 1 (droite).
// Source principale : inclinaison du téléphone (DeviceOrientation).
// Secours : flèches du clavier, ou toucher la moitié gauche/droite de l'écran.
//
// Pourquoi un vecteur "haut" plutôt que gamma directement ?
// - gamma saute brutalement (±90°) quand on incline fort ou qu'on tient le téléphone droit ;
// - iOS peut faire pivoter l'écran en paysage en cours de partie, ce qui changeait l'axe lu.
// On reconstruit donc la direction de la gravité (continue, sans saut). Le jeu reste toujours
// en portrait par rapport au téléphone (src/core/orientation.js), donc l'axe gauche/droite
// est toujours l'axe X du téléphone.
import { CONFIG } from '../config.js';
import { rotation } from '../core/orientation.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const up = { x: 0, y: 0, z: 1 };  // direction "vers le ciel" dans le repère du téléphone
let neutralDeg = 0;                // position "tout droit"
let hasTilt = false;
let keyAxis = 0;
let touchAxis = 0;

function onOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  hasTilt = true;
  const b = e.beta * D2R, g = e.gamma * D2R;
  up.x = -Math.sin(g) * Math.cos(b);
  up.y = Math.sin(b);
  up.z = Math.cos(b) * Math.cos(g);
}

/** Inclinaison gauche/droite en degrés (axe X du téléphone, tenu en portrait). */
function lateralDeg() {
  return Math.asin(Math.max(-1, Math.min(1, -up.x))) * R2D;
}

/** À appeler depuis un geste utilisateur (tap) : iOS l'exige. */
export async function enableTilt() {
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission();
      if (res !== 'granted') return false;
    }
    window.addEventListener('deviceorientation', onOrientation);
    return true;
  } catch {
    return false;
  }
}

/** Mémorise la position actuelle du téléphone comme "tout droit". */
export function calibrate() {
  neutralDeg = lateralDeg();
}

export function isTiltActive() {
  return hasTilt;
}

export function getSteer() {
  const { tiltMaxDeg, deadzoneDeg } = CONFIG.steer;
  let v = 0;
  if (hasTilt) {
    let d = lateralDeg() - neutralDeg;
    if (Math.abs(d) < deadzoneDeg) d = 0;
    else d -= Math.sign(d) * deadzoneDeg;
    v = d / (tiltMaxDeg - deadzoneDeg);
  }
  v += keyAxis + touchAxis;
  return Math.max(-1, Math.min(1, v));
}

// --- secours clavier / tactile ---
const keys = new Set();
function updateKeys() {
  keyAxis = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('q') || keys.has('a') ? 1 : 0);
}
window.addEventListener('keydown', (e) => { keys.add(e.key); updateKeys(); });
window.addEventListener('keyup', (e) => { keys.delete(e.key); updateKeys(); });

function onTouch(e) {
  if (hasTilt) { touchAxis = 0; return; }
  let axis = 0;
  const r = rotation(); // le jeu peut être tourné : on ramène le toucher dans le repère du jeu
  for (const t of e.touches) {
    const x = r === 90 ? 1 - t.clientY / window.innerHeight : r === -90 ? t.clientY / window.innerHeight : t.clientX / window.innerWidth;
    axis += x < 0.5 ? -1 : 1;
  }
  touchAxis = Math.max(-1, Math.min(1, axis));
}
window.addEventListener('touchstart', onTouch, { passive: true });
window.addEventListener('touchmove', onTouch, { passive: true });
window.addEventListener('touchend', onTouch, { passive: true });
