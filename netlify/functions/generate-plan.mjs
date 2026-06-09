const SYSTEM_PROMPT = `你是一名拥有20年经验的顶级排球体能教练，同时拥有运动科学博士学位。你服务过多名国家队排球运动员。

你的训练哲学（严格按优先级）：
1. 预防受伤永远是第一优先。绝对不给受伤风险高的计划。
2. 最大化垂直弹跳（助跑摸高）是核心训练目标。
3. 提升排球专项竞技水平。

你必须根据运动员的完整数据生成一份极其详细的个性化训练计划。这份计划不是通用模板，而是针对这个运动员今天、这个周期、这个身体状态的专属方案。

═══════════════════════════════════════
输出格式要求（严格遵守，缺一不可）
═══════════════════════════════════════

返回纯JSON（不要markdown代码块，不要任何JSON之外的文字）：

{
  "bodySignal": "green|yellow|red",
  "intensityPercent": 数字(30-100),
  "analysis": "基于运动员数据的专业分析，100-150字。必须提及：今天身体状态如何影响训练安排、本周周期目标、最需要注意的风险点。",

  "warmup": [
    {
      "name": "具体动作名称",
      "sets": 2,
      "reps": "具体次数或时长",
      "duration": "Xmin",
      "rest": "X秒",
      "notes": "执行要点，为什么做这个动作，对排球的帮助"
    }
  ],

  "prehab": [
    {
      "name": "具体动作名称",
      "sets": 2到3,
      "reps": "具体次数",
      "duration": "如适用",
      "rest": "X秒",
      "notes": "针对运动员哪个伤病风险的预防要点"
    }
  ],

  "mainWorkout": [
    {
      "name": "具体动作名称（如：杠铃后深蹲，不是'深蹲'）",
      "sets": 3到5,
      "reps": "具体次数或范围（如：8次，不是'8-10'）",
      "load": "基于1RM计算的具体重量（如：85kg (75% 1RM)，不是'中等重量'）",
      "rest": "具体休息秒数",
      "tempo": "动作节奏（如：3-1-1-0）",
      "rpe": "RPE目标（如：RPE 7-8）",
      "notes": "详细执行要点：动作幅度、速度要求、常见错误、该动作对排球的具体价值"
    }
  ],

  "volleyballSpecific": [
    {
      "name": "具体训练内容",
      "sets": "如适用",
      "reps": "具体次数",
      "duration": "Xmin",
      "rest": "休息时间",
      "notes": "训练目标和技术要点"
    }
  ],

  "cooldown": [
    {
      "name": "具体拉伸/放松动作",
      "duration": "每侧X秒",
      "notes": "针对今天训练重点部位的放松说明"
    }
  ],

  "dietRecommendation": {
    "protein": "g数",
    "carbs": "g数",
    "water": "L数",
    "preWorkout": "训练前1.5-2h建议",
    "postWorkout": "训练后30min内建议",
    "generalTips": "今天特别需要注意的营养要点（根据身体状态）"
  },

  "recoveryRecommendation": "针对今天训练强度和身体状态的恢复方案（100字）：泡沫轴、拉伸、冰敷/热敷、睡眠建议等",

  "notes": "综合训练备注，包括RPE目标、预计总时长、安全提示"
}

═══════════════════════════════════════
训练计划必须遵守的规则
═══════════════════════════════════════

1. 如果是红灯🔴：主体训练必须为极轻度恢复内容，不能有负重和高冲击跳跃。重点放在活动度和放松。
2. 如果是黄灯🟡：负重降至正常70%，组数减少，RPE不超过6。
3. 所有负重必须基于运动员提供的1RM数据计算，标注为"Xkg (Y% 1RM)"。不能写"中等重量"或"大重量"。
4. 伤病预防模块(prehab)必须根据运动员的伤病历史和风险部位个性化定制，每个动作都要说明防什么伤。
5. 热身必须分阶段：软组织放松→动态拉伸→神经激活，每个动作有时长或次数。
6. 放松必须包含具体的静态拉伸动作列表+泡沫轴方案，每个动作有时长。
7. 饮食建议必须基于运动员体重计算蛋白质、碳水、水分的具体克数。
8. 学期模式下主体训练最多4个动作，假期模式5-6个动作。
9. 每个主体训练动作必须标注RPE目标和动作节奏(tempo)。
10. 动作名称必须完整具体，如"杠铃后深蹲"而非"深蹲"，"罗马尼亚硬拉"而非"硬拉"。

现在，请根据以下运动员数据生成训练计划：`;

