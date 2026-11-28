// Ciel et météo : dôme en dégradé, soleil, lune, étoiles, cycle jour/nuit,
// météo changeante (beau temps, brouillard, pluie — ou neige dans les mondes enneigés).
// World lui fournit l'ambiance "de base" du thème courant ; ce module la modifie selon l'heure et la météo.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const col = (h) => new THREE.Color(h);
// Couleurs douces, façon dessin animé : la nuit est bleu-violet (jamais noire), le couchant rose-orangé.
const NIGHT_TOP = col(0x1d2366), NIGHT_HORIZON = col(0x4a4fa8);
const SUNSET_TOP = col(0x6b6fd6), SUNSET_HORIZON = col(0xff9ab0);
const DAY_BLUE = col(0x4fc3ff), WHITE = col(0xffffff);
const OVERCAST = col(0xa3adc2), FOGGY = col(0xe3e8f2);
const MOONLIGHT = col(0xb9c6ff), DUSK_SUN = col(0xff9a6b), NIGHT_SKYLIGHT = col(0x8f9cf0);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const WEATHER_LABEL = { clear: 'Beau temps', fog: 'Brouillard', rain: 'Pluie' };

export class Sky {
  constructor(scene, hemi, sun) {
    this.scene = scene;
    this.hemi = hemi;
    this.sun = sun;
    this.camera = null;
    this.group = new THREE.Group();
    this.sunDir = new THREE.Vector3();
    scene.add(this.group);

    // Dôme : dégradé horizon → zénith (l'horizon = couleur du brouillard, donc raccord parfait avec le sol)
    this.domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
        void main(){ float h = clamp(vP.y * 1.5, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.65)), 1.0);
        #include <colorspace_fragment>
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), this.domeMat);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.group.add(dome);

    // Étoiles
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xfff6b0, size: 3, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Soleil et lune (disques lointains)
    this.sunMat = new THREE.MeshBasicMaterial({ map: faceTexture(THREE, 'sun'), fog: false, transparent: true, depthWrite: false });
    this.sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), this.sunMat);
    this.moonMat = new THREE.MeshBasicMaterial({ map: faceTexture(THREE, 'moon'), fog: false, transparent: true, depthWrite: false });
    this.moonDisc = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), this.moonMat);
    for (const m of [this.sunDisc, this.moonDisc]) { m.renderOrder = -8; this.group.add(m); }

    // Gros nuages moelleux (un seul objet ; motif qui se répète, ancré au monde)
    this.cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.95, depthWrite: false });
    this.clouds = new THREE.Mesh(cloudField(THREE), this.cloudMat);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -7;
    scene.add(this.clouds);

    // Précipitations (positions relatives à la caméra)
    this.rain = this.makeRain();
    this.snow = this.makeSnow();
    this.group.add(this.rain.mesh, this.snow.mesh);

    this.reset();
  }

  reset() {
    this.time = CONFIG.cycle.start;
    this.weather = 'clear';
    this.timer = CONFIG.weather.firstChange;
    this.fog = 0;
    this.wet = 0; // pluie ou neige
  }

  /** Heure affichable "hh:mm" */
  clock() {
    const m = Math.floor(this.time * 24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  isNight() {
    return this.day < 0.35;
  }

  /** Force une heure / une météo (debug, tests) : sky.set({ time: 0.9, weather: 'rain' }) */
  set({ time, weather } = {}) {
    if (time != null) this.time = time;
    if (weather) { this.weather = weather; this.fog = weather === 'fog' ? 1 : 0; this.wet = weather === 'rain' ? 1 : 0; }
  }

  pickWeather() {
    const odds = CONFIG.weather.odds;
    let r = Math.random() * Object.values(odds).reduce((a, b) => a + b, 0);
    for (const [w, p] of Object.entries(odds)) { if ((r -= p) <= 0) return w; }
    return 'clear';
  }

  makeRain() {
    const n = 900, pos = new Float32Array(n * 6), drops = [];
    for (let i = 0; i < n; i++) drops.push({ x: rand(-35, 35), y: rand(-4, 26), z: rand(-70, 6) });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xb9cde0, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const mesh = new THREE.LineSegments(g, mat);
    mesh.frustumCulled = false;
    return { mesh, mat, drops, pos, g };
  }

  makeSnow() {
    const n = 700, pos = new Float32Array(n * 3), flakes = [];
    for (let i = 0; i < n; i++) flakes.push({ x: rand(-35, 35), y: rand(-4, 22), z: rand(-60, 6), p: Math.random() * 6 });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const mesh = new THREE.Points(g, mat);
    mesh.frustumCulled = false;
    return { mesh, mat, flakes, pos, g, t: 0 };
  }

  /**
   * base = ambiance du thème : { sky, near, far, hemiSky, hemiGround, sunColor, precipitation }
   * speed = vitesse de l'oiseau (inclinaison des gouttes)
   */
  update(dt, base, speed) {
    const { cycle, weather: W } = CONFIG;
    // --- Heure ---
    // forcedTime : un style graphique peut figer l'heure (ex. Néon = toujours la nuit)
    this.time = this.forcedTime ?? (this.time + dt / cycle.dayLength) % 1;
    const a = (this.time - 0.25) * Math.PI * 2; // 6 h : lever, 12 h : zénith, 18 h : coucher
    // Course du soleil assez basse et devant le joueur : on le voit dans le ciel pendant le vol.
    this.sunDir.set(-Math.cos(a) * 0.8, Math.sin(a) * 0.42, -1).normalize();
    const elev = this.sunDir.y;
    const day = smooth(-0.1, 0.14, elev);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.16) * smooth(-0.2, -0.03, elev);
    this.day = day;

    // --- Météo ---
    this.timer -= dt;
    if (this.timer <= 0) {
      this.weather = this.pickWeather();
      this.timer = rand(W.minDuration, W.maxDuration);
    }
    const step = dt / W.transition;
    this.fog += Math.sign((this.weather === 'fog' ? 1 : 0) - this.fog) * Math.min(step, Math.abs((this.weather === 'fog' ? 1 : 0) - this.fog));
    this.wet += Math.sign((this.weather === 'rain' ? 1 : 0) - this.wet) * Math.min(step, Math.abs((this.weather === 'rain' ? 1 : 0) - this.wet));
    const grey = Math.max(this.wet, this.fog * 0.85);

    // --- Couleurs du ciel ---
    const top = tmp1.copy(base.sky).lerp(DAY_BLUE, 0.4).lerp(SUNSET_TOP, dusk * 0.7);
    const hor = tmp2.copy(base.sky).lerp(WHITE, 0.18).lerp(SUNSET_HORIZON, dusk * 0.75);
    top.lerp(tmp3.copy(NIGHT_TOP), 1 - day);
    hor.lerp(tmp3.copy(NIGHT_HORIZON), 1 - day);
    const dim = 0.22 + 0.78 * day;
    top.lerp(tmp3.copy(OVERCAST).multiplyScalar(dim * 0.85), grey * 0.85);
    hor.lerp(tmp3.copy(OVERCAST).multiplyScalar(dim), this.wet * 0.85);
    hor.lerp(tmp3.copy(FOGGY).multiplyScalar(dim), this.fog * 0.9);
    this.domeMat.uniforms.top.value.copy(top);
    this.domeMat.uniforms.horizon.value.copy(hor);
    this.scene.background.copy(hor);
    this.scene.fog.color.copy(hor);

    // --- Distance de vue ---
    let near = base.near, far = base.far;
    near += (W.fogNear - near) * this.fog; far += (W.fogFar - far) * this.fog;
    far *= 1 - this.wet * (1 - W.rainFarFactor);
    near = Math.min(near, far * 0.4);
    this.scene.fog.near = near;
    this.scene.fog.far = far;

    // --- Lumières ---
    this.hemi.color.copy(base.hemiSky).lerp(NIGHT_SKYLIGHT, 1 - day);
    this.hemi.groundColor.copy(base.hemiGround).multiplyScalar(0.45 + 0.55 * day);
    this.hemi.intensity = (0.6 + 1.0 * day) * (1 - 0.25 * grey);
    this.sun.color.copy(base.sunColor).lerp(DUSK_SUN, dusk).lerp(MOONLIGHT, 1 - day);
    this.sun.intensity = (0.25 + 1.2 * day) * (1 - 0.65 * grey);
    // La lune est à l'opposé du soleil en hauteur, mais reste devant le joueur.
    const moonDir = tmp5.set(-this.sunDir.x, -this.sunDir.y, this.sunDir.z);
    const light = elev > -0.05 ? this.sunDir : moonDir;
    this.sun.position.copy(light).multiplyScalar(100);

    // --- Astres ---
    this.starMat.opacity = (1 - day) * (1 - grey);
    this.sunMat.opacity = smooth(-0.1, 0.05, elev) * (1 - grey);
    this.moonMat.opacity = smooth(0.05, -0.1, elev) * (1 - grey);
    this.sunMat.color.copy(WHITE).lerp(DUSK_SUN, dusk * 0.4);
    // Nuages : blancs le jour, roses au couchant, bleutés la nuit, gris sous la pluie
    this.cloudMat.color.copy(WHITE).lerp(tmp3.setHex(0xffb3c8), dusk * 0.8).lerp(tmp3.setHex(0x7f86d6), 1 - day).lerp(tmp3.setHex(0xb8bfcc), grey * 0.7);
    this.cloudMat.opacity = 0.95 - this.fog * 0.6;
    if (this.camera) {
      const P = CLOUD_PERIOD, c = this.camera.position;
      this.clouds.position.set(Math.floor(c.x / P) * P, 0, Math.floor(c.z / P) * P);
    }
    this.sunDisc.position.copy(this.sunDir).multiplyScalar(360);
    this.moonDisc.position.copy(moonDir).multiplyScalar(360);
    if (this.camera) this.group.position.copy(this.camera.position);
    this.sunDisc.lookAt(this.group.position);
    this.moonDisc.lookAt(this.group.position);

    if (this.camera) this.group.position.copy(this.camera.position);
    this.snowy = base.precipitation === 'snow';
    this.updatePrecipitation(dt, speed, this.snowy);
  }

  updatePrecipitation(dt, speed, snowy) {
    const r = this.rain, s = this.snow;
    r.mat.opacity = snowy ? 0 : this.wet * 0.55;
    s.mat.opacity = snowy ? this.wet * 0.95 : 0;
    if (r.mat.opacity > 0.01) {
      const fall = 38, slant = speed * 0.025;
      r.drops.forEach((d, i) => {
        d.y -= fall * dt; d.z += speed * dt;
        if (d.y < -4) { d.y += 30; d.x = rand(-35, 35); }
        if (d.z > 6) d.z -= 76;
        r.pos.set([d.x, d.y, d.z, d.x, d.y + 1.1, d.z - slant], i * 6);
      });
      r.g.attributes.position.needsUpdate = true;
    }
    if (s.mat.opacity > 0.01) {
      s.t += dt;
      s.flakes.forEach((f, i) => {
        f.y -= 3.2 * dt; f.z += speed * dt;
        if (f.y < -4) { f.y += 26; f.x = rand(-35, 35); }
        if (f.z > 6) f.z -= 66;
        s.pos.set([f.x + Math.sin(s.t * 1.3 + f.p) * 0.6, f.y, f.z], i * 3);
      });
      s.g.attributes.position.needsUpdate = true;
    }
  }
}

