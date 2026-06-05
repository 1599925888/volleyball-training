import { useState } from 'react';
import { presetExercises } from '../data/exercises';
import type { ExerciseCategory } from '../types';

const categoryLabels: Record<ExerciseCategory, string> = {
  warmup: '🔥 热身', prehab: '🛡 预复', strength: '💪 力量',
  power: '⚡ 爆发力', plyometric: '🦘 增强式', volleyball: '🏐 排球专项',
  mobility: '🤸 活动度', recovery: '🧘 恢复',
};

const relevanceLabels: Record<string, string> = { high: '核心', medium: '重要', low: '辅助' };

export default function ExerciseLibrary() {
  const [filter, setFilter] = useState<ExerciseCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const categories = Object.keys(categoryLabels) as ExerciseCategory[];

  const filtered = presetExercises.filter((ex) => {
    if (filter !== 'all' && ex.category !== filter) return false;
    if (search && !ex.name.includes(search) && !ex.targetMuscles.some((m) => m.includes(search))) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">训练动作库</h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索动作或目标肌群..."
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >全部</button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >{categoryLabels[cat]}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((ex, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-800">{ex.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    ex.volleyballRelevance === 'high' ? 'bg-blue-100 text-blue-700'
                      : ex.volleyballRelevance === 'medium' ? 'bg-slate-100 text-slate-600'
                      : 'bg-slate-50 text-slate-400'
                  }`}>{relevanceLabels[ex.volleyballRelevance]}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{ex.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ex.equipment.map((eq) => (
                    <span key={eq} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{eq}</span>
                  ))}
                  {ex.targetMuscles.map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{m}</span>
                  ))}
                </div>
                {ex.prehabBenefit && ex.prehabBenefit.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[10px] text-green-600">🛡 保护：{ex.prehabBenefit.join('、')}</span>
                  </div>
                )}
                {ex.injuryRisk && ex.injuryRisk.length > 0 && (
                  <div className="mt-0.5">
                    <span className="text-[10px] text-orange-500">⚠ 注意：{ex.injuryRisk.join('、')}有伤注意</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
