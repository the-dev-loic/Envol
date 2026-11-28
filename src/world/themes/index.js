// Registre des thèmes (mondes). Ajouter ici chaque nouveau thème
// (et dans CONFIG.stages.order pour qu'il apparaisse en mode Aventure).
import forest from './forest.js';
import canyon from './canyon.js';
import snow from './snow.js';
import city from './city.js';
import country from './country.js';
import ocean from './ocean.js';

export const THEMES = { forest, country, ocean, canyon, snow, city };

export function getTheme(name) {
  return THEMES[name] ?? forest;
}
