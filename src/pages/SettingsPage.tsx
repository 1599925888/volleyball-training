import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { getAIConfig, saveAIConfig } from '../utils/aiEngine';
import type { AIConfig, AIMode } from '../utils/aiEngine';

const PRESET_ENDPOINTS = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  { label: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
  { label: '自定义', url: '', model: '' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { trainingMode, setTrainingMode, userProfile, setUserProfile, initialAssessment, assessmentReport } = useAppStore();
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig());
  const [showKey, setShowKey] = useState(false);
  const [mode, setMode] = useState(trainingMode);

  useEffect(() => {
    const stored = getAIConfig();
    setAiConfig(stored);
  }, []);

  function handleAIModeChange(m: AIMode) {
    const updated = { ...aiConfig, mode: m };
    setAiConfig(updated);
    saveAIConfig(updated);
  }

  function handleSave() {
    saveAIConfig(aiConfig);
    alert('已保存');
  }

  async function handleModeChange(m: 'school' | 'holiday') {
    setMode(m);
    setTrainingMode(m);
    if (userProfile) {
      const updated = { ...userProfile, trainingMode: m };
      await db.userProfile.update(userProfile.id!, updated);
      setUserProfile(updated);
    }
  }

  async function handleReset() {
    if (!confirm('确定要重置所有数据吗？此操作不可撤销。')) return;
    await db.delete();
    await db.open();
    localStorage.clear();
    navigate('/onboarding');
    window.location.reload();
  }

  const modeLabels: Record<AIMode, { icon: string; title: string; desc: string }> = {
    api: { icon: '⚡', title: 'API 自动模式（推荐）', desc: '一键生成，全自动。DeepSeek API 一次训练不到 1 分钱。' },
    manual: { icon: '📋', title: '手动模式', desc: '复制 Prompt → 粘贴到免费 AI → 粘贴回复。不需要 API Key。' },
    off: { icon: '🔧', title: '规则引擎', desc: '使用内置规则的训练方案。无需 AI、无需网络。' },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">设置</h2>

      {/* AI Mode Selection */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-slate-700 mb-3">🤖 训练计划生成方式</h3>
        <div className="space-y-2 mb-4">
          {(Object.keys(modeLabels) as AIMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleAIModeChange(m)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                aiConfig.mode === m
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{modeLabels[m].icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{modeLabels[m].title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{modeLabels[m].desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Manual mode guide */}
        {aiConfig.mode === 'manual' && (
          <div className="p-3 bg-green-50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-green-800">📋 使用步骤（用任何免费 AI 都可以）</p>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
              <li>在训练页点击「AI 生成」→ 复制 Prompt</li>
              <li>打开以下任一免费 AI 平台（点击直达）：</li>
            </ol>
            <div className="flex flex-wrap gap-1 ml-4">
              <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer" className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200">DeepSeek（推荐）</a>
              <a href="https://chat.openai.com" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-green-200 text-green-700 rounded-full text-xs hover:bg-green-50">ChatGPT</a>
              <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-green-200 text-green-700 rounded-full text-xs hover:bg-green-50">Gemini</a>
              <a href="https://claude.ai" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-green-200 text-green-700 rounded-full text-xs hover:bg-green-50">Claude</a>
              <a href="https://kimi.moonshot.cn" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-green-200 text-green-700 rounded-full text-xs hover:bg-green-50">Kimi</a>
              <a href="https://tongyi.aliyun.com" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white border border-green-200 text-green-700 rounded-full text-xs hover:bg-green-50">通义千问</a>
            </div>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside" start={3}>
              <li>粘贴 Prompt，等待 AI 回复</li>
              <li>复制 AI 的完整回复 → 粘贴回 App</li>
              <li>App 自动解析 JSON 并显示训练计划</li>
            </ol>
            <p className="text-xs text-green-600 mt-2">💡 <strong>推荐 DeepSeek</strong>：免费、国内直连、中文理解好。Kimi 和通义千问也很方便。</p>
          </div>
        )}

        {/* API mode config */}
        {aiConfig.mode === 'api' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            {/* DeepSeek Setup Guide */}
            {!aiConfig.apiKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-800">🔑 获取 DeepSeek API Key（30 秒）</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>打开 <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="underline font-medium">platform.deepseek.com</a> 用手机号注册</li>
                  <li>左侧菜单 → 「API Keys」→ 点击「创建新的 API Key」</li>
                  <li>复制 Key，粘贴到下方输入框，保存</li>
                </ol>
                <p className="text-xs text-blue-500">💡 新用户送免费额度，够用几个月。一次训练不到 1 分钱。</p>
              </div>
            )}

            {/* Service selector */}
            <div>
              <p className="text-xs text-slate-500 mb-1">AI 服务商</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_ENDPOINTS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setAiConfig({ ...aiConfig, apiEndpoint: preset.url, modelName: preset.model })}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      aiConfig.apiEndpoint === preset.url ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    {preset.label === 'DeepSeek' ? '⭐ DeepSeek' : preset.label}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                注册链接：
                <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-blue-600 mx-1">DeepSeek</a>·
                <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-blue-600 mx-1">OpenAI</a>·
                <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-blue-600 mx-1">Groq</a>·
                <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-blue-600 mx-1">Gemini</a>
              </div>
            </div>

            {/* API Key */}
            <div>
              <p className="text-xs text-slate-500 mb-1">API Key（仅存本地浏览器，不上传）</p>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
                <button onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 text-xs text-slate-500 border rounded-lg bg-white">{showKey ? '隐藏' : '显示'}</button>
              </div>
            </div>

            {/* Custom endpoint (only when custom selected) */}
            {aiConfig.apiEndpoint === '' && (
              <input type="text" value={aiConfig.apiEndpoint}
                onChange={(e) => setAiConfig({ ...aiConfig, apiEndpoint: e.target.value })}
                placeholder="自定义 API Endpoint URL" className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
            )}

            {/* Model name */}
            <div>
              <p className="text-xs text-slate-500 mb-1">模型名称</p>
              <input type="text" value={aiConfig.modelName}
                onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {aiConfig.apiKey ? '✅ 保存' : '🔑 保存'}
              </button>
              <button onClick={async () => {
                try {
                  const res = await fetch('/.netlify/functions/health');
                  const data = await res.json();
                  alert(`✅ API 服务正常\n\n端点: ${data.endpoints?.generatePlan || 'N/A'}\n时间: ${data.time || 'N/A'}`);
                } catch (e: any) {
                  alert(`❌ API 服务不可用\n\n${e.message}\n\n请确认已部署到 Netlify（非本地开发）`);
                }
              }}
                className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50">
                🩺 测试连接
              </button>
            </div>

            {aiConfig.apiKey && (
              <p className="text-xs text-green-600 text-center">✅ API 已配置 · 训练页一键自动生成</p>
            )}
          </div>
        )}
      </div>

      {/* Training Mode */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-slate-700 mb-3">训练模式</h3>
        <div className="flex gap-2">
          <button onClick={() => handleModeChange('school')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 ${
              mode === 'school' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent text-slate-600'
            }`}>
            🏫 学期模式<p className="text-xs font-normal mt-0.5 opacity-70">每周 2-3 次</p>
          </button>
          <button onClick={() => handleModeChange('holiday')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 ${
              mode === 'holiday' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-transparent text-slate-600'
            }`}>
            🌞 假期模式<p className="text-xs font-normal mt-0.5 opacity-70">每周 4-5 次</p>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-slate-700 mb-3">身体基线</h3>
        {initialAssessment ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">身高</span><span className="text-slate-700">{initialAssessment.height} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">体重</span><span className="text-slate-700">{initialAssessment.weight} kg</span></div>
            <div className="flex justify-between"><span className="text-slate-500">站立摸高</span><span className="text-slate-700">{initialAssessment.standingReach} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">助跑摸高</span><span className="text-slate-700 font-bold text-blue-700">{initialAssessment.maxApproachReach} cm</span></div>
            <div className="flex justify-between"><span className="text-slate-500">深蹲 1RM</span><span className="text-slate-700">{initialAssessment.squatMax} kg</span></div>
            {assessmentReport && (
              <div className="flex justify-between">
                <span className="text-slate-500">弹跳潜力</span>
                <span className={`font-medium ${assessmentReport.jumpRating === 'green' ? 'text-green-600' : assessmentReport.jumpRating === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {assessmentReport.jumpRating === 'green' ? '优秀' : assessmentReport.jumpRating === 'yellow' ? '良好' : '待提升'}
                </span>
              </div>
            )}
            <button onClick={() => navigate('/onboarding')} className="mt-2 text-xs text-blue-600 hover:underline">重新体测</button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">尚未完成初始体测</p>
        )}
      </div>

      {/* Reset */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-slate-700 mb-3">数据管理</h3>
        <p className="text-xs text-slate-500 mb-3">所有数据存储在浏览器本地。</p>
        <button onClick={handleReset} className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
          重置所有数据
        </button>
      </div>
    </div>
  );
}
