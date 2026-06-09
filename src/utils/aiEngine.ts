import type { DailyPlan, AssessmentReport, InitialAssessment, BodyMetrics, MacroCyclePhase } from '../types';
import { generateDailyPlan } from './trainingEngine';

// ============ Config ============
export type AIMode = 'manual' | 'api' | 'off';

export interface AIConfig {
  mode: AIMode;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
}

const STORAGE_KEY = 'volleyball_ai_config';

export function getAIConfig(): AIConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return {
    mode: 'api',
    apiKey: '',
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    modelName: 'deepseek-chat',
  };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ============ Prompt Builders (for manual mode) ============

const SYSTEM_PROMPT = `你是拥有20年经验的顶级排球体能教练+运动科学博士，服务过国家队。请根据运动员完整数据生成极其详细的个性化训练计划。

返回纯JSON（不要markdown）。格式要求：
{
  "bodySignal": "green|yellow|red",
  "intensityPercent": 数字(30-100),
  "analysis": "专业分析100-150字：身体状态影响、周期目标、风险点",
  "warmup": [{"name":"动作","sets":2,"reps":"次数","duration":"时长","rest":"秒","notes":"要点"}],
  "prehab": [{"name":"动作","sets":2-3,"reps":"次数","rest":"秒","notes":"防什么伤"}],
  "mainWorkout": [{"name":"完整动作名（如杠铃后深蹲）","sets":3-5,"reps":"具体次数","load":"基于1RM的具体重量如85kg(75%1RM)","rest":"秒","tempo":"X-X-X-X","rpe":"RPE X","notes":"动作要点+排球价值"}],
  "volleyballSpecific": [{"name":"内容","sets":N,"reps":"次数","duration":"时长","notes":"要点"}],
  "cooldown": [{"name":"拉伸/放松","duration":"每侧X秒","notes":"说明"}],
  "dietRecommendation": {"protein":"g","carbs":"g","water":"L","preWorkout":"建议","postWorkout":"建议","generalTips":"要点"},
  "recoveryRecommendation": "100字恢复方案",
  "notes": "RPE目标+预计时长+安全提示"
}

规则：
- 负重不能写"中等"或"大重量"！必须标注基于1RM的具体kg数和百分比
- 红灯→纯恢复，无负重无跳跃。黄灯→70%强度，RPE≤6
- 学期模式主体≤4动作，假期≤6动作
- prehab必须个性化匹配运动员风险部位
- 饮食必须给出具体克数`;

