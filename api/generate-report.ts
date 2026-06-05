import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_PROMPT = `你是一位顶级排球运动表现分析专家，擅长：
- 排球运动员体能评估与测试解读
- 运动生物力学分析（起跳力学、力量传递链）
- 伤病风险评估与预防策略
- 个性化训练方案设计

请根据运动员的初始体测数据，生成详细的评估报告。`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, apiEndpoint, modelName, ...assessment } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: '请先在设置中配置 API Key' });
  }

  const endpoint = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  const model = modelName || 'gpt-4o-mini';

  const verticalJump = assessment.maxApproachReach - assessment.standingReach;
  const relSquat = assessment.squatMax / assessment.weight;
  const pChainRatio = assessment.deadliftMax / assessment.squatMax;

  const userPrompt = `请分析以下排球运动员的体测数据并生成评估报告：

【基础数据】
- 年龄：${assessment.age}，性别：${assessment.gender === 'male' ? '男' : '女'}
- 身高：${assessment.height}cm，体重：${assessment.weight}kg
- 站立摸高：${assessment.standingReach}cm
- 体脂率：${assessment.bodyFat ? assessment.bodyFat + '%' : '未测'}

【力量三大项】
- 深蹲 1RM：${assessment.squatMax}kg（相对力量：${relSquat.toFixed(1)}倍体重）
- 硬拉 1RM：${assessment.deadliftMax}kg（后链/前链比：${pChainRatio.toFixed(2)}）
- 卧推 1RM：${assessment.benchMax}kg
- 深蹲数据来源：${assessment.squatInputType}（输入值：${assessment.squatInputValue}kg）
- 硬拉数据来源：${assessment.deadliftInputType}（输入值：${assessment.deadliftInputValue}kg）

【排球专项】
- 助跑最大摸高：${assessment.maxApproachReach}cm
- 弹跳高度：${verticalJump}cm（摸高 - 站立摸高）
- 原地纵跳：${assessment.standingVerticalJump}cm
- 训练经验：${assessment.experience === 'beginner' ? '初级(<1年)' : assessment.experience === 'intermediate' ? '中级(1-3年)' : '进阶(3年+)'}

【伤病历史】
- 过往伤病：${assessment.injuryHistory?.join('、') || '无'}
- 当前困扰：${assessment.currentIssues || '无'}
- 康复状态：${assessment.rehabStatus === 'fully_recovered' ? '完全恢复' : assessment.rehabStatus === 'recovering' ? '恢复中' : '慢性问题'}

【活动度筛查】（1=受限 2=达标 3=良好）
- 过顶深蹲：${assessment.overheadSquatScore}/3
- 肩关节活动度：${assessment.shoulderMobilityScore}/3
- 踝关节背屈：${assessment.ankleMobilityScore}/3
- 托马斯测试（髋屈肌）：${assessment.thomasTestScore}/3

请以JSON格式返回评估报告（只返回JSON，不要其他文字）：
{
  "verticalJumpHeight": ${verticalJump},
  "relativeSquatStrength": ${relSquat.toFixed(1)},
  "jumpRating": "green|yellow|red",
  "strengthBalance": {"squat": ${assessment.squatMax}, "deadlift": ${assessment.deadliftMax}, "bench": ${assessment.benchMax}},
  "posteriorChainRatio": ${pChainRatio.toFixed(2)},
  "riskAreas": ["风险部位1", "风险部位2"],
  "recommendations": ["具体建议1", "具体建议2", ...],
  "suggestedStartPhase": "strength_base|power_conversion|explosive_peak",
  "suggestedTrainingLoad": 75,
  "suggestedJumpVolume": "low|medium|high",
  "detailedAnalysis": "200字以内的综合分析"
}

评估标准参考：
- 弹跳潜力：相对深蹲≥2.0x体重=优秀，≥1.5x=良好，<1.5x=待提升
- 后链/前链比：0.8-1.1为理想，<0.7需加强后链，>1.2需加强深蹲
- 活动度≤2分的项目即为风险因素`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI 服务返回错误 (${response.status})`, detail: errText.slice(0, 200) });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: 'AI 未返回有效内容' });
    }

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const reportJson = JSON.parse(cleaned);
      return res.status(200).json(reportJson);
    } catch {
      return res.status(502).json({ error: 'AI 返回格式不正确', rawContent: content.slice(0, 500) });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `请求失败: ${err.message}` });
  }
}
