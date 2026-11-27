// Garde le jeu en PORTRAIT par rapport au téléphone, même si iOS fait pivoter l'écran.
// Safari iOS ne sait pas verrouiller l'orientation (screen.orientation.lock non supporté),
// donc quand l'écran passe en paysage on fait tourner tout le jeu (#app) en sens inverse.
// Ailleurs (Android…), on tente aussi le vrai verrouillage.

const app = document.getElementById('app');
let current = 0;

/** Angle de rotation de l'écran : 0, 90 ou -90. */
export function screenAngle() {
  let a = screen.orientation?.angle ?? window.orientation ?? 0;
  if (a === 270) a = -90;
  // Sécurité : si l'angle n'est pas fiable, on se fie aux dimensions.
  if (a === 0 && window.innerWidth > window.innerHeight) a = 90;
  return a === 180 ? 0 : a;
}

/** Taille de l'aire de jeu (toujours en portrait). */
export function viewportSize() {
  const w = window.innerWidth, h = window.innerHeight;
  return current ? { w: h, h: w } : { w, h };
}

/** Rotation appliquée (0, 90, -90) — sert à convertir les coordonnées de toucher. */
export function rotation() {
  return current;
}

export function applyPortrait() {
  current = window.innerWidth > window.innerHeight ? screenAngle() : 0;
  const w = window.innerWidth, h = window.innerHeight;
  if (current === 90) {
    app.style.width = `${h}px`;
    app.style.height = `${w}px`;
    app.style.transform = `translateY(${h}px) rotate(-90deg)`;
  } else if (current === -90) {
    app.style.width = `${h}px`;
    app.style.height = `${w}px`;
    app.style.transform = `translateX(${w}px) rotate(90deg)`;
  } else {
    app.style.width = '100%';
    app.style.height = '100%';
    app.style.transform = '';
  }
}

export function tryNativeLock() {
  screen.orientation?.lock?.('portrait').catch(() => {});
}