function buildPlanContext(context: {
  assessment: InitialAssessment | null;
  report: AssessmentReport | null;
  bodyMetrics: BodyMetrics;
  macroCycle: { phase: MacroCyclePhase; weekNumber: number } | null;
  trainingMode: 'school' | 'holiday';
}): string {
  const { assessment, report, bodyMetrics, macroCycle, trainingMode } = context;

  const phaseNames: Record<string, string> = {
    strength_base: '基础力量期——建立下肢+后链力量基础，强化关节稳定性。跳跃量低，侧重动作质量。',
    power_conversion: '力量转化期——将基础力量转化为爆发力。加入跳跃和奥林匹克举重。跳跃量中。',
    explosive_peak: '爆发力峰值期——最大化垂直弹跳能力。最高跳跃量，冲击摸高纪录。需密切监控膝盖。',
    deload: '减载恢复期——主动恢复，消除累积疲劳。不跳跃不打球，纯恢复。',
  };

  let signal = 'green';
  if (bodyMetrics.fatigueLevel >= 8 || bodyMetrics.sleepHours < 5) signal = 'red';
  else if (bodyMetrics.fatigueLevel >= 5 || bodyMetrics.sleepHours < 6) signal = 'yellow';

  const parts: string[] = [];

  if (assessment) {
    const relSquat = (assessment.squatMax / assessment.weight).toFixed(1);
    const pChain = (assessment.deadliftMax / assessment.squatMax).toFixed(2);
    const vj = assessment.maxApproachReach - assessment.standingReach;
    parts.push(`【体测档案】
年龄${assessment.age}岁 · ${assessment.gender==='male'?'男':'女'} · 身高${assessment.height}cm · 体重${assessment.weight}kg
站立摸高${assessment.standingReach}cm · 助跑摸高${assessment.maxApproachReach}cm · 弹跳高度${vj}cm · 原地纵跳${assessment.standingVerticalJump}cm
深蹲1RM:${assessment.squatMax}kg(相对力量${relSquat}x体重) · 硬拉1RM:${assessment.deadliftMax}kg(后链比${pChain}) · 卧推1RM:${assessment.benchMax}kg
经验:${assessment.experience==='beginner'?'初级<1年':assessment.experience==='intermediate'?'中级1-3年':'进阶3年+'}
伤病历史:${assessment.injuryHistory?.join('、')||'无'} · 当前困扰:${assessment.currentIssues||'无'} · 康复:${assessment.rehabStatus==='fully_recovered'?'完全恢复':assessment.rehabStatus==='recovering'?'恢复中':'慢性'}
活动度:过顶深蹲${assessment.overheadSquatScore}/3·肩${assessment.shoulderMobilityScore}/3·踝${assessment.ankleMobilityScore}/3·髋${assessment.thomasTestScore}/3(1受限2达标3良好)`);
  }

  if (report) {
    parts.push(`【评估】弹跳潜力:${report.jumpRating==='green'?'优秀':report.jumpRating==='yellow'?'良好':'待提升'} · 高风险:${report.riskAreas?.join('、')||'无'} · 负荷起点:${report.suggestedTrainingLoad}%1RM · 建议起始周期:${report.suggestedStartPhase} · 跳跃量:${report.suggestedJumpVolume}`);
  }

  parts.push(`【今日状态】
日期${bodyMetrics.date} · 体重${bodyMetrics.weight}kg · 晨起心率${bodyMetrics.restingHeartRate||'未测'}bpm
睡眠${bodyMetrics.sleepHours}h(质量${bodyMetrics.sleepQuality}/5) · 疲劳${bodyMetrics.fatigueLevel}/10${bodyMetrics.fatigueLevel<=4?'(恢复良好)':bodyMetrics.fatigueLevel<=7?'(中度疲劳)':'(明显疲劳!)'}
酸痛:${bodyMetrics.soreAreas?.filter(s=>s!=='none').join('、')||'无'} · ${bodyMetrics.playedVolleyball?'⚠昨天有排球活动→今天必须降低下肢冲击负荷':'昨日无排球'} · ${bodyMetrics.injuryNotes||''}`);

  parts.push(`信号:${signal==='green'?'🟢绿灯全力100%':signal==='yellow'?'🟡黄灯70% RPE≤6':'🔴红灯→纯恢复日 禁止高强度'}`);
  parts.push(`周期:${macroCycle?phaseNames[macroCycle.phase]:'未设定'} · 第${macroCycle?.weekNumber||1}/4周 ${macroCycle?`(${macroCycle.weekNumber<=1?'适应周低负荷':macroCycle.weekNumber<=2?'递增周':macroCycle.weekNumber<=3?'高峰周':'最大负荷/测试周'})`:''} · ${trainingMode==='school'?'学期(2-3次/周浓缩)':'假期(4-5次/周)'}`);

  return parts.join('\n\n');
}

export function buildPlanPrompt(context: Parameters<typeof buildPlanContext>[0]): string {
  return `${SYSTEM_PROMPT}\n\n---\n\n${buildPlanContext(context)}`;
}

export function buildReportPrompt(assessment: InitialAssessment): string {
  const relSquat = assessment.squatMax / assessment.weight;
  const pChain = assessment.deadliftMax / assessment.squatMax;
  const vj = assessment.maxApproachReach - assessment.standingReach;

  return `你是排球运动表现分析专家。请分析以下体测数据，生成评估报告（纯JSON）：

身高${assessment.height}cm 体重${assessment.weight}kg 站立摸高${assessment.standingReach}cm
深蹲1RM:${assessment.squatMax}kg(相对${relSquat.toFixed(1)}x) 硬拉1RM:${assessment.deadliftMax}kg(后链比${pChain.toFixed(2)}) 卧推1RM:${assessment.benchMax}kg
助跑摸高:${assessment.maxApproachReach}cm 弹跳:${vj}cm 原地纵跳:${assessment.standingVerticalJump}cm
经验:${assessment.experience==='beginner'?'初级':assessment.experience==='intermediate'?'中级':'进阶'}
伤病:${assessment.injuryHistory?.join('、')||'无'} 困扰:${assessment.currentIssues||'无'} 康复:${assessment.rehabStatus}
活动度:过顶深蹲${assessment.overheadSquatScore}/3 肩${assessment.shoulderMobilityScore}/3 踝${assessment.ankleMobilityScore}/3 髋${assessment.thomasTestScore}/3

返回JSON：
{"verticalJumpHeight":${vj},"relativeSquatStrength":${relSquat.toFixed(1)},"jumpRating":"green|yellow|red","strengthBalance":{"squat":${assessment.squatMax},"deadlift":${assessment.deadliftMax},"bench":${assessment.benchMax}},"posteriorChainRatio":${pChain.toFixed(2)},"riskAreas":["部位"],"recommendations":["建议"],"suggestedStartPhase":"strength_base|power_conversion|explosive_peak","suggestedTrainingLoad":75,"suggestedJumpVolume":"low|medium|high","detailedAnalysis":"200字分析"}`;
}

// ============ Response Parsers ============

