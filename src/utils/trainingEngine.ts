import type { DailyPlan, ExerciseBlock, BodyMetrics, BodySignal, InitialAssessment, MacroCyclePhase, AssessmentReport } from '../types';

export function computeBodySignal(m: BodyMetrics): BodySignal {
  if (m.fatigueLevel >= 8 || m.sleepHours < 5 || m.soreAreas.filter((s) => s !== 'none').length >= 3) return 'red';
  if (m.fatigueLevel >= 5 || m.sleepHours < 6 || m.soreAreas.filter((s) => s !== 'none').length >= 1) return 'yellow';
  return 'green';
}

function getIntensityMultiplier(signal: BodySignal, playedYesterday: boolean): number {
  if (signal === 'red') return 0.3;
  if (signal === 'yellow') return 0.7;
  if (playedYesterday) return 0.8;
  return 1.0;
}

// ─── WARM-UP (detailed) ───
function buildWarmup(signal: BodySignal): ExerciseBlock[] {
  if (signal === 'red') return [{ name: '轻柔拉伸 + 泡沫轴', duration: '10min', notes: '重点部位轻柔放松，不做高强度动态拉伸' }];
  return [
    { name: '泡沫轴自我放松', duration: '5min', notes: '侧重：股四头肌（大腿前侧）、腘绳肌（大腿后侧）、阔筋膜张肌（大腿外侧）、胸椎（上背部）。每个部位30秒，缓慢滚动。' },
    { name: '动态热身序列', duration: '5min', notes: '①腿摆动（前后×10+左右×10）→②髋关节环绕（每侧×10）→③手臂大绕环（前后各×10）→④侧弓步交替（每侧×8）→⑤最伟大拉伸（每侧×5）' },
    { name: '神经激活', duration: '2min', notes: '①快速高抬腿 2×10s→②A-Skip 2×15m→③臀桥激活 2×10次→④弹力带侧向行走 2×10步/侧' },
  ];
}

// ─── PREHAB (personalized by risk areas) ───
function buildPrehab(riskAreas: string[]): ExerciseBlock[] {
  const all: ExerciseBlock[] = [
    // Shoulder - always included for volleyball
    { name: '弹力带 YTWL 肩袖激活', sets: 2, reps: '每字母10次', rest: '30s', notes: '俯身或站姿，弹力带轻阻力。Y：拇指向上举至头顶。T：手臂向两侧展开。W：屈肘下拉。L：外旋。防扣球肩必备。', targets: ['shoulder'] },
    { name: '弹力带肩关节外旋', sets: 2, reps: '每侧15次', rest: '30s', notes: '肘关节夹紧身体侧面，前臂外旋对抗弹力带阻力。加强冈下肌和小圆肌。', targets: ['shoulder'] },

    // Knee injury prevention
    { name: '单腿箱上控制下落', sets: 2, reps: '每侧8次', rest: '45s', notes: '单腿站于20cm箱上，缓慢控制下落（3秒），强化膝关节离心控制。预防跳跃膝核心训练。', targets: ['knee'] },
    { name: '北欧弯举辅助', sets: 2, reps: '5次', rest: '90s', notes: '跪姿，双脚固定，身体缓慢前倾（3-5秒），腘绳肌离心训练。ACL损伤预防黄金动作。', targets: ['knee'] },

    // Ankle
    { name: '单腿闭眼平衡', sets: 2, duration: '每侧45s', rest: '15s', notes: '单腿站立，闭眼增加难度。踝关节本体感觉训练，预防崴脚。', targets: ['ankle'] },
    { name: '踝关节ABC书写', sets: 1, reps: '每侧A-Z', notes: '坐姿抬腿，用脚尖在空中书写字母表。踝关节全范围活动。', targets: ['ankle'] },

    // Hip mobility
    { name: '90/90 髋关节拉伸', sets: 1, duration: '每侧45s', notes: '坐姿前后腿各90度，上身前倾。改善髋关节内外旋活动度，直接影响起跳力学。', targets: ['hip'] },
    { name: '髋屈肌动态拉伸', sets: 2, reps: '每侧10次', rest: '15s', notes: '半跪姿髋屈肌拉伸+臀肌收缩。改善骨盆前倾，提升起跳伸展能力。', targets: ['hip'] },

    // Back/Core
    { name: '死虫式核心稳定', sets: 2, reps: '每侧12次', rest: '30s', notes: '仰卧，对侧手臂和腿交替伸展，保持腰椎贴地。核心深层稳定训练。', targets: ['back'] },
  ];

  // Filter by risk areas
  const relevantAreas = new Set<string>();
  if (riskAreas.includes('膝盖') || riskAreas.includes('knee')) { relevantAreas.add('knee'); relevantAreas.add('shoulder'); }
  if (riskAreas.includes('肩关节') || riskAreas.includes('shoulder')) { relevantAreas.add('shoulder'); }
  if (riskAreas.includes('脚踝') || riskAreas.includes('ankle')) relevantAreas.add('ankle');
  if (riskAreas.includes('髋关节') || riskAreas.includes('hip')) relevantAreas.add('hip');
  if (riskAreas.includes('下背部') || riskAreas.includes('back')) relevantAreas.add('back');
  // Always include shoulder and at least one lower body
  relevantAreas.add('shoulder');
  relevantAreas.add('knee');

  const filtered = all.filter((ex) => ex.targets?.some((t: string) => relevantAreas.has(t)));

  // Deduplicate and limit to 4-5 exercises
  const seen = new Set<string>();
  const result: ExerciseBlock[] = [];
  for (const ex of filtered) {
    if (!seen.has(ex.name) && result.length < 5) {
      seen.add(ex.name);
      result.push(ex);
    }
  }
  return result;
}