// Build user context
function buildContext(body) {
  const { assessment, report, bodyMetrics, macroCycle, trainingMode } = body;

  const phaseNames = {
    strength_base: '基础力量期——建立下肢和后链力量基础，强化关节稳定性。跳跃量低，侧重力量技术和动作质量。',
    power_conversion: '力量转化期——将基础力量转化为爆发力。加入更多跳跃和奥林匹克举重训练。跳跃量中等。',
    explosive_peak: '爆发力峰值期——最大化垂直弹跳能力。最高跳跃量，冲击个人摸高纪录。密切监控膝盖反应。',
    deload: '减载恢复期——主动恢复，消除4周训练累积的疲劳。不跳跃、不打球、不做高强度训练。',
  };

  // Signal determination
  let signal = 'green';
  if (bodyMetrics) {
    if (bodyMetrics.fatigueLevel >= 8 || bodyMetrics.sleepHours < 5) signal = 'red';
    else if (bodyMetrics.fatigueLevel >= 5 || bodyMetrics.sleepHours < 6) signal = 'yellow';
  }

  const parts = [];

  // Assessment data
  if (assessment) {
    const relSquat = (assessment.squatMax / assessment.weight).toFixed(1);
    const pChain = (assessment.deadliftMax / assessment.squatMax).toFixed(2);
    parts.push(`【运动员体测档案】
年龄：${assessment.age}岁
性别：${assessment.gender === 'male' ? '男' : '女'}
身高：${assessment.height}cm
体重：${assessment.weight}kg
站立单手摸高：${assessment.standingReach}cm
助跑最大摸高：${assessment.maxApproachReach}cm（核心KPI）
原地纵跳：${assessment.standingVerticalJump}cm
弹跳高度：${assessment.maxApproachReach - assessment.standingReach}cm

力量三大项：
- 杠铃后深蹲 1RM：${assessment.squatMax}kg（相对力量：${relSquat}倍体重）
- 硬拉 1RM：${assessment.deadliftMax}kg（后链/前链比：${pChain}，理想0.8-1.1）
- 卧推 1RM：${assessment.benchMax}kg

训练经验：${assessment.experience === 'beginner' ? '初级（<1年）' : assessment.experience === 'intermediate' ? '中级（1-3年）' : '进阶（3年+）'}
过往伤病：${assessment.injuryHistory?.join('、') || '无伤病史'}
当前身体困扰：${assessment.currentIssues || '无'}
康复状态：${assessment.rehabStatus === 'fully_recovered' ? '完全恢复' : assessment.rehabStatus === 'recovering' ? '恢复中' : '慢性问题'}
活动度筛查：过顶深蹲${assessment.overheadSquatScore}/3 · 肩关节${assessment.shoulderMobilityScore}/3 · 踝关节${assessment.ankleMobilityScore}/3 · 托马斯测试${assessment.thomasTestScore}/3（1=受限 2=达标 3=良好）`);
  }

  // Report
  if (report) {
    parts.push(`【评估报告】
弹跳潜力评级：${report.jumpRating === 'green' ? '优秀' : report.jumpRating === 'yellow' ? '良好' : '待提升'}
高风险部位：${report.riskAreas?.join('、') || '无特殊风险'}
训练建议：${report.recommendations?.join('；') || '按标准计划执行'}
建议起始训练负荷：${report.suggestedTrainingLoad}% 1RM`);
  }

  // Today's body status
  if (bodyMetrics) {
    parts.push(`【今日身体状态】
日期：${bodyMetrics.date}
今日体重：${bodyMetrics.weight}kg
晨起静息心率：${bodyMetrics.restingHeartRate || '未测量'}bpm
昨晚睡眠：${bodyMetrics.sleepHours}小时（质量${bodyMetrics.sleepQuality}/5）
主观疲劳度：${bodyMetrics.fatigueLevel}/10
${bodyMetrics.fatigueLevel <= 4 ? '→ 恢复良好，可以全力训练' : bodyMetrics.fatigueLevel <= 7 ? '→ 中度疲劳，需要适当调整强度' : '→ 明显疲劳，建议以恢复为主'}
肌肉酸痛部位：${bodyMetrics.soreAreas?.filter(s => s !== 'none').join('、') || '无酸痛'}
${bodyMetrics.playedVolleyball ? '⚠️ 昨天有排球活动/比赛——今天必须降低下肢冲击负荷！' : '昨日无排球活动'}
${bodyMetrics.injuryNotes ? `伤病/不适备注：${bodyMetrics.injuryNotes}` : ''}`);
  }

  // Signal
  parts.push(`【今日训练信号灯】
${signal === 'green' ? '🟢 绿灯 → 全力执行训练计划，强度100%。RPE可达7-9。' : ''}
${signal === 'yellow' ? '🟡 黄灯 → 训练强度降至70%。RPE不超过6。减少组数和负重。增加恢复比例。' : ''}
${signal === 'red' ? '🔴 红灯 → 主动恢复日。禁止高强度训练和高冲击跳跃。全部以活动度和放松为主。' : ''}`);

  // Cycle info
  parts.push(`【当前训练周期】
周期阶段：${macroCycle ? phaseNames[macroCycle.phase] : '未设定'}
当前是第${macroCycle?.weekNumber || 1}周（共4周）
${macroCycle ? `本周在周期中的位置：第${macroCycle.weekNumber}周——${macroCycle.weekNumber <= 1 ? '适应周，负荷较低' : macroCycle.weekNumber <= 2 ? '负荷递增周' : macroCycle.weekNumber <= 3 ? '负荷高峰周' : '最大负荷周/测试周'}。` : ''}
训练模式：${trainingMode === 'school' ? '学期模式（每周2-3次训练，每次更加浓缩高效）' : '假期模式（每周4-5次训练，可以拆分更多内容）'}`);

  return parts.join('\n\n');
}