export function parsePlanResponse(raw: string, date: string): DailyPlan | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\S]*?\{/, '{')  // Remove any text before first {
      .replace(/\}[\s\S]*$/, '}')    // Remove any text after last }
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      date,
      macroCycleId: 0,
      bodySignal: parsed.bodySignal || 'green',
      intensityPercent: parsed.intensityPercent || 100,
      warmup: parsed.warmup || [],
      prehab: parsed.prehab || [],
      mainWorkout: parsed.mainWorkout || [],
      volleyballSpecific: parsed.volleyballSpecific || [],
      cooldown: parsed.cooldown || [],
      notes: [parsed.analysis, parsed.notes, parsed.recoveryRecommendation ? `💡${parsed.recoveryRecommendation}` : '']
        .filter(Boolean).join('\n'),
      completed: false,
    };
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    return null;
  }
}

export function parseReportResponse(raw: string): AssessmentReport | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\S]*?\{/, '{')
      .replace(/\}[\s\S]*$/, '}')
      .trim();
    return JSON.parse(cleaned) as AssessmentReport;
  } catch {
    return null;
  }
}

// ============ API Mode ============

export async function generatePlanViaAPI(context: Parameters<typeof buildPlanContext>[0]): Promise<DailyPlan | null> {
  const config = getAIConfig();
  if (!config.apiKey) return null;

  try {
    const response = await fetch('/.netlify/functions/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, ...context }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      date: context.bodyMetrics.date,
      macroCycleId: 0,
      bodySignal: data.bodySignal || 'green',
      intensityPercent: data.intensityPercent || 100,
      warmup: data.warmup || [],
      prehab: data.prehab || [],
      mainWorkout: data.mainWorkout || [],
      volleyballSpecific: data.volleyballSpecific || [],
      cooldown: data.cooldown || [],
      notes: `🤖 AI自动生成\n${[data.analysis, data.notes, data.recoveryRecommendation ? `💡${data.recoveryRecommendation}` : ''].filter(Boolean).join('\n')}`,
      completed: false,
    };
  } catch {
    return null;
  }
}

export async function generateReportViaAPI(assessment: InitialAssessment): Promise<AssessmentReport | null> {
  const config = getAIConfig();
  if (!config.apiKey) return null;
  try {
    const res = await fetch('/.netlify/functions/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, ...assessment }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============ Local fallback ============

function generateLocalReport(a: InitialAssessment): AssessmentReport {
  const vj = a.maxApproachReach - a.standingReach;
  const rs = a.squatMax / a.weight;
  const pc = a.deadliftMax / a.squatMax;
  const jr = rs >= 2.0 ? 'green' as const : rs >= 1.5 ? 'yellow' as const : 'red' as const;

  const risk: string[] = [];
  if (a.injuryHistory.includes('knee') || a.overheadSquatScore <= 2) risk.push('膝盖');
  if (a.injuryHistory.includes('shoulder') || a.shoulderMobilityScore <= 2) risk.push('肩关节');
  if (a.injuryHistory.includes('ankle') || a.ankleMobilityScore <= 2) risk.push('脚踝');
  if (a.injuryHistory.includes('back') || pc < 0.7) risk.push('下背部');
  if (a.thomasTestScore <= 2) risk.push('髋关节');

  const recs: string[] = [];
  if (rs < 1.5) recs.push('相对力量偏弱，从基础力量期开始，优先提升下肢力量');
  if (pc < 0.7) recs.push('后链力量不足，加强硬拉和腘绳肌训练');
  if (a.shoulderMobilityScore <= 2) recs.push('肩关节活动度需改善，加入肩袖预复');
  if (a.ankleMobilityScore <= 2) recs.push('踝关节活动度受限，影响起跳力学');

  let phase: MacroCyclePhase = 'strength_base';
  if (rs >= 2.0 && vj < 60) phase = 'power_conversion';
  else if (rs >= 2.0 && vj >= 60) phase = 'explosive_peak';

  return {
    verticalJumpHeight: vj, relativeSquatStrength: rs, jumpRating: jr,
    strengthBalance: { squat: a.squatMax, deadlift: a.deadliftMax, bench: a.benchMax },
    posteriorChainRatio: pc, riskAreas: risk, recommendations: recs,
    suggestedStartPhase: phase,
    suggestedTrainingLoad: rs < 1.5 ? 70 : rs < 2.0 ? 75 : 80,
    suggestedJumpVolume: rs < 1.5 ? 'low' : rs < 2.0 ? 'medium' : 'high',
  };
}

export function getFallbackPlan(context: Parameters<typeof buildPlanContext>[0]): DailyPlan {
  return generateDailyPlan(
    context.bodyMetrics, context.assessment, context.report,
    context.macroCycle?.phase || 'strength_base',
    context.macroCycle?.weekNumber || 1, context.trainingMode,
  );
}

export function getFallbackReport(assessment: InitialAssessment): AssessmentReport {
  return generateLocalReport(assessment);
}
