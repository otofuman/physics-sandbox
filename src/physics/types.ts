export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  id: string;
  position: Vec2;
  velocity: Vec2;
  force: Vec2;
  mass: number;
  fixed: boolean;
  radius: number;
}

export interface RigidArm {
  id: string;
  particleA: string;
  particleB: string;
  length: number;
}

export interface Spring {
  id: string;
  particleA: string;
  particleB: string;
  k: number;
  restLength: number;
}

export interface Damper {
  id: string;
  particleA: string;
  particleB: string;
  c: number;
}

export interface Boundary {
  id: string;
  y: number;
  restitution: number;
  friction: number;
}

export interface PhysicsWorld {
  particles: Particle[]; // Mapから配列に変更
  arms: RigidArm[];
  springs: Spring[];
  dampers: Damper[];
  boundaries: Boundary[];
  gravity: Vec2;
}