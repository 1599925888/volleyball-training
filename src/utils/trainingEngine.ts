import type {
  DailyPlan, ExerciseBlock, BodyMetrics, BodySignal,
  InitialAssessment, MacroCyclePhase, AssessmentReport,
} from '../types';

export function computeBodySignal(m: BodyMetrics): BodySignal {
  if (m.fatigueLevel >= 8 || m.sleepHours < 5 || m.soreAreas.filter((s) => s !== 'none').length >= 3) return 'red';
  if (m.fatigueLevel >= 5 || m.sleepHours < 6 || m.soreAreas.filter((s) => s !== 'none').length >= 1) return 'yellow';
  return 'green';
}

function getIntensityPercent(signal: BodySignal, playedYesterday: boolean): number {
  if (signal === 'red') return 30;
  if (signal === 'yellow') return 70;
  if (playedYesterday) return 80;
  return 100;
}

// Core exercise library
const warmupExercises: ExerciseBlock[] = [
  { name: '泡沫轴全身放松', duration: '3min', notes: '重点放松股四头肌、腘绳肌、背部' },
  { name: '动态拉伸', duration: '5min', notes: '腿摆动、髋关节环绕、手臂绕圈、侧弓步' },
  { name: '激活训练', duration: '2min', notes: '臀桥激活、弹力带侧向行走、平板支撑' },
];

const prehabExercises_base: ExerciseBlock[] = [
  { name: '弹力带 YTWL', sets: 2, reps: '每动作10次', rest: '30s', notes: '肩袖肌群激活，防扣球肩' },
  { name: '单腿平衡站立', sets: 2, duration: '每侧30s', rest: '15s', notes: '踝关节稳定性' },
  { name: '落地缓冲练习', sets: 2, reps: '5次', rest: '30s', notes: '从30cm箱跳下，软着陆，防ACL损伤' },
  { name: '90/90 髋关节拉伸', sets: 1, duration: '每侧30s', notes: '改善起跳力学' },
];

// Extra prehab based on risk areas
function getExtraPrehab(riskAreas: string[]): ExerciseBlock[] {
  const extras: ExerciseBlock[] = [];
  if (riskAreas.includes('膝盖')) {
    extras.push({ name: '北欧弯举辅助', sets: 2, reps: '5次', rest: '60s', notes: '腘绳肌离心训练，保护膝盖' });
    extras.push({ name: '靠墙静蹲', sets: 2, duration: '45s', rest: '30s', notes: '股四头肌等长训练' });
  }
  if (riskAreas.includes('肩关节')) {
    extras.push({ name: '弹力带肩袖外旋', sets: 2, reps: '每侧15次', rest: '30s', notes: '加强肩袖' });
  }
  if (riskAreas.includes('脚踝')) {
    extras.push({ name: '踝关节 ABC书写', sets: 1, reps: '每侧一套字母', notes: '踝关节活动度' });
  }
  return extras;
}

function getMainWorkout(
  phase: MacroCyclePhase,
  _weekNumber: number,
  intensityPercent: number,
  trainingMode: 'school' | 'holiday',
  squat1RM: number,
  dl1RM: number,
  assessment: AssessmentReport,
): ExerciseBlock[] {
  const loadPct = assessment.suggestedTrainingLoad / 100 * (intensityPercent / 100);
  const sWeight = Math.round(squat1RM * loadPct / 2.5) * 2.5;
  const dWeight = Math.round(dl1RM * loadPct / 2.5) * 2.5;

  const sets = trainingMode === 'school' ? 3 : 4;
  const exercises = trainingMode === 'school' ? 4 : 6;

  switch (phase) {
    case 'strength_base':
      return [
        { name: '杠铃深蹲', sets, reps: '8-10', load: `${sWeight}kg (${Math.round(loadPct * 100)}% 1RM)`, rest: '120s' },
        { name: '罗马尼亚硬拉', sets, reps: '8-10', load: `${dWeight}kg`, rest: '90s' },
        { name: '单腿保加利亚分腿蹲', sets: 3, reps: '每侧8次', load: '自重或哑铃', rest: '60s' },
        { name: '悬垂翻/高翻', sets: 3, reps: '5次', load: '中等重量', rest: '90s', notes: '爆发力基础' },
        ...(trainingMode === 'holiday' ? [
          { name: '北欧弯举', sets: 3, reps: '5次', rest: '90s', notes: '腘绳肌离心训练' },
          { name: '农夫行走', sets: 3, duration: '40m', rest: '60s', notes: '核心稳定+握力' },
        ] : []),
        { name: '核心抗旋转训练', sets: 3, reps: '每侧10次', rest: '45s', notes: '弹力带Pallof Press' },
      ].slice(0, exercises);

    case 'power_conversion':
      return [
        { name: '悬垂高翻', sets, reps: '3-5', load: '中等偏重', rest: '120s' },
        { name: '跳蹲', sets, reps: '5次', load: `${sWeight}kg`, rest: '90s', notes: '向心阶段快速爆发' },
        { name: '箱跳', sets: 4, reps: '5次', rest: '60s', notes: '选择安全高度，软着陆' },
        { name: '药球下砸+上抛', sets: 3, reps: '8次', rest: '45s' },
        ...(trainingMode === 'holiday' ? [
          { name: '杠铃深蹲', sets: 3, reps: '5次', load: `${Math.round(squat1RM * 0.8 / 2.5) * 2.5}kg (80%)`, rest: '120s', notes: '保持力量' },
          { name: '单腿跳箱', sets: 3, reps: '每侧5次', rest: '60s' },
        ] : []),
      ].slice(0, exercises);

    case 'explosive_peak':
      return [
        { name: '助跑摸高训练', sets: 5, reps: '3次', rest: '90s', notes: '全力起跳，记录每次高度' },
        { name: '深度跳跃（Depth Jump）', sets: 3, reps: '5次', rest: '120s', notes: '从30-45cm箱落下后立即起跳' },
        { name: '悬垂高翻', sets: 4, reps: '3次', load: '大重量', rest: '120s' },
        { name: '跳蹲', sets: 3, reps: '5次', load: `${sWeight}kg`, rest: '90s' },
        ...(trainingMode === 'holiday' ? [
          { name: '连续障碍跳跃', sets: 3, reps: '6次', rest: '60s', notes: '连续跳过多个低障碍' },
          { name: '助跑扣球模拟', sets: 4, reps: '5次', rest: '60s', notes: '无球助跑扣球动作' },
        ] : []),
      ].slice(0, exercises);

    case 'deload':
      return [
        { name: '自重深蹲', sets: 2, reps: '15次', rest: '30s' },
        { name: '猫牛式', sets: 2, reps: '10次', rest: '15s' },
        { name: '灵活性综合训练', duration: '15min', notes: '肩、髋、踝全身活动度' },
        ...(trainingMode === 'holiday' ? [
          { name: '游泳或骑行', duration: '20min', notes: '低冲击有氧' },
        ] : []),
      ];
  }
}

