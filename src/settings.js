// Réglages modifiables SANS toucher au code : fichier reglages.json à la racine du dépôt.
// Il est édité depuis la page de contrôle (admin.html) ou directement sur github.com.
// Au démarrage, le jeu le lit et l'applique par-dessus CONFIG (src/config.js = valeurs par défaut).
// Unités « humaines » dans le fichier (km/h, mètres, heures, pourcentages) → converties ici.
import { CONFIG } from './config.js';

export let SETTINGS = {};

const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined);
const put = (obj, key, v) => { if (v !== undefined) obj[key] = v; };

export async function loadSettings() {
  try {
    const res = await fetch('./reglages.json', { cache: 'no-cache' });
    if (res.ok) SETTINGS = await res.json();
  } catch { /* hors ligne sans cache : valeurs par défaut */ }
  applySettings(SETTINGS);
  return SETTINGS;
}

export function applySettings(s) {
  const v = s.vitesse ?? {};
  put(CONFIG.speed, 'start', num(v.departKmh, 20, 300) && v.departKmh / 3.6);
  put(CONFIG.speed, 'max', num(v.maxKmh, 30, 500) && v.maxKmh / 3.6);
  put(CONFIG.speed, 'accel', num(v.accelerationKmhParSeconde, 0, 30) !== undefined ? v.accelerationKmhParSeconde / 3.6 : undefined);
  if (CONFIG.speed.max < CONFIG.speed.start) CONFIG.speed.max = CONFIG.speed.start;

  const i = s.inclinaison ?? {};
  put(CONFIG.steer, 'tiltMaxDeg', num(i.angleMaxDegres, 5, 60));
  put(CONFIG.steer, 'deadzoneDeg', num(i.zoneMorteDegres, 0, 10));
  put(CONFIG.steer, 'maxLateralSpeed', num(i.vitesseLaterale, 5, 60));

  const e = s.etapes ?? {};
  if (Array.isArray(e.ordre) && e.ordre.length) CONFIG.stages.order = e.ordre.filter((x) => typeof x === 'string');
  const len = num(e.longueurMetres, 300, 10000);
  if (len) CONFIG.stages.chunks = Math.round(len / CONFIG.world.chunkLength);

  const d = num(s.difficulte?.distanceMaxMetres, 600, 60000);
  if (d) CONFIG.difficulty.rampChunks = Math.round(d / CONFIG.world.chunkLength);

  const j = s.jour ?? {};
  put(CONFIG.cycle, 'dayLength', num(j.dureeSecondes, 30, 3600));
  const h = num(j.heureDepart, 0, 23.99);
  if (h !== undefined) CONFIG.cycle.start = h / 24;

  const m = s.meteo ?? {};
  const odds = { clear: num(m.beauTemps, 0, 100), fog: num(m.brouillard, 0, 100), rain: num(m.pluie, 0, 100) };
  if (Object.values(odds).some((x) => x !== undefined)) {
    for (const k of Object.keys(odds)) CONFIG.weather.odds[k] = odds[k] ?? 0;
    if (!Object.values(CONFIG.weather.odds).some((x) => x > 0)) CONFIG.weather.odds.clear = 1;
  }
  put(CONFIG.weather, 'firstChange', num(m.premierChangementSecondes, 0, 600));
}
