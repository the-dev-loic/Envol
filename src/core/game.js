// Boucle de jeu et états : 'menu' -> 'playing' -> 'over' -> ('playing' | 'menu')
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Bird } from '../player/bird.js';
import { World } from '../world/world.js';
import { createPlan } from '../world/stages.js';
import { getTheme } from '../world/themes/index.js';
import { safeX } from '../world/obstacles.js';
import { enableTilt, calibrate, getSteer, getControl } from '../input/tilt.js';
import { hud, modeLabel } from '../ui/hud.js';
import { applyLandscape, viewportSize, tryNativeLock } from './orientation.js';

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    const { fov, near, far } = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.scene.add(this.camera); // la caméra porte les ailes et le bec de l'oiseau
    this.bird = new Bird(this.camera);
    this.world = new World(this.scene);
    this.world.setCamera(this.camera);
    this.mode = localStorage.getItem('birdrun.mode') || 'adventure';
    this.state = 'menu';
    this.stageNumber = 1;
    this.clock = new THREE.Clock();

    this.resize();
    // iOS met parfois un instant à donner les nouvelles dimensions après une rotation.
    const onRotate = () => { this.resize(); setTimeout(() => this.resize(), 300); };
    window.addEventListener('resize', onRotate);
    window.addEventListener('orientationchange', onRotate);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clock.stop();
      else this.clock.start();
    });

    this.prepare('adventure');
    hud.showMenu();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    applyLandscape();
    const { w, h } = viewportSize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * (this.pixelScale ?? 1));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Remet le monde à zéro pour un mode donné ('adventure' ou un nom de thème). */
  prepare(mode) {
    this.world.setPlan(createPlan(mode));
    this.world.reset(Math.floor(Math.random() * 2 ** 31)); // monde différent à chaque partie
    this.bird.reset(safeX(0));                           // départ sur le chemin sûr
    this.world.update(this.bird.x, this.bird.z, 0, 0, true);
  }

  /** Appelé par un tap (geste utilisateur requis pour les permissions iOS). */
  async start(mode = this.mode) {
    this.mode = mode;
    localStorage.setItem('birdrun.mode', mode);
    document.activeElement?.blur?.(); // évite qu'Espace « reclique » le bouton du menu
    if (getControl() === 'tilt') {
      const ok = await enableTilt(); // ne redemande rien si déjà autorisé pendant ce lancement
      hud.setHint(ok ? '' : 'Inclinaison refusée : touche la gauche / droite de l’écran.');
    }
    this.requestWakeLock();
    tryNativeLock();
    // Laisse arriver les premières mesures avant de fixer le "tout droit"
    // (les deux premiers tronçons sont vides, donc pas de risque pendant ce délai).
    setTimeout(calibrate, 250);

    this.prepare(mode);
    this.stageNumber = 1;
    this.clock.getDelta();
    this.state = 'playing';
    hud.showPlaying();
    const t0 = getTheme(this.world.stageAt(0).theme);
    hud.banner(mode === 'adventure' ? 'Étape 1' : 'C\u2019est parti !', `${t0.icon ?? ''} ${t0.label}`);
  }

  toMenu() {
    this.state = 'menu';
    this.prepare('adventure');
    hud.showMenu();
  }

  async requestWakeLock() {
    try { await navigator.wakeLock?.request('screen'); } catch { /* facultatif */ }
  }

  gameOver() {
    this.state = 'over';
    hud.showOver(this.mode, this.bird.distance, this.stageNumber);
    navigator.vibrate?.(200);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    if (this.state === 'playing') {
      this.bird.update(dt, getSteer());
      if (-this.bird.z > CONFIG.world.rebaseDistance) {
        const off = -this.bird.z;
        this.bird.z += off;
        this.world.rebase(off);
        this.bird.apply();
      }
      this.world.update(this.bird.x, this.bird.z, dt, this.bird.speed);
      this.checkStage();
      if (this.world.collides(this.bird.x, this.bird.z, CONFIG.bird.hitRadius)) this.gameOver();
      hud.update(this.bird.distance, this.bird.speed, this.world.sky);
    } else {
      // Au menu / en fin de partie : léger battement d'ailes, obstacles mobiles animés.
      this.bird.time += dt;
      this.bird.apply();
      if (this.state === 'menu') this.world.update(this.bird.x, this.bird.z, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  checkStage() {
    if (this.mode !== 'adventure') return;
    const stage = this.world.stageAt(this.bird.z);
    if (stage.number !== this.stageNumber) {
      this.stageNumber = stage.number;
      const t = getTheme(stage.theme);
      hud.banner(`Étape ${stage.number}`, `${t.icon ?? ''} ${t.label}`);
    }
  }
}
