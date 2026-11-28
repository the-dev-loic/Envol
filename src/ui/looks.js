// Styles graphiques au choix (menu « 🎨 Style »). Le monde reste le même, seul le rendu change :
//   - filter  : filtre CSS appliqué à l'image du jeu (couleurs, sépia, noir et blanc, flou…)
//   - pixel   : résolution réduite + agrandissement sans lissage (gros pixels)
//   - tones   : 3 tons d'ombrage des matériaux cartoon (style.js)
//   - overlay : calque décoratif par-dessus l'image (vignette, trame BD, papier)
//   - night   : fige l'heure la nuit (Néon)
import { setShadingTones } from '../world/style.js';

export const LOOKS = {
  cartoon:    { label: 'Dessin animé', icon: '🎨', filter: '', tones: [120, 195, 255] },
  pastel:     { label: 'Pastel', icon: '🍬', filter: 'saturate(0.6) brightness(1.13) contrast(0.86)', tones: [190, 228, 255] },
  neon:       { label: 'Néon', icon: '🌃', filter: 'hue-rotate(38deg) saturate(1.6) contrast(1.2) brightness(1.3)', tones: [80, 170, 255], night: 0.9, overlay: 'scanlines' },
  pixel:      { label: 'Pixel', icon: '👾', filter: 'saturate(1.3) contrast(1.08)', tones: [100, 185, 255], pixel: 0.2 },
  retro:      { label: 'Rétro', icon: '📜', filter: 'sepia(0.8) contrast(1.08) brightness(1.03) saturate(1.15)', tones: [130, 200, 255], overlay: 'vignette' },
  comic:      { label: 'BD', icon: '✏️', filter: 'grayscale(1) contrast(1.75) brightness(1.1)', tones: [55, 55, 255], overlay: 'halftone' },
  watercolor: { label: 'Aquarelle', icon: '🖌️', filter: 'saturate(1.25) contrast(0.9) brightness(1.06) blur(0.6px)', tones: [175, 218, 255], overlay: 'paper' },
};

export const LOOK_ORDER = Object.keys(LOOKS);

/** Applique un style au jeu (en direct, même au menu). */
export function applyLook(game, name) {
  const look = LOOKS[name] ?? LOOKS.cartoon;
  const canvas = game.renderer.domElement;
  canvas.style.filter = look.filter || '';
  canvas.style.imageRendering = look.pixel ? 'pixelated' : '';
  game.pixelScale = look.pixel ?? 1;
  game.resize();
  setShadingTones(look.tones);
  game.world.sky.forcedTime = look.night ?? null;
  if (look.night) game.world.sky.time = look.night;
  const overlay = document.getElementById('overlay');
  overlay.className = look.overlay ?? '';
  return look;
}
