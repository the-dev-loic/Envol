// Ciel et météo : dôme en dégradé, soleil, lune, étoiles, cycle jour/nuit,
// météo changeante (beau temps, brouillard, pluie — ou neige dans les mondes enneigés).
// World lui fournit l'ambiance "de base" du thème courant ; ce module la modifie selon l'heure et la météo.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const col = (h) => new THREE.Color(h);
const NIGHT_TOP = col(0x03061a), NIGHT_HORIZON = col(0x121a36);
const SUNSET_TOP = col(0x3d4a8f), SUNSET_HORIZON = col(0xff8f55);
const DAY_BLUE = col(0x3f8fe0), WHITE = col(0xffffff);
const OVERCAST = col(0x8e979f), FOGGY = col(0xc9cfd5);
const MOONLIGHT = col(0x8ea6ff), DUSK_SUN = col(0xff8a4a), NIGHT_SKYLIGHT = col(0x5466a0);
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
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // Soleil et lune (disques lointains)
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2, fog: false, transparent: true, depthWrite: false });
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 24), this.sunMat);
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xf2f0e4, fog: false, transparent: true, depthWrite: false });
    this.moonDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 20), this.moonMat);
    for (const m of [this.sunDisc, this.moonDisc]) { m.renderOrder = -8; this.group.add(m); }

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
    this.time = (this.time + dt / cycle.dayLength) % 1;
    const a = (this.time - 0.25) * Math.PI * 2; // 6 h : lever, 12 h : zénith, 18 h : coucher
    this.sunDir.set(-Math.cos(a) * 0.75, Math.sin(a), -0.65).normalize();
    const elev = this.sunDir.y;
    const day = smooth(-0.18, 0.22, elev);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.3) * smooth(-0.35, -0.05, elev);
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
    this.sunMat.color.copy(WHITE).lerp(DUSK_SUN, dusk * 0.6);
    this.sunDisc.position.copy(this.sunDir).multiplyScalar(360);
    this.moonDisc.position.copy(moonDir).multiplyScalar(360);
    this.sunDisc.lookAt(0, 0, 0);
    this.moonDisc.lookAt(0, 0, 0);

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

const tmp1 = new THREE.Color(), tmp2 = new THREE.Color(), tmp3 = new THREE.Color();
const tmp5 = new THREE.Vector3();
function rand(a, b) { return a + Math.random() * (b - a); }
