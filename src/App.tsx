//import React from 'react';
import { useState } from 'react';
import { CanvasView } from './components/CanvasView';
import type { PhysicsWorld } from './physics/types';

// ベースとなる初期データのテンプレート
const createInitialWorld = (defaultK: number, defaultC: number): PhysicsWorld => ({
  particles: [
    { id: 'p1', position: { x: 300, y: 100 }, velocity: { x: 0, y: 0 }, force: { x: 0, y: 0 }, mass: 1, fixed: true, radius: 10 },
    { id: 'p2', position: { x: 200, y: 140 }, velocity: { x: 0, y: 0 }, force: { x: 0, y: 0 }, mass: 1, fixed: false, radius: 14 },
  ],
  arms: [],
  springs: [
    { id: 's1', particleA: 'p1', particleB: 'p2', k: defaultK, restLength: 100 }
  ],
  dampers: [
    { id: 'd1', particleA: 'p1', particleB: 'p2', c: defaultC }
  ],
  boundaries: [
    { id: 'b1', y: 400, restitution: 1, friction: 0.6 }
  ],
  gravity: { x: 0, y: 9.81 }
});

export default function App() {
  const [isPaused, setIsPaused] = useState(true);
  const [defaultK, setDefaultK] = useState<number>(200); // ばね定数のデフォルト値
  const [defaultC, setDefaultC] = useState<number>(1.5); // ばね定数のデフォルト値
  const [world, setWorld] = useState<PhysicsWorld>(() => createInitialWorld(200, 1.5));
  //const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // CanvasViewを完全に再マウントさせるためのリセット用キー
  const [resetKey, setResetKey] = useState(0);

  // ワールドを初期状態にリセットする関数（現在の defaultK を反映）
  const handleReset = () => {
    setWorld(createInitialWorld(defaultK, defaultC));
    //setSelectedId(null);
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-100 text-slate-900 select-none overflow-hidden">
      <header className="flex flex-col items-center gap-4 p-6 bg-white shadow-md rounded-xl mb-8 border border-slate-200">
        <h1 className="font-extrabold text-3xl text-emerald-600 tracking-tight">Physics Sandbox MVP</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-8 py-2.5 rounded-full font-bold text-base transition-all transform active:scale-95 shadow ${
              isPaused 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isPaused ? '▶ 再生' : '⏸ 停止'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-full font-bold text-base bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all transform active:scale-95 shadow"
          >
            🔄 リセット
          </button>

          {/* デフォルトばね定数の入力欄 */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <label htmlFor="spring-k" className="font-semibold text-slate-600">ばね定数 $k$:</label>
            <input
              id="spring-k"
              type="number"
              value={defaultK}
              onChange={(e) => setDefaultK(Number(e.target.value) || 0)}
              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              step="10"
              min="0"
            />
          </div>

          {/* デフォルトダンパ定数の入力欄 */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <label htmlFor="spring-k" className="font-semibold text-slate-600">ばね定数 $k$:</label>
            <input
              id="damper-c"
              type="number"
              value={defaultC}
              onChange={(e) => setDefaultC(Number(e.target.value) || 0)}
              className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              step="10"
              min="0"
            />
          </div>
        </div>
      </header>

      <main className="w-[600px] h-[450px] bg-slate-900 rounded-3xl shadow-2xl border-4 border-slate-950 overflow-hidden relative">
        <CanvasView key={resetKey} world={world} isPaused={isPaused} />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none"></div>
      </main>
    </div>
  );
}