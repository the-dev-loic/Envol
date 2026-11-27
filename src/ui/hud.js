// Interface HTML par-dessus le canvas : score, vitesse, écrans menu / fin.
const $ = (id) => document.getElementById(id);
const BEST_KEY = 'birdrun.best';

export const hud = {
  best: Number(localStorage.getItem(BEST_KEY) || 0),

  showMenu() {
    $('best').textContent = this.best ? `Record : ${Math.floor(this.best)} m` : '';
    $('menu').hidden = false;
    $('over').hidden = true;
    $('hud').hidden = true;
  },

  showPlaying() {
    $('menu').hidden = true;
    $('over').hidden = true;
    $('hud').hidden = false;
  },

  update(distance, speed) {
    $('dist').textContent = `${Math.floor(distance)} m`;
    $('speed').textContent = `${Math.round(speed * 3.6)} km/h`;
  },

  showOver(distance) {
    const record = distance > this.best;
    if (record) {
      this.best = distance;
      localStorage.setItem(BEST_KEY, String(distance));
    }
    $('final').textContent = `${Math.floor(distance)} m`;
    $('record').textContent = record ? 'Nouveau record !' : `Record : ${Math.floor(this.best)} m`;
    $('over').hidden = false;
    $('hud').hidden = true;
  },

  setHint(text) {
    $('hint').textContent = text;
  },
};
