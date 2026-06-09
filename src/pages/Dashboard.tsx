import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { getPhaseName } from '../utils/trainingEngine';
import type { BodyMetrics, BodySignal } from '../types';

function computeSignal(m: BodyMetrics): BodySignal {
  if (m.fatigueLevel >= 8 || m.sleepHours < 5) return 'red';
  if (m.fatigueLevel >= 5 || m.sleepHours < 6) return 'yellow';
  return 'green';
}

const signalCfg = {
  green:  { emoji: '🟢', label: '状态良好', bg: 'bg-green-50 border-green-200', btn: 'bg-green-600 hover:bg-green-700' },
  yellow: { emoji: '🟡', label: '注意调整', bg: 'bg-yellow-50 border-yellow-200', btn: 'bg-yellow-600 hover:bg-yellow-700' },
  red:    { emoji: '🔴', label: '需要休息', bg: 'bg-red-50 border-red-200', btn: 'bg-red-600 hover:bg-red-700' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { initialAssessment, currentMacroCycle, trainingMode } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [planCompleted, setPlanCompleted] = useState(false);
  const [weekDone, setWeekDone] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    const m = await db.bodyMetrics.where('date').equals(today).first();
    setMetrics(m || null);

    const plan = await db.dailyPlans.where('date').equals(today).first();
    setHasPlan(!!plan);
    setPlanCompleted(plan?.completed || false);

    // Week progress
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    const sessions = await db.trainingSessions
      .where('date').between(start.toISOString().split('T')[0], today, true, true).toArray();
    setWeekDone(sessions.filter((s) => s.completed).length);
  }

  const signal = metrics ? computeSignal(metrics) : 'green';
  const cfg = signalCfg[signal];
  const reach = initialAssessment?.maxApproachReach || '?';
  const weekTarget = trainingMode === 'school' ? 3 : 5;
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">排球训练</h2>
          <p className="text-xs text-slate-400">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {currentMacroCycle ? `${getPhaseName(currentMacroCycle.phase)} W${currentMacroCycle.weekNumber}` : '未开始'}
          </span>
          <Link to="/settings" className="text-slate-400 hover:text-slate-600">⚙️</Link>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className={`p-4 rounded-xl border-2 ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-bold text-slate-800">{cfg.label}</p>
              {metrics && (
                <p className="text-xs text-slate-500">
                  疲劳{metrics.fatigueLevel}/10 · 睡眠{metrics.sleepHours}h · {metrics.weight}kg
                </p>
              )}
            </div>
          </div>
          {!metrics && (
            <Link to="/body" className="text-xs text-blue-600 font-medium underline">填写状态 →</Link>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      {!planCompleted ? (
        <button
          onClick={() => navigate('/training')}
          className={`w-full py-4 rounded-xl text-white font-bold text-base shadow-lg transition-all active:scale-95 ${cfg.btn}`}
        >
          {!metrics ? '📝 先填写身体状态' : hasPlan ? '🏋️ 查看今日训练' : '⚡ 生成今日训练计划'}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-bold">✅ 今日训练已完成</p>
          <button onClick={() => navigate('/training')} className="text-xs text-blue-600 underline mt-1">查看详情</button>
        </div>
      )}

      {/* Core KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-700">{reach}<span className="text-xs font-normal text-slate-400">cm</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">助跑摸高</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-700">{weekDone}/{weekTarget}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">本周训练</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-700">
            {currentMacroCycle ? `${currentMacroCycle.weekNumber}/4` : '?'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">周期周</p>
        </div>
      </div>

      {/* 7-day strip */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-xs text-slate-500 mb-2">未来 7 天</p>
        <div className="flex gap-1">
          {next7.map((d, i) => {
            const isToday = i === 0;
            const dayNames = ['今', '明', '后'];
            const label = i < 3 ? dayNames[i] : new Date(d).getDate();
            return (
              <button
                key={d}
                onClick={async () => {
                  // Navigate to training with date context (just use today for now)
                  const plan = await db.dailyPlans.where('date').equals(d).first();
                  if (plan || isToday) navigate('/training');
                  else {
                    // Pre-fill body metrics date and navigate
                    const m = await db.bodyMetrics.where('date').equals(d).first();
                    if (m) navigate('/training');
                    else if (isToday) navigate('/body');
                  }
                }}
                className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-colors ${
                  isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: '/body', icon: '⚖️', label: '身体数据' },
          { to: '/recovery', icon: '🧘', label: '恢复' },
          { to: '/match', icon: '🏐', label: '打球记录' },
          { to: '/diet', icon: '🍽️', label: '饮食' },
          { to: '/performance', icon: '📊', label: '能力测试' },
          { to: '/calendar', icon: '📅', label: '周期日历' },
          { to: '/training/history', icon: '📋', label: '训练历史' },
          { to: '/training/exercises', icon: '📚', label: '动作库' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className="bg-white rounded-xl p-3 shadow-sm text-center hover:shadow-md transition-all active:scale-95"
          >
            <p className="text-2xl mb-1">{item.icon}</p>
            <p className="text-[10px] text-slate-500">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
