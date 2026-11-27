// Point d'entrée : crée le jeu, branche les boutons, enregistre le service worker.
import { Game } from './core/game.js';
import { hud } from './ui/hud.js';
import { VERSION } from './version.js';
import { isTouchDevice } from './core/orientation.js';
import { autoEnableTilt, getControl, setControl, isInverted, setInverted } from './input/tilt.js';

autoEnableTilt();
document.getElementById('version').textContent = `version ${VERSION}`;

try {
  const game = new Game(document.getElementById('game'));
  window.__game = game; // debug console
  hud.buildMenu((mode) => game.start(mode));
  document.getElementById('again').addEventListener('click', (e) => { e.stopPropagation(); game.start(); });
  const ctrl = document.getElementById('control');
  const showControl = () => { ctrl.textContent = getControl() === 'tilt' ? 'Commandes : inclinaison' : 'Commandes : toucher gauche/droite'; };
  showControl();
  ctrl.addEventListener('click', (e) => { e.stopPropagation(); setControl(getControl() === 'tilt' ? 'touch' : 'tilt'); showControl(); });
  const inv = document.getElementById('invert');
  const showInvert = () => { inv.textContent = isInverted() ? 'Sens de l\u2019inclinaison : inversé' : 'Sens de l\u2019inclinaison : normal'; };
  showInvert();
  inv.addEventListener('click', (e) => { e.stopPropagation(); setInverted(!isInverted()); showInvert(); });
  // --- Clavier (ordinateur) ---
  // ← → (ou Q/D) : diriger · Entrée / Espace : jouer, rejouer · Échap : menu
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if ((e.key === 'Enter' || e.key === ' ') && game.state !== 'playing') {
      e.preventDefault();
      // Entrée sur un bouton du menu = ce bouton ; sinon on relance le dernier mode
      if (e.key === 'Enter' && document.activeElement?.dataset?.mode) return;
      game.start();
    } else if (e.key === 'Escape' && game.state !== 'menu') {
      game.toMenu();
    }
  });
  if (!isTouchDevice) {
    document.body.classList.add('desktop');
    document.getElementById('tagline').textContent = 'Flèches ← → pour diriger · Entrée pour jouer · Échap pour le menu';
    document.getElementById('againHint').textContent = 'Entrée pour rejouer · Échap pour le menu';
  }
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
