import React, { useEffect, useRef, useState } from 'react';
import type { PhysicsWorld } from '../physics/types';
import { usePhysics } from '../hooks/usePhysics';

interface CanvasViewProps {
  world: PhysicsWorld;
  isPaused: boolean;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ world, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { startLoop, setPaused, addParticle, addArm } = usePhysics(world);

  // 👈 1つ目に選択された質点のIDを保持するState
  const [selectedParticleId, setSelectedParticleId] = useState<string | null>(null);

  useEffect(() => {
    setPaused(isPaused);
  }, [isPaused, setPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 450;

    const cleanup = startLoop((currentWorld) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 背景の枠
      ctx.strokeStyle = '#333';
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // 床
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 4;
      currentWorld.boundaries.forEach((b) => {
        ctx.beginPath();
        ctx.moveTo(0, b.y);
        ctx.lineTo(canvas.width, b.y);
        ctx.stroke();
      });

      // ばねの描画
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 3;
      currentWorld.springs.forEach((s) => {
        const pA = currentWorld.particles.find(p => p.id === s.particleA);
        const pB = currentWorld.particles.find(p => p.id === s.particleB);
        if (!pA || !pB) return;

        ctx.beginPath();
        ctx.moveTo(pA.position.x, pA.position.y);
        ctx.lineTo(pB.position.x, pB.position.y);
        ctx.stroke();
      });

      // 👈 剛体腕の描画 (太い実線)
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 6;
      currentWorld.arms.forEach((arm) => {
        const pA = currentWorld.particles.find(p => p.id === arm.particleA);
        const pB = currentWorld.particles.find(p => p.id === arm.particleB);
        if (!pA || !pB) return;

        ctx.beginPath();
        ctx.moveTo(pA.position.x, pA.position.y);
        ctx.lineTo(pB.position.x, pB.position.y);
        ctx.stroke();
      });

      // 質点の描画
      currentWorld.particles.forEach((p) => {
        ctx.fillStyle = p.fixed ? '#e74c3c' : '#3498db';
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // 👈 選択されている質点なら黄色いリングでハイライトする
        if (p.id === selectedParticleId) {
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    return () => {
      cleanup();
    };
  }, [startLoop, selectedParticleId]); // selectedParticleIdが変わったら再描画に反映

  // キャンバスクリック時の処理（質点の選択、腕の接続、または新規作成）
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // const currentWorld = canvasRef.current ? (canvasRef.current as any).__world_ref__ : null; 
    // ※ 簡易的に直近のワールドから既存の質点をヒットテストする
    // 現在のエンジンのワールドからパーティクルを探す
    const particles = world.particles; // Appから渡っている初期構造、あるいはエンジンから引く

    // クリック位置にある質点を検出する（当たり判定：半径内か）
    const clickedParticle = particles.find((p) => {
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= p.radius + 6;
    });

    if (clickedParticle) {
      // 質点をタップした場合
      if (!selectedParticleId) {
        // 1つ目の選択
        setSelectedParticleId(clickedParticle.id);
      } else if (selectedParticleId === clickedParticle.id) {
        // 同じものをタップしたら選択解除
        setSelectedParticleId(null);
      } else {
        // 2つ目の異なる質点をタップ！ -> 剛体腕で結ぶ
        const pA = particles.find(p => p.id === selectedParticleId);
        const pB = clickedParticle;

        if (pA && pB) {
          const dx = pB.position.x - pA.position.x;
          const dy = pB.position.y - pA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 剛体腕を追加
          addArm({
            id: `arm_${Date.now()}`,
            particleA: pA.id,
            particleB: pB.id,
            length: distance, // 現在の距離をそのまま剛体の長さにする
          });
        }
        // 選択をリセット
        setSelectedParticleId(null);
      }
    } else {
      // 何もない場所をタップした場合 -> 新しい質点を追加
      addParticle({
        id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        force: { x: 0, y: 0 },
        mass: 1,
        fixed: false,
        radius: 12,
      });
      setSelectedParticleId(null);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 relative flex flex-col items-center justify-center">
      <p className="text-xs text-emerald-400 mb-2">
        💡 空白タップで質点追加 / 1つ目の質点をタップして選択し、2つ目をタップすると<span className="text-green-300 font-bold">緑の剛体腕</span>で結ばれます！
      </p>
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="w-[600px] h-[450px] block bg-slate-950 shadow-inner rounded-xl cursor-crosshair" 
      />
    </div>
  );
};