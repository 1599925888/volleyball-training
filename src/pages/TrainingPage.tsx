import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { buildPlanPrompt, parsePlanResponse, generatePlanViaAPI, getAIConfig, getFallbackPlan } from '../utils/aiEngine';
import { getPhaseName } from '../utils/trainingEngine';
import type { DailyPlan, BodyMetrics, TrainingSession } from '../types';

const signalStyles = {
  green: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: '🟢 状态良好 · 全力训练' },
  yellow: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: '🟡 注意调整 · 强度70%' },
  red: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: '🔴 需要恢复 · 主动恢复日' },
};

type GenMode = 'select' | 'rule' | 'manual-prompt' | 'manual-paste' | 'api-loading';

export default function TrainingPage() {
  const { initialAssessment, assessmentReport, currentMacroCycle, trainingMode } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [todaySession, setTodaySession] = useState<TrainingSession | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [genMode, setGenMode] = useState<GenMode>('select');
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const aiConfig = getAIConfig();
  const hasAPIKey = aiConfig.mode === 'api' && aiConfig.apiKey;

  useEffect(() => { loadToday(); }, []);

  async function loadToday() {
    const metrics = await db.bodyMetrics.where('date').equals(today).first();
    setBodyMetrics(metrics || null);
    const plan = await db.dailyPlans.where('date').equals(today).first();
    setDailyPlan(plan || null);
    const session = await db.trainingSessions.where('date').equals(today).first();
    setTodaySession(session || null);
    setLoading(false);
  }

  async function savePlan(plan: DailyPlan) {
    plan.macroCycleId = currentMacroCycle?.id || 0;
    const id = await db.dailyPlans.add(plan);
    plan.id = id;
    setDailyPlan(plan);
    setGenMode('select');
  }

  // === Rule Engine ===
  async function useRuleEngine() {
    if (!bodyMetrics) return;
    const macroCycle = currentMacroCycle || { phase: 'strength_base' as const, weekNumber: 1, startDate: today, endDate: today };
    const plan = getFallbackPlan({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle,
      trainingMode,
    });
    await savePlan(plan);
  }

  // === Manual AI ===
  function startManual() {
    if (!bodyMetrics) return;
    const macroCycle = currentMacroCycle || { phase: 'strength_base' as const, weekNumber: 1, startDate: today, endDate: today };
    const p = buildPlanPrompt({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle,
      trainingMode,
    });
    setPrompt(p);
    setGenMode('manual-prompt');
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setGenMode('manual-paste');
  }

  async function pasteResponse() {
    if (!aiResponse.trim()) return;
    const plan = parsePlanResponse(aiResponse, today);
    if (plan) {
      await savePlan(plan);
      setAiResponse('');
    } else {
      alert('无法解析。请复制 AI 的完整 JSON 回复再试。');
    }
  }

  // === API Auto ===
  async function useAPI() {
    if (!bodyMetrics || !hasAPIKey) return;
    const macroCycle = currentMacroCycle || { phase: 'strength_base' as const, weekNumber: 1, startDate: today, endDate: today };
    setGenMode('api-loading');
    const plan = await generatePlanViaAPI({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle,
      trainingMode,
    });

    if (plan) {
      await savePlan(plan);
    } else {
      // API failed, fallback to rule engine
      useRuleEngine();
    }
  }

  async function handleComplete(rpe: number) {
    if (!dailyPlan) return;
    const session: TrainingSession = {
      date: today, dailyPlanId: dailyPlan.id || 0, completed: true, actualRPE: rpe,
    };
    const id = await db.trainingSessions.add(session);
    setTodaySession({ ...session, id });
    await db.dailyPlans.update(dailyPlan.id!, { completed: true });
    setDailyPlan({ ...dailyPlan, completed: true });
  }

  if (loading) return <div className="text-center py-8 text-slate-400">加载中...</div>;

  if (!bodyMetrics) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-700 font-medium mb-2">尚未填写今日身体状态</p>
        <p className="text-sm text-yellow-600 mb-3">训练前请先填写身体指标</p>
        <Link to="/body" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          填写身体状态
        </Link>
      </div>
    );
  }

  // ====== Plan Selection ======
  if (!dailyPlan && genMode === 'select') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">今日训练</h2>
        <p className="text-xs text-slate-400">体重 {bodyMetrics.weight}kg · 疲劳 {bodyMetrics.fatigueLevel}/10 · 睡眠 {bodyMetrics.sleepHours}h</p>

        {/* Option 1: Rule Engine - always works */}
        <button onClick={useRuleEngine}
          className="w-full bg-white rounded-xl p-5 shadow-sm border-2 border-blue-500 hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔧</span>
            <div>
              <p className="font-semibold text-blue-700">规则引擎生成（推荐）</p>
              <p className="text-xs text-slate-500 mt-0.5">基于运动科学内置规则，零延迟，免费</p>
            </div>
          </div>
        </button>

        {/* Option 2: Manual AI */}
        <button onClick={startManual}
          className="w-full bg-white rounded-xl p-5 shadow-sm border-2 border-green-500 hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <p className="font-semibold text-green-700">AI 智能生成（免费）</p>
              <p className="text-xs text-slate-500 mt-0.5">复制 Prompt → DeepSeek/ChatGPT/Kimi → 粘贴回复</p>
            </div>
          </div>
        </button>

        {/* Option 3: API Auto (if key configured) */}
        {hasAPIKey && (
          <button onClick={useAPI}
            className="w-full bg-white rounded-xl p-5 shadow-sm border-2 border-purple-500 hover:shadow-md transition-all text-left">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚡</span>
              <div>
                <p className="font-semibold text-purple-700">API 一键自动生成</p>
                <p className="text-xs text-slate-500 mt-0.5">DeepSeek API 自动调用，3秒出结果</p>
              </div>
            </div>
          </button>
        )}

        {!hasAPIKey && (
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">
              想用 API 自动模式？<Link to="/settings" className="text-blue-600 underline">去设置配 DeepSeek Key</Link>（一次不到1分钱）
            </p>
          </div>
        )}
      </div>
    );
  }

  // ====== Manual Prompt ======
  if (genMode === 'manual-prompt') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">AI 生成训练计划</h2>
        <p className="text-sm text-slate-600">步骤 1/2：复制下方 Prompt</p>
        <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap">{prompt}</pre>
        </div>
        <button onClick={copyPrompt}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          📋 复制 Prompt 并进入下一步
        </button>
        <button onClick={() => setGenMode('select')} className="w-full py-2 text-sm text-slate-500">返回</button>
      </div>
    );
  }

  // ====== Manual Paste ======
  if (genMode === 'manual-paste') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">AI 生成训练计划</h2>
        <p className="text-sm text-slate-600">步骤 2/2：去 AI 聊天粘贴 Prompt，把回复粘贴回来</p>
        <div className="flex flex-wrap gap-1">
          <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer" className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">DeepSeek（推荐）</a>
          <a href="https://kimi.moonshot.cn" target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border text-slate-500 rounded-full text-xs">Kimi</a>
          <a href="https://chat.openai.com" target="_blank" rel="noreferrer" className="px-3 py-1 bg-white border text-slate-500 rounded-full text-xs">ChatGPT</a>
        </div>
        <textarea value={aiResponse} onChange={(e) => setAiResponse(e.target.value)}
          placeholder="把 AI 的完整回复粘贴到这里..."
          className="w-full h-48 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
        <button onClick={pasteResponse}
          className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
          ✅ 解析并应用训练计划
        </button>
        <button onClick={() => { setGenMode('select'); setAiResponse(''); }} className="w-full py-2 text-sm text-slate-500">返回</button>
      </div>
    );
  }

  // ====== API Loading ======
  if (genMode === 'api-loading') {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">AI 正在分析你的数据...</p>
        <p className="text-xs text-slate-400">用 DeepSeek 生成个性化训练计划</p>
      </div>
    );
  }

  // ====== Plan Display ======
  if (!dailyPlan) {
    return <div className="text-center py-8 text-slate-400">暂无训练计划</div>;
  }

  const signal = signalStyles[dailyPlan.bodySignal] || signalStyles.green;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">今日训练</h2>
        <span className="text-xs text-slate-400">{today}</span>
      </div>

      <div className={`p-4 rounded-xl border ${signal.bg}`}>
        <p className={`font-medium ${signal.text}`}>{signal.label}</p>
        {dailyPlan.notes && <p className="text-xs mt-1 opacity-70 whitespace-pre-line">{dailyPlan.notes}</p>}
        {currentMacroCycle && (
          <p className="text-xs mt-2 opacity-60">
            {getPhaseName(currentMacroCycle.phase)} · 第{currentMacroCycle.weekNumber}周 · {trainingMode === 'school' ? '🏫学期' : '🌞假期'}
          </p>
        )}
      </div>

      {[
        { title: '🔥 热身', items: dailyPlan.warmup, color: 'border-l-orange-400' },
        { title: '🛡 伤病预防', items: dailyPlan.prehab, color: 'border-l-green-400' },
        { title: '💪 主体训练', items: dailyPlan.mainWorkout, color: 'border-l-blue-400' },
        { title: '🏐 排球专项', items: dailyPlan.volleyballSpecific, color: 'border-l-purple-400' },
        { title: '🧘 放松恢复', items: dailyPlan.cooldown, color: 'border-l-teal-400' },
      ].map((block) => (
        <div key={block.title} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${block.color}`}>
          <h3 className="font-medium text-slate-700 mb-3">{block.title}</h3>
          <div className="space-y-3">
            {block.items.length === 0 ? (
              <p className="text-xs text-slate-400 italic">今日此项休息</p>
            ) : block.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                    {item.sets && <span>{item.sets}组</span>}
                    {item.reps && <span>{item.reps}</span>}
                    {item.load && <span className="text-blue-600 font-medium">{item.load}</span>}
                    {item.duration && <span>{item.duration}</span>}
                    {item.rest && <span>休息 {item.rest}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!dailyPlan.completed && !todaySession ? (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-slate-700">完成训练后打卡</p>
          <div>
            <label className="text-xs text-slate-500">实际 RPE（1-10）</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
                <button key={rpe} onClick={() => handleComplete(rpe)}
                  className="w-8 h-8 rounded text-xs font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600">
                  {rpe}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">✅ 今日训练已完成</p>
          {todaySession?.actualRPE && <p className="text-sm text-green-600 mt-1">实际 RPE: {todaySession.actualRPE}/10</p>}
        </div>
      )}
    </div>
  );
}
