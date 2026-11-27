// Entrée de direction : renvoie une valeur entre -1 (gauche) et 1 (droite).
// Source principale : inclinaison du téléphone (DeviceOrientation).
// Secours : flèches du clavier, ou toucher la moitié gauche/droite de l'écran.
import { CONFIG } from '../config.js';

let tiltDeg = 0;          // inclinaison gauche/droite brute, en degrés
let neutralDeg = 0;       // position de référence (calibrée au départ)
let hasTilt = false;
let keyAxis = 0;
let touchAxis = 0;

function screenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
  return typeof window.orientation === 'number' ? window.orientation : 0;
}

function onOrientation(e) {
  if (e.gamma == null) return;
  hasTilt = true;
  const a = screenAngle();
  // Convertit selon l'orientation de l'écran pour avoir toujours "gauche/droite".
  if (a === 90) tiltDeg = e.beta;
  else if (a === -90 || a === 270) tiltDeg = -e.beta;
  else if (a === 180) tiltDeg = -e.gamma;
  else tiltDeg = e.gamma;
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
  neutralDeg = tiltDeg;
}

export function isTiltActive() {
  return hasTilt;
}

export function getSteer() {
  const { tiltMaxDeg, deadzoneDeg } = CONFIG.steer;
  let v = 0;
  if (hasTilt) {
    let d = tiltDeg - neutralDeg;
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
  for (const t of e.touches) axis += t.clientX < window.innerWidth / 2 ? -1 : 1;
  touchAxis = Math.max(-1, Math.min(1, axis));
}
window.addEventListener('touchstart', onTouch, { passive: true });
window.addEventListener('touchmove', onTouch, { passive: true });
window.addEventListener('touchend', onTouch, { passive: true });
