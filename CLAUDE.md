# Envol — jeu d'oiseau en vue subjective (PWA iPhone, en PAYSAGE)

**À lire en premier. Ne relire le code que des fichiers concernés par la tâche.**

- Code : https://github.com/the-dev-loic/Envol (branche `main`) — cloner ce dépôt en début de session.
- Jeu en ligne : https://the-dev-loic.github.io/Envol/ (GitHub Pages, publié à chaque push sur `main`).

## Le jeu
Oiseau à la 1re personne, avance tout seul vers l'avant, de plus en plus vite, monde infini.
On va à gauche/droite en inclinant le téléphone. Collision avec un obstacle = fin. Score = distance (m).
Modes : **Aventure** (étapes de 1200 m : Forêt → Canyon → Neige → Ville, puis boucle) ou **un seul monde** à l'infini.
Record séparé par mode (localStorage `birdrun.best.<mode>`).

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
| `src/core/game.js` | Boucle, états `menu/playing/over`, mode, bannière d'étape, collisions, recentrage | règles du jeu, nouveaux états |
| `src/core/orientation.js` | Garde le jeu en **paysage** : si l'écran est en portrait, `#app` est tourné de -90° (`viewportSize()` = taille paysage, `gameAngle()` = 90/-90) | orientation |
| `src/core/rng.js` | Aléatoire déterministe par tronçon | — |
| `src/input/tilt.js` | Inclinaison iOS (vecteur gravité continu, axe Y du téléphone, sens selon `gameAngle()`) + secours clavier/tactile → `getSteer()` ∈ [-1,1] | contrôles |
| `src/player/bird.js` | Caméra = oiseau : avance, latéral, roulis, battement, FOV vitesse | sensations de vol |
| `src/world/world.js` | Tronçons infinis, colliders, obstacles mobiles, transition d'ambiance entre thèmes, recentrage | génération générale |
| `src/world/stages.js` | Plan de partie : thème + n° d'étape pour chaque tronçon | modes, enchaînement des étapes |
| `src/world/obstacles.js` | Briques pour les thèmes : `scatter`, `wallWithGap`, `borders`, `instances`, `mover`, couloir sûr `safeX`/`isFree` | nouveaux types d'obstacles |
| `src/world/themes/*.js` | **Contenu d'un monde** : forest, canyon, snow, city | nouveaux mondes |
| `src/world/themes/index.js` | Registre des thèmes | ajouter un thème |
| `src/ui/hud.js` + `index.html` + `styles.css` | Menu (choix du mode), score, bannière, fin, records | interface |

## Contrat d'un thème (pour « modifier le monde »)
```js
export default {
  name, label: 'Nom affiché', sky: 0xRRGGBB, fog: { near, far },
  light: { sky, ground, sun },              // couleurs des lumières (transition douce entre thèmes)
  createAssets(THREE) -> {...},             // géométries/matériaux, créés une fois à la 1re utilisation
  populateChunk(ctx)                        // remplit UN tronçon
}
// ctx = { THREE, group, index, length, halfWidth, rng, difficulty /*0..1*/, calm /*true = pas d'obstacle*/,
//         assets, shared /*{ground}*/, distanceAt(z), addCollider(x,z,r), addMover(m), track(obj) }
```
- Coordonnées locales au tronçon : `z` entre `-length` et `0`, `x` entre `-halfWidth` et `halfWidth`.
- `addCollider` = obstacle circulaire (vu de dessus). Obstacle mobile : `mover(ctx, mesh, {x,z,r,amplitude,speed})`.
- **Couloir sûr** : chemin sinueux (`safeX`) jamais bloqué par un obstacle fixe → toujours franchissable.
  Placer les obstacles fixes via `scatter`/`wallWithGap` (ou vérifier `isFree`). Les mobiles peuvent le croiser.
- Utiliser `instances()` (InstancedMesh, perf mobile) et `ctx.rng` (jamais `Math.random`).
- Nouveau thème : créer le fichier, l'ajouter dans `themes/index.js` (et `CONFIG.stages.order` pour l'Aventure).

## Tests
Chrome headless + puppeteer-core : servir le dossier, cliquer `[data-mode=adventure]`, puis autopilote
`bird.x = safeX(bird.distance)` sur ~8 km → doit donner 0 collision avec les obstacles fixes.

## Conventions
- Axe d'avance : **-Z**. L'oiseau garde `y = CONFIG.bird.height`.
- Toute valeur réglable va dans `config.js`, pas en dur.
- Budget perf : viser < 60 draw calls (`__game.renderer.info.render.calls` en console).
- Après une modif : mettre à jour la carte ci-dessus si un fichier est ajouté, et `docs/ROADMAP.md`.
- `window.__game` exposé pour le debug.

## Pièges iOS
- `DeviceOrientationEvent.requestPermission()` doit être appelé dans un tap → fait dans `Game.start()`.
- iOS ne sait pas verrouiller l'orientation (ni `screen.orientation.lock`, ni manifest) → `orientation.js` tourne `#app` pour rester en paysage (les 2 sens de paysage sont acceptés). Tout l'UI doit vivre dans `#app` (positions `absolute`, pas `fixed`) et utiliser `viewportSize()` plutôt que `innerWidth/innerHeight`.
- L'inclinaison ne marche qu'en HTTPS. iOS ignore `display: fullscreen` → mode `standalone` (plein écran sans barre Safari).
- Après une mise en ligne, l'app installée récupère la nouvelle version au lancement suivant (réseau d'abord).
