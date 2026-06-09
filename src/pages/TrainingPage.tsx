import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { buildPlanPrompt, parsePlanResponse, generatePlanViaAPI, getAIConfig, getFallbackPlan } from '../utils/aiEngine';
import { getPhaseName } from '../utils/trainingEngine';
import type { DailyPlan, BodyMetrics, TrainingSession, BodySignal } from '../types';

// ─── Signal badge ───
function SignalBadge({ signal, pct }: { signal: BodySignal; pct: number }) {
  const map = {
    green:  { bg: 'bg-green-100 border-green-300 text-green-800', emoji: '🟢', label: '全力训练' },
    yellow: { bg: 'bg-yellow-100 border-yellow-300 text-yellow-800', emoji: '🟡', label: `注意调整` },
    red:    { bg: 'bg-red-100 border-red-300 text-red-800', emoji: '🔴', label: '主动恢复' },
  };
  const s = map[signal];
  return (
    <div className={`p-4 rounded-xl border ${s.bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">{s.emoji} {s.label}</p>
          <p className="text-xs opacity-70 mt-0.5">今日强度 {pct}%</p>
        </div>
        <div className="text-4xl">{s.emoji}</div>
      </div>
    </div>
  );
}

// ─── Exercise Block ───
function BlockSection({ title, icon, color, items, checked, onToggle, expanded, onExpand }: {
  title: string; icon: string; color: string;
  items: any[]; checked: Set<number>; onToggle: (i: number) => void;
  expanded: boolean; onExpand: () => void;
}) {
  if (!items.length) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="font-medium text-slate-400">{title}</h3>
          <span className="text-xs text-slate-300 ml-auto">今日此项休息</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} overflow-hidden`}>
      <button onClick={onExpand} className="w-full p-4 flex items-center gap-2 text-left hover:bg-slate-50 transition-colors">
        <span className="text-lg">{icon}</span>
        <h3 className="font-medium text-slate-700 flex-1">{title}</h3>
        <span className="text-xs text-slate-400">{checked.size}/{items.length}</span>
        <span className="text-slate-300 text-xs">{expanded ? '收起 ▲' : '展开 ▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item: any, i: number) => (
            <label
              key={i}
              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                checked.has(i) ? 'bg-green-50 line-through opacity-60' : 'hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => onToggle(i)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{item.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {item.sets && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{item.sets}组</span>}
                  {item.reps && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.reps}</span>}
                  {item.load && <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">{item.load}</span>}
                  {item.duration && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.duration}</span>}
                  {item.rest && <span className="text-xs text-slate-400">⏱ 休息{item.rest}</span>}
                  {item.rpe && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">RPE {item.rpe}</span>}
                  {item.tempo && <span className="text-xs text-slate-400">节奏 {item.tempo}</span>}
                </div>
                {item.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───
export default function TrainingPage() {
  const { initialAssessment, assessmentReport, currentMacroCycle, trainingMode } = useAppStore();
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const urlDate = searchParams.get('date');
  const planRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(urlDate || today);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [dateSession, setDateSession] = useState<TrainingSession | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Manual AI state
  const [genMode, setGenMode] = useState<'idle' | 'manual-prompt' | 'manual-paste'>('idle');
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  // Exercise check tracking
  const [checkedEx, setCheckedEx] = useState<Record<string, Set<number>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    warmup: true, prehab: true, mainWorkout: true, volleyballSpecific: false, cooldown: false,
  });

  const aiConfig = getAIConfig();
  const hasAPIKey = aiConfig.mode === 'api' && aiConfig.apiKey;

  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

  useEffect(() => { loadDate(selectedDate); }, [selectedDate]);

  async function loadDate(date: string) {
    setLoading(true);
    const metrics = await db.bodyMetrics.where('date').equals(date).first();
    setBodyMetrics(metrics || null);
    const plan = await db.dailyPlans.where('date').equals(date).first();
    setDailyPlan(plan || null);
    if (plan) resetChecked(plan);
    const session = await db.trainingSessions.where('date').equals(date).first();
    setDateSession(session || null);
    setLoading(false);
  }

  function changeDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
    setGenMode('idle');
    setGenerating(false);
  }

  function resetChecked(_plan: DailyPlan) {
    const c: Record<string, Set<number>> = {};
    const keys = ['warmup', 'prehab', 'mainWorkout', 'volleyballSpecific', 'cooldown'] as const;
    for (const k of keys) {
      c[k] = new Set();
    }
    setCheckedEx(c);
  }

  async function savePlan(plan: DailyPlan) {
    plan.date = selectedDate;
    plan.macroCycleId = currentMacroCycle?.id || 0;
    const id = await db.dailyPlans.add(plan);
    plan.id = id;
    setDailyPlan(plan);
    resetChecked(plan);
    setGenMode('idle');
    setGenerating(false);
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ─── Generation methods ───
  const macroCycle = currentMacroCycle || { phase: 'strength_base' as const, weekNumber: 1, startDate: selectedDate, endDate: selectedDate };

  async function useRuleEngine() {
    if (!bodyMetrics && isToday) return;
    setGenerating(true);
    const plan = getFallbackPlan({ assessment: initialAssessment, report: assessmentReport, bodyMetrics: bodyMetrics || { date: selectedDate, weight: initialAssessment?.weight || 70, sleepHours: 7, sleepQuality: 3, fatigueLevel: 5, soreAreas: [], playedVolleyball: false }, macroCycle, trainingMode });
    await savePlan(plan);
  }

  function startManual() {
    const m = bodyMetrics || { date: selectedDate, weight: initialAssessment?.weight || 70, sleepHours: 7, sleepQuality: 3, fatigueLevel: 5, soreAreas: [], playedVolleyball: false };
    if (!bodyMetrics && !isToday) return;
    setPrompt(buildPlanPrompt({ assessment: initialAssessment, report: assessmentReport, bodyMetrics: bodyMetrics || m, macroCycle, trainingMode }));
    setGenMode('manual-prompt');
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setGenMode('manual-paste');
  }

  async function pasteResponse() {
    if (!aiResponse.trim()) return;
    const plan = parsePlanResponse(aiResponse, selectedDate);
    if (plan) {
      await savePlan(plan);
      setAiResponse('');
    } else {
      alert('无法解析。请确保复制了 AI 的完整 JSON 回复。');
    }
  }

  async function useAPI() {
    if (!hasAPIKey) return;
    setGenerating(true);
    const m = bodyMetrics || { date: selectedDate, weight: initialAssessment?.weight || 70, sleepHours: 7, sleepQuality: 3, fatigueLevel: 5, soreAreas: [], playedVolleyball: false };
    const plan = await generatePlanViaAPI({ assessment: initialAssessment, report: assessmentReport, bodyMetrics: bodyMetrics || m, macroCycle, trainingMode });
    if (plan) await savePlan(plan);
    else await useRuleEngine();
  }

  async function handleComplete(rpe: number) {
    if (!dailyPlan) return;
    const session: TrainingSession = { date: selectedDate, dailyPlanId: dailyPlan.id || 0, completed: true, actualRPE: rpe };
    const id = await db.trainingSessions.add(session);
    setDateSession({ ...session, id });
    await db.dailyPlans.update(dailyPlan.id!, { completed: true });
    setDailyPlan({ ...dailyPlan, completed: true });
  }

  async function markAsRestDay() {
    if (!confirm(`将 ${selectedDate} 标记为休息日？`)) return;
    const plan: DailyPlan = {
      date: selectedDate, macroCycleId: currentMacroCycle?.id || 0,
      bodySignal: 'red', intensityPercent: 30,
      warmup: buildCooldownWorkaround('red'),
      prehab: [], mainWorkout: [], volleyballSpecific: [],
      cooldown: [],
      notes: '🛌 这天标记为休息日。好好恢复，比勉强训练更有价值。',
      completed: false,
    };
    await savePlan(plan);
  }

  function buildCooldownWorkaround(signal: string): any[] {
    if (signal === 'red') return [{ name: '轻柔拉伸', duration: '10min', notes: '全身轻柔拉伸放松' }];
    return [];
  }

  async function deletePlan() {
    if (!dailyPlan || !confirm('删除当前计划？')) return;
    await db.dailyPlans.delete(dailyPlan.id!);
    setDailyPlan(null);
    setGenerating(false);
    setGenMode('idle');
  }

  function toggleCheck(section: string, idx: number) {
    setCheckedEx((prev) => {
      const next = { ...prev };
      const s = new Set(prev[section] || []);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      next[section] = s;
      return next;
    });
  }

  function toggleExpand(section: string) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  // ─── RENDER ───
  if (loading) {
    return <div className="text-center py-12"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-slate-400 text-sm">加载中...</p></div>;
  }

  // Common date nav bar
  const dateNav = (
    <div className="flex items-center justify-between bg-white rounded-xl p-2 shadow-sm">
      <button onClick={() => changeDate(-1)} className="px-3 py-1 text-slate-500 hover:text-slate-700 text-lg">◀</button>
      <div className="text-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm font-bold text-slate-700 bg-transparent text-center cursor-pointer border-none focus:outline-none"
        />
        <p className="text-[10px] text-slate-400">
          {isToday ? '今天' : isPast ? `${Math.round((new Date().getTime() - new Date(selectedDate).getTime()) / 86400000)}天前` : `${Math.round((new Date(selectedDate).getTime() - new Date().getTime()) / 86400000)}天后`}
        </p>
      </div>
      <button onClick={() => changeDate(+1)} className="px-3 py-1 text-slate-500 hover:text-slate-700 text-lg">▶</button>
    </div>
  );

  if (!bodyMetrics && isToday) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">🏋️ 训练</h2>
        {dateNav}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-yellow-700 font-bold mb-2">还没有今日身体数据</p>
          <p className="text-sm text-yellow-600 mb-4">填写后系统才能生成最适合的训练计划</p>
          <Link to="/body" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm">
            去填写身体状态 →
          </Link>
        </div>
      </div>
    );
  }

  // ─── Plan generation screen ───
  if (!dailyPlan && !generating) {
    // Manual AI sub-screens
    if (genMode === 'manual-prompt') {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">🤖 AI 生成（步骤 1/2）</h2>
          <p className="text-sm text-slate-600">📋 点击按钮复制下方 Prompt</p>
          <div className="bg-slate-50 rounded-lg p-3 max-h-72 overflow-y-auto border">
            <pre className="text-xs text-slate-600 whitespace-pre-wrap">{prompt}</pre>
          </div>
          <button onClick={copyPrompt} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
            📋 复制 Prompt 并继续
          </button>
          <button onClick={() => setGenMode('idle')} className="w-full py-2 text-sm text-slate-500">← 返回</button>
        </div>
      );
    }

    if (genMode === 'manual-paste') {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">🤖 AI 生成（步骤 2/2）</h2>
          <p className="text-sm text-slate-600">打开任意 AI 聊天 → 粘贴 Prompt → 复制完整的回复</p>
          <div className="flex flex-wrap gap-1">
            <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-300">DeepSeek（推荐）</a>
            <a href="https://kimi.moonshot.cn" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border text-slate-500 rounded-full text-xs">Kimi</a>
            <a href="https://chat.openai.com" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border text-slate-500 rounded-full text-xs">ChatGPT</a>
          </div>
          <textarea value={aiResponse} onChange={(e) => setAiResponse(e.target.value)}
            placeholder="把 AI 的完整回复粘贴到这里..."
            className="w-full h-48 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
          <button onClick={pasteResponse} className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
            ✅ 解析训练计划
          </button>
          <button onClick={() => { setGenMode('idle'); setAiResponse(''); }} className="w-full py-2 text-sm text-slate-500">← 返回</button>
        </div>
      );
    }

    // Main selection screen
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">🏋️ 训练</h2>
        {dateNav}

        {bodyMetrics && (
          <div className="bg-white rounded-xl p-3 shadow-sm flex gap-3 text-center text-xs">
            <div><p className="text-slate-400">体重</p><p className="font-bold text-slate-700">{bodyMetrics.weight}kg</p></div>
            <div><p className="text-slate-400">疲劳</p><p className={`font-bold ${bodyMetrics.fatigueLevel >= 7 ? 'text-red-600' : bodyMetrics.fatigueLevel >= 5 ? 'text-yellow-600' : 'text-green-600'}`}>{bodyMetrics.fatigueLevel}/10</p></div>
            <div><p className="text-slate-400">睡眠</p><p className={`font-bold ${bodyMetrics.sleepHours < 6 ? 'text-red-600' : 'text-green-600'}`}>{bodyMetrics.sleepHours}h</p></div>
            <div><p className="text-slate-400">周期</p><p className="font-bold text-blue-600">{getPhaseName(macroCycle.phase).slice(0,4)}W{macroCycle.weekNumber}</p></div>
          </div>
        )}

        {!isToday && (
          <div className={`p-3 rounded-lg text-xs ${isPast ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
            {isPast ? `⚠️ ${selectedDate} 是过去的日期。可以补录训练或标记为休息日。` : `📅 ${selectedDate} 是未来的日期。可以提前规划训练。`}
          </div>
        )}

        <p className="text-sm text-slate-600 font-medium">选择训练计划生成方式：</p>

        {/* Rule engine - always works */}
        <button onClick={useRuleEngine}
          className="w-full bg-white rounded-xl p-4 shadow-sm border-2 border-blue-400 hover:border-blue-600 hover:shadow transition-all text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔧</span>
            <div>
              <p className="font-bold text-blue-700">规则引擎（即刻生成）</p>
              <p className="text-xs text-slate-500 mt-0.5">基于你体测数据 + 运动科学内置规则，包含热身/预复/主体/专项/放松/饮食</p>
            </div>
          </div>
        </button>

        {/* Manual AI */}
        <button onClick={startManual}
          className="w-full bg-white rounded-xl p-4 shadow-sm border-2 border-green-400 hover:border-green-600 hover:shadow transition-all text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <p className="font-bold text-green-700">AI 智能生成（免费）</p>
              <p className="text-xs text-slate-500 mt-0.5">Prompt 一键复制 → 丢给 DeepSeek/ChatGPT/Kimi → 粘贴回复</p>
            </div>
          </div>
        </button>

        {/* API auto */}
        {hasAPIKey && (
          <button onClick={useAPI}
            className="w-full bg-white rounded-xl p-4 shadow-sm border-2 border-purple-400 hover:border-purple-600 hover:shadow transition-all text-left">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚡</span>
              <div>
                <p className="font-bold text-purple-700">API 一键自动</p>
                <p className="text-xs text-slate-500 mt-0.5">调用 DeepSeek API，3秒自动出结果，无需手动操作</p>
              </div>
            </div>
          </button>
        )}

        {!hasAPIKey && (
          <Link to="/settings" className="block text-center text-xs text-blue-600 underline py-2">
            ⚡ 想用一键自动？去设置配 DeepSeek Key（一次不到1分钱）
          </Link>
        )}

        {isToday && (
          <button onClick={markAsRestDay}
            className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl text-sm font-medium hover:border-red-300 hover:text-red-500 transition-colors">
            🛌 今天休息，标记为休息日
          </button>
        )}

        {isPast && (
          <button onClick={markAsRestDay}
            className="w-full py-2 border border-dashed border-slate-200 text-slate-400 rounded-lg text-xs hover:border-red-200 hover:text-red-400">
            {selectedDate} 标记为休息日（跳过训练）
          </button>
        )}
      </div>
    );
  }

  // ─── Generating state ───
  if (generating) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div>
          <p className="text-slate-700 font-bold text-lg">正在生成训练计划...</p>
          <p className="text-sm text-slate-400 mt-1">根据你的身体数据和当前周期定制</p>
        </div>
      </div>
    );
  }

  // ─── Plan Display ───
  if (!dailyPlan) {
    return <div className="text-center py-12 text-slate-400">暂无训练计划。点击上方按钮生成。</div>;
  }

  const plan = dailyPlan;

  return (
    <div className="space-y-4" ref={planRef}>
      <h2 className="text-lg font-bold text-slate-800">🏋️ 训练</h2>
      {dateNav}

      {/* Signal badge */}
      <SignalBadge signal={plan.bodySignal} pct={plan.intensityPercent} />

      {/* Phase info */}
      {currentMacroCycle && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
          {getPhaseName(currentMacroCycle.phase)} · 第{currentMacroCycle.weekNumber}周 · {trainingMode === 'school' ? '🏫学期' : '🌞假期'}
          {currentMacroCycle.weekNumber <= 1 ? '（适应周）' : currentMacroCycle.weekNumber <= 2 ? '（递增周）' : currentMacroCycle.weekNumber <= 3 ? '（高峰周）' : '（测试周）'}
        </div>
      )}

      {/* Exercise sections */}
      <div className="space-y-3">
        <BlockSection title="热身" icon="🔥" color="border-l-orange-400"
          items={plan.warmup} checked={checkedEx.warmup || new Set()} onToggle={(i) => toggleCheck('warmup', i)}
          expanded={expanded.warmup} onExpand={() => toggleExpand('warmup')} />

        <BlockSection title="伤病预防" icon="🛡️" color="border-l-green-400"
          items={plan.prehab} checked={checkedEx.prehab || new Set()} onToggle={(i) => toggleCheck('prehab', i)}
          expanded={expanded.prehab} onExpand={() => toggleExpand('prehab')} />

        <BlockSection title="主体训练" icon="💪" color="border-l-blue-500"
          items={plan.mainWorkout} checked={checkedEx.mainWorkout || new Set()} onToggle={(i) => toggleCheck('mainWorkout', i)}
          expanded={expanded.mainWorkout} onExpand={() => toggleExpand('mainWorkout')} />

        <BlockSection title="排球专项" icon="🏐" color="border-l-purple-400"
          items={plan.volleyballSpecific} checked={checkedEx.volleyballSpecific || new Set()} onToggle={(i) => toggleCheck('volleyballSpecific', i)}
          expanded={expanded.volleyballSpecific} onExpand={() => toggleExpand('volleyballSpecific')} />

        <BlockSection title="放松恢复" icon="🧘" color="border-l-teal-400"
          items={plan.cooldown} checked={checkedEx.cooldown || new Set()} onToggle={(i) => toggleCheck('cooldown', i)}
          expanded={expanded.cooldown} onExpand={() => toggleExpand('cooldown')} />
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-2">📋 详细说明</h3>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{plan.notes}</pre>
        </div>
      )}

      {/* Complete / Already done */}
      {!plan.completed && !dateSession ? (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700">✅ 完成训练后打卡</p>
          <p className="text-xs text-slate-400">主观疲劳感知评级 RPE（1=极轻松，10=极限）</p>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
              <button key={rpe} onClick={() => handleComplete(rpe)}
                className="w-9 h-9 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-colors">
                {rpe}
              </button>
            ))}
          </div>
          <button onClick={deletePlan} className="w-full py-2 text-xs text-slate-400 hover:text-red-500">🔄 重新生成</button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-bold text-lg">✅ {isToday ? '今日' : selectedDate} 训练已完成</p>
          {dateSession?.actualRPE && <p className="text-sm text-green-600 mt-1">实际 RPE: {dateSession.actualRPE}/10</p>}
          <button onClick={deletePlan} className="text-xs text-slate-400 hover:text-red-500 mt-2 underline">删除此计划，重新生成</button>
        </div>
      )}
    </div>
  );
}
