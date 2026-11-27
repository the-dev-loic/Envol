// Boucle de jeu et états : 'menu' -> 'playing' -> 'over' -> 'playing' ...
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Bird } from '../player/bird.js';
import { World } from '../world/world.js';
import { getTheme } from '../world/themes/index.js';
import { enableTilt, calibrate, getSteer } from '../input/tilt.js';
import { hud } from '../ui/hud.js';

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    const { fov, near, far } = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.bird = new Bird(this.camera);
    this.world = new World(this.scene, getTheme(CONFIG.theme));
    this.state = 'menu';
    this.clock = new THREE.Clock();
    this.tiltRequested = false;
    this.wakeLock = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.clock.stop();
      else this.clock.start();
    });

    this.world.update(this.bird.z);
    hud.showMenu();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Appelé par un tap (geste utilisateur requis pour les permissions iOS). */
  async start() {
    if (!this.tiltRequested) {
      this.tiltRequested = true;
      const ok = await enableTilt();
      if (!ok) hud.setHint('Inclinaison indisponible : touche la gauche / droite de l’écran.');
    }
    this.requestWakeLock();
    // Laisse le temps au premier événement d'orientation d'arriver avant de calibrer.
    // (les deux premiers tronçons sont vides, donc pas de risque pendant ce délai)
    setTimeout(calibrate, 250);

    this.bird.reset();
    this.world.reset();
    this.world.update(this.bird.z);
    this.clock.getDelta();
    this.state = 'playing';
    hud.showPlaying();
  }

  async requestWakeLock() {
    try { this.wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* facultatif */ }
  }

  gameOver() {
    this.state = 'over';
    hud.showOver(this.bird.distance);
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
      this.world.update(this.bird.z);
      if (this.world.collides(this.bird.x, this.bird.z, CONFIG.bird.hitRadius)) this.gameOver();
      hud.update(this.bird.distance, this.bird.speed);
    } else if (this.state === 'menu') {
      // Petit survol au menu pour donner vie à l'écran d'accueil.
      this.bird.time += dt;
      this.bird.apply();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
