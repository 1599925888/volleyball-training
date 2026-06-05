import { useState, useEffect } from 'react';
import { db } from '../db';
import type { BodyMetrics } from '../types';

export default function BodyMetricsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<BodyMetrics[]>([]);
  const [form, setForm] = useState<BodyMetrics>({
    date: today,
    weight: 0,
    restingHeartRate: undefined,
    sleepHours: 0,
    sleepQuality: 3,
    fatigueLevel: 5,
    soreAreas: [],
    playedVolleyball: false,
  });

  const soreOptions = [
    { v: 'quads', l: '股四头肌' }, { v: 'hamstrings', l: '腘绳肌' },
    { v: 'calves', l: '小腿' }, { v: 'shoulders', l: '肩膀' },
    { v: 'back', l: '背部' }, { v: 'knees', l: '膝盖' },
    { v: 'ankles', l: '脚踝' }, { v: 'none', l: '无酸痛' },
  ];

  const toggleSore = (v: string) => {
    if (v === 'none') { setForm({ ...form, soreAreas: ['none'] }); return; }
    const filtered = form.soreAreas.filter((s) => s !== 'none');
    const next = filtered.includes(v) ? filtered.filter((s) => s !== v) : [...filtered, v];
    setForm({ ...form, soreAreas: next });
  };

  useEffect(() => { loadRecords(); }, []);
  async function loadRecords() {
    const data = await db.bodyMetrics.orderBy('date').reverse().limit(30).toArray();
    setRecords(data);
  }

  async function handleSubmit() {
    const existing = await db.bodyMetrics.where('date').equals(form.date).first();
    if (existing) {
      await db.bodyMetrics.put({ ...form, id: existing.id! });
    } else {
      await db.bodyMetrics.add(form);
    }
    loadRecords();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">身体指标记录</h2>

      {/* Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex gap-2">
          <input type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">体重 (kg)</label>
            <input type="number" value={form.weight || ''} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">晨起心率 (可选)</label>
            <input type="number" value={form.restingHeartRate || ''}
              onChange={(e) => setForm({ ...form, restingHeartRate: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">睡眠时长 (h)</label>
            <input type="number" value={form.sleepHours || ''} onChange={(e) => setForm({ ...form, sleepHours: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" step="0.5" />
          </div>
          <div>
            <label className="text-xs text-slate-500">睡眠质量</label>
            <div className="flex gap-1 mt-1">
              {([1, 2, 3, 4, 5] as const).map((s) => (
                <button key={s} onClick={() => setForm({ ...form, sleepQuality: s })}
                  className={`w-8 h-8 rounded text-xs font-medium ${
                    form.sleepQuality >= s ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">主观疲劳度 (1-10)</label>
          <div className="flex gap-1 mt-1 flex-wrap">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((f) => (
              <button key={f} onClick={() => setForm({ ...form, fatigueLevel: f })}
                className={`w-7 h-7 rounded text-xs font-medium ${
                  form.fatigueLevel === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{f}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">肌肉酸痛部位</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {soreOptions.map((opt) => (
              <button key={opt.v} onClick={() => toggleSore(opt.v)}
                className={`px-2 py-1 rounded-full text-xs ${
                  form.soreAreas.includes(opt.v) ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-slate-100 text-slate-500'
                }`}>{opt.l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.playedVolleyball}
              onChange={(e) => setForm({ ...form, playedVolleyball: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600" />
            <span className="text-sm text-slate-700">昨天打了排球</span>
          </label>
        </div>
        <div>
          <label className="text-xs text-slate-500">备注（伤病/不适）</label>
          <input type="text" value={form.injuryNotes || ''}
            onChange={(e) => setForm({ ...form, injuryNotes: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="选填" />
        </div>
        <button onClick={handleSubmit}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          保存记录
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-3">最近记录</h3>
        <div className="space-y-2">
          {records.slice(0, 7).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs">{r.date}</span>
              <span className="text-slate-700">{r.weight}kg</span>
              <span className="text-slate-400 text-xs">睡眠 {r.sleepHours}h</span>
              <span className="text-slate-400 text-xs">疲劳 {r.fatigueLevel}/10</span>
              <span>{r.fatigueLevel <= 4 ? '🟢' : r.fatigueLevel <= 7 ? '🟡' : '🔴'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