// ─── MAIN WORKOUT (phase-specific, week-progressed) ───
function buildMainWorkout(
  phase: MacroCyclePhase, weekNumber: number, intensityMult: number,
  trainingMode: 'school' | 'holiday', squat1RM: number, dl1RM: number, bench1RM: number,
  baseLoadPct: number,
): ExerciseBlock[] {
  // Week progression: week 1=65%, week 2=72.5%, week 3=77.5%, week 4=80% (for strength phases)
  const weekMultiplier = weekNumber <= 1 ? 0.85 : weekNumber <= 2 ? 0.93 : weekNumber <= 3 ? 0.97 : 1.0;
  const loadPct = (baseLoadPct / 100) * weekMultiplier * intensityMult;

  const mainSets = trainingMode === 'school' ? 3 : 4;
  const numExercises = trainingMode === 'school' ? 4 : 6;

  const sWeight = formatWeight(squat1RM * loadPct);
  const dWeight = formatWeight(dl1RM * loadPct);
  const bWeight = formatWeight(bench1RM * loadPct);
  const pctLabel = Math.round(loadPct * 100);

  switch (phase) {
    case 'strength_base': {
      const ex: ExerciseBlock[] = [
        { name: '杠铃后深蹲', sets: mainSets, reps: '8次', load: `${sWeight}kg (${pctLabel}% 1RM)`, rest: '120-150s', notes: `核心收紧，下蹲至大腿与地面平行。向心阶段（起立）快速有力。本周目标：第${weekNumber}周${weekNumber >= 3 ? '接近力竭' : '保留2次余量'}。` },
        { name: '罗马尼亚硬拉', sets: mainSets, reps: '10次', load: `${dWeight}kg`, rest: '90-120s', notes: '保持背部平直，臀部后推。杠铃沿小腿下滑至膝盖下方。腘绳肌拉伸感。' },
        { name: '保加利亚分腿蹲', sets: 3, reps: '每侧8次', load: '哑铃各10-15kg起', rest: '60s/侧', notes: '后脚抬高40cm，前腿下蹲至大腿平行。模拟单腿起跳力学。' },
        { name: '悬垂高翻', sets: 3, reps: '5次', load: '60-70% 高翻1RM', rest: '90s', notes: '从悬垂位发力，三关节伸展（踝、膝、髋）+ 耸肩。爆发力基础技能。' },
        ...(trainingMode === 'holiday' ? [
          { name: '北欧弯举', sets: 3, reps: '5-6次', rest: '90s', notes: '跪姿缓慢前倾，能控制多远就多远。渐进超负荷：每周多控制1-2cm。' },
          { name: '卧推', sets: 3, reps: '8次', load: `${bWeight}kg (${pctLabel}%)`, rest: '90s', notes: '上肢推力维持，扣球力量传导链。' },
          { name: '农夫行走', sets: 3, duration: '40m往返', rest: '60s', notes: '双手持哑铃/壶铃，核心稳定不侧倾。握力+核心+肩稳定。' },
          { name: '弹力带反向前弓箭步', sets: 2, reps: '每侧12次', rest: '45s', notes: '弹力带固定于前方，后撤步弓步。抗阻髋伸训练。' },
        ] : []),
        { name: 'Pallof Press 核心抗旋转', sets: 3, reps: '每侧10次（5秒保持）', rest: '45s', notes: '弹力带或龙门架，双手推至胸前伸直，对抗侧向拉力。排球扣球转体核心稳定。' },
      ];
      return ex.slice(0, numExercises + 1); // +1 for core at the end
    }

    case 'power_conversion': {
      const ex: ExerciseBlock[] = [
        { name: '悬垂高翻 + 前蹲', sets: mainSets, reps: '3+3次', load: `70-80% 高翻1RM`, rest: '120s', notes: `高翻接前蹲。三关节爆发伸展+接杠控制。专注动作速度和流畅性。第${weekNumber}周重点：${weekNumber <= 2 ? '技术巩固' : '加重量'}` },
        { name: '跳蹲', sets: mainSets, reps: '5次', load: `${sWeight}kg`, rest: '90s', notes: '深蹲位爆发跳起。向心阶段全速！落地缓冲控制（3秒下放）。专注起跳力量转化。' },
        { name: '跳箱（安全高度）', sets: 4, reps: '5次', load: `${60 + weekNumber * 5}cm箱`, rest: '60s', notes: `选择安全可控高度。双脚同时起跳，软着陆。渐进：每周增加5cm箱高。` },
        { name: '药球过顶下砸', sets: 3, reps: '8次', load: '4-6kg药球', rest: '45s', notes: '药球举过头顶→全力砸向地面→接反弹→重复。模拟扣球发力链。' },
        ...(trainingMode === 'holiday' ? [
          { name: '杠铃深蹲（保持力量）', sets: 3, reps: '5次', load: `${formatWeight(squat1RM * 0.8)}kg (80% 1RM)`, rest: '120s', notes: '保持最大力量水平，不追求突破。' },
          { name: '单腿跳箱', sets: 3, reps: '每侧5次', load: '30cm箱', rest: '60s', notes: '单腿起跳（排球起跳多为单腿主导），控制落地。' },
        ] : []),
      ];
      return ex.slice(0, numExercises + 1);
    }

    case 'explosive_peak': {
      const ex: ExerciseBlock[] = [
        { name: '助跑摸高极限训练', sets: 6, reps: '3次', rest: '90-120s', notes: `三步助跑全力起跳摸高。记录每次高度（手机慢动作拍摄分析）。本周目标：冲击个人纪录。第${weekNumber}周 ${weekNumber >= 3 ? '冲击PR' : '技术打磨'}` },
        { name: '深度跳跃 Depth Jump', sets: 4, reps: '5次', rest: '120s', notes: `从${30 + weekNumber * 5}cm箱落下→落地瞬间全力垂直起跳。触地时间<0.2秒。拉伸-缩短周期(SSC)最大化训练。` },
        { name: '悬垂高翻（大重量）', sets: 4, reps: '3次', load: '80-90% 高翻1RM', rest: '120-150s', notes: '专注三关节爆发伸展速度。重量重但动作必须快。' },
        { name: '轨迹跳蹲', sets: 3, reps: '5次', load: `${sWeight}kg`, rest: '90s', notes: '下蹲位爆发跳起，专注起跳轨迹（向前上方，模拟助跑起跳方向）。' },
        ...(trainingMode === 'holiday' ? [
          { name: '连续障碍跳跃', sets: 3, reps: '6障碍连续', rest: '60s', notes: '5-6个40-50cm障碍连续跳跃。弹跳耐力+连续起跳能力（拦网/扣球回合）。' },
          { name: '助跑扣球模拟（无球）', sets: 4, reps: '5次', rest: '60s', notes: '完整助跑→起跳→扣球动作（无球）。动作模式训练。' },
        ] : []),
      ];
      return ex.slice(0, numExercises + 1);
    }

    case 'deload': {
      return [
        { name: '自重深蹲 + 俯卧撑', sets: 2, reps: '各15次', rest: '30s', notes: '慢速控制（3秒下3秒上），感知身体。' },
        { name: '猫牛式 + 鸟狗式', sets: 2, reps: '各10次', rest: '15s', notes: '脊柱活动度维护 + 核心稳定。' },
        { name: '灵活性综合训练', duration: '20min', notes: '包含：髋关节CARs（受控关节旋转）×每侧5min + 肩关节CARs × 每侧3min + 踝关节活动度训练' },
        { name: '泡沫轴全身放松', duration: '15min', notes: '从头到脚系统放松，重点关注股四头肌、腘绳肌、阔筋膜张肌、胸椎、背阔肌。' },
        ...(trainingMode === 'holiday' ? [
          { name: '低强度有氧', duration: '20-30min', notes: '游泳（推荐，零冲击）或骑行或快走。心率控制在120-140bpm。促进血液循环加速恢复。' },
        ] : []),
      ];
    }
  }
}

