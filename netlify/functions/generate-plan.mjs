const SYSTEM_PROMPT = `你是顶级排球体能教练。请根据运动员数据生成今日个性化训练计划。

核心原则：1.预防受伤第一 2.提升摸高 3.排球专项水平。
每次训练5模块：热身→伤病预防→主体→排球专项→放松

返回纯JSON（不要markdown）：
{"bodySignal":"green|yellow|red","intensityPercent":100,"analysis":"50字分析","warmup":[{"name":"","duration":"","notes":""}],"prehab":[{"name":"","sets":2,"reps":"","rest":"","notes":""}],"mainWorkout":[{"name":"","sets":3,"reps":"","load":"","rest":"","notes":""}],"volleyballSpecific":[{"name":"","duration":"","notes":""}],"cooldown":[{"name":"","duration":"","notes":""}],"notes":"建议","recoveryRecommendation":"恢复建议"}

规则：红灯→恢复日不可高强度。黄灯→70%强度。负重必须基于1RM标注。prehab必须个性化。学期模式3-4动作，假期模式5-6动作。`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (req.method !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { apiKey, apiEndpoint, modelName, ...context } = JSON.parse(req.body);
  if (!apiKey) return { statusCode: 400, body: JSON.stringify({ error: '请先配置 API Key' }) };

  const endpoint = apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  const model = modelName || 'deepseek-chat';

  const { assessment, report, bodyMetrics, macroCycle, trainingMode } = context;

  let signal = 'green';
  if (bodyMetrics && (bodyMetrics.fatigueLevel >= 8 || bodyMetrics.sleepHours < 5)) signal = 'red';
  else if (bodyMetrics && (bodyMetrics.fatigueLevel >= 5 || bodyMetrics.sleepHours < 6)) signal = 'yellow';

  const phaseNames = { strength_base: '基础力量期（下肢+后链，低跳）', power_conversion: '力量转化期（力量转爆发力，中跳）', explosive_peak: '爆发力峰值期（最大化弹跳，高跳）', deload: '减载恢复期（主动恢复，不跳）' };

  const parts = [];
  if (assessment) parts.push(`【体测】${assessment.age}岁 ${assessment.gender} 身高${assessment.height}cm 体重${assessment.weight}kg 站立摸高${assessment.standingReach}cm 助跑摸高${assessment.maxApproachReach}cm 深蹲1RM:${assessment.squatMax}kg 硬拉1RM:${assessment.deadliftMax}kg 卧推1RM:${assessment.benchMax}kg 伤病:${assessment.injuryHistory?.join('、')||'无'} 活动度:过顶深蹲${assessment.overheadSquatScore}/3肩${assessment.shoulderMobilityScore}/3踝${assessment.ankleMobilityScore}/3髋${assessment.thomasTestScore}/3`);
  if (bodyMetrics) parts.push(`【今日】${bodyMetrics.date} 体重${bodyMetrics.weight}kg 睡眠${bodyMetrics.sleepHours}h(质${bodyMetrics.sleepQuality}/5) 疲劳${bodyMetrics.fatigueLevel}/10 酸痛:${bodyMetrics.soreAreas?.join('、')||'无'} ${bodyMetrics.playedVolleyball?'昨日有排球→降低下肢冲击':''}`);
  parts.push(`【信号】${signal==='green'?'🟢绿灯100%':signal==='yellow'?'🟡黄灯70%':'🔴红灯→恢复日'}`);
  parts.push(`【周期】${macroCycle?phaseNames[macroCycle.phase]:'未设定'} 第${macroCycle?.weekNumber||1}周 ${trainingMode==='school'?'学期(2-3次)':'假期(4-5次)'}`);

  const userPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${parts.join('\n\n')}`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: userPrompt }], temperature: 0.7, max_tokens: 3000 }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: `AI服务错误(${resp.status})`, detail: err.slice(0, 200) }) };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { statusCode: 502, body: JSON.stringify({ error: 'AI未返回内容' }) };

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const plan = JSON.parse(cleaned);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: `请求失败: ${err.message}` }) };
  }
}
