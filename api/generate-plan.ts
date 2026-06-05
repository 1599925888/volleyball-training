import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_PROMPT = `你是一位顶级的排球体能教练和运动科学专家，精通：
- 排球运动生物力学（助跑起跳、扣球、拦网、防守移动）
- 运动损伤预防（跳跃膝、扣球肩、踝关节扭伤、ACL损伤、下背痛）
- 周期化训练理论（线性周期、波动周期、共轭周期）
- 力量与爆发力训练（VBT速度依循训练、增强式训练、奥林匹克举重）
- 运动营养与恢复科学
- 运动表现测试与评估

你的训练哲学（按优先级排序）：
1. 预防受伤永远是第一优先级。宁可保守，不可冒进。
2. 提升垂直弹跳（最大摸高）是核心目标。
3. 提升排球专项水平（技术、步法、比赛能力）。

你必须为排球运动员生成个性化训练计划。计划必须：
- 根据当日身体状态动态调整强度
- 基于初始体测数据计算精准负重（%1RM）
- 根据伤病风险标记强化对应预复训练
- 区分学期模式（浓缩高效）和假期模式（内容更丰富）
- 考虑昨日是否有排球活动（自动降低下肢冲击负荷）
- 每次训练必须包含：热身→伤病预防→主体训练→排球专项→放松`;

function buildUserContextPrompt(body: any): string {
  // Extract all context from request body
  const { assessment, report, bodyMetrics, macroCycle, trainingMode, recentSessions, recentMatches, recentRecovery } = body;

  const assessmentInfo = assessment ? `
【运动员体测数据】
- 年龄：${assessment.age}岁，性别：${assessment.gender === 'male' ? '男' : '女'}
- 身高：${assessment.height}cm，体重：${assessment.weight}kg
- 站立摸高：${assessment.standingReach}cm
- 助跑最大摸高：${assessment.maxApproachReach}cm
- 原地纵跳：${assessment.standingVerticalJump}cm
- 深蹲1RM：${assessment.squatMax}kg（相对力量：${(assessment.squatMax / assessment.weight).toFixed(1)}倍体重）
- 硬拉1RM：${assessment.deadliftMax}kg（后链/前链比：${(assessment.deadliftMax / assessment.squatMax).toFixed(2)}）
- 卧推1RM：${assessment.benchMax}kg
- 训练经验：${assessment.experience === 'beginner' ? '初级' : assessment.experience === 'intermediate' ? '中级' : '进阶'}
- 伤病历史：${assessment.injuryHistory?.join('、') || '无'}
- 当前身体困扰：${assessment.currentIssues || '无'}
- 康复状态：${assessment.rehabStatus}
- 活动度筛查：过顶深蹲${assessment.overheadSquatScore}/3，肩关节${assessment.shoulderMobilityScore}/3，踝关节${assessment.ankleMobilityScore}/3，托马斯测试${assessment.thomasTestScore}/3` : '';

  const reportInfo = report ? `
【评估报告】
- 弹跳潜力：${report.jumpRating === 'green' ? '优秀' : report.jumpRating === 'yellow' ? '良好' : '待提升'}
- 相对深蹲力量：${report.relativeSquatStrength?.toFixed(1)}倍体重
- 高风险部位：${report.riskAreas?.join('、') || '无'}
- 训练建议：${report.recommendations?.join('；') || '无'}
- 建议起始周期：${report.suggestedStartPhase}
- 建议训练负荷起点：${report.suggestedTrainingLoad}% 1RM` : '';

  const todayInfo = bodyMetrics ? `
【今日身体状态】
- 日期：${bodyMetrics.date}
- 体重：${bodyMetrics.weight}kg
- 晨起心率：${bodyMetrics.restingHeartRate || '未记录'}bpm
- 睡眠：${bodyMetrics.sleepHours}小时，质量${bodyMetrics.sleepQuality}/5
- 主观疲劳度：${bodyMetrics.fatigueLevel}/10（${bodyMetrics.fatigueLevel <= 4 ? '恢复良好' : bodyMetrics.fatigueLevel <= 7 ? '中度疲劳' : '明显疲劳'}）
- 酸痛部位：${bodyMetrics.soreAreas?.join('、') || '无'}
- ${bodyMetrics.playedVolleyball ? '⚠️ 昨日有排球活动，今天需要降低下肢冲击负荷' : '昨日无排球活动'}
${bodyMetrics.injuryNotes ? `- 伤病备注：${bodyMetrics.injuryNotes}` : ''}` : '';

  // Determine signal
  let signal = 'green';
  if (bodyMetrics) {
    if (bodyMetrics.fatigueLevel >= 8 || bodyMetrics.sleepHours < 5 || (bodyMetrics.soreAreas?.filter((s: string) => s !== 'none').length >= 3)) {
      signal = 'red';
    } else if (bodyMetrics.fatigueLevel >= 5 || bodyMetrics.sleepHours < 6 || (bodyMetrics.soreAreas?.filter((s: string) => s !== 'none').length >= 1)) {
      signal = 'yellow';
    }
  }

  const signalInfo = `
【身体信号灯】${signal === 'green' ? '🟢 绿灯 — 按计划全力执行，强度100%' : signal === 'yellow' ? '🟡 黄灯 — 强度降至70%，增加恢复比例' : '🔴 红灯 — 切换为主动恢复日，禁止高强度训练'}`;

  const cycleInfo = macroCycle ? `
【当前训练周期】
- 周期类型：${phaseNameMap[macroCycle.phase] || macroCycle.phase}
- 第${macroCycle.weekNumber}周
- 训练模式：${trainingMode === 'school' ? '🏫 学期模式（2-3次/周，单次更浓缩高效）' : '🌞 假期模式（4-5次/周，内容更丰富）'}` : '';

  const historyInfo = [];
  if (recentSessions?.length) {
    historyInfo.push(`【近期训练】最近${recentSessions.length}次：${recentSessions.map((s: any) => `${s.date} ${s.completed ? '✅完成' : '❌未完成'}${s.actualRPE ? ` RPE:${s.actualRPE}` : ''}`).join('、')}`);
  }
  if (recentMatches?.length) {
    historyInfo.push(`【近期打球】最近${recentMatches.length}次：${recentMatches.map((m: any) => `${m.date} ${m.durationMinutes}min ${m.intensity} 位置:${m.position}`).join('、')}`);
  }

  return `${assessmentInfo}${reportInfo}${todayInfo}${signalInfo}${cycleInfo}${historyInfo.length ? '\n' + historyInfo.join('\n') : ''}`;
}

