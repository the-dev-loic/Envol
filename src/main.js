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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
