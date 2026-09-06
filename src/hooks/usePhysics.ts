import {
  // useEffect,
  useRef,
  useCallback } from 'react';
import { PhysicsEngine } from '../physics/engine';
import type { PhysicsWorld, Particle, RigidArm } from '../physics/types';

export function usePhysics(initialWorld: PhysicsWorld) {
  const engineRef = useRef(new PhysicsEngine(initialWorld));
  const requestRef = useRef<number>(0);

  const getWorld = () => engineRef.current.world;

  const setPaused = useCallback((paused: boolean) => {
    engineRef.current.isPaused = paused;
  }, []);

  const isPaused = useCallback(() => {
    return engineRef.current.isPaused;
  }, []);

  const addParticle = useCallback((particle: Particle) => {
    engineRef.current.world.particles.push(particle);
  }, []);

  // 👈 新しい剛体腕をワールドに追加する関数
  const addArm = useCallback((arm: RigidArm) => {
    engineRef.current.world.arms.push(arm);
  }, []);

  const startLoop = useCallback((onDraw: (world: PhysicsWorld) => void) => {
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      engineRef.current.step(dt);
      onDraw(engineRef.current.world);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return {
    engine: engineRef.current,
    getWorld,
    setPaused,
    isPaused,
    addParticle,
    addArm,
    startLoop,
  };
}