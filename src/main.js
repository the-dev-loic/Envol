// Point d'entrée : crée le jeu, branche les boutons, enregistre le service worker.
import { Game } from './core/game.js';
import { hud } from './ui/hud.js';
import { autoEnableTilt, getControl, setControl } from './input/tilt.js';

autoEnableTilt();

try {
  const game = new Game(document.getElementById('game'));
  window.__game = game; // debug console
  hud.buildMenu((mode) => game.start(mode));
  document.getElementById('again').addEventListener('click', (e) => { e.stopPropagation(); game.start(); });
  const ctrl = document.getElementById('control');
  const showControl = () => { ctrl.textContent = getControl() === 'tilt' ? 'Commandes : inclinaison' : 'Commandes : toucher gauche/droite'; };
  showControl();
  ctrl.addEventListener('click', (e) => { e.stopPropagation(); setControl(getControl() === 'tilt' ? 'touch' : 'tilt'); showControl(); });
  document.getElementById('toMenu').addEventListener('click', (e) => { e.stopPropagation(); game.toMenu(); });
} catch (err) {
  // Typiquement : WebGL indisponible. On l'affiche au lieu d'un écran figé.
  document.getElementById('hint').textContent = 'Impossible de lancer la 3D sur cet appareil : ' + String(err?.message || err);
}

// Hors connexion : le service worker garde une copie complète du jeu sur le téléphone.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.ready.then(async () => {
    // Le jeu est prêt hors connexion quand un fichier chargé en dernier est en cache.
    for (let i = 0; i < 20; i++) {
      if (await caches.match('./src/world/themes/country.js', { ignoreSearch: true })) {
        document.getElementById('offline').textContent = '✓ Jouable sans connexion';
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  });
}
