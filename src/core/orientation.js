// Garde le jeu en PAYSAGE, même si le téléphone est tenu en portrait.
// Safari iOS ne sait pas verrouiller l'orientation (screen.orientation.lock non supporté),
// donc quand l'écran est en portrait on fait tourner tout le jeu (#app) de 90°.
// Les deux sens du paysage sont acceptés (sinon l'image serait à l'envers en retournant le téléphone).
// Ailleurs (Android…), on tente aussi le vrai verrouillage.

const app = document.getElementById('app');
let forced = false;   // true = écran en portrait, jeu tourné de 90° pour rester en paysage

/** Angle de rotation de l'écran : 0, 90 ou -90. */
function screenAngle() {
  let a = screen.orientation?.angle ?? window.orientation ?? 0;
  if (a === 270) a = -90;
  return a === 180 ? 0 : a;
}

/** Taille de l'aire de jeu (toujours en paysage). */
export function viewportSize() {
  const w = window.innerWidth, h = window.innerHeight;
  return forced ? { w: h, h: w } : { w, h };
}

/** Orientation effective du jeu par rapport au téléphone : 90 ou -90 (paysage). */
export function gameAngle() {
  if (forced) return 90;
  const a = screenAngle();
  return a === -90 ? -90 : 90;
}

/** true si le jeu est tourné de 90° (sert à convertir les coordonnées de toucher). */
export function isForced() {
  return forced;
}

export function applyLandscape() {
  const w = window.innerWidth, h = window.innerHeight;
  forced = h > w;
  if (forced) {
    // Le haut du jeu se retrouve sur le bord gauche du téléphone (comme un paysage "classique").
    app.style.width = `${h}px`;
    app.style.height = `${w}px`;
    app.style.transform = `translateY(${h}px) rotate(-90deg)`;
  } else {
    app.style.width = '100%';
    app.style.height = '100%';
    app.style.transform = '';
  }
}

export function tryNativeLock() {
  screen.orientation?.lock?.('landscape').catch(() => {});
}