function getVolleyballSpecific(
  phase: MacroCyclePhase,
  signal: BodySignal,
  trainingMode: 'school' | 'holiday',
): ExerciseBlock[] {
  if (signal === 'red') return [{ name: '休息', duration: '-', notes: '今日不建议进行排球专项训练' }];
  if (signal === 'yellow' && trainingMode === 'school') return [{ name: '排球技术动作徒手练习', duration: '10min', notes: '降低强度，注重技术' }];

  switch (phase) {
    case 'strength_base':
      return [
        { name: '步法移动训练', duration: '10min', notes: '前后左右快速移动，重心控制' },
        { name: '发球练习', duration: '10min', notes: '注重技术稳定性' },
      ];
    case 'power_conversion':
      return [
        { name: '助跑起跳技术练习', duration: '10min', notes: '注重最后两步加速 + 摆臂' },
        { name: '扣球手法练习', duration: '10min', notes: '对墙或搭档' },
      ];
    case 'explosive_peak':
      return [
        { name: '实战对抗', duration: '15min', notes: '或扣球/拦网专项' },
        { name: '连续起跳拦网', sets: 3, reps: '5次连续', notes: '快速连续起跳能力' },
      ];
    case 'deload':
      return [
        { name: '传球手感练习', duration: '10min', notes: '轻量技术维持' },
        { name: '垫球练习', duration: '10min' },
      ];
  }
}

export function generateDailyPlan(
  bodyMetrics: BodyMetrics,
  assessment: InitialAssessment | null,
  report: AssessmentReport | null,
  phase: MacroCyclePhase,
  weekNumber: number,
  trainingMode: 'school' | 'holiday',
): DailyPlan {
  if (!assessment || !report) {
    return {
      date: bodyMetrics.date,
      macroCycleId: 0,
      bodySignal: 'green',
      intensityPercent: 100,
      warmup: [],
      prehab: [],
      mainWorkout: [],
      volleyballSpecific: [],
      cooldown: [{ name: '静态拉伸', duration: '10min', notes: '全身主要肌群静态拉伸' }],
      notes: '请先完成初始体测评估',
      completed: false,
    };
  }

  const signal = computeBodySignal(bodyMetrics);
  const playedYesterday = bodyMetrics.playedVolleyball;
  const intensityPercent = getIntensityPercent(signal, playedYesterday);

  const riskAreas = report.riskAreas;
  const extraPrehab = getExtraPrehab(riskAreas);

  const mainWorkout = getMainWorkout(phase, weekNumber, intensityPercent, trainingMode, assessment.squatMax, assessment.deadliftMax, report);

  const volleyballSpecific = getVolleyballSpecific(phase, signal, trainingMode);

  const notes: string[] = [];
  if (signal === 'red') notes.push('⚠ 红灯：身体状态不佳，今日为主动恢复日');
  if (signal === 'yellow') notes.push('⚠ 黄灯：降低训练强度至70%，注意身体信号');
  if (playedYesterday) notes.push('🏐 昨日有排球活动，已降低下肢冲击负荷');
  if (extraPrehab.length > 0) notes.push('🛡 已根据你的伤病风险增加针对性预复训练');

  return {
    date: bodyMetrics.date,
    macroCycleId: 0, // Will be set by caller
    bodySignal: signal,
    intensityPercent,
    warmup: signal === 'red' ? warmupExercises.slice(0, 1) : warmupExercises,
    prehab: [...prehabExercises_base, ...extraPrehab],
    mainWorkout,
    volleyballSpecific,
    cooldown: [
      { name: '静态拉伸', duration: '10min', notes: '股四头肌、腘绳肌、臀大肌、胸肌、背阔肌' },
      { name: '泡沫轴放松', duration: '5min', notes: '重点部位额外放松' },
    ],
    notes: notes.join(' · '),
    completed: false,
  };
}

export function getPhaseName(phase: MacroCyclePhase): string {
  switch (phase) {
    case 'strength_base': return '基础力量期';
    case 'power_conversion': return '力量转化期';
    case 'explosive_peak': return '爆发力峰值期';
    case 'deload': return '减载恢复期';
  }
}
