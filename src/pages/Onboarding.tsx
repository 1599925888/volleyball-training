import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useAppStore } from '../stores/appStore';
import { generateReportViaAPI, getFallbackReport, getAIConfig } from '../utils/aiEngine';
import type { InitialAssessment } from '../types';

type Step = 1 | 2 | 3 | 4 | 5;

const stepLabels = ['身体数据', '力量测试', '排球专项', '伤病历史', '活动度筛查'];

function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { setInitialAssessment, setAssessmentReport, setOnboardingCompleted, setUserProfile } = useAppStore();
  const [step, setStep] = useState<Step>(1);

  // Step 1: Body
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [standingReach, setStandingReach] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  // Step 2: Strength
  const [squatMethod, setSquatMethod] = useState<'1RM' | '3RM' | '5x5'>('1RM');
  const [squatValue, setSquatValue] = useState('');
  const [dlMethod, setDlMethod] = useState<'1RM' | '3RM' | '5x5'>('1RM');
  const [dlValue, setDlValue] = useState('');
  const [benchMethod, setBenchMethod] = useState<'1RM' | '3RM' | '5x5'>('1RM');
  const [benchValue, setBenchValue] = useState('');

  // Step 3: Volleyball
  const [maxReach, setMaxReach] = useState('');
  const [standVJ, setStandVJ] = useState('');
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  // Step 4: Injury
  const [injuryHistory, setInjuryHistory] = useState<string[]>([]);
  const [currentIssues, setCurrentIssues] = useState('');
  const [rehabStatus, setRehabStatus] = useState('fully_recovered');

  // Step 5: Mobility
  const [ohSquat, setOhSquat] = useState(2);
  const [shoulderMob, setShoulderMob] = useState(2);
  const [ankleMob, setAnkleMob] = useState(2);
  const [thomasTest, setThomasTest] = useState(2);

  const injuryOptions = [
    { value: 'knee', label: '膝盖' },
    { value: 'shoulder', label: '肩膀' },
    { value: 'ankle', label: '脚踝' },
    { value: 'back', label: '腰部/背部' },
    { value: 'hip', label: '髋关节' },
    { value: 'wrist', label: '手腕' },
    { value: 'none', label: '无伤病史' },
  ];

  const toggleInjury = (v: string) => {
    if (v === 'none') {
      setInjuryHistory(['none']);
      return;
    }
    const filtered = injuryHistory.filter((i) => i !== 'none');
    if (filtered.includes(v)) {
      setInjuryHistory(filtered.filter((i) => i !== v));
    } else {
      setInjuryHistory([...filtered, v]);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const squat1RM = squatMethod === '1RM' ? Number(squatValue) : estimate1RM(Number(squatValue), squatMethod === '3RM' ? 3 : 5);
    const dl1RM = dlMethod === '1RM' ? Number(dlValue) : estimate1RM(Number(dlValue), dlMethod === '3RM' ? 3 : 5);
    const bench1RM = benchMethod === '1RM' ? Number(benchValue) : estimate1RM(Number(benchValue), benchMethod === '3RM' ? 3 : 5);

    const assessment: InitialAssessment = {
      date: new Date().toISOString().split('T')[0],
      age: Number(age),
      gender,
      height: Number(height),
      weight: Number(weight),
      standingReach: Number(standingReach),
      bodyFat: bodyFat ? Number(bodyFat) : undefined,
      squatMax: squat1RM,
      squatInputType: squatMethod,
      squatInputValue: Number(squatValue),
      deadliftMax: dl1RM,
      deadliftInputType: dlMethod,
      deadliftInputValue: Number(dlValue),
      benchMax: bench1RM,
      benchInputType: benchMethod,
      benchInputValue: Number(benchValue),
      maxApproachReach: Number(maxReach),
      standingVerticalJump: Number(standVJ),
      experience,
      injuryHistory,
      currentIssues,
      rehabStatus,
      overheadSquatScore: ohSquat as 1 | 2 | 3,
      shoulderMobilityScore: shoulderMob as 1 | 2 | 3,
      ankleMobilityScore: ankleMob as 1 | 2 | 3,
      thomasTestScore: thomasTest as 1 | 2 | 3,
    };

    // Try API report or use fallback
    const config = getAIConfig();
    let report;
    if (config.mode === 'api' && config.apiKey) {
      const apiReport = await generateReportViaAPI(assessment);
      report = apiReport || getFallbackReport(assessment);
    } else {
      report = getFallbackReport(assessment);
    }

    db.initialAssessments.add(assessment);
    setInitialAssessment(assessment);
    setAssessmentReport(report);

    // Create default user profile
    const profile = { trainingMode: 'school' as const, weightGoal: 'maintain' as const };
    db.userProfile.add(profile);
    setUserProfile(profile);

    // Initialize macro cycle
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 28);
    db.macroCycles.add({
      phase: report.suggestedStartPhase,
      weekNumber: 1,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      completed: false,
    });

    setOnboardingCompleted(true);
    setSubmitting(false);
    navigate('/onboarding/report');
  }

  const canNext = () => {
    if (step === 1) return age && height && weight && standingReach;
    if (step === 2) return squatValue && dlValue && benchValue;
    if (step === 3) return maxReach && standVJ;
    if (step === 4) return true;
    if (step === 5) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress */}
      <div className="bg-blue-700 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold mb-1">初始体测评估</h1>
          <p className="text-sm text-blue-200">为你的训练建立一个精准的起点</p>
          <div className="flex gap-1 mt-4">
            {([1, 2, 3, 4, 5] as Step[]).map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-white' : 'bg-blue-500'}`}
              />
            ))}
          </div>
          <p className="text-xs text-blue-200 mt-2">
            {step}/5 · {stepLabels[step - 1]}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* ====== Step 1: Body ====== */}
        {step === 1 && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-800">身体基础数据</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">年龄</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="岁"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">性别</label>
                  <div className="flex gap-2 mt-1">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          gender === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g === 'male' ? '男' : '女'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">身高 (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="cm"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">体重 (kg)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">站立单手摸高 (cm)</label>
                  <input type="number" value={standingReach} onChange={(e) => setStandingReach(e.target.value)} placeholder="cm"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <p className="text-[10px] text-slate-400 mt-0.5">双脚站立，单手向上摸到的最高点</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">体脂率 (%) 可选</label>
                  <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="可选"
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====== Step 2: Strength ====== */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">力量三大项</h2>
            <p className="text-xs text-slate-500">如有明确1RM数据直接输入；否则输入做组重量（如5×5），系统会估算1RM</p>
            {([
              { label: '深蹲', state: squatValue, setter: setSquatValue, method: squatMethod, setMethod: setSquatMethod },
              { label: '硬拉', state: dlValue, setter: setDlValue, method: dlMethod, setMethod: setDlMethod },
              { label: '卧推', state: benchValue, setter: setBenchValue, method: benchMethod, setMethod: setBenchMethod },
            ] as const).map((ex) => (
              <div key={ex.label} className="border border-slate-100 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">{ex.label}</p>
                <div className="flex gap-2 mb-2">
                  {(['1RM', '3RM', '5x5'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => ex.setMethod(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ex.method === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={ex.state}
                  onChange={(e) => ex.setter(e.target.value)}
                  placeholder={`${ex.method === '5x5' ? '5x5 做组重量' : ex.method} (kg)`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* ====== Step 3: Volleyball ====== */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">排球专项能力</h2>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-slate-500">最大助跑摸高 (cm)</label>
                <input type="number" value={maxReach} onChange={(e) => setMaxReach(e.target.value)} placeholder="cm"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <p className="text-[10px] text-slate-400 mt-0.5">全力助跑起跳单手摸到的最高点</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">原地纵跳高度 (cm)</label>
                <input type="number" value={standVJ} onChange={(e) => setStandVJ(e.target.value)} placeholder="cm"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <p className="text-[10px] text-slate-400 mt-0.5">原地起跳摸高 - 站立摸高</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">训练/打球经验</label>
                <div className="flex gap-2 mt-1">
                  {([
                    { v: 'beginner' as const, l: '初级 <1年' },
                    { v: 'intermediate' as const, l: '中级 1-3年' },
                    { v: 'advanced' as const, l: '进阶 3年+' },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setExperience(opt.v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        experience === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== Step 4: Injury ====== */}
        {step === 4 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">伤病历史</h2>
            <div>
              <label className="text-xs text-slate-500 mb-2 block">过往伤病部位（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {injuryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleInjury(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      injuryHistory.includes(opt.value)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-slate-100 text-slate-600 border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">当前身体困扰</label>
              <textarea value={currentIssues} onChange={(e) => setCurrentIssues(e.target.value)}
                placeholder="描述目前是否有任何疼痛、僵硬、不适..."
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[80px]" />
            </div>
            <div>
              <label className="text-xs text-slate-500">康复情况</label>
              <div className="flex gap-2 mt-1">
                {(['fully_recovered', 'recovering', 'chronic'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setRehabStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      rehabStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s === 'fully_recovered' ? '完全恢复' : s === 'recovering' ? '恢复中' : '慢性问题'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== Step 5: Mobility ====== */}
        {step === 5 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">功能性活动度筛查</h2>
            <p className="text-xs text-slate-500">按实际测试评分：1=受限明显 2=基本达标 3=良好</p>
            {([
              { label: '过顶深蹲', desc: '双手举杆过头做深蹲，观察姿态是否稳定', state: ohSquat, setter: setOhSquat },
              { label: '肩关节活动度', desc: '仰卧肩屈曲/内外旋范围评估', state: shoulderMob, setter: setShoulderMob },
              { label: '踝关节背屈', desc: '膝盖触墙测试，评估踝关节活动范围', state: ankleMob, setter: setAnkleMob },
              { label: '托马斯测试', desc: '仰卧抱单膝，看对侧大腿是否抬起（髋屈肌紧张度）', state: thomasTest, setter: setThomasTest },
            ]).map((test) => (
              <div key={test.label} className="border border-slate-100 rounded-lg p-3">
                <p className="text-sm font-medium text-slate-700">{test.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 mb-2">{test.desc}</p>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((score) => (
                    <button
                      key={score}
                      onClick={() => test.setter(score)}
                      className={`w-10 h-10 rounded-full text-sm font-medium ${
                        test.state === score
                          ? score === 3 ? 'bg-green-500 text-white' : score === 2 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              上一步
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canNext()}
              className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition-colors ${
                canNext() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition-colors ${
                submitting ? 'bg-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? '正在生成 AI 评估报告...' : '完成体测 · 查看报告'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
