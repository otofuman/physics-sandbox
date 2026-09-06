import type { PhysicsWorld, Particle, Vec2, RigidArm } from './types';

const getParticleById = (particles: Particle[], id: string) => particles.find((p) => p.id === id);

type RigidCluster = {
  particleIds: string[],
  mass: number,
  inertia: number,
  velocity: Vec2,
  velocityVolumetricCenter: Vec2,
  omega: number,
  position: Vec2,
  positionVolumetricCenter: Vec2,
  angle: number,
  K: number,
  Kt: number,
  Kr: number,
  P: Vec2,
  L: number,
  armLength: number[],  
  armAngle: number[],  // 初期の相対角度（ローカル）
  force: Vec2,
  moment: number,

  translationFixed: boolean,
  rotationFixed: boolean,
  isInitialized: boolean, // 👈 初回初期化フラグを追加
};

const SI_UNIT_LENGTH_GAIN = 0.01; // ピクセル数×この値＝[m]

const makeRigidClusters = (particles: Particle[], arms: RigidArm[]) => {
  const visitedParticles = new Set<string>();
  const rigidClusters: RigidCluster[] = [];
  const isolatedParticles: Particle[] = [];

  const adj = new Map<string, string[]>();
  particles.forEach(p => adj.set(p.id, []));
  arms.forEach(arm => {
    adj.get(arm.particleA)?.push(arm.particleB);
    adj.get(arm.particleB)?.push(arm.particleA);
  });

  particles.forEach(p => {
    if (visitedParticles.has(p.id)) return;

    const neighbors = adj.get(p.id) || [];
    if (neighbors.length === 0 && !p.fixed) {
      isolatedParticles.push(p);
      visitedParticles.add(p.id);
      return;
    }

    const clusterParticleIds: string[] = [];
    const queue: string[] = [p.id];
    visitedParticles.add(p.id);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      clusterParticleIds.push(currId);

      const nexts = adj.get(currId) || [];
      nexts.forEach(nextId => {
        if (!visitedParticles.has(nextId)) {
          visitedParticles.add(nextId);
          queue.push(nextId);
        }
      });
    }

    rigidClusters.push(initRigidCluster(clusterParticleIds));
  });

  isolatedParticles.forEach(p => {
    const clusterParticleIds: string[] = [p.id];
    rigidClusters.push(initRigidCluster(clusterParticleIds));
  });

  return rigidClusters;
}

const initRigidCluster = (particleIds: string[]): RigidCluster => {
  let rc: RigidCluster = {
    particleIds: particleIds,
    mass: 0,
    inertia: 0,
    omega: 0,
    angle: 0,
    K: 0,
    Kt: 0,
    Kr: 0,
    P: { x: 0, y: 0 },
    L: 0,
    position: { x: 0, y: 0 },
    positionVolumetricCenter: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    velocityVolumetricCenter: { x: 0, y: 0 },
    armLength: [],
    armAngle: [],
    force: { x: 0, y: 0 },
    moment: 0,
    translationFixed: false,
    rotationFixed: false,
    isInitialized: false,
  }
  rc.particleIds.forEach(() => {
    rc.armLength.push(0);
    rc.armAngle.push(0);
  });

  return rc;
}

const integrateParticles = (particles: Particle[], rc: RigidCluster) => {
  if (rc.particleIds.length === 0) return;

  rc.mass = 0;
  rc.inertia = 0;
  rc.K = 0;
  rc.Kt = 0;
  rc.L = 0;
  rc.position = { x: 0, y: 0 };
  rc.positionVolumetricCenter = { x: 0, y: 0 };
  rc.velocity = { x: 0, y: 0 };
  rc.velocityVolumetricCenter = { x: 0, y: 0 };
  rc.translationFixed = false;
  rc.rotationFixed = false;

  rc.particleIds.forEach(pid => {
    const p = getParticleById(particles, pid);
    if (!p) return;

    rc.mass += p.mass;
    rc.K += getKt(p);

    if (p.fixed) {
      if (rc.translationFixed) {
        rc.rotationFixed = true;
      }
      rc.translationFixed = true;
      rc.position = { ...p.position };
      rc.positionVolumetricCenter = { ...p.position };
      rc.velocity = { x: 0, y: 0 };
      rc.velocityVolumetricCenter = { x: 0, y: 0 };
    }

    rc.position.x += p.mass * p.position.x;
    rc.position.y += p.mass * p.position.y;
    rc.positionVolumetricCenter.x += p.position.x;
    rc.positionVolumetricCenter.y += p.position.y;
    
    rc.velocity.x += p.mass * p.velocity.x;
    rc.velocity.y += p.mass * p.velocity.y;
    rc.velocityVolumetricCenter.x += p.velocity.x;
    rc.velocityVolumetricCenter.y += p.velocity.y;
  });

  if (!rc.translationFixed) {
    rc.positionVolumetricCenter.x /= rc.particleIds.length;
    rc.positionVolumetricCenter.y /= rc.particleIds.length;

    if (rc.mass > 0) {
      rc.position.x /= rc.mass;
      rc.position.y /= rc.mass;
      rc.velocity.x /= rc.mass;
      rc.velocity.y /= rc.mass;
    } else {
      rc.position = { ...rc.positionVolumetricCenter };
      rc.velocity = { ...rc.velocityVolumetricCenter };
    }
  }

  rc.Kt = getKt(rc);

  for (let ii = 0; ii < rc.particleIds.length; ii++) {
    const pid = rc.particleIds[ii];
    if (!pid) continue;
    
    const p = getParticleById(particles, pid);
    if (!p) continue;

    const vcp = diffV(p.velocity, rc.velocity);
    const pcp = diffV(p.position, rc.position);
    const l2 = (pcp.x) ** 2 + (pcp.y) ** 2;
    const theta = Math.atan2(pcp.y, pcp.x);

    rc.armLength[ii] = Math.sqrt(l2);

    // 初回のみ相対角度を初期固定、以降は回転角を考慮
    if (!rc.isInitialized) {
      rc.armAngle[ii] = theta;
    }

    rc.inertia += p.mass * l2 * SI_UNIT_LENGTH_GAIN * SI_UNIT_LENGTH_GAIN;
    rc.L += p.mass * (-vcp.x * Math.sin(theta) + vcp.y * Math.cos(theta)) * rc.armLength[ii] * SI_UNIT_LENGTH_GAIN;
  }

  rc.inertia = Math.max(rc.inertia, 0.00001); // ゼロ除算防止
  rc.omega = rc.L / rc.inertia;
  if (rc.translationFixed) rc.omega = 0;

  rc.isInitialized = true;
}