// ─── VOLLEYBALL SPECIFIC ───
function buildVolleyballSpecific(phase: MacroCyclePhase, signal: BodySignal, trainingMode: 'school' | 'holiday', experience: string): ExerciseBlock[] {
  if (signal === 'red') return [{ name: '排球动作观察与分析', duration: '10min', notes: '观看自己或职业选手比赛录像，分析步法和起跳技术。主动恢复日可选择。' }];
  if (signal === 'yellow') return [{ name: '排球技术徒手练习（低强度）', duration: '10-15min', notes: '无跳跃：传球手感、垫球控制、发球动作徒手练习。专注技术而非强度。' }];

  const isBeginner = experience === 'beginner';

  switch (phase) {
    case 'strength_base':
      return [
        { name: '排球场步法移动', duration: '10min', notes: `①三米线往返移动×5 → ②交叉步防守移动×5 → ③网前左右移动×5。${isBeginner ? '重点：低重心保持。' : '全速移动+方向变换。'}` },
        { name: '发球技术练习', duration: `${trainingMode === 'school' ? 10 : 15}min`, notes: `${isBeginner ? '上手发球基础动作练习，注重抛球稳定性。' : '跳发球/跳飘球技术练习。每种发球×15次。'}` },
        ...(trainingMode === 'holiday' ? [{ name: '垫球+传球连续练习', duration: '10min', notes: '对墙连续垫球100次→传球100次。提升控球手感。' }] : []),
      ];
    case 'power_conversion':
      return [
        { name: '助跑起跳技术分析训练', duration: '15min', notes: `三步助跑起跳摸高×10次。手机侧面拍摄分析：①最后两步是否加速 ②摆臂幅度 ③起跳角度是否向前上方。${isBeginner ? '重点纠正步法节奏。' : '逐次微调优化。'}` },
        { name: '扣球手法练习', duration: `${trainingMode === 'school' ? 10 : 15}min`, notes: `对墙扣球练习×30次。专注：①手腕包球 ②击球点高度 ③手臂鞭打速度。${isBeginner ? '先练原地扣球再练助跑扣球。' : '练习不同线路和角度。'}` },
      ];
    case 'explosive_peak':
      return [
        { name: '实战模拟对抗', duration: '15-20min', notes: '3v3或4v4小场地对抗。专注：起跳时机、扣球线路选择、拦网判断。以赛代练。' },
        { name: '连续起跳拦网训练', sets: 4, reps: '5次连续起跳', rest: '45s', notes: '网前连续拦网起跳。第5次必须和第1次一样高。拦网弹跳耐力核心训练。' },
        ...(trainingMode === 'holiday' ? [{ name: '扣球+防守组合训练', duration: '15min', notes: '扣球后立即回位防守→再扣球。排球比赛实际节奏模拟。' }] : []),
      ];
    case 'deload':
      return [
        { name: '传球手感维持', duration: '10min', notes: '轻松传球练习。感受手指触球反馈。不需强度，只维持手感。' },
        { name: '垫球控制练习', duration: '10min', notes: '轻垫球。专注手臂平面和重心转移。' },
      ];
  }
}

