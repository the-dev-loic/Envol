// Plan de partie : quel monde (thème) et quelle étape pour chaque tronçon.
// mode 'adventure' = les mondes s'enchaînent (CONFIG.stages.order), sinon = nom d'un thème joué à l'infini.
import { CONFIG } from '../config.js';

export function createPlan(mode) {
  const { order, chunks } = CONFIG.stages;
  if (mode !== 'adventure') {
    return { mode, stageAt: () => ({ number: 1, theme: mode, startIndex: 0 }) };
  }
  return {
    mode,
    stageAt(index) {
      const n = Math.max(0, Math.floor(index / chunks));
      return { number: n + 1, theme: order[n % order.length], startIndex: n * chunks };
    },
  };
}
