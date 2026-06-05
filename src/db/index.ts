import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  InitialAssessment,
  UserProfile,
  BodyMetrics,
  RecoveryLog,
  MatchLog,
  PerformanceTest,
  MacroCycle,
  DailyPlan,
  TrainingSession,
  Exercise,
  DietRecord,
  FoodItem,
} from '../types';

export class VolleyballDB extends Dexie {
  initialAssessments!: Table<InitialAssessment, number>;
  userProfile!: Table<UserProfile, number>;
  bodyMetrics!: Table<BodyMetrics, number>;
  recoveryLogs!: Table<RecoveryLog, number>;
  matchLogs!: Table<MatchLog, number>;
  performanceTests!: Table<PerformanceTest, number>;
  macroCycles!: Table<MacroCycle, number>;
  dailyPlans!: Table<DailyPlan, number>;
  trainingSessions!: Table<TrainingSession, number>;
  exercises!: Table<Exercise, number>;
  dietRecords!: Table<DietRecord, number>;
  foodItems!: Table<FoodItem, number>;

  constructor() {
    super('VolleyballTrainingDB');
    this.version(1).stores({
      initialAssessments: '++id, date',
      userProfile: '++id',
      bodyMetrics: '++id, date',
      recoveryLogs: '++id, date',
      matchLogs: '++id, date',
      performanceTests: '++id, date, testType',
      macroCycles: '++id, startDate, endDate, phase',
      dailyPlans: '++id, date, macroCycleId',
      trainingSessions: '++id, date, dailyPlanId',
      exercises: '++id, category, volleyballRelevance',
      dietRecords: '++id, date, mealType',
      foodItems: '++id, category',
    });
  }
}

export const db = new VolleyballDB();