const getKt = (p: Particle | RigidCluster) => {
  return getKtFromV(p.mass, p.velocity);
}

const getKtFromV = (mass: number, velocity: Vec2) => {
  return 0.5 * mass * (velocity.x ** 2 + velocity.y ** 2);
}

const diffV = (v1: Vec2, v2: Vec2) => {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y
  }
}

// 👈 修正：particles[ii] ではなく getParticleById で安全に取得
const updateParticleKineticsByRigidCluster = (particles: Particle[], rc: RigidCluster) => {
  if (rc.particleIds.length === 0) return;

  for (let ii = 0; ii < rc.particleIds.length; ii++) {
    const pid = rc.particleIds[ii];
    if (!pid) continue;
    const p = getParticleById(particles, pid);
    if (!p) continue;
    if (p.fixed) continue;

    const currentArmAngle = rc.armAngle[ii] + rc.angle;
    const vAroundCenter = rc.omega * rc.armLength[ii] * SI_UNIT_LENGTH_GAIN;
    const vx = -vAroundCenter * Math.sin(currentArmAngle);
    const vy = vAroundCenter * Math.cos(currentArmAngle);

    p.velocity.x = vx + rc.velocity.x;
    p.velocity.y = vy + rc.velocity.y;

    p.position.x = rc.position.x + rc.armLength[ii] * Math.cos(currentArmAngle);
    p.position.y = rc.position.y + rc.armLength[ii] * Math.sin(currentArmAngle);
  }
}

// 👈 修正：particles[ii] ではなく getParticleById で安全に取得
const updateRigidClusterForces = (particles: Particle[], rc: RigidCluster) => {
  if (rc.particleIds.length === 0) return;
  rc.force = { x: 0, y: 0 };
  rc.moment = 0;

  for (let ii = 0; ii < rc.particleIds.length; ii++) {
    const pid = rc.particleIds[ii];
    if (!pid) continue;
    const p = getParticleById(particles, pid);
    if (!p) continue;
    if (p.fixed) continue;

    rc.force.x += p.force.x;
    rc.force.y += p.force.y;

    const currentArmAngle = rc.armAngle[ii] + rc.angle;
    rc.moment += (p.force.y * Math.cos(currentArmAngle) - p.force.x * Math.sin(currentArmAngle)) * rc.armLength[ii] * SI_UNIT_LENGTH_GAIN;
  }
}

export class PhysicsEngine {
  world: PhysicsWorld;
  isPaused: boolean = false;

  constructor(world: PhysicsWorld) {
    this.world = world;
  }

  step(dt: number){
    if (this.isPaused) return;

    // this.stepOde1(dt);
    this.stepOdeN(dt);
  }

  //private stepOde1(dt: number){
  //  this.substep(dt);
  //}
  private stepOdeN(dt: number){
    const substeps = 10;
    const subDt = dt / substeps;

    for (let i = 0; i < substeps; i++) {
      this.substep(subDt);
    }
  }

