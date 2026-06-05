import { useState, useEffect } from 'react';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import type { DailyPlan, MatchLog } from '../types';

const phaseColors: Record<string, string> = {
  strength_base: 'bg-blue-100 border-blue-300',
  power_conversion: 'bg-orange-100 border-orange-300',
  explosive_peak: 'bg-red-100 border-red-300',
  deload: 'bg-green-100 border-green-300',
};

const phaseLabels: Record<string, string> = {
  strength_base: '基础力量',
  power_conversion: '力量转化',
  explosive_peak: '爆发力',
  deload: '减载恢复',
};

export default function CalendarPage() {
  const { currentMacroCycle } = useAppStore();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [matches, setMatches] = useState<MatchLog[]>([]);
  const [sessions, setSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [currentDate]);

  async function loadData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const p = await db.dailyPlans.where('date').between(start, end, true, true).toArray();
    setPlans(p);
    const m = await db.matchLogs.where('date').between(start, end, true, true).toArray();
    setMatches(m);
    const s = await db.trainingSessions.where('date').between(start, end, true, true).toArray();
    setSessions(new Set(s.filter((x) => x.completed).map((x) => x.date)));
  }

  const today = new Date().toISOString().split('T')[0];

  // Generate days for the current month view
  const month = currentDate.getMonth();
  const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), month, 1).getDay();

  // Week view: current week
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

  function getDayClass(dateStr: string) {
    const isToday = dateStr === today;
    const hasPlan = plans.some((p) => p.date === dateStr);
    const hasMatch = matches.some((m) => m.date === dateStr);
    const isCompleted = sessions.has(dateStr);
    let cls = 'flex flex-col items-center p-1 rounded-lg text-xs cursor-pointer hover:bg-slate-100';
    if (isToday) cls += ' ring-2 ring-blue-400';
    if (isCompleted) cls += ' bg-green-50';
    return { cls, hasPlan, hasMatch, isCompleted };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">周期日历</h2>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md text-xs font-medium ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'}`}>周</button>
          <button onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-md text-xs font-medium ${viewMode === 'month' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500'}`}>月</button>
        </div>
      </div>

      {/* Current Phase Badge */}
      {currentMacroCycle && (
        <div className={`p-3 rounded-xl border ${phaseColors[currentMacroCycle.phase]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{phaseLabels[currentMacroCycle.phase]}</p>
              <p className="text-xs opacity-70">第 {currentMacroCycle.weekNumber} 周</p>
            </div>
            <div className="text-xs opacity-70">
              {currentMacroCycle.startDate} ~ {currentMacroCycle.endDate}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(viewMode === 'month' ? d.getMonth() - 1 : d.getDate() - 7);
            setCurrentDate(d);
          }} className="text-slate-400 hover:text-slate-600">◀</button>
          <p className="text-sm font-medium text-slate-700">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </p>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(viewMode === 'month' ? d.getMonth() + 1 : d.getDate() + 7);
            setCurrentDate(d);
          }} className="text-slate-400 hover:text-slate-600">▶</button>
        </div>

        {viewMode === 'week' ? (
          /* Week View */
          <div className="grid grid-cols-7 gap-1">
            {weekDayNames.map((name) => (
              <div key={name} className="text-center text-xs text-slate-400 py-1">{name}</div>
            ))}
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split('T')[0];
              const { cls, hasPlan, hasMatch, isCompleted } = getDayClass(dateStr);
              return (
                <div key={dateStr} className={cls}>
                  <span className={`font-medium ${dateStr === today ? 'text-blue-600' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {hasPlan && <span className="text-[8px]">🏋️</span>}
                    {hasMatch && <span className="text-[8px]">🏐</span>}
                    {isCompleted && <span className="text-[8px]">✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Month View */
          <div className="grid grid-cols-7 gap-1">
            {weekDayNames.map((name) => (
              <div key={name} className="text-center text-xs text-slate-400 py-1">{name}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dateStr = `${currentDate.getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              const { cls, hasPlan, hasMatch, isCompleted } = getDayClass(dateStr);
              return (
                <div key={dateStr} className={cls}>
                  <span className={`font-medium text-[11px] ${dateStr === today ? 'text-blue-600' : 'text-slate-700'}`}>
                    {i + 1}
                  </span>
                  <div className="flex gap-0.5">
                    {hasPlan && <span className="text-[8px]">🏋️</span>}
                    {hasMatch && <span className="text-[8px]">🏐</span>}
                    {isCompleted && <span className="text-[8px]">✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-2">图例</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(phaseLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${phaseColors[key]}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-xs">🏋️ 训练日</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">🏐 打球</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">✅ 已完成</span>
          </div>
        </div>
      </div>
    </div>
  );
}
