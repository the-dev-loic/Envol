# Feuille de route

## Fait
### v0.1
- Vol infini en vue subjective, accélération progressive, roulis et FOV liés à la vitesse
- Inclinaison iOS + calibration au départ ; secours clavier / tactile
- Thème « forêt » low-poly, densité croissante, collisions, score + record
- PWA installable (manifest, icônes, service worker hors-ligne), maintien de l'écran allumé

### v0.2
- Correction : l'inclinaison forte « remettait droit » (saut de gamma / rotation d'écran) → vecteur gravité continu + orientation verrouillée
- Mode Aventure par étapes (Forêt → Canyon → Neige → Ville, bannière à chaque étape) + mode « un seul monde »
- Nouveaux obstacles : rochers, rangées avec passage, arches, pics de glace, immeubles, lampadaires
- Obstacles mobiles : rochers qui roulent, boules de neige, drones
- Couloir sûr garanti (toujours un chemin possible), records par mode

## Idées suivantes (par ordre suggéré)
- v0.3 : jeu verrouillé en paysage (rotation CSS si le téléphone est en portrait ; iOS ne sait pas verrouiller), menu adapté
- v0.4 : autorisation des mouvements demandée une seule fois par lancement (au 1er toucher) + choix mémorisé « Commandes : inclinaison / toucher »
- v0.5 : ville refaite (façades à fenêtres éclairées, boulevard, panneaux, arbres), monde Campagne (granges à traverser, moulins, silos, meules, animaux, champs), jeu jouable sans connexion
- v0.6 : sol texturé + détails (herbe, fleurs, cailloux, cactus…), ciel en dégradé avec soleil/lune/étoiles, cycle jour/nuit, météo (brouillard, pluie, neige)
- v0.7 : monde ouvert sans mur (grille de cases infinie à gauche/droite), monde différent à chaque partie, ville en quadrillage d'avenues
- v0.8 : inclinaison au sens mesuré physiquement + option « sens inversé », version affichée, jouable entièrement au clavier sur ordinateur
- v0.9 : refonte graphique enfantine (ombrage cartoon, couleurs bonbon, arbres sucettes, champignons à pois, bonshommes de neige, pingouins, ville pastel, soleil/lune avec visage, nuages, ailes et bec visibles, interface « gommes »)

## Idées suivantes (suite)
1. Bouton « recalibrer » + réglage de sensibilité dans le menu (le choix des commandes existe déjà)
3. Bonus à ramasser (anneaux, plumes) et pièces
4. Monter/descendre (inclinaison avant/arrière) + obstacles à différentes hauteurs
5. Sons (vent qui augmente avec la vitesse, pluie, collision) — audio iOS à débloquer par un tap
6. Débloquer les mondes en mode libre seulement après les avoir atteints en Aventure
7. Publication App Store (enveloppe Capacitor) — plus tard
