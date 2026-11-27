// Tous les réglages du jeu. Modifier ICI plutôt que dans le code.
export const CONFIG = {
  theme: 'forest',           // nom d'un fichier de src/world/themes/

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

  world: {
    chunkLength: 60,         // longueur d'un tronçon de monde
    chunksAhead: 7,          // tronçons générés devant
    chunksBehind: 1,         // tronçons gardés derrière
    halfWidth: 32,           // largeur jouable de chaque côté du centre
    rebaseDistance: 2000,    // recentrage de l'origine (précision flottante)
  },

  bird: {
    height: 3.2,             // hauteur de vol
    hitRadius: 0.6,          // rayon de collision
    bobAmplitude: 0.12,      // battement d'ailes (oscillation verticale)
    bobFrequency: 2.2,
  },

  camera: { fov: 78, near: 0.1, far: 420 },
};
