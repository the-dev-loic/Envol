// Entrée de direction : renvoie une valeur entre -1 (gauche) et 1 (droite).
// Source principale : inclinaison du téléphone (DeviceOrientation).
// Secours : flèches du clavier, ou toucher la moitié gauche/droite de l'écran.
//
// Pourquoi un vecteur "haut" plutôt que gamma directement ?
// - gamma saute brutalement (±90°) quand on incline fort ou qu'on tient le téléphone droit ;
// - iOS peut faire pivoter l'écran en paysage en cours de partie, ce qui changeait l'axe lu.
// On reconstruit donc la direction de la gravité (continue, sans saut). Le jeu est toujours
// en paysage (src/core/orientation.js) : l'axe gauche/droite du jeu est l'axe Y du téléphone,
// dans un sens ou l'autre selon le côté où on tient le téléphone.
import { CONFIG } from '../config.js';
import { gameAngle, isForced } from '../core/orientation.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const up = { x: 0, y: 0, z: 1 };  // direction "vers le ciel" dans le repère du téléphone
let neutralDeg = 0;                // position "tout droit"
let hasTilt = false;
let listening = false;
let keyAxis = 0;
// Choix du joueur, mémorisé : 'tilt' (inclinaison) ou 'touch' (toucher gauche/droite).
let control = localStorage.getItem('birdrun.control') || 'tilt';
let touchAxis = 0;

function onOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  hasTilt = true;
  const b = e.beta * D2R, g = e.gamma * D2R;
  up.x = -Math.sin(g) * Math.cos(b);
  up.y = Math.sin(b);
  up.z = Math.cos(b) * Math.cos(g);
}

/** Inclinaison gauche/droite en degrés, dans le repère du jeu (paysage). */
function lateralDeg() {
  const v = gameAngle() === -90 ? -up.y : up.y;
  return Math.asin(Math.max(-1, Math.min(1, v))) * R2D;
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('deviceorientation', onOrientation);
}

/**
 * Demande l'accès aux mouvements (iOS l'exige, depuis un geste utilisateur).
 * iOS ne garde l'autorisation que tant que l'app est ouverte : on ne la demande donc
 * qu'une fois par lancement, et jamais si le joueur a choisi les commandes tactiles.
 */
let pending = null;
export function enableTilt() {
  if (control !== 'tilt') return Promise.resolve(false);
  if (listening) return Promise.resolve(true);
  // Un seul appel à la fois (le 1er toucher et le bouton de départ peuvent arriver ensemble).
  pending ??= requestAccess().finally(() => { pending = null; });
  return pending;
}

async function requestAccess() {
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission();
      if (res !== 'granted') return false;
    }
    listen();
    return true;
  } catch {
    return false;
  }
}

/**
 * Au chargement : active l'inclinaison sans rien demander si c'est possible
 * (Android, ou autorisation iOS déjà accordée pour cette session), sinon la demande
 * au PREMIER toucher n'importe où (avant même de choisir un mode).
 */
export function autoEnableTilt() {
  const DOE = window.DeviceOrientationEvent;
  if (control !== 'tilt' || !DOE) return;
  if (typeof DOE.requestPermission !== 'function') { listen(); return; }
  DOE.requestPermission().then((r) => { if (r === 'granted') listen(); }).catch(() => {});
  const onFirstGesture = () => {
    enableTilt();
    document.removeEventListener('touchend', onFirstGesture, true);
    document.removeEventListener('click', onFirstGesture, true);
  };
  document.addEventListener('touchend', onFirstGesture, true);
  document.addEventListener('click', onFirstGesture, true);
}

export function getControl() {
  return control;
}

export function setControl(value) {
  control = value;
  localStorage.setItem('birdrun.control', value);
  if (value === 'tilt') enableTilt();
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
  if (control === 'tilt' && hasTilt) {
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
  if (control === 'tilt' && hasTilt) { touchAxis = 0; return; }
  let axis = 0;
  // Le jeu peut être tourné de 90° : on ramène le toucher dans le repère du jeu.
  for (const t of e.touches) {
    const x = isForced() ? 1 - t.clientY / window.innerHeight : t.clientX / window.innerWidth;
    axis += x < 0.5 ? -1 : 1;
  }
  touchAxis = Math.max(-1, Math.min(1, axis));
}
window.addEventListener('touchstart', onTouch, { passive: true });
window.addEventListener('touchmove', onTouch, { passive: true });
window.addEventListener('touchend', onTouch, { passive: true });
