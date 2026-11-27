// Registre des thèmes (mondes). Ajouter ici chaque nouveau thème.
import forest from './forest.js';

export const THEMES = { forest };

export function getTheme(name) {
  return THEMES[name] ?? forest;
}
