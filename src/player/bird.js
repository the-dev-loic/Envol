// L'oiseau = la caméra (vue à la première personne).
// Avance toujours vers -Z, de plus en plus vite ; se déplace en X selon l'inclinaison.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Bird {
  constructor(camera) {
    this.camera = camera;
    this.reset();
  }

  reset(startX = 0) {
    this.x = startX;
    this.z = 0;             // position "monde local" (recentrée périodiquement)
    this.distance = 0;      // distance totale parcourue (score)
    this.speed = CONFIG.speed.start;
    this.lateralVel = 0;
    this.time = 0;
    this.apply();
  }

  update(dt, steer) {
    const { speed, steer: s, bird } = CONFIG;
    this.time += dt;
    this.speed = Math.min(speed.max, this.speed + speed.accel * dt);

    // Lissage de la vitesse latérale vers la consigne.
    const target = steer * s.maxLateralSpeed * (0.8 + 0.4 * this.speed / speed.max);
    this.lateralVel += (target - this.lateralVel) * Math.min(1, s.response * dt);
    this.x += this.lateralVel * dt;

    // Monde ouvert : aucune limite à gauche ni à droite.

    const dz = this.speed * dt;
    this.z -= dz;
    this.distance += dz;
    this.apply();
    return bird;
  }

  apply() {
    const { bird, steer, speed } = CONFIG;
    const c = this.camera;
    const bob = Math.sin(this.time * bird.bobFrequency * Math.PI * 2) * bird.bobAmplitude;
    c.position.set(this.x, bird.height + bob, this.z);
    const bank = -(this.lateralVel / steer.maxLateralSpeed) * THREE.MathUtils.degToRad(steer.bankMaxDeg);
    c.rotation.set(-0.04, 0, bank, 'YXZ');
    // Effet de vitesse : le champ de vision s'élargit.
    const fov = CONFIG.camera.fov + 14 * (this.speed - speed.start) / (speed.max - speed.start);
    if (Math.abs(c.fov - fov) > 0.05) { c.fov = fov; c.updateProjectionMatrix(); }
  }
}
