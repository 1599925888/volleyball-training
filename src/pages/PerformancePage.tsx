import { useState, useEffect } from 'react';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import type { PerformanceTest, TestType } from '../types';

const testOptions: { v: TestType; l: string; unit: string; freq: string }[] = [
  { v: 'max_reach', l: '最大摸高', unit: 'cm', freq: '每2周' },
  { v: 'vertical_jump', l: '原地纵跳', unit: 'cm', freq: '每2周' },
  { v: 'squat_3rm', l: '深蹲 3RM', unit: 'kg', freq: '每3周' },
  { v: 'deadlift_3rm', l: '硬拉 3RM', unit: 'kg', freq: '每3周' },
  { v: 'sprint_30m', l: '30m冲刺', unit: '秒', freq: '每月' },
  { v: 't_agility', l: 'T型折返', unit: '秒', freq: '每月' },
];

export default function PerformancePage() {
  const { initialAssessment } = useAppStore();
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<PerformanceTest[]>([]);
  const [form, setForm] = useState({ date: today, testType: 'max_reach' as TestType, value: 0, notes: '' });

  useEffect(() => { loadRecords(); }, []);
  async function loadRecords() {
    setRecords(await db.performanceTests.orderBy('date').reverse().limit(30).toArray());
  }

  async function handleSubmit() {
    const opt = testOptions.find((t) => t.v === form.testType)!;
    await db.performanceTests.add({ ...form, unit: opt.unit });
    loadRecords();
    setForm({ ...form, value: 0, notes: '' });
  }

  const baseline = initialAssessment;
  const getBaseline = (type: TestType): number | null => {
    if (!baseline) return null;
    switch (type) {
      case 'max_reach': return baseline.maxApproachReach;
      case 'vertical_jump': return baseline.standingVerticalJump;
      case 'squat_3rm': return Math.round(baseline.squatMax / 1.08); // estimated 3RM from 1RM
      case 'deadlift_3rm': return Math.round(baseline.deadliftMax / 1.08);
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">能力测试</h2>

      {/* Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />

        <div>
          <label className="text-xs text-slate-500">测试项目</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {testOptions.map((opt) => (
              <button key={opt.v} onClick={() => setForm({ ...form, testType: opt.v })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  form.testType === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{opt.l}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">
            数值 ({testOptions.find((t) => t.v === form.testType)!.unit})
          </label>
          <input type="number" value={form.value || ''}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" step="0.1" />
        </div>

        {getBaseline(form.testType) !== null && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">初始基准</span>
              <span className="font-bold text-blue-700">{getBaseline(form.testType)} {testOptions.find((t) => t.v === form.testType)!.unit}</span>
            </div>
            {form.value > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">变化</span>
                <span className={`font-bold ${form.value > getBaseline(form.testType)! ? 'text-green-600' : 'text-red-600'}`}>
                  {form.value > getBaseline(form.testType)! ? '+' : ''}{(form.value - getBaseline(form.testType)!).toFixed(1)} {testOptions.find((t) => t.v === form.testType)!.unit}
                </span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-slate-500">备注</label>
          <input type="text" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="选填" />
        </div>

        <button onClick={handleSubmit}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          记录测试
        </button>
      </div>

      {/* History by test type */}
      {testOptions.map((opt) => {
        const testRecords = records.filter((r) => r.testType === opt.v);
        if (testRecords.length === 0) return null;
        const latest = testRecords[0];
        const bl = getBaseline(opt.v);
        return (
          <div key={opt.v} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">{opt.l}</h3>
              <span className="text-xs text-slate-400">建议{opt.freq}测一次</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-blue-700">{latest.value}</span>
              <span className="text-sm text-slate-400">{opt.unit}</span>
              {bl !== null && latest.value !== bl && (
                <span className={`text-xs font-medium ${latest.value > bl ? 'text-green-600' : 'text-red-600'}`}>
                  {latest.value > bl ? '↑' : '↓'} {Math.abs(latest.value - bl).toFixed(1)} vs 基准
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-1">
              {testRecords.slice(0, 6).reverse().map((r) => (
                <div key={r.id} className="flex-1 text-center">
                  <div className="w-full bg-blue-100 rounded-t-sm" style={{
                    height: `${Math.max(8, (r.value / Math.max(...testRecords.map((x) => x.value))) * 40)}px`
                  }} />
                  <span className="text-[9px] text-slate-400">{r.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
