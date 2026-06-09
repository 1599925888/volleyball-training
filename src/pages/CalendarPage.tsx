import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { getPhaseName } from '../utils/trainingEngine';
import type { DailyPlan, TrainingSession } from '../types';

const phaseColors: Record<string, string> = {
  strength_base: 'bg-blue-100 text-blue-700',
  power_conversion: 'bg-orange-100 text-orange-700',
  explosive_peak: 'bg-red-100 text-red-700',
  deload: 'bg-green-100 text-green-700',
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const { currentMacroCycle, trainingMode } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const [viewDate, setViewDate] = useState(new Date());
  const [plans, setPlans] = useState<Map<string, DailyPlan>>(new Map());
  const [sessions, setSessions] = useState<Map<string, TrainingSession>>(new Map());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  useEffect(() => { loadMonth(); }, [viewDate]);

  async function loadMonth() {
    const first = new Date(year, month, 1).toISOString().split('T')[0];
    const last = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const p = await db.dailyPlans.where('date').between(first, last, true, true).toArray();
    const planMap = new Map<string, DailyPlan>();
    p.forEach((x) => planMap.set(x.date, x));
    setPlans(planMap);

    const s = await db.trainingSessions.where('date').between(first, last, true, true).toArray();
    const sessMap = new Map<string, TrainingSession>();
    s.forEach((x) => sessMap.set(x.date, x));
    setSessions(sessMap);
  }

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function getDayStatus(dateStr: string) {
    const plan = plans.get(dateStr);
    const session = sessions.get(dateStr);
    const isToday = dateStr === today;
    return { plan, session, isToday, hasPlan: !!plan, completed: session?.completed || plan?.completed };
  }

  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="space-y-4">
      {/* Phase banner */}
      {currentMacroCycle && (
        <div className={`px-4 py-2 rounded-xl ${phaseColors[currentMacroCycle.phase]}`}>
          <p className="text-sm font-bold">{getPhaseName(currentMacroCycle.phase)} · 第{currentMacroCycle.weekNumber}周</p>
          <p className="text-xs opacity-70">{trainingMode === 'school' ? '学期模式 2-3次/周' : '假期模式 4-5次/周'}</p>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
        <button onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-slate-600 text-lg px-2">◀</button>
        <p className="font-bold text-slate-700">{year}年{month + 1}月</p>
        <button onClick={() => changeMonth(1)} className="text-slate-400 hover:text-slate-600 text-lg px-2">▶</button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {weekDayNames.map((name, i) => (
            <div key={i} className={`py-2 text-center text-xs font-medium ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-600'}`}>
              {name}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells before month start */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square border-b border-r border-slate-50" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const { isToday, hasPlan, completed } = getDayStatus(dateStr);
            const isPast = dateStr < today;

            let bg = 'hover:bg-blue-50';
            let dot = null;
            if (completed) { bg = 'bg-green-50 hover:bg-green-100'; dot = 'bg-green-500'; }
            else if (hasPlan) { bg = 'bg-blue-50 hover:bg-blue-100'; dot = 'bg-blue-500'; }
            else if (isPast) { bg = 'hover:bg-slate-50'; }

            return (
              <button
                key={dateStr}
                onClick={() => navigate(`/training?date=${dateStr}`)}
                className={`aspect-square border-b border-r border-slate-50 flex flex-col items-center justify-center transition-colors ${bg} ${
                  isToday ? 'ring-2 ring-blue-400 ring-inset' : ''
                }`}
              >
                <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : hasPlan && !completed ? 'text-blue-700' : 'text-slate-700'}`}>
                  {day}
                </span>
                {dot && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dot}`} />}
                {!dot && isPast && <div className="w-1.5 h-1.5 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-600">有训练计划</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-600">已完成</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full ring-2 ring-blue-400" />
          <span className="text-slate-600">今天</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={async () => {
          if (!confirm(`将今天(${today})标记为休息日？`)) return;
          const plan = await db.dailyPlans.where('date').equals(today).first();
          if (plan) {
            plan.bodySignal = 'red';
            plan.intensityPercent = 30;
            plan.notes = (plan.notes || '') + '\n\n🛌 已手动标记为休息日。';
            plan.id = plan.id!;
            await db.dailyPlans.put(plan);
          } else {
            await db.dailyPlans.add({
              date: today, macroCycleId: currentMacroCycle?.id || 0,
              bodySignal: 'red', intensityPercent: 30,
              warmup: [{ name: '轻柔拉伸', duration: '10min', notes: '休息日主动恢复' }],
              prehab: [], mainWorkout: [], volleyballSpecific: [],
              cooldown: [], notes: '🛌 手动标记为休息日。', completed: false,
            });
          }
          loadMonth();
        }} className="py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 text-sm font-medium hover:border-red-300 hover:text-red-500">
          🛌 今天休息
        </button>
        <button onClick={() => navigate('/settings')}
          className="py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 hover:text-blue-500">
          ⚙️ 训练设置
        </button>
      </div>
    </div>
  );
}