  private substep(dt: number) {
    if (this.isPaused) return;

    const { particles, arms, springs, dampers, boundaries, gravity } = this.world;

    const getParticle = (id: string) => getParticleById(particles, id);

    // 1. グラフ探索による「剛体グループ」の検出
    const rigidClusters = makeRigidClusters(particles, arms);

    // 剛体情報の上書き：エネルギーと運動量保存
    rigidClusters.forEach(rc => {
      if (!rc) return;
      integrateParticles(particles, rc);
    });
    
    // 2. 外力の集計 (重力・ばね)
    particles.forEach(p => {
      p.force = { x: 0, y: 0 };
    });

    particles.forEach(p => {
      if (p.fixed) return;
      p.force.x += gravity.x * p.mass;
      p.force.y += gravity.y * p.mass;
    });

    springs.forEach((spring) => {
      const pA = getParticle(spring.particleA);
      const pB = getParticle(spring.particleB);
      if (!pA || !pB) return;

      const dx = pB.position.x - pA.position.x;
      const dy = pB.position.y - pA.position.y;
      const currentLength = Math.sqrt(dx * dx + dy * dy);
      if (currentLength === 0) return;

      const normal = { x: dx / currentLength, y: dy / currentLength };
      const delta = (currentLength - spring.restLength) * SI_UNIT_LENGTH_GAIN;
      const forceMag = spring.k * delta;

      if (!pA.fixed) {
        pA.force.x += normal.x * forceMag;
        pA.force.y += normal.y * forceMag;
      }
      if (!pB.fixed) {
        pB.force.x -= normal.x * forceMag;
        pB.force.y -= normal.y * forceMag;
      }
    });
    

    dampers.forEach((damper) => {
      const pA = getParticle(damper.particleA);
      const pB = getParticle(damper.particleB);
      if (!pA || !pB) return;

      const dx = pB.position.x - pA.position.x;
      const dy = pB.position.y - pA.position.y;
      const vx = pB.velocity.x - pA.velocity.x;
      const vy = pB.velocity.y - pA.velocity.y;
      const theta = Math.atan2(dy, dx);
      const v = vx*Math.cos(theta) + vy*Math.sin(theta);

      const forceMag = damper.c * v;

      if (!pA.fixed) {
        pA.force.x += Math.cos(theta) * forceMag;
        pA.force.y += Math.sin(theta) * forceMag;
      }
      if (!pB.fixed) {
        pB.force.x -= Math.cos(theta) * forceMag;
        pB.force.y -= Math.sin(theta) * forceMag;
      }
    });
    

    // 5. 床との衝突判定
    rigidClusters.forEach(rc => {
      if (!rc) return;
      if (rc.translationFixed) return;

      let dy: number = 0;
      
      rc.particleIds.forEach((pid: string) => {
        const p = getParticleById(particles, pid);
        if (!p) return;
        if (p.fixed) return;
        boundaries.forEach((b) => {
          if (p.position.y + p.radius + dy > b.y) {
            dy += b.y - p.radius - p.position.y;

            p.force.x -= p.force.y * b.friction * Math.sign(p.velocity.x);
            p.force.y -= p.mass * p.velocity.y * (1 + b.restitution) / dt;
          }
        });
      });

      if (dy !== 0) {
        rc.position.y += dy;
        updateParticleKineticsByRigidCluster(particles, rc);
      }
    });
    
    // 剛体情報の上書き：力
    rigidClusters.forEach(rc => {
      if (!rc) return;
      updateRigidClusterForces(particles, rc);
    });

    // 3. 通常の粒子位置・速度の更新（オイラー法）
    rigidClusters.forEach((rc) => {
      if (!rc.translationFixed) {
        const ax = rc.mass > 0 ? rc.force.x / rc.mass : 0;
        const ay = rc.mass > 0 ? rc.force.y / rc.mass : 0;

        rc.velocity.x += ax * dt;
        rc.velocity.y += ay * dt;

        rc.position.x += rc.velocity.x * dt / SI_UNIT_LENGTH_GAIN;
        rc.position.y += rc.velocity.y * dt / SI_UNIT_LENGTH_GAIN;
      }
      if (!rc.rotationFixed) {
        const omega_dot = rc.inertia > 0 ? rc.moment / rc.inertia : 0;
        rc.omega += omega_dot * dt;
        rc.angle += rc.omega * dt; // 👈 修正：回転角を蓄積する
      }
    });

    // 4. 剛体運動をparticleに返送
    rigidClusters.forEach(rc => {
      if (!rc) return;
      updateParticleKineticsByRigidCluster(particles, rc);
    });

    return;

    // 5. 床との衝突判定
    rigidClusters.forEach(rc => {
      if (!rc) return;
      if (rc.translationFixed) return;

      let dy: number = 0;
      
      rc.particleIds.forEach((pid: string) => {
        const p = getParticleById(particles, pid);
        if (!p) return;
        if (p.fixed) return;
        boundaries.forEach((b) => {
          if (p.position.y + p.radius + dy > b.y) {
            dy += b.y - p.radius - p.position.y;

            p.velocity.y = -p.velocity.y * b.restitution;
            p.velocity.x *= 1 - b.friction;
          }
        });
      });

      if (dy !== 0) {
        rc.position.y += dy;
        updateParticleKineticsByRigidCluster(particles, rc);
      }
    });
  }
}
