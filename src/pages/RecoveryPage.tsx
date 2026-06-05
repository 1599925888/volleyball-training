import { useState, useEffect } from 'react';
import { db } from '../db';
import type { RecoveryLog } from '../types';

const methods = [
  { v: 'foam_rolling', l: '泡沫轴' }, { v: 'stretching', l: '拉伸' },
  { v: 'massage', l: '按摩' }, { v: 'ice', l: '冰敷' },
  { v: 'heat', l: '热敷' }, { v: 'compression', l: '压缩衣' },
  { v: 'none', l: '无' },
];

export default function RecoveryPage() {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<RecoveryLog[]>([]);
  const [form, setForm] = useState<RecoveryLog>({
    date: today, methods: [], durationMinutes: 0,
    subjectiveRecovery: 7, hydration: 'ok',
  });

  useEffect(() => { loadRecords(); }, []);
  async function loadRecords() {
    setRecords(await db.recoveryLogs.orderBy('date').reverse().limit(14).toArray());
  }

  const toggleMethod = (v: string) => {
    if (v === 'none') { setForm({ ...form, methods: ['none'] }); return; }
    const f = form.methods.filter((m) => m !== 'none');
    const next = f.includes(v) ? f.filter((m) => m !== v) : [...f, v];
    setForm({ ...form, methods: next });
  };

  async function handleSubmit() {
    const existing = await db.recoveryLogs.where('date').equals(form.date).first();
    if (existing) await db.recoveryLogs.put({ ...form, id: existing.id! });
    else await db.recoveryLogs.add(form);
    loadRecords();
  }

  // Weekly recovery rate
  const thisWeekRecords = records.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    return d >= start;
  });
  const totalRecoveryMin = thisWeekRecords.reduce((s, r) => s + r.durationMinutes, 0);
  const avgRecovery = records.length > 0 ? records.reduce((s, r) => s + r.subjectiveRecovery, 0) / records.length : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">恢复追踪</h2>

      {/* Weekly summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-500">本周恢复时长</p>
            <p className="text-xl font-bold text-blue-700">{totalRecoveryMin}<span className="text-sm font-normal text-slate-400">min</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">平均恢复度</p>
            <p className="text-xl font-bold text-blue-700">{avgRecovery.toFixed(1)}<span className="text-sm font-normal text-slate-400">/10</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">恢复率预警</p>
            <p className={`text-xl font-bold ${totalRecoveryMin < 60 ? 'text-orange-500' : 'text-green-500'}`}>
              {totalRecoveryMin < 60 ? '⚠' : '✅'}
            </p>
          </div>
        </div>
        {totalRecoveryMin < 60 && (
          <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded-lg">
            本周恢复投入偏少，训练效果和伤病预防都需要足够的恢复支持
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />

        <div>
          <label className="text-xs text-slate-500">恢复手段</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {methods.map((m) => (
              <button key={m.v} onClick={() => toggleMethod(m.v)}
                className={`px-2 py-1 rounded-full text-xs ${
                  form.methods.includes(m.v) ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-slate-100 text-slate-500'
                }`}>{m.l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">恢复时长 (分钟)</label>
            <input type="number" value={form.durationMinutes || ''}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">主观恢复度 (1-10)</label>
            <input type="number" min="1" max="10" value={form.subjectiveRecovery}
              onChange={(e) => setForm({ ...form, subjectiveRecovery: Number(e.target.value) as RecoveryLog['subjectiveRecovery'] })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">补水情况</label>
          <div className="flex gap-2 mt-1">
            {(['good', 'ok', 'poor'] as const).map((h) => (
              <button key={h} onClick={() => setForm({ ...form, hydration: h })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  form.hydration === h ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{h === 'good' ? '充足' : h === 'ok' ? '一般' : '不足'}</button>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          保存恢复记录
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-3">最近恢复记录</h3>
        <div className="space-y-2">
          {records.slice(0, 7).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs">{r.date}</span>
              <span className="text-slate-600 text-xs">{r.methods.map((m) => methods.find((x) => x.v === m)?.l).join('、')}</span>
              <span className="text-slate-400 text-xs">{r.durationMinutes}min</span>
              <span className="text-slate-700">恢复度 {r.subjectiveRecovery}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
