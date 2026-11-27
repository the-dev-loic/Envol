# Envol — jeu d'oiseau en vue subjective (PWA iPhone, en PAYSAGE)

**À lire en premier. Ne relire le code que des fichiers concernés par la tâche.**

- Code : https://github.com/the-dev-loic/Envol (branche `main`) — cloner ce dépôt en début de session.
- Jeu en ligne : https://the-dev-loic.github.io/Envol/ (GitHub Pages, publié à chaque push sur `main`).

## Le jeu
Oiseau à la 1re personne, avance tout seul vers l'avant, de plus en plus vite.
**Monde ouvert** : infini devant ET sur les côtés (aucun mur), **différent à chaque partie** (graine aléatoire).
On va à gauche/droite en inclinant le téléphone. Collision avec un obstacle = fin. Score = distance (m).
Modes : **Aventure** (étapes de 1200 m : Forêt → Campagne → Canyon → Neige → Ville, puis boucle) ou **un seul monde** à l'infini.
Record séparé par mode (localStorage `birdrun.best.<mode>`).

## Stack (aucune étape de build)
- HTML + JS modules natifs + Three.js r187 dans `vendor/` (importmap `"three"` dans index.html).
- PWA : `manifest.webmanifest` + `sw.js` → installable via Safari « Sur l'écran d'accueil » et **jouable sans connexion** (tous les fichiers pré-téléchargés ; réseau d'abord avec délai de 2,5 s, sinon cache).
- ⚠️ **Avant chaque commit : `python3 tools/update-sw.py`** (régénère la liste des fichiers hors connexion + la version du cache). Sans ça, un nouveau fichier ne marche pas hors ligne.
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
| `src/world/world.js` | **Grille de cases** (ix, iz) créées autour de l'oiseau (quelques-unes par image), sol par rangée qui suit l'oiseau en X, colliders (case + voisines), obstacles mobiles, ambiance, recentrage Z | génération générale |
| `src/world/stages.js` | Plan de partie : thème + n° d'étape pour chaque tronçon | modes, enchaînement des étapes |
| `src/world/sky.js` | Ciel en dégradé, soleil/lune/étoiles, **cycle jour/nuit**, **météo** (beau, brouillard, pluie / neige), précipitations. `world.sky.set({time, weather})` pour tester | ambiance, météo |
| `src/world/ground.js` | Sol : `groundMaterial()` (texture procédurale sans image) + petits détails `detail.*` / `sowDetails()` (touffes, fleurs, cailloux, champignons, cactus…) | rendu du sol |
| `src/world/merge.js` | `mergeColored()` : fusionne des pièces colorées en 1 géométrie (1 appel de rendu par tronçon) | décor riche (ville, campagne) |
| `src/world/obstacles.js` | Briques pour les thèmes : `scatter`, `density`, `wallWithGap`, `instances`, `mover` ; **chemin sûr** `setLaneSeed`/`safeX`/`laneX`/`laneInTile`/`isFree` | nouveaux types d'obstacles |
| `src/world/themes/*.js` | **Contenu d'un monde** : forest, country (granges à traverser, moulins, animaux), canyon (mesas), snow (montagnes), city (quadrillage d'avenues tous les 40 m + rues transversales) | nouveaux mondes |
| `src/world/themes/index.js` | Registre des thèmes | ajouter un thème |
| `src/ui/hud.js` + `index.html` + `styles.css` | Menu (choix du mode, commandes, état hors connexion), score, bannière, fin, records | interface |
| `sw.js` + `tools/update-sw.py` | Hors connexion : cache complet du jeu | ajout de fichiers (relancer le script) |