// ─── COOLDOWN ───
function buildCooldown(signal: BodySignal, mainWorkoutType: string): ExerciseBlock[] {
  return [
    { name: '静态拉伸（每动作30-45秒）', duration: '8-10min', notes: '必做：①股四头肌拉伸（侧卧拉脚跟）→②腘绳肌拉伸（仰卧弹力带辅助）→③臀大肌拉伸（4字拉伸）→④胸肌拉伸（门框/墙）→⑤背阔肌拉伸（悬垂或扶墙）→⑥髋屈肌拉伸（半跪姿）→⑦小腿拉伸（推墙）。全程深呼吸，不憋气。' },
    { name: '泡沫轴深度放松', duration: '5-10min', notes: `重点区域：①股四头肌（${signal === 'red' || mainWorkoutType === 'legs' ? '3min/侧' : '1min/侧'}）→②腘绳肌→③阔筋膜张肌→④臀大肌→⑤上背部（胸椎段）→⑥背阔肌。每部位缓慢滚动30-60秒，痛点多停留。` },
  ];
}

// ─── DIET RECOMMENDATIONS ───
function buildDietRecommendation(signal: BodySignal, bodyWeight: number, isTrainingDay: boolean): string {
  const protein = Math.round(bodyWeight * 2.0); // 2g per kg for athletes
  const carbs = signal === 'red' ? Math.round(bodyWeight * 3) : Math.round(bodyWeight * 5);
  const water = Math.round(bodyWeight * 0.035);

  const parts: string[] = [];
  parts.push(`🥩 蛋白质目标：${protein}g/天（${Math.round(protein / 4)}餐×约${Math.round(protein / 4)}g）`);
  parts.push(`🍚 碳水目标：${carbs}g/天${isTrainingDay ? '（训练日偏高）' : '（休息日偏低）'}`);
  parts.push(`💧 饮水目标：${water}L/天以上`);

  if (isTrainingDay) {
    parts.push('⏰ 训练前1.5-2h：含碳水+蛋白质的正餐（如：米饭+鸡胸肉+蔬菜）');
    parts.push('⏰ 训练前30min：快速碳水（香蕉/能量棒）');
    parts.push('⏰ 训练后30min内：蛋白质20-30g+碳水40-60g（如：乳清蛋白+香蕉，或牛奶+全麦面包+鸡蛋）');
  }
  if (signal === 'red') {
    parts.push('🛌 今天是恢复日，适当增加蛋白质摄入（修复组织），睡前可补充酪蛋白（牛奶/酸奶）');
  }

  return parts.join('\n');
}

