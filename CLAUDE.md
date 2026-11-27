# Envol — jeu d'oiseau en vue subjective (PWA iPhone)

**À lire en premier. Ne relire le code que des fichiers concernés par la tâche.**

## Le jeu
Oiseau à la 1re personne, avance tout seul vers l'avant, de plus en plus vite, monde infini.
On va à gauche/droite en inclinant le téléphone. Collision avec un obstacle = fin. Score = distance (m).

## Stack (aucune étape de build)
- HTML + JS modules natifs + Three.js r187 dans `vendor/` (importmap `"three"` dans index.html).
- PWA : `manifest.webmanifest` + `sw.js` (réseau d'abord, cache en secours) → installable via Safari « Sur l'écran d'accueil ».
- Hébergement : n'importe quel serveur statique **HTTPS** (requis par iOS pour l'inclinaison). Ex. GitHub Pages.
- Test local : `python3 -m http.server` puis ouvrir `http://localhost:8000` (flèches ←/→ ou Q/D pour diriger).

## Carte des fichiers (1 responsabilité par fichier)
| Fichier | Rôle | Toucher pour… |
|---|---|---|
| `src/config.js` | **Tous les réglages** (vitesse, sensibilité, largeur, hauteur…) | équilibrage, ressenti |
| `src/main.js` | Point d'entrée, boutons, service worker | rarement |
| `src/core/game.js` | Boucle, états `menu/playing/over`, collisions, recentrage | règles du jeu, nouveaux états |
| `src/core/rng.js` | Aléatoire déterministe par tronçon | — |
| `src/input/tilt.js` | Inclinaison iOS (permission + calibration) + secours clavier/tactile → `getSteer()` ∈ [-1,1] | contrôles |
| `src/player/bird.js` | Caméra = oiseau : avance, latéral, roulis, battement, FOV vitesse | sensations de vol |
| `src/world/world.js` | Tronçons infinis (création/suppression), colliders, recentrage d'origine | génération générale |
| `src/world/themes/*.js` | **Contenu d'un monde** (couleurs, ciel, obstacles) | nouveaux mondes |
| `src/world/themes/index.js` | Registre des thèmes | ajouter un thème |
| `src/ui/hud.js` + `index.html` + `styles.css` | Score, menus, record (localStorage) | interface |

## Contrat d'un thème (pour « modifier le monde »)
```js
export default {
  name, sky: 0xRRGGBB, fog: { near, far },
  createLights(THREE) -> Light[],
  createAssets(THREE) -> {...},           // géométries/matériaux partagés, créés une fois
  populateChunk({ THREE, group, index, length, halfWidth, rng, difficulty /*0..1*/,
                  assets, addCollider(x, z, r), track(obj) }) // remplit UN tronçon
}
```
- Coordonnées locales au tronçon : `z` entre `-length` et `0`, `x` entre `-halfWidth` et `halfWidth`.
- `addCollider` = obstacle circulaire (vu de dessus). `track(obj)` = objet à `dispose()` à la suppression.
- Utiliser `InstancedMesh` (perf mobile) et `rng` (jamais `Math.random`, pour rester déterministe).
- Tronçons 0 et 1 sans obstacle (temps de calibration).

## Conventions
- Axe d'avance : **-Z**. L'oiseau garde `y = CONFIG.bird.height`.
- Toute valeur réglable va dans `config.js`, pas en dur.
- Budget perf : viser < 60 draw calls (`__game.renderer.info.render.calls` en console).
- Après une modif : mettre à jour la carte ci-dessus si un fichier est ajouté, et `docs/ROADMAP.md`.
- `window.__game` exposé pour le debug.

## Pièges iOS
- `DeviceOrientationEvent.requestPermission()` doit être appelé dans un tap → fait dans `Game.start()`.
- L'inclinaison ne marche qu'en HTTPS. iOS ignore `display: fullscreen` → mode `standalone` (plein écran sans barre Safari).
- Après une mise en ligne, l'app installée récupère la nouvelle version au lancement suivant (réseau d'abord).
