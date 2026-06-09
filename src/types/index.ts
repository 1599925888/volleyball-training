// ============ 初始体测 ============
export interface InitialAssessment {
  id?: number;
  date: string;
  // 身体基础
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  standingReach: number; // cm 站立单手摸高
  bodyFat?: number; // % 可选

  // 力量三大项 — 支持直接1RM或做组反推
  squatMax: number; // kg 1RM
  squatInputType: '1RM' | '3RM' | '5x5' | 'other'; // 数据来源
  squatInputValue: number; // 原始输入值
  deadliftMax: number;
  deadliftInputType: '1RM' | '3RM' | '5x5' | 'other';
  deadliftInputValue: number;
  benchMax: number;
  benchInputType: '1RM' | '3RM' | '5x5' | 'other';
  benchInputValue: number;

  // 排球专项
  maxApproachReach: number; // cm 助跑摸高
  standingVerticalJump: number; // cm 原地纵跳高度
  experience: 'beginner' | 'intermediate' | 'advanced';

  // 伤病历史
  injuryHistory: string[]; // knee/shoulder/ankle/back/hip/wrist/none
  currentIssues: string;
  rehabStatus: string; // fully_recovered / recovering / chronic

  // 活动度筛查
  overheadSquatScore: 1 | 2 | 3; // 1=差 2=一般 3=好
  shoulderMobilityScore: 1 | 2 | 3;
  ankleMobilityScore: 1 | 2 | 3;
  thomasTestScore: 1 | 2 | 3;
}

// ============ 评估报告 ============
export interface AssessmentReport {
  verticalJumpHeight: number; // 助跑摸高 - 站立摸高
  relativeSquatStrength: number; // 深蹲/体重
  jumpRating: 'green' | 'yellow' | 'red';
  strengthBalance: {
    squat: number;
    deadlift: number;
    bench: number;
  };
  posteriorChainRatio: number; // 硬拉/深蹲
  riskAreas: string[];
  recommendations: string[];
  suggestedStartPhase: 'strength_base' | 'power_conversion' | 'explosive_peak';
  suggestedTrainingLoad: number; // % 1RM
  suggestedJumpVolume: 'low' | 'medium' | 'high';
}

// ============ 用户档案 ============
export interface UserProfile {
  id?: number;
  trainingMode: 'school' | 'holiday'; // 学期/假期
  weightGoal: 'maintain' | 'bulk' | 'cut';
  targetReach?: number; // 摸高目标
  currentMacroCycleId?: number;
}

// ============ 身体指标 ============
export interface BodyMetrics {
  id?: number;
  date: string;
  weight: number;
  restingHeartRate?: number;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  fatigueLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  soreAreas: string[]; // quads/hamstrings/calves/shoulders/back/knees/ankles/none
  injuryNotes?: string;
  playedVolleyball: boolean; // 昨天是否打球
}

export type BodySignal = 'green' | 'yellow' | 'red';

// ============ 恢复追踪 ============
export interface RecoveryLog {
  id?: number;
  date: string;
  methods: string[]; // foam_rolling/stretching/massage/ice/heat/compression/none
  durationMinutes: number;
  subjectiveRecovery: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  hydration: 'good' | 'ok' | 'poor';
}

// ============ 比赛/打球日志 ============
export type MatchIntensity = 'casual' | 'moderate' | 'intense';
export type VolleyballPosition = 'outside_hitter' | 'middle_blocker' | 'setter' | 'opposite' | 'libero' | 'rotating';

export interface MatchLog {
  id?: number;
  date: string;
  durationMinutes: number;
  intensity: MatchIntensity;
  position: VolleyballPosition;
  bodyResponse: string;
  calculatedLoad: number; // duration × intensityCoefficient
}

// ============ 能力测试 ============
export type TestType = 'max_reach' | 'vertical_jump' | 'squat_3rm' | 'deadlift_3rm' | 'sprint_30m' | 't_agility';

export interface PerformanceTest {
  id?: number;
  date: string;
  testType: TestType;
  value: number;
  unit: string;
  notes?: string;
}

// ============ 中周期 ============
export type MacroCyclePhase = 'strength_base' | 'power_conversion' | 'explosive_peak' | 'deload';

export interface MacroCycle {
  id?: number;
  phase: MacroCyclePhase;
  weekNumber: number; // 1-4, 当前周期的第几周
  startDate: string;
  endDate: string;
  completed: boolean;
}

// ============ 训练计划 & 训练课 ============
export interface DailyPlan {
  id?: number;
  date: string;
  macroCycleId: number;
  bodySignal: BodySignal;
  intensityPercent: number; // 相对标准强度的百分比
  warmup: ExerciseBlock[];
  prehab: ExerciseBlock[];
  mainWorkout: ExerciseBlock[];
  volleyballSpecific: ExerciseBlock[];
  cooldown: ExerciseBlock[];
  notes: string;
  completed: boolean;
}

export interface ExerciseBlock {
  name: string;
  sets?: number;
  reps?: string;
  load?: string;
  rest?: string;
  duration?: string;
  notes?: string;
  targets?: string[]; // e.g. ['knee', 'shoulder']
}

export interface TrainingSession {
  id?: number;
  date: string;
  dailyPlanId: number;
  completed: boolean;
  actualRPE?: number;
  actualDuration?: number;
  notes?: string;
  deviations?: string; // 与计划的偏差
}

// ============ 动作库 ============
export type ExerciseCategory = 'warmup' | 'prehab' | 'strength' | 'power' | 'plyometric' | 'volleyball' | 'mobility' | 'recovery';
export type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'band' | 'box' | 'medball' | 'cable' | 'other';

export interface Exercise {
  id?: number;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment[];
  targetMuscles: string[];
  description: string;
  videoUrl?: string;
  volleyballRelevance: 'high' | 'medium' | 'low'; // 对排球的重要性
  injuryRisk?: string[]; // 对哪些伤病部位有风险，如 ['knee', 'shoulder']
  prehabBenefit?: string[]; // 对哪些部位有保护作用
}

// ============ 饮食 ============
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DietRecord {
  id?: number;
  date: string;
  mealType: MealType;
  foodName: string;
  amount: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodItem {
  id?: number;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  commonAmount: string; // e.g. "1碗(200g)"
}
