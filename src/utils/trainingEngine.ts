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

// ─── WARM-UP (each exercise individually) ───
function buildWarmup(signal: BodySignal): ExerciseBlock[] {
  if (signal === 'red') {
    return [
      { name: '泡沫轴轻柔滚动', duration: '3min', notes: '仅用自身体重压力，不过度按压。股四头肌、腘绳肌、背部各1分钟。' },
      { name: '仰卧深呼吸', duration: '2min', notes: '仰卧，手放腹部。吸气4秒→屏息2秒→呼气6秒。激活副交感神经。' },
      { name: '猫牛式脊柱活动', sets: 1, reps: '10次（慢速）', notes: '四足跪姿，吸气弓背、呼气凹背。5秒一个循环。' },
    ];
  }
  return [
    // Phase 1: Soft tissue
    { name: '泡沫轴—股四头肌', duration: '每侧30秒', notes: '俯卧，泡沫轴置于大腿前侧。肘撑地缓慢前后滚动。找到痛点停10秒。' },
    { name: '泡沫轴—腘绳肌', duration: '每侧30秒', notes: '坐姿，腿伸直，泡沫轴置于大腿后侧。手臂支撑身体前后滚动。' },
    { name: '泡沫轴—阔筋膜张肌', duration: '每侧30秒', notes: '侧卧，泡沫轴置于大腿外侧髋关节下方。小范围滚动，这块肌肉通常很酸。' },
    { name: '泡沫轴—胸椎段', duration: '30秒', notes: '仰卧，泡沫轴横置于上背部。双手抱头，缓慢做胸椎伸展。改善扣球时的胸椎旋转。' },
    // Phase 2: Dynamic mobility
    { name: '腿摆动—前后方向', sets: 1, reps: '每侧12次', notes: '手扶墙，腿放松前后摆动。逐渐增大摆动幅度。放松髋关节囊。' },
    { name: '腿摆动—左右方向', sets: 1, reps: '每侧12次', notes: '手扶墙，腿在身体前方左右摆动（内收外展）。激活髋内收肌群。' },
    { name: '髋关节环绕', sets: 1, reps: '每侧10圈/方向', notes: '手扶墙，膝盖抬高向外画大圈。正向10圈+反向10圈。提升髋臼活动空间。' },
    { name: '手臂大绕环', sets: 1, reps: '前后各12次', notes: '双臂同时向前大绕环12次→向后12次。逐渐加速。肩关节全范围活动。' },
    { name: '侧弓步交替', sets: 1, reps: '每侧8次', notes: '宽站姿，重心移到一侧做侧弓步，另一腿伸直。拉伸内收肌群。排球侧向移动准备。' },
    { name: '最伟大拉伸（World\'s Greatest Stretch）', sets: 1, reps: '每侧5次', notes: '弓步位→同侧手肘触地→转体向上伸手→回到弓步。每次保持3秒。综合动态拉伸。' },
    // Phase 3: Neural activation
    { name: '快速高抬腿', sets: 2, reps: '10秒', rest: '20s', notes: '原地最快速度高抬腿。前脚掌着地，保持躯干稳定。激活快肌纤维。' },
    { name: 'A-Skip 行进', sets: 2, reps: '15m', rest: '走回', notes: '抬膝至髋高+前脚掌扒地。模拟起跳最后一步的膝驱动。排球专项激活。' },
    { name: '臀桥激活', sets: 2, reps: '12次', rest: '15s', notes: '仰卧屈膝，臀部发力上抬至肩髋膝一线。顶端夹臀1秒。激活起跳主力肌群。' },
    { name: '弹力带侧向行走', sets: 2, reps: '每方向10步', rest: '15s', notes: '弹力带套脚踝上方，微蹲姿势侧向行走。激活臀中肌，稳定膝关节。' },
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
  baseLoadPct: number, dateStr: string,
): ExerciseBlock[] {
  const weekMultiplier = weekNumber <= 1 ? 0.85 : weekNumber <= 2 ? 0.93 : weekNumber <= 3 ? 0.97 : 1.0;
  const loadPct = (baseLoadPct / 100) * weekMultiplier * intensityMult;
  const mainSets = trainingMode === 'school' ? 3 : 4;
  const numExercises = trainingMode === 'school' ? 4 : 6;
  const sWeight = formatWeight(squat1RM * loadPct);
  const dWeight = formatWeight(dl1RM * loadPct);
  const bWeight = formatWeight(bench1RM * loadPct);
  const pctLabel = Math.round(loadPct * 100);
  const today = dateStr;

  // Pick variants based on date for variety
  const squatVar = pickFromPool(SQUAT_VARIANTS, today + 'sq', 1)[0];
  const hingeVar = pickFromPool(HINGE_VARIANTS, today + 'hg', 1)[0];
  const powerVar = pickFromPool(POWER_VARIANTS, today + 'pw', 1)[0];
  const coreVar = pickFromPool(CORE_VARIANTS, today + 'cr', 1)[0];
  const upperVar = pickFromPool(UPPER_VARIANTS, today + 'up', 1)[0];

  const filledSquat = { ...squatVar, sets: mainSets, load: `${sWeight}kg (${pctLabel}% 1RM)` };
  const filledHinge = { ...hingeVar, sets: mainSets, load: `${dWeight}kg` };
  const filledPower = { ...powerVar, sets: 3, load: '60-75% 高翻1RM' };
  const filledUpper = { ...upperVar, sets: 3, load: `${bWeight}kg (${pctLabel}%)` };

  switch (phase) {
    case 'strength_base': {
      const ex: ExerciseBlock[] = [
        { ...filledSquat, notes: `${filledSquat.notes} 本周目标：第${weekNumber}周${weekNumber >= 3 ? '接近力竭' : '保留2次余量'}。` },
        { ...filledHinge, notes: filledHinge.notes },
        { name: '保加利亚分腿蹲', sets: 3, reps: '每侧8次', load: '哑铃各10-15kg起', rest: '60s/侧', notes: '后脚抬高40cm，前腿下蹲至大腿平行。模拟单腿起跳力学。' },
        { ...filledPower, notes: filledPower.notes },
        ...(trainingMode === 'holiday' ? [
          { name: '北欧弯举', sets: 3, reps: '5-6次', rest: '90s', notes: '跪姿缓慢前倾，渐进超负荷。' },
          { ...filledUpper, notes: `上肢推力维持。${filledUpper.notes}` },
        ] : []),
        { ...coreVar, sets: 3 },
      ];
      return ex.slice(0, numExercises + 1);
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

// ─── COOLDOWN (each stretch individually) ───
function buildCooldown(signal: BodySignal): ExerciseBlock[] {
  const holdTime = signal === 'red' ? '每侧60秒' : '每侧30-45秒';

  return [
    // Static stretches - each as individual exercise
    { name: '股四头肌拉伸', duration: holdTime, notes: '侧卧，下方腿屈膝，上方手抓同侧脚踝向后拉向臀部。保持骨盆中立不前倾。感受大腿前侧拉伸。扣球落地的主要离心肌群。' },
    { name: '腘绳肌拉伸（仰卧弹力带）', duration: holdTime, notes: '仰卧，弹力带套脚底，腿伸直上举。保持膝盖锁直，缓慢拉向身体。感受大腿后侧拉伸。若没有弹力带可用毛巾替代。' },
    { name: '臀大肌拉伸（4字拉伸/鸽子式）', duration: holdTime, notes: '仰卧，右脚踝搭左膝上方（4字形），双手抱左大腿后侧拉向胸部。感受右侧臀部深层拉伸。左右交换。排球运动员臀大肌通常紧张。' },
    { name: '髋屈肌拉伸', duration: holdTime, notes: '半跪姿，右膝跪地（垫毛巾），左腿前弓步。收紧右侧臀肌向前推髋，感受右侧大腿根部前方拉伸。扣球起跳髋伸的关键肌群。' },
    { name: '内收肌拉伸（蝴蝶式）', duration: holdTime, notes: '坐姿，脚底相对，膝盖向外打开。手抓脚踝，肘压膝盖内侧。保持背部挺直。侧向移动和内收肌群灵活度维持。' },
    { name: '胸肌拉伸', duration: holdTime, notes: '站姿，手臂外展90°，前臂贴门框/墙壁。身体向前旋转，感受胸肌和前肩拉伸。扣球和卧推后必做。' },
    { name: '背阔肌拉伸', duration: holdTime, notes: '手扶固定物（杠铃架/门框），屈髋向后坐，手臂伸直。感受背阔肌和躯干侧面拉伸。排球扣球的主要发力链。' },
    { name: '小腿拉伸（推墙）', duration: holdTime, notes: '弓箭步面墙，后腿伸直脚跟贴地，前腿屈膝。感受小腿后侧（腓肠肌）拉伸。然后后腿微屈膝，拉伸更深层的比目鱼肌。跳跃落地缓冲关键肌群。' },
    { name: '颈部放松', duration: '每侧30秒', notes: '坐姿，右手轻拉头部向右侧屈，左肩下沉。感受左侧斜方肌拉伸。左右交换。放松扣球和传球紧张的肩颈。' },

    // Foam rolling
    { name: '泡沫轴—股四头肌深度放松', duration: '每侧60-90秒', notes: '俯卧，缓慢滚动。重点：髌骨上方10cm处（股四头肌肌腱），跳跃膝高发区域。痛点停留20-30秒待放松。' },
    { name: '泡沫轴—腘绳肌深度放松', duration: '每侧45-60秒', notes: '坐姿滚动大腿后侧。找到肌肉结节处小范围滚动。' },
    { name: '泡沫轴—阔筋膜张肌/髂胫束', duration: '每侧60秒', notes: '侧卧，泡沫轴从髋外侧滚至膝外侧。排球运动员这块通常很紧。如果太痛可减小压力。' },
    { name: '泡沫轴—臀大肌/梨状肌', duration: '每侧60秒', notes: '坐泡沫轴上，右脚踝搭左膝，身体向右侧倾斜。感受臀部深层酸胀。梨状肌紧张可能导致坐骨神经不适。' },
    { name: '泡沫轴—胸椎段和背阔肌', duration: '60秒', notes: '仰卧泡沫轴横置上背部，抱头做胸椎伸展。然后侧身滚动背阔肌区域。' },

    // Breathing
    { name: '腹式深呼吸收尾', duration: '2min', notes: '仰卧闭眼，手放腹部。吸气4秒→呼气6秒。10个呼吸循环。让心率回落至静息水平，神经系统进入恢复模式。' },
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

// Date-based rotation for exercise variety
function pickFromPool<T>(pool: T[], dateStr: string, count: number): T[] {
  const seed = dateStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const result: T[] = [];
  const available = [...pool];
  let idx = seed % available.length;
  for (let i = 0; i < count && available.length > 0; i++) {
    result.push(available.splice(idx % available.length, 1)[0]);
    idx = (idx * 31 + 17) % Math.max(1, available.length);
  }
  return result;
}

// Exercise pools - multiple options per phase for variety
const SQUAT_VARIANTS: ExerciseBlock[] = [
  { name: '杠铃后深蹲', sets: 0, reps: '8次', load: '', rest: '120s', notes: '核心收紧，大腿与地面平行，向心阶段快速发力。' },
  { name: '前蹲', sets: 0, reps: '6次', load: '', rest: '120s', notes: '杠铃架于前肩，躯干更直立。对胸椎活动度要求高，排球扣球力学更直接。' },
  { name: '箱式深蹲', sets: 0, reps: '8次', load: '', rest: '120s', notes: '坐箱后起立。消除牵张反射，强化从静止位发力能力——模拟起跳起始位。' },
  { name: '暂停深蹲', sets: 0, reps: '6次', load: '', rest: '120s', notes: '底部暂停2秒再起立。消除惯性，强化底部发力。对起跳预蹲有直接迁移。' },
];

const HINGE_VARIANTS: ExerciseBlock[] = [
  { name: '罗马尼亚硬拉', sets: 0, reps: '10次', load: '', rest: '90s', notes: '保持背部平直，臀部后推。杠铃沿小腿下滑。' },
  { name: '六角杠硬拉', sets: 0, reps: '8次', load: '', rest: '90s', notes: '更直立，对下背压力更小。力量传递效率更高，适合排球运动员。' },
  { name: '单腿罗马尼亚硬拉', sets: 0, reps: '每侧8次', load: '', rest: '60s', notes: '强化单侧后链+平衡能力。排球单腿起跳的核心辅助。' },
  { name: '宽握硬拉', sets: 0, reps: '6次', load: '', rest: '120s', notes: '更大活动范围，强化上背和握力。' },
];

const POWER_VARIANTS: ExerciseBlock[] = [
  { name: '悬垂高翻', sets: 0, reps: '5次', load: '', rest: '120s', notes: '从悬垂位三关节爆发伸展。' },
  { name: '悬垂抓举', sets: 0, reps: '5次', load: '', rest: '120s', notes: '更宽握距，更大活动范围。需要良好肩关节活动度。' },
  { name: '哑铃单臂抓举', sets: 0, reps: '每侧5次', load: '', rest: '60s', notes: '单侧爆发力+肩稳定。扣球单侧发力迁移。' },
  { name: '壶铃摆荡', sets: 0, reps: '15次', load: '', rest: '60s', notes: '髋主导爆发力。腘绳肌和臀大肌爆发力训练。' },
];

const CORE_VARIANTS: ExerciseBlock[] = [
  { name: 'Pallof Press', sets: 3, reps: '每侧10次(5秒保持)', rest: '45s', notes: '抗旋转核心训练。扣球转体稳定基础。' },
  { name: '平板支撑+肩轻拍', sets: 3, reps: '每侧15次', rest: '30s', notes: '平板位交替拍对侧肩。抗旋转+肩稳定。' },
  { name: '悬垂举腿', sets: 3, reps: '10-12次', rest: '45s', notes: '悬挂位举腿至水平。腹直肌+髋屈肌。' },
  { name: '农夫行走', sets: 3, duration: '40m往返', rest: '60s', notes: '持重物行走，核心稳定。握力+核心。' },
];

const UPPER_VARIANTS: ExerciseBlock[] = [
  { name: '卧推', sets: 0, reps: '8次', load: '', rest: '90s', notes: '上肢推力维持。扣球力量链。' },
  { name: '哑铃上斜卧推', sets: 0, reps: '10次', load: '', rest: '60s', notes: '上胸+前三角。扣球手臂前上方发力角度。' },
  { name: '引体向上', sets: 0, reps: '8-10次', rest: '90s', notes: '背阔肌+握力。扣球拉臂的拮抗训练。' },
  { name: '双杠臂屈伸', sets: 0, reps: '10-12次', rest: '60s', notes: '胸+三头。扣球手臂伸展力量。' },
];

// ─── MAIN GENERATOR ───
export function generateDailyPlan(
  bodyMetrics: BodyMetrics, assessment: InitialAssessment | null,
  report: AssessmentReport | null, phase: MacroCyclePhase,
  weekNumber: number, trainingMode: 'school' | 'holiday',
): DailyPlan {
  // If no assessment at all, return a minimal plan instead of empty
  if (!assessment) {
    return {
      date: bodyMetrics.date, macroCycleId: 0, bodySignal: 'green',
      intensityPercent: 100,
      warmup: buildWarmup('green'),
      prehab: buildPrehab([]),
      mainWorkout: [{ name: '自重深蹲', sets: 3, reps: '15次', rest: '60s', notes: '无体测数据，使用默认自重训练' }, { name: '俯卧撑', sets: 3, reps: '12次', rest: '60s' }, { name: '平板支撑', sets: 3, duration: '45s', rest: '30s' }],
      volleyballSpecific: [{ name: '步法移动', duration: '10min', notes: '前后左右移动练习' }],
      cooldown: buildCooldown('green'),
      notes: '⚠️ 尚未完成初始体测，使用默认计划。建议尽快完成体测以获得个性化方案。',
      completed: false,
    };
  }

  // Use report if available, otherwise build a minimal one from assessment
  const effectiveReport = report || {
    verticalJumpHeight: assessment.maxApproachReach - assessment.standingReach,
    relativeSquatStrength: assessment.squatMax / assessment.weight,
    jumpRating: 'yellow' as const,
    strengthBalance: { squat: assessment.squatMax, deadlift: assessment.deadliftMax, bench: assessment.benchMax },
    posteriorChainRatio: assessment.deadliftMax / assessment.squatMax,
    riskAreas: assessment.injuryHistory || [],
    recommendations: [],
    suggestedStartPhase: 'strength_base' as const,
    suggestedTrainingLoad: 70,
    suggestedJumpVolume: 'medium' as const,
  };

  const signal = computeBodySignal(bodyMetrics);
  const playedYesterday = bodyMetrics.playedVolleyball;
  const intensityMult = getIntensityMultiplier(signal, playedYesterday);
  const intensityPercent = Math.round(intensityMult * 100);

  const riskAreas = effectiveReport.riskAreas || [];
  const warmup = buildWarmup(signal);
  const prehab = buildPrehab(riskAreas);
  const mainWorkout = buildMainWorkout(phase, weekNumber, intensityMult, trainingMode, assessment.squatMax, assessment.deadliftMax, assessment.benchMax, effectiveReport.suggestedTrainingLoad, bodyMetrics.date);
  const volleyballSpecific = buildVolleyballSpecific(phase, signal, trainingMode, assessment.experience);
  const cooldown = buildCooldown(signal);

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