const phaseNameMap: Record<string, string> = {
  strength_base: '基础力量期（侧重下肢+后链力量基础，关节稳定性，跳跃量低）',
  power_conversion: '力量转化期（将力量转化为爆发力，加入更多跳跃和爆发力训练）',
  explosive_peak: '爆发力峰值期（最大化垂直弹跳能力，高跳跃量，密切监控膝盖）',
  deload: '减载恢复期（主动恢复，灵活性训练，低冲击有氧，不跳跃不打球）',
};

const RESPONSE_SCHEMA = `
请以JSON格式返回训练计划（只返回JSON，不要其他文字）：
{
  "bodySignal": "green|yellow|red",
  "intensityPercent": 100,
  "analysis": "针对当前状态的简短分析（50字以内）",
  "warmup": [{"name": "动作名", "duration": "时长", "notes": "要点"}],
  "prehab": [{"name": "动作名", "sets": 2, "reps": "次数或时长", "rest": "休息时间", "notes": "要点"}],
  "mainWorkout": [{"name": "动作名", "sets": 3, "reps": "次数", "load": "负重（如80kg或70%1RM或自重）", "rest": "休息时间", "notes": "要点"}],
  "volleyballSpecific": [{"name": "训练内容", "duration": "时长", "notes": "要点"}],
  "cooldown": [{"name": "动作名", "duration": "时长", "notes": "要点"}],
  "notes": "综合建议和注意事项",
  "recoveryRecommendation": "训练后的恢复建议"
}

重要规则：
1. 如果是红灯（🔴），主体训练和排球专项必须为空或极轻度，整个训练以恢复和灵活性为主
2. 如果是黄灯（🟡），降低负重至正常的70%，减少组数
3. 伤病预防模块（prehab）必须根据运动员的风险部位个性化调整
4. 主体训练的负重必须基于1RM计算，标注为"Xkg（Y% 1RM）"
5. 学期模式下主体训练动作3-4个；假期模式下5-6个
6. 回复必须是纯JSON，不能包含markdown代码块标记`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiEndpoint, modelName, ...context } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: '请先在设置中配置 API Key' });
  }

  const endpoint = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  const model = modelName || 'gpt-4o-mini';

  const userContext = buildUserContextPrompt(context);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请根据以下运动员数据生成今日训练计划：\n\n${userContext}\n\n${RESPONSE_SCHEMA}` },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return res.status(502).json({ error: `AI 服务返回错误 (${response.status})，请检查 API Key 和 Endpoint 配置`, detail: errText.slice(0, 200) });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: 'AI 未返回有效内容' });
    }

    // Try to parse JSON from response
    let planJson;
    try {
      // Clean potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      planJson = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'AI 返回的内容格式不正确', rawContent: content.slice(0, 500) });
    }

    return res.status(200).json(planJson);
  } catch (err: any) {
    console.error('API error:', err);
    return res.status(500).json({ error: `请求失败: ${err.message}` });
  }
}
