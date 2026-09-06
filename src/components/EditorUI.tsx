import React from 'react';
import type { PhysicsWorld, Particle } from '../physics/types';

type EditorUIProps = {
  world: PhysicsWorld;
  setWorld: React.Dispatch<React.SetStateAction<PhysicsWorld>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentTool: string;
  setCurrentTool: (tool: string) => void;
};

export const EditorUI: React.FC<EditorUIProps> = ({
  world,
  setWorld,
  selectedId,
  setSelectedId,
  currentTool,
  setCurrentTool,
}) => {
  const selectedParticle = world.particles.find(p => p.id === selectedId);

  // パレットから新しい粒子を画面（中央付近）に追加する
  const addParticle = () => {
    const newId = `p_${Date.now()}`;
    const newParticle: Particle = {
      id: newId,
      position: { x: 300, y: 150 },
      velocity: { x: 0, y: 0 },
      force: { x: 0, y: 0 },
      mass: 1,
      fixed: false,
      radius: 12,
    };
    setWorld(prev => ({
      ...prev,
      particles: [...prev.particles, newParticle],
    }));
    setSelectedId(newId);
  };

  // 選択中の粒子のプロパティを変更する
  const handleParticleChange = (key: keyof Particle, value: any) => {
    if (!selectedId) return;
    setWorld(prev => ({
      ...prev,
      particles: prev.particles.map(p =>
        p.id === selectedId ? { ...p, [key]: value } : p
      ),
    }));
  };

  return (
    <div className="flex gap-4 mb-4 w-[600px]">
      {/* 1. パレット / ツール */}
      <div className="flex-1 bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-col gap-2">
        <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">パレット / ツール</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentTool('select')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTool === 'select' 
                ? 'bg-slate-800 text-white shadow' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            選択 / 移動
          </button>
          <button
            onClick={addParticle}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow transition-all"
          >
            + 粒子を追加
          </button>
        </div>
      </div>

      {/* 2. 特性変更パネル */}
      <div className="flex-1 bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-col gap-2">
        <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">特性変更パネル</h3>
        {selectedParticle ? (
          <div className="flex flex-col gap-2 text-xs text-slate-700">
            <div className="text-slate-400 font-mono text-[11px]">ID: {selectedParticle.id}</div>
            <div className="flex items-center justify-between">
              <label>質量 (kg):</label>
              <input
                type="number"
                value={selectedParticle.mass}
                step="0.1"
                min="0.01"
                onChange={e => handleParticleChange('mass', parseFloat(e.target.value) || 0.1)}
                className="w-20 px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-900 font-medium"
              />
            </div>
            <div className="flex items-center justify-between">
              <label>半径 (px):</label>
              <input
                type="number"
                value={selectedParticle.radius}
                min="1"
                onChange={e => handleParticleChange('radius', parseInt(e.target.value) || 5)}
                className="w-20 px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-900 font-medium"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={selectedParticle.fixed}
                onChange={e => handleParticleChange('fixed', e.target.checked)}
                id="fixed-check"
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="fixed-check" className="cursor-pointer">位置を固定する (Fixed)</label>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-xs italic py-2">オブジェクトが選択されていません</p>
        )}
      </div>
    </div>
  );
};