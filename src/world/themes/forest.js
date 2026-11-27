// Thème "forêt" low-poly. Un thème = un fichier qui exporte cet objet.
// Pour créer un nouveau monde : copier ce fichier, changer couleurs et populateChunk,
// puis l'enregistrer dans src/world/themes/index.js.

const TREE_COLORS = [0x2f7d32, 0x388e3c, 0x43a047, 0x1b5e20, 0x558b2f];

export default {
  name: 'forest',
  sky: 0xbfe3f2,
  fog: { near: 60, far: 380 },

  createLights(THREE) {
    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x4a6b3a, 1.6);
    const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
    sun.position.set(-40, 80, 30);
    return [hemi, sun];
  },

  createAssets(THREE) {
    const ground = new THREE.PlaneGeometry(260, 60, 1, 1);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, 0, -30);          // couvre z de -60 à 0 (un tronçon)
    const trunk = new THREE.CylinderGeometry(0.35, 0.5, 3, 6);
    trunk.translate(0, 1.5, 0);
    const crown = new THREE.ConeGeometry(2.4, 7.5, 7);
    crown.translate(0, 2 + 3.75, 0);
    return {
      ground,
      trunk,
      crown,
      groundMat: new THREE.MeshLambertMaterial({ color: 0x7cb342 }),
      trunkMat: new THREE.MeshLambertMaterial({ color: 0x6d4c41, flatShading: true }),
      crownMat: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    };
  },

  populateChunk({ THREE, group, index, length, halfWidth, rng, difficulty, assets, addCollider, track }) {
    group.add(new THREE.Mesh(assets.ground, assets.groundMat));

    // Liste des arbres : [x, z, échelle, collision?]
    const trees = [];
    // Bordures denses (décor, hors couloir).
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      trees.push([side * rng.range(halfWidth + 1, halfWidth + 60), -rng.range(0, length), rng.range(1, 1.8), false]);
    }
    // Obstacles dans le couloir (aucun au tout début).
    if (index >= 2) {
      const n = Math.round(5 + difficulty * 20 + rng.range(0, 3));
      for (let i = 0; i < n; i++) {
        trees.push([rng.range(-halfWidth + 1, halfWidth - 1), -rng.range(0, length), rng.range(0.8, 1.4), true]);
      }
    }

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    const trunks = new THREE.InstancedMesh(assets.trunk, assets.trunkMat, trees.length);
    const crowns = new THREE.InstancedMesh(assets.crown, assets.crownMat, trees.length);
    trees.forEach(([x, z, sc, solid], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2));
      s.set(sc, sc * rng.range(0.9, 1.25), sc);
      p.set(x, 0, z);
      m.compose(p, q, s);
      trunks.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, color.setHex(TREE_COLORS[rng.int(0, TREE_COLORS.length - 1)]));
      if (solid) addCollider(x, z, 1.25 * sc);
    });
    group.add(trunks, crowns);
    track(trunks);
    track(crowns);
  },
};
