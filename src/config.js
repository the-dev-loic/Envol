// Tous les réglages du jeu. Modifier ICI plutôt que dans le code.
export const CONFIG = {
  stages: {
    order: ['forest', 'country', 'canyon', 'snow', 'city'], // ordre des mondes en mode Aventure (puis ça boucle)
    chunks: 20,              // longueur d'une étape, en tronçons (20 × 60 = 1200 m)
  },

  difficulty: {
    rampChunks: 100,         // tronçons pour atteindre la difficulté max (0 → 1)
  },

  // Chemin sûr : un chemin sinueux toujours libre d'obstacles fixes (garantit qu'on peut passer).
  // Son tracé change à chaque partie (graine aléatoire). Ailleurs, le monde est libre mais rempli d'obstacles.
  safeLane: {
    amplitude: 30,           // écart max du chemin
    wavelength: 1400,        // longueur d'une ondulation (pente toujours rattrapable par l'oiseau)
    halfWidthEasy: 4,        // demi-largeur libre au début
    halfWidthHard: 2.6,      // demi-largeur libre à difficulté max
  },

  speed: {
    start: 22,               // unités/s au départ
    max: 95,                 // vitesse plafond
    accel: 0.9,              // gain de vitesse par seconde
  },

  steer: {
    tiltMaxDeg: 22,          // inclinaison qui donne 100 % de virage
    deadzoneDeg: 1.5,        // zone morte autour de la position neutre
    maxLateralSpeed: 20,     // vitesse latérale max (unités/s)
    response: 7,             // réactivité (plus haut = plus nerveux)
    bankMaxDeg: 28,          // roulis de la caméra en virage
  },

  // Monde ouvert : grille de cases (largeur tileWidth × longueur chunkLength) générées autour de l'oiseau.
  // Pas de mur : à gauche et à droite, le monde continue à l'infini.
  world: {
    chunkLength: 60,         // longueur d'une case (le long de la course)
    tileWidth: 150,          // largeur d'une case (les quantités d'objets des thèmes sont données pour 100 m)
    chunksAhead: 7,          // rangées générées devant
    chunksBehind: 1,         // rangées gardées derrière
    tilesSide: 1,            // cases de chaque côté de l'oiseau
    buildPerFrame: 3,        // cases créées au plus par image (évite les saccades)
    calmMargin: 14,          // au départ et en début d'étape : rien à moins de X m du chemin
    rebaseDistance: 2000,    // recentrage de l'origine (précision flottante)
  },

  bird: {
    height: 3.2,             // hauteur de vol
    hitRadius: 0.6,          // rayon de collision
    bobAmplitude: 0.12,      // battement d'ailes (oscillation verticale)
    bobFrequency: 2.2,
  },

  // Cycle jour/nuit : time 0 = minuit, 0.25 = 6 h, 0.5 = midi, 0.75 = 18 h
  cycle: {
    dayLength: 240,          // durée d'une journée complète, en secondes de jeu
    start: 0.37,             // heure au début de chaque partie (≈ 9 h)
  },

  weather: {
    odds: { clear: 0.5, fog: 0.2, rain: 0.3 }, // chances relatives (neige au lieu de pluie dans les mondes enneigés)
    firstChange: 35,         // secondes de beau temps au début d'une partie
    minDuration: 25,         // durée d'un épisode météo (s)
    maxDuration: 55,
    transition: 6,           // durée du fondu entre deux météos (s)
    fogNear: 8,              // brouillard : distance de vue
    fogFar: 135,
    rainFarFactor: 0.65,     // pluie : la vue est réduite de 35 %
  },

  camera: { fov: 55, near: 0.1, far: 420 }, // fov vertical (jeu en paysage)
};
