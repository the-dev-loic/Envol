// Fusionne plusieurs géométries (déjà placées) en UNE seule, avec une couleur par pièce.
// → un seul appel de rendu pour tout un tronçon de décor (important pour la perf mobile).
// parts: [{ geometry, color: 0xRRGGBB, shade?: 1 }]
export function mergeColored(THREE, parts) {
  let vCount = 0, iCount = 0;
  for (const { geometry: g } of parts) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2), col = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  const c = new THREE.Color();
  let v = 0, i = 0;
  for (const { geometry: g, color, shade = 1 } of parts) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, v * 3);
    nor.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, v * 2);
    c.setHex(color).multiplyScalar(shade);
    const vc = g.attributes.color?.array;
    for (let k = 0; k < n; k++) {
      const s = vc ? vc[k * 3] : 1; // les pièces peuvent assombrir certains sommets (toits)
      col[(v + k) * 3] = c.r * s; col[(v + k) * 3 + 1] = c.g * s; col[(v + k) * 3 + 2] = c.b * s;
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) idx[i++] = g.index.array[k] + v;
    else for (let k = 0; k < n; k++) idx[i++] = v + k;
    v += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
