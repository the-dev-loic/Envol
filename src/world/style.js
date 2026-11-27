// Style graphique "dessin animé" : un seul endroit pour les matériaux.
// MeshToonMaterial + dégradé à 3 tons = ombres franches comme dans un dessin animé.
import * as THREE from 'three';

let gradient = null;

/** Dégradé d'ombrage en 3 marches (ombre / mi-ton / lumière). */
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

/** Matériau cartoon. Options = celles de MeshToonMaterial (color, map, vertexColors, emissive…). */
export function toon(options = {}) {
  return new THREE.MeshToonMaterial({ gradientMap: gradientMap(), ...options });
}

/** Matériau cartoon pour les décors fusionnés (une couleur par pièce). */
export function toonColors(options = {}) {
  return toon({ vertexColors: true, ...options });
}
