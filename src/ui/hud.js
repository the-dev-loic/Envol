// Interface HTML par-dessus le canvas : menu (choix du mode), score, bannière d'étape, fin de partie.
import { THEMES } from '../world/themes/index.js';

const $ = (id) => document.getElementById(id);
const bestKey = (mode) => `birdrun.best.${mode}`;
let bannerTimer = 0;

export function modeLabel(mode) {
  return mode === 'adventure' ? 'Aventure' : THEMES[mode]?.label ?? mode;
}

export const hud = {
  best(mode) {
    return Number(localStorage.getItem(bestKey(mode)) || 0);
  },

  /** Construit les boutons de mode ; onPick(mode) est appelé au tap. */
  buildMenu(onPick) {
    const list = $('themes');
    list.innerHTML = '';
    for (const [name, t] of Object.entries(THEMES)) {
      const b = document.createElement('button');
      b.className = 'mode';
      b.dataset.mode = name;
      b.innerHTML = `<span class="icon">${t.icon ?? '✨'}</span>${t.label}`;
      list.append(b);
    }
    for (const b of document.querySelectorAll('[data-mode]')) {
      b.addEventListener('click', (e) => { e.stopPropagation(); onPick(b.dataset.mode); });
    }
  },

  showMenu() {
    for (const b of document.querySelectorAll('[data-mode]')) {
      const best = this.best(b.dataset.mode);
      b.dataset.best = best ? `${Math.floor(best)} m` : '';
    }
    $('menu').hidden = false;
    $('over').hidden = true;
    $('hud').hidden = true;
  },

  showPlaying() {
    $('menu').hidden = true;
    $('over').hidden = true;
    $('hud').hidden = false;
  },

  update(distance, speed, sky) {
    $('dist').textContent = `${Math.floor(distance)} m`;
    $('speed').textContent = `${Math.round(speed * 3.6)} km/h`;
    if (sky) {
      const icon = sky.weather === 'rain' ? (sky.snowy ? '🌨️' : '🌧️') : sky.weather === 'fog' ? '🌫️' : sky.isNight() ? '🌙' : '☀️';
      $('clock').textContent = `${icon} ${sky.clock()}`;
    }
  },

  banner(title, subtitle = '') {
    const el = $('banner');
    el.innerHTML = `<strong>${title}</strong>${subtitle ? `<span>${subtitle}</span>` : ''}`;
    el.classList.remove('show');
    void el.offsetWidth; // relance l'animation
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2600);
  },

  showOver(mode, distance, stageNumber) {
    const record = distance > this.best(mode);
    if (record) localStorage.setItem(bestKey(mode), String(distance));
    const OOPS = ['Oups !', 'Aïe aïe aïe !', 'Badaboum !', 'Ouille !', 'Patatras !', 'Boing !'];
    $('overTitle').textContent = OOPS[Math.floor(Math.random() * OOPS.length)];
    $('final').textContent = `${Math.floor(distance)} m`;
    $('overMode').textContent = mode === 'adventure' ? `Aventure · étape ${stageNumber}` : modeLabel(mode);
    $('record').textContent = record ? '🎉 Nouveau record ! 🎉' : `🏆 Record : ${Math.floor(this.best(mode))} m`;
    $('over').hidden = false;
    $('hud').hidden = true;
  },

  setHint(text) {
    $('hint').textContent = text;
  },
};
