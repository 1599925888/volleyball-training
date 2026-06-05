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

export default function TrainingPage() {
  const { initialAssessment, assessmentReport, currentMacroCycle, trainingMode } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [todaySession, setTodaySession] = useState<TrainingSession | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // AI manual mode state
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const aiConfig = getAIConfig();

  useEffect(() => { loadToday(); }, []);

  async function loadToday() {
    const metrics = await db.bodyMetrics.where('date').equals(today).first();
    setBodyMetrics(metrics || null);

    let plan = await db.dailyPlans.where('date').equals(today).first();
    setDailyPlan(plan || null);

    const session = await db.trainingSessions.where('date').equals(today).first();
    setTodaySession(session || null);

    setLoading(false);
  }

  function handleGeneratePrompt() {
    if (!bodyMetrics || !currentMacroCycle) return;
    const p = buildPlanPrompt({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle: currentMacroCycle,
      trainingMode,
    });
    setPrompt(p);
    setShowPrompt(true);
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(prompt).then(() => {
      alert('已复制！粘贴到 DeepSeek / ChatGPT / 任何 AI 聊天框，拿到回复后回来粘贴。');
      setShowPrompt(false);
      setShowPaste(true);
    });
  }

  async function handlePasteResponse() {
    if (!aiResponse.trim()) return;
    const parsed = parsePlanResponse(aiResponse, today);
    if (parsed) {
      parsed.macroCycleId = currentMacroCycle?.id || 0;
      const id = await db.dailyPlans.add(parsed);
      parsed.id = id;
      setDailyPlan(parsed);
      setShowPaste(false);
      setAiResponse('');
    } else {
      alert('无法解析 AI 回复。请确保复制了完整的 JSON 回复，不要只复制一部分。');
    }
  }

  async function handleAutoGenerate() {
    if (!bodyMetrics || !currentMacroCycle) return;
    setAiGenerating(true);
    const plan = await generatePlanViaAPI({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle: currentMacroCycle,
      trainingMode,
    });

    if (plan) {
      plan.macroCycleId = currentMacroCycle.id || 0;
      const id = await db.dailyPlans.add(plan);
      plan.id = id;
      setDailyPlan(plan);
    } else {
      // Fallback to rule engine
      const fb = getFallbackPlan({
        assessment: initialAssessment,
        report: assessmentReport,
        bodyMetrics,
        macroCycle: currentMacroCycle,
        trainingMode,
      });
      fb.notes = `⚠️ AI 不可用，使用规则引擎\n${fb.notes}`;
      const id = await db.dailyPlans.add(fb);
      fb.id = id;
      setDailyPlan(fb);
    }
    setAiGenerating(false);
  }

  async function handleSkipAI() {
    if (!bodyMetrics || !currentMacroCycle) return;
    const fb = getFallbackPlan({
      assessment: initialAssessment,
      report: assessmentReport,
      bodyMetrics,
      macroCycle: currentMacroCycle,
      trainingMode,
    });
    const id = await db.dailyPlans.add(fb);
    fb.id = id;
    setDailyPlan(fb);
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

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        加载中...
      </div>
    );
  }

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

  // ===== Plan Generation Screen =====
  if (!dailyPlan) {
    const hasAPI = aiConfig.mode === 'api' && aiConfig.apiKey;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">今日训练</h2>

        {/* API Mode — direct auto-generate */}
        {hasAPI ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-4">
            <div className="text-5xl">🤖</div>
            <div>
              <p className="font-medium text-slate-700">AI 智能教练已就绪</p>
              <p className="text-xs text-slate-400 mt-1">使用 {aiConfig.apiEndpoint.includes('deepseek') ? 'DeepSeek' : aiConfig.modelName} 为你生成个性化训练计划</p>
            </div>
            <button onClick={handleAutoGenerate} disabled={aiGenerating}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300">
              {aiGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI 正在分析你的数据...
                </span>
              ) : '⚡ 一键生成训练计划'}
            </button>
            <div className="flex gap-2 text-xs">
              <button onClick={handleGeneratePrompt} className="flex-1 py-2 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg">
                📋 手动复制 Prompt
              </button>
              <button onClick={handleSkipAI} className="flex-1 py-2 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg">
                规则引擎
              </button>
            </div>
          </div>
        ) : (
          /* No API Key — show setup guide */
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
              <p className="font-semibold text-lg mb-1">🚀 开启 AI 智能教练</p>
              <p className="text-sm text-blue-100 mb-4">自动生成训练计划，实时适应你的身体状态。一次训练成本不到 1 分钱。</p>
              <ol className="text-xs text-blue-100 space-y-1 list-decimal list-inside mb-4">
                <li>打开 <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="underline font-medium text-white">platform.deepseek.com</a> 注册（手机号即可）</li>
                <li>点击「API Keys」→ 创建 Key → 复制</li>
                <li>点击下方按钮粘贴 Key</li>
              </ol>
              <Link to="/settings" className="inline-block w-full py-2.5 bg-white text-blue-700 rounded-lg text-sm font-medium text-center hover:bg-blue-50">
                ⚡ 配置 API Key（30 秒搞定）
              </Link>
            </div>

            {/* Manual fallback */}
            {!showPrompt && !showPaste && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <p className="text-sm text-slate-500">或者先用传统方式：</p>
                <button onClick={handleGeneratePrompt}
                  className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
                  📋 手动模式（复制粘贴）
                </button>
                <button onClick={handleSkipAI}
                  className="w-full py-2.5 border border-slate-200 text-slate-500 rounded-lg text-sm hover:bg-slate-50">
                  规则引擎
                </button>
              </div>
            )}

            {/* Prompt / Paste steps still available as backup */}
            {showPrompt && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <p className="text-sm text-slate-600">1️⃣ 复制下方 Prompt</p>
                <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap">{prompt}</pre>
                </div>
                <button onClick={handleCopyPrompt}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  📋 复制 Prompt
                </button>
                <button onClick={() => setShowPrompt(false)} className="w-full py-2 text-sm text-slate-500">取消</button>
              </div>
            )}

            {showPaste && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                <p className="text-sm text-slate-600">2️⃣ 粘贴 AI 回复</p>
                <textarea value={aiResponse} onChange={(e) => setAiResponse(e.target.value)}
                  placeholder="把 AI 的完整回复粘贴到这里..."
                  className="w-full h-48 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                <button onClick={handlePasteResponse}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  ✅ 解析训练计划
                </button>
                <button onClick={() => { setShowPaste(false); setAiResponse(''); }} className="w-full py-2 text-sm text-slate-500">取消</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== Plan Display =====
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
            {block.items.map((item, i) => (
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

      {/* Complete Button */}
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