const CLOUD_PERIOD = 300;

/** Champ de nuages : grappes de boules, répété sur 3 × 3 périodes autour de l'oiseau. */
function cloudField(THREE) {
  const geos = [];
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const P = CLOUD_PERIOD;
  const layout = [];
  for (let i = 0; i < 11; i++) layout.push([rnd() * P, 34 + rnd() * 22, rnd() * P, 0.8 + rnd() * 0.9]);
  for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) {
    for (const [x, y, z, s] of layout) {
      for (let k = 0; k < 5; k++) {
        const r = (6 + rnd() * 5) * s;
        const g = new THREE.SphereGeometry(r, 8, 5).scale(1, 0.75, 1).translate(gx * P + x + (k - 2) * 7 * s, y + rnd() * 4, gz * P + z + (rnd() - 0.5) * 8);
        geos.push(g);
      }
    }
  }
  // fusion simple (positions seulement)
  let n = 0; for (const g of geos) n += g.index.count;
  const pos = [], idx = new Uint32Array(n);
  let v = 0, i = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    for (const k of g.index.array) idx[i++] = k + v;
    v += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Soleil souriant / lune qui dort, dessinés sur un canvas. */
function faceTexture(THREE, kind) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  if (kind === 'sun') {
    g.fillStyle = '#ffd84d';
    for (let i = 0; i < 12; i++) { // rayons arrondis
      const a = (i / 12) * Math.PI * 2;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.beginPath(); g.roundRect(-9, -122, 18, 40, 9); g.fill(); g.restore();
    }
    g.fillStyle = '#ffe36e'; g.beginPath(); g.arc(cx, cy, 76, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(cx, cy + 6, 70, 0.1 * Math.PI, 0.9 * Math.PI); g.fill();
    g.fillStyle = '#5a3a1a';
    for (const dx of [-24, 24]) { g.beginPath(); g.ellipse(cx + dx, cy - 12, 7, 10, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff9eb0';
    for (const dx of [-44, 44]) { g.beginPath(); g.arc(cx + dx, cy + 14, 11, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy + 8, 24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  } else {
    g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(cx, cy, 100, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f3e6a6';
    for (const [x, y, r] of [[-40, -45, 16], [45, 35, 12], [-20, 55, 9]]) { g.beginPath(); g.arc(cx + x, cy + y, r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#6b5b3a'; g.lineWidth = 6; g.lineCap = 'round';
    for (const dx of [-30, 30]) { g.beginPath(); g.arc(cx + dx, cy - 8, 13, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); } // yeux fermés
    g.beginPath(); g.arc(cx, cy + 22, 14, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = '#ffb3c1';
    for (const dx of [-52, 52]) { g.beginPath(); g.arc(cx + dx, cy + 12, 12, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const tmp1 = new THREE.Color(), tmp2 = new THREE.Color(), tmp3 = new THREE.Color();
const tmp5 = new THREE.Vector3();
function rand(a, b) { return a + Math.random() * (b - a); }
