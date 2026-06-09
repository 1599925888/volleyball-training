export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (req.method !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { apiKey, apiEndpoint, modelName, ...a } = JSON.parse(req.body);
  if (!apiKey) return { statusCode: 400, body: JSON.stringify({ error: '请先配置 API Key' }) };

  const endpoint = apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  const model = modelName || 'deepseek-chat';

  const vj = (a.maxApproachReach || 300) - (a.standingReach || 230);
  const rs = (a.squatMax || 100) / (a.weight || 75);
  const pc = (a.deadliftMax || 120) / (a.squatMax || 100);

  const prompt = `你是排球运动表现分析专家。分析体测数据生成报告（纯JSON）：

身高${a.height}cm 体重${a.weight}kg 站立摸高${a.standingReach}cm
深蹲1RM:${a.squatMax}kg(相对${rs.toFixed(1)}x) 硬拉1RM:${a.deadliftMax}kg(后链比${pc.toFixed(2)}) 卧推1RM:${a.benchMax}kg
助跑摸高:${a.maxApproachReach}cm 弹跳:${vj}cm 原地纵跳:${a.standingVerticalJump}cm
经验:${a.experience==='beginner'?'初级':a.experience==='intermediate'?'中级':'进阶'}
伤病:${a.injuryHistory?.join('、')||'无'} 困扰:${a.currentIssues||'无'}
活动度:过顶深蹲${a.overheadSquatScore}/3肩${a.shoulderMobilityScore}/3踝${a.ankleMobilityScore}/3髋${a.thomasTestScore}/3

返回JSON：{"verticalJumpHeight":${vj},"relativeSquatStrength":${rs.toFixed(1)},"jumpRating":"green|yellow|red","strengthBalance":{"squat":${a.squatMax},"deadlift":${a.deadliftMax},"bench":${a.benchMax}},"posteriorChainRatio":${pc.toFixed(2)},"riskAreas":["部位"],"recommendations":["建议"],"suggestedStartPhase":"strength_base|power_conversion|explosive_peak","suggestedTrainingLoad":75,"suggestedJumpVolume":"low|medium|high","detailedAnalysis":"200字分析"}`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 1500 }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: `AI服务错误(${resp.status})`, detail: err.slice(0, 200) }) };
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { statusCode: 502, body: JSON.stringify({ error: 'AI未返回内容' }) };

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const report = JSON.parse(cleaned);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: `请求失败: ${err.message}` }) };
  }
}
