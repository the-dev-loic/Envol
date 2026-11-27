// Point d'entrée : crée le jeu, branche les boutons, enregistre le service worker.
import { Game } from './core/game.js';

const game = new Game(document.getElementById('game'));
window.__game = game; // debug console

for (const id of ['menu', 'over']) {
  document.getElementById(id).addEventListener('click', () => game.start());
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
