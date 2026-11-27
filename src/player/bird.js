// L'oiseau = la caméra (vue à la première personne).
// Avance toujours vers -Z, de plus en plus vite ; se déplace en X selon l'inclinaison.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { toon } from '../world/style.js';

export class Bird {
  constructor(camera) {
    this.camera = camera;
    this.buildBody();
    this.reset();
  }

  /** Ailes qui battent sur les côtés de l'écran + petit bec en bas : on EST l'oiseau. */
  buildBody() {
    const body = toon({ color: 0x4dabf7, fog: false });
    const tip = toon({ color: 0xffffff, fog: false });
    const beakMat = new THREE.MeshBasicMaterial({ color: 0xffa62b, fog: false }); // toujours bien orange
    this.wings = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();          // épaule
      pivot.position.set(side * 0.5, -0.4, -0.8);
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 10).scale(0.85, 0.09, 0.36), body);
      wing.position.x = side * 0.38;
      // Plumes au bout de l'aile (3 « doigts » blancs)
      for (let k = 0; k < 3; k++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8).scale(1.6, 0.35, 0.55), tip);
        f.position.set(side * (0.42 + k * 0.05), -0.005, -0.08 + k * 0.1);
        f.rotation.y = side * (0.25 - k * 0.25);
        wing.add(f);
      }
      pivot.add(wing);
      pivot.userData.side = side;
      this.camera.add(pivot);
      this.wings.push(pivot);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 16).scale(1.3, 0.7, 1).rotateX(-Math.PI / 2 - 0.25), beakMat);
    beak.position.set(0, -0.355, -0.7);
    this.camera.add(beak);
    for (const o of [...this.wings, beak]) o.traverse((m) => { m.renderOrder = 10; });
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
    // Battement d'ailes (plus rapide quand on va vite) ; l'aile intérieure se replie un peu en virage.
    const flap = Math.sin(this.time * (5 + 5 * this.speed / speed.max)) * 0.35;
    for (const w of this.wings) {
      const sd = w.userData.side;
      w.rotation.z = sd * (flap + 0.25) + bank * 0.6;
    }
  }
}