// ─── HELPERS ───
function formatWeight(kg: number): number { return Math.round(kg / 2.5) * 2.5; }

// ─── MAIN GENERATOR ───
export function generateDailyPlan(
  bodyMetrics: BodyMetrics, assessment: InitialAssessment | null,
  report: AssessmentReport | null, phase: MacroCyclePhase,
  weekNumber: number, trainingMode: 'school' | 'holiday',
): DailyPlan {
  if (!assessment || !report) {
    return {
      date: bodyMetrics.date, macroCycleId: 0, bodySignal: 'green',
      intensityPercent: 100, warmup: [], prehab: [], mainWorkout: [],
      volleyballSpecific: [], cooldown: [],
      notes: '⚠️ 请先完成初始体测评估，系统才能生成个性化训练计划。',
      completed: false,
    };
  }

  const signal = computeBodySignal(bodyMetrics);
  const playedYesterday = bodyMetrics.playedVolleyball;
  const intensityMult = getIntensityMultiplier(signal, playedYesterday);
  const intensityPercent = Math.round(intensityMult * 100);

  const riskAreas = report.riskAreas || [];
  const warmup = buildWarmup(signal);
  const prehab = buildPrehab(riskAreas);
  const mainWorkout = buildMainWorkout(phase, weekNumber, intensityMult, trainingMode, assessment.squatMax, assessment.deadliftMax, assessment.benchMax, report.suggestedTrainingLoad);
  const volleyballSpecific = buildVolleyballSpecific(phase, signal, trainingMode, assessment.experience);
  const cooldown = buildCooldown(signal, phase);

  // Build notes
  const notes: string[] = [];
  notes.push(`━━━━ 今日训练概要 ━━━━`);
  notes.push(`📊 身体信号：${signal === 'green' ? '🟢 绿灯' : signal === 'yellow' ? '🟡 黄灯' : '🔴 红灯'}（疲劳${bodyMetrics.fatigueLevel}/10 · 睡眠${bodyMetrics.sleepHours}h · 强度${intensityPercent}%）`);
  notes.push(`🔄 当前周期：${getPhaseName(phase)} 第${weekNumber}周 · ${trainingMode === 'school' ? '学期模式' : '假期模式'}`);
  notes.push(`🎯 训练核心：${phase === 'strength_base' ? '建立力量基础，强化关节稳定' : phase === 'power_conversion' ? '力量转化为爆发力' : phase === 'explosive_peak' ? '最大化弹跳能力，冲击摸高PR' : '主动恢复，消除累积疲劳'}`);
  notes.push(`⚖️ 负重基准：深蹲1RM=${assessment.squatMax}kg · 硬拉1RM=${assessment.deadliftMax}kg · 今天负重系数=${intensityPercent}%`);
  if (signal === 'red') notes.push('⚠️ 红灯：身体状态需要恢复。今天禁止高强度训练和高冲击跳跃。');
  if (signal === 'yellow') notes.push('⚠️ 黄灯：降低训练强度。如果训练中感觉不适，随时降级为恢复日。');
  if (playedYesterday) notes.push('🏐 昨天有排球活动——下肢冲击负荷已自动降低20%。');

  // Perceived exertion target
  if (signal === 'green') notes.push(`💪 RPE目标：${phase === 'deload' ? '3-5（轻松）' : phase === 'explosive_peak' ? '7-9（高强度）' : '6-8（中高）'}`);
  if (signal === 'yellow') notes.push('💪 RPE目标：5-6（中等，留有余力）');
  if (signal === 'red') notes.push('💪 RPE目标：2-3（极轻松，纯恢复）');

  // Diet note
  const isTrainingDay = signal !== 'red';
  notes.push('\n🥗 今日饮食建议：');
  notes.push(buildDietRecommendation(signal, assessment.weight, isTrainingDay));

  // Estimated duration
  const totalMin = 15 + 10 + (trainingMode === 'school' ? 45 : 60) + (signal === 'red' ? 10 : 20) + 10;
  notes.push(`\n⏱️ 预计总时长：约${signal === 'red' ? 30 : totalMin}分钟`);

  return {
    date: bodyMetrics.date, macroCycleId: 0,
    bodySignal: signal, intensityPercent,
    warmup, prehab, mainWorkout, volleyballSpecific, cooldown,
    notes: notes.join('\n'),
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