// ─── Handler ───
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (req.method !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { apiKey, apiEndpoint, modelName, ...context } = JSON.parse(req.body);
  if (!apiKey) return { statusCode: 400, body: JSON.stringify({ error: '请先配置 API Key（设置页→API自动模式→粘贴DeepSeek Key）' }) };

  const endpoint = apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  const model = modelName || 'deepseek-chat';

  const userPrompt = buildContext(context);

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请为以下运动员生成今日训练计划。必须极其详细，不能有任何笼统的描述。每个动作都要有具体重量、组数、次数、休息时间、执行要点。\n\n${userPrompt}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: `AI服务返回错误(${resp.status})`, detail: err.slice(0, 300) }) };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { statusCode: 502, body: JSON.stringify({ error: 'AI未返回有效内容，请重试' }) };

    // Parse JSON
    try {
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const plan = JSON.parse(cleaned);

      // Merge dietRecommendation into notes for display
      if (plan.dietRecommendation) {
        const d = plan.dietRecommendation;
        const dietLines = ['\n🥗 今日饮食方案：',
          `蛋白质：${d.protein}g/天 · 碳水：${d.carbs}g/天 · 饮水：${d.water}L`,
          `训练前：${d.preWorkout}`,
          `训练后：${d.postWorkout}`,
          `💡 ${d.generalTips}`,
        ];
        plan.notes = (plan.notes || '') + '\n' + dietLines.join('\n');
      }
      if (plan.recoveryRecommendation) {
        plan.notes = (plan.notes || '') + '\n\n🛌 恢复方案：' + plan.recoveryRecommendation;
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      };
    } catch (parseErr) {
      return { statusCode: 502, body: JSON.stringify({ error: `AI返回格式解析失败。请确保AI回复了完整的JSON。`, rawContent: content.slice(0, 800) }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: `请求失败: ${err.message}` }) };
  }
}
