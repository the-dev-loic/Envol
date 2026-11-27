// Point d'entrée : crée le jeu, branche les boutons, enregistre le service worker.
import { Game } from './core/game.js';

try {
  const game = new Game(document.getElementById('game'));
  window.__game = game; // debug console
  for (const id of ['menu', 'over']) {
    document.getElementById(id).addEventListener('click', () => game.start());
  }
} catch (err) {
  // Typiquement : WebGL indisponible. On l'affiche au lieu d'un écran figé.
  document.querySelector('#menu .cta').textContent = 'Impossible de lancer la 3D sur cet appareil.';
  document.getElementById('hint').textContent = String(err?.message || err);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
