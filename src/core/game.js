// Boucle de jeu et états : 'menu' -> 'playing' -> 'over' -> ('playing' | 'menu')
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Bird } from '../player/bird.js';
import { World } from '../world/world.js';
import { createPlan } from '../world/stages.js';
import { getTheme } from '../world/themes/index.js';
import { enableTilt, calibrate, getSteer } from '../input/tilt.js';
import { hud, modeLabel } from '../ui/hud.js';
import { applyPortrait, viewportSize, tryNativeLock } from './orientation.js';

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    const { fov, near, far } = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.bird = new Bird(this.camera);
    this.world = new World(this.scene);
    this.mode = localStorage.getItem('birdrun.mode') || 'adventure';
    this.state = 'menu';
    this.stageNumber = 1;
    this.clock = new THREE.Clock();
    this.tiltRequested = false;

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
    applyPortrait();
    const { w, h } = viewportSize();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Remet le monde à zéro pour un mode donné ('adventure' ou un nom de thème). */
  prepare(mode) {
    this.world.setPlan(createPlan(mode));
    this.bird.reset();
    this.world.reset();
    this.world.update(this.bird.z, 0);
  }

  /** Appelé par un tap (geste utilisateur requis pour les permissions iOS). */
  async start(mode = this.mode) {
    this.mode = mode;
    localStorage.setItem('birdrun.mode', mode);
    if (!this.tiltRequested) {
      this.tiltRequested = true;
      const ok = await enableTilt();
      if (!ok) hud.setHint('Inclinaison indisponible : touche la gauche / droite de l’écran.');
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
    hud.banner(mode === 'adventure' ? 'Étape 1' : modeLabel(mode), getTheme(this.world.stageAt(0).theme).label);
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
      this.world.update(this.bird.z, dt);
      this.checkStage();
      if (this.world.collides(this.bird.x, this.bird.z, CONFIG.bird.hitRadius)) this.gameOver();
      hud.update(this.bird.distance, this.bird.speed);
    } else {
      // Au menu / en fin de partie : léger battement d'ailes, obstacles mobiles animés.
      this.bird.time += dt;
      this.bird.apply();
      if (this.state === 'menu') this.world.update(this.bird.z, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  checkStage() {
    if (this.mode !== 'adventure') return;
    const stage = this.world.stageAt(this.bird.z);
    if (stage.number !== this.stageNumber) {
      this.stageNumber = stage.number;
      hud.banner(`Étape ${stage.number}`, getTheme(stage.theme).label);
    }
  }
}
