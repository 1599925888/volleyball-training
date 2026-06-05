import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import type { BodyMetrics, BodySignal } from '../types';

function getBodySignal(m: BodyMetrics): BodySignal {
  if (m.fatigueLevel >= 8 || m.sleepHours < 5 || m.soreAreas.length > 2) return 'red';
  if (m.fatigueLevel >= 5 || m.sleepHours < 6 || m.soreAreas.length > 0) return 'yellow';
  return 'green';
}

const signalColors: Record<BodySignal, string> = {
  green: 'bg-green-100 text-green-800 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

const signalLabels: Record<BodySignal, string> = { green: '状态良好', yellow: '注意调整', red: '需要休息' };

const phaseNames: Record<string, string> = {
  strength_base: '基础力量期',
  power_conversion: '力量转化期',
  explosive_peak: '爆发力峰值期',
  deload: '减载恢复期',
};

const phaseColors: Record<string, string> = {
  strength_base: 'bg-blue-100 text-blue-800',
  power_conversion: 'bg-orange-100 text-orange-800',
  explosive_peak: 'bg-red-100 text-red-800',
  deload: 'bg-green-100 text-green-800',
};

export default function Dashboard() {
  const { initialAssessment, assessmentReport, trainingMode, currentMacroCycle } = useAppStore();
  const [todayMetrics, setTodayMetrics] = useState<BodyMetrics | null>(null);
  const [todaySignal, setTodaySignal] = useState<BodySignal>('green');
  const [thisWeekCompleted, setThisWeekCompleted] = useState(0);
  const [thisWeekTotal, setThisWeekTotal] = useState(0);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const metrics = await db.bodyMetrics.where('date').equals(today).first();
      if (metrics) {
        setTodayMetrics(metrics);
        setTodaySignal(getBodySignal(metrics));
      }

      // Count this week's sessions
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const sessions = await db.trainingSessions
        .where('date')
        .between(startOfWeek.toISOString().split('T')[0], today, true, true)
        .toArray();
      setThisWeekCompleted(sessions.filter((s) => s.completed).length);
      setThisWeekTotal(sessions.length || (trainingMode === 'school' ? 3 : 5));
    }
    load();
  }, []);

  const reach = initialAssessment?.maxApproachReach ?? 0;
  const report = assessmentReport;

  return (
    <div className="space-y-4">
      {/* Body Signal */}
      <Link
        to="/body"
        className={`block p-4 rounded-xl border ${signalColors[todaySignal]} transition-all hover:shadow-md`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70">今日身体状态</p>
            <p className="text-2xl font-bold">{signalLabels[todaySignal]}</p>
            {todayMetrics && (
              <p className="text-xs mt-1 opacity-70">
                疲劳度 {todayMetrics.fatigueLevel}/10 · 睡眠 {todayMetrics.sleepHours}h
              </p>
            )}
          </div>
          <div className="text-3xl">
            {todaySignal === 'green' ? '🟢' : todaySignal === 'yellow' ? '🟡' : '🔴'}
          </div>
        </div>
        {!todayMetrics && (
          <p className="text-xs mt-2 opacity-60">点击填写今日身体状态</p>
        )}
      </Link>

      {/* Core KPI */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-slate-500 mb-1">核心KPI · 助跑摸高</p>
        <p className="text-3xl font-bold text-blue-700">{reach} <span className="text-sm font-normal text-slate-400">cm</span></p>
        {report && (
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>弹跳 {report.verticalJumpHeight}cm</span>
            <span>相对力量 {report.relativeSquatStrength.toFixed(1)}x 体重</span>
          </div>
        )}
      </div>

      {/* Current Phase + Progress */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">当前周期</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentMacroCycle ? phaseColors[currentMacroCycle.phase] : 'bg-slate-100 text-slate-600'}`}>
            {currentMacroCycle ? phaseNames[currentMacroCycle.phase] : '未开始'}
          </span>
        </div>
        {currentMacroCycle && (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span>第 {currentMacroCycle.weekNumber}/4 周</span>
              <span>·</span>
              <span>模式：{trainingMode === 'school' ? '🏫 学期' : '🌞 假期'}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(currentMacroCycle.weekNumber / 4) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* This Week */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700 mb-2">本周训练</p>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-blue-700">
            {thisWeekCompleted}/{thisWeekTotal}
          </div>
          <div className="text-xs text-slate-500">次完成</div>
        </div>
        <Link
          to="/training"
          className="block mt-3 text-center py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          开始今日训练
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/body" className="bg-white rounded-xl p-3 shadow-sm text-center hover:shadow-md transition-shadow">
          <p className="text-2xl mb-1">⚖️</p>
          <p className="text-xs text-slate-600">身体指标</p>
        </Link>
        <Link to="/recovery" className="bg-white rounded-xl p-3 shadow-sm text-center hover:shadow-md transition-shadow">
          <p className="text-2xl mb-1">🧘</p>
          <p className="text-xs text-slate-600">恢复追踪</p>
        </Link>
        <Link to="/match" className="bg-white rounded-xl p-3 shadow-sm text-center hover:shadow-md transition-shadow">
          <p className="text-2xl mb-1">🏐</p>
          <p className="text-xs text-slate-600">打球记录</p>
        </Link>
      </div>
    </div>
  );
}