## Contrat d'un thème (pour « modifier le monde »)
```js
export default {
  name, label: 'Nom affiché', sky: 0xRRGGBB, fog: { near, far }, precipitation?: 'rain' | 'snow',
  light: { sky, ground, sun },              // couleurs des lumières (transition douce entre thèmes)
  createAssets(THREE) -> { groundMat, ... }, // groundMat OBLIGATOIRE (sol de la rangée) ; créés une fois
  populateTile(ctx)                         // remplit UNE case (largeur ctx.width, longueur ctx.length)
}
// ctx = { THREE, group, index /*iz*/, ix, width, length, offsetX, rng, difficulty /*0..1*/, calm,
//         laneMargin, assets, distanceAt(z), addCollider(x,z,r), addMover(m), addSpinner(obj, speed, axis),
//         reserve(x,z,r), isClear(x,z,r), merge(parts, material), track(obj) }
```
- Coordonnées locales à la case : `x ∈ [-width/2, width/2]`, `z ∈ [-length, 0]`. X monde = `offsetX + x`.
- **Remplir toute la case** (pas de couloir ni de bord) : le joueur peut aller partout.
- Quantités données **pour une case de 100 m** : `scatter`/`sowDetails` les ajustent seuls ; sinon `density(ctx, n)`.
- **Chemin sûr** (`safeX`, tracé tiré de la graine) : jamais bloqué par un obstacle fixe → toujours un passage.
  Obstacles fixes via `scatter` (respecte chemin + zones réservées) ou vérifier `isFree`.
  Obstacles « sur le chemin » (rangées avec passage, arches, granges, mobiles) : seulement si `laneInTile(ctx, z)`, centrés sur `laneX(ctx, z)`.
- `calm` (départ, début d'étape) : pas de rangée/arche/mobile ; `scatter` laisse `calmMargin` m libres autour du chemin.
- Perf : tout le décor fixe d'une case dans `ctx.merge(parts, mat)` (1 appel de rendu). Pièces = `{ geometry, color, shade? }`.
- Obstacle qu'on traverse (grange) : colliders posés à la main + `ctx.reserve()` (voir country.js).
- Sol : `groundMat: groundMaterial(THREE, { base, blotches, specks, blades?, cracks?, tile? }, seed)` (tile divise 60) + détails `sowDetails`.
- L'heure et la météo modifient l'ambiance du thème (sky.js) : le thème donne seulement ses couleurs « de jour par beau temps ».
- Nouveau thème : créer le fichier, l'ajouter dans `themes/index.js` (et `CONFIG.stages.order` pour l'Aventure).

## Tests
Chrome headless + puppeteer-core : servir le dossier, cliquer `[data-mode=adventure]`, puis autopilote
`bird.x = safeX(bird.distance)` sur ~10 km → 0 collision avec les obstacles fixes (vérifier case + 8 voisines).
Vol latéral : `bird.update(dt, 1)` pendant 40 s → x > 700 sans erreur. Deux `prepare()` → graines différentes.
Hors connexion : `page.setOfflineMode(true)` puis recharger → le menu doit s'afficher et une partie démarrer.

## Conventions
- Axe d'avance : **-Z**. L'oiseau garde `y = CONFIG.bird.height`. Pas de limite en X.
- Toute valeur réglable va dans `config.js`, pas en dur.
- Budget perf : viser ≤ 90 draw calls (mesuré : 77 au pire, en ville ; ~40-55 ailleurs ; ≤ 300 k triangles) (`__game.renderer.info.render.calls` en console).
- Après une modif : mettre à jour la carte ci-dessus si un fichier est ajouté, et `docs/ROADMAP.md`.
- `window.__game` exposé pour le debug.

## Pièges iOS
- `DeviceOrientationEvent.requestPermission()` doit être appelé dans un tap, et iOS **n'enregistre pas** l'autorisation au-delà de la session (elle est redemandée à chaque lancement de l'app). `autoEnableTilt()` la demande au 1er toucher n'importe où, une seule fois par lancement. Le choix « Commandes : inclinaison / toucher » est mémorisé (`birdrun.control`) ; en mode toucher, rien n'est demandé.
- iOS ne sait pas verrouiller l'orientation (ni `screen.orientation.lock`, ni manifest) → `orientation.js` tourne `#app` pour rester en paysage (les 2 sens de paysage sont acceptés). Tout l'UI doit vivre dans `#app` (positions `absolute`, pas `fixed`) et utiliser `viewportSize()` plutôt que `innerWidth/innerHeight`.
- L'inclinaison ne marche qu'en HTTPS. iOS ignore `display: fullscreen` → mode `standalone` (plein écran sans barre Safari).
- Après une mise en ligne, l'app installée récupère la nouvelle version au lancement suivant (réseau d'abord).
