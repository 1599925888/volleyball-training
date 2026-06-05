import { useState, useEffect } from 'react';
import { db } from '../db';
import type { MatchLog, MatchIntensity, VolleyballPosition } from '../types';

const intensityOptions: { v: MatchIntensity; l: string; coeff: number }[] = [
  { v: 'casual', l: '轻松娱乐', coeff: 3 },
  { v: 'moderate', l: '中等强度', coeff: 5 },
  { v: 'intense', l: '高强度比赛', coeff: 7 },
];

const positionOptions: { v: VolleyballPosition; l: string }[] = [
  { v: 'outside_hitter', l: '主攻' }, { v: 'middle_blocker', l: '副攻' },
  { v: 'setter', l: '二传' }, { v: 'opposite', l: '接应' },
  { v: 'libero', l: '自由人' }, { v: 'rotating', l: '轮转' },
];

export default function MatchLogPage() {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<MatchLog[]>([]);
  const [form, setForm] = useState({
    date: today, durationMinutes: 0,
    intensity: 'moderate' as MatchIntensity,
    position: 'outside_hitter' as VolleyballPosition,
    bodyResponse: '',
  });

  useEffect(() => { loadRecords(); }, []);
  async function loadRecords() {
    setRecords(await db.matchLogs.orderBy('date').reverse().limit(20).toArray());
  }

  async function handleSubmit() {
    const coeff = intensityOptions.find((o) => o.v === form.intensity)!.coeff;
    const log: MatchLog = {
      ...form,
      calculatedLoad: form.durationMinutes * coeff,
    };
    await db.matchLogs.add(log);
    loadRecords();
    setForm({ ...form, durationMinutes: 0, intensity: 'moderate', bodyResponse: '' });
  }

  const totalLoadThisWeek = records.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    return d >= start;
  }).reduce((s, r) => s + r.calculatedLoad, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">比赛/打球日志</h2>

      {/* Week load */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">本周打球负荷</p>
            <p className="text-2xl font-bold text-blue-700">{totalLoadThisWeek}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">打球次数</p>
            <p className="text-2xl font-bold text-blue-700">
              {records.filter((r) => {
                const d = new Date(r.date);
                const now = new Date();
                const start = new Date(now); start.setDate(now.getDate() - now.getDay());
                return d >= start;
              }).length}次
            </p>
          </div>
        </div>
        {totalLoadThisWeek > 500 && (
          <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded-lg">
            ⚠ 本周打球负荷较高，建议适当降低训练强度或增加恢复
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />

        <div>
          <label className="text-xs text-slate-500">打球时长 (分钟)</label>
          <input type="number" value={form.durationMinutes || ''}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>

        <div>
          <label className="text-xs text-slate-500">强度评级</label>
          <div className="flex gap-2 mt-1">
            {intensityOptions.map((opt) => (
              <button key={opt.v} onClick={() => setForm({ ...form, intensity: opt.v })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  form.intensity === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{opt.l}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">打球位置</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {positionOptions.map((opt) => (
              <button key={opt.v} onClick={() => setForm({ ...form, position: opt.v })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  form.position === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{opt.l}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">身体反应</label>
          <input type="text" value={form.bodyResponse}
            onChange={(e) => setForm({ ...form, bodyResponse: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="打完后的身体感觉..." />
        </div>

        {form.durationMinutes > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">预计负荷值</p>
            <p className="text-lg font-bold text-blue-700">
              {form.durationMinutes * intensityOptions.find((o) => o.v === form.intensity)!.coeff}
            </p>
          </div>
        )}

        <button onClick={handleSubmit}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          记录打球
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-3">打球记录</h3>
        <div className="space-y-2">
          {records.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs">{r.date}</span>
              <span className="text-slate-600 text-xs">{r.durationMinutes}min</span>
              <span className="text-slate-600 text-xs">{intensityOptions.find((o) => o.v === r.intensity)!.l}</span>
              <span className="text-slate-400 text-xs">{positionOptions.find((o) => o.v === r.position)!.l}</span>
              <span className="text-xs font-medium text-blue-600">负荷 {r.calculatedLoad}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
