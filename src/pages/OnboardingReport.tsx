import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

const phaseNames: Record<string, string> = {
  strength_base: '基础力量期',
  power_conversion: '力量转化期',
  explosive_peak: '爆发力峰值期',
  deload: '减载恢复期',
};

export default function OnboardingReport() {
  const navigate = useNavigate();
  const { initialAssessment, assessmentReport } = useAppStore();

  const a = initialAssessment;
  const r = assessmentReport;

  if (!a || !r) {
    navigate('/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-700 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">你的身体基线报告</h1>
          <p className="text-sm text-blue-200 mt-1">基于你的体测数据自动生成</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Jump */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">弹跳相关</h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">助跑摸高</p>
              <p className="text-2xl font-bold text-blue-700">{a.maxApproachReach} <span className="text-sm font-normal">cm</span></p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">弹跳高度</p>
              <p className="text-2xl font-bold text-blue-700">{r.verticalJumpHeight} <span className="text-sm font-normal">cm</span></p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">相对深蹲力量</span>
            <span className="text-sm font-bold">{r.relativeSquatStrength.toFixed(1)}x 体重</span>
          </div>
          <div className={`mt-2 text-center py-1.5 rounded-lg text-sm font-medium ${
            r.jumpRating === 'green' ? 'bg-green-100 text-green-800'
              : r.jumpRating === 'yellow' ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {r.jumpRating === 'green' ? '🟢 弹跳潜力优秀'
              : r.jumpRating === 'yellow' ? '🟡 弹跳潜力良好，有提升空间'
              : '🔴 弹跳潜力待提升，需重点加强下肢力量'}
          </div>
        </div>

        {/* Strength Balance */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">力量平衡</h2>
          <div className="flex gap-2">
            {[
              { label: '深蹲', value: r.strengthBalance.squat, color: 'bg-blue-500' },
              { label: '硬拉', value: r.strengthBalance.deadlift, color: 'bg-orange-500' },
              { label: '卧推', value: r.strengthBalance.bench, color: 'bg-slate-500' },
            ].map((item) => {
              const maxVal = Math.max(r.strengthBalance.squat, r.strengthBalance.deadlift, r.strengthBalance.bench);
              const height = (item.value / maxVal) * 100;
              return (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-700">{item.value}kg</span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-24 relative">
                    <div
                      className={`absolute bottom-0 w-full rounded-t-lg ${item.color}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">后链/前链比：{r.posteriorChainRatio.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {r.posteriorChainRatio < 0.7 ? '⚠ 后链力量相对不足，建议加强硬拉和腘绳肌训练'
                : r.posteriorChainRatio > 1.2 ? '⚠ 深蹲相对偏弱，建议增加深蹲训练量'
                : '✅ 力量比例良好'}
            </p>
          </div>
        </div>

        {/* Risk Areas */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">伤病风险预判</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {r.riskAreas.length === 0 ? (
              <span className="text-sm text-green-600">✅ 未发现明显风险因素</span>
            ) : (
              r.riskAreas.map((area) => (
                <span key={area} className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                  ⚠ {area}
                </span>
              ))
            )}
          </div>
          {r.recommendations.length > 0 && (
            <ul className="space-y-1">
              {r.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1">
                  <span className="text-blue-500">•</span> {rec}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Starting Point */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">训练起点建议</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">起始周期</p>
              <p className="font-bold text-blue-700">{phaseNames[r.suggestedStartPhase]}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">训练负荷起点</p>
              <p className="font-bold text-blue-700">{r.suggestedTrainingLoad}% 1RM</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">跳跃训练量</p>
              <p className="font-bold text-blue-700">
                {r.suggestedJumpVolume === 'low' ? '低' : r.suggestedJumpVolume === 'medium' ? '中' : '高'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">训练经验</p>
              <p className="font-bold text-blue-700">
                {a.experience === 'beginner' ? '初级' : a.experience === 'intermediate' ? '中级' : '进阶'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          进入训练管理
        </button>
      </div>
    </div>
  );
}
