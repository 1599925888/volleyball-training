import { create } from 'zustand';
import type {
  UserProfile,
  InitialAssessment,
  AssessmentReport,
  MacroCycle,
  MacroCyclePhase,
} from '../types';

interface AppState {
  // Onboarding
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;

  // User
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile) => void;

  // Initial assessment
  initialAssessment: InitialAssessment | null;
  setInitialAssessment: (a: InitialAssessment) => void;
  assessmentReport: AssessmentReport | null;
  setAssessmentReport: (r: AssessmentReport) => void;

  // Training mode
  trainingMode: 'school' | 'holiday';
  setTrainingMode: (m: 'school' | 'holiday') => void;

  // Current macro cycle
  currentMacroCycle: MacroCycle | null;
  setCurrentMacroCycle: (c: MacroCycle) => void;
  currentPhase: MacroCyclePhase | null;
  currentWeek: number;
}

export const useAppStore = create<AppState>((set) => ({
  onboardingCompleted: false,
  setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),

  userProfile: null,
  setUserProfile: (p) => set({ userProfile: p }),

  initialAssessment: null,
  setInitialAssessment: (a) => set({ initialAssessment: a }),
  assessmentReport: null,
  setAssessmentReport: (r) => set({ assessmentReport: r }),

  trainingMode: 'school',
  setTrainingMode: (m) => set({ trainingMode: m }),

  currentMacroCycle: null,
  setCurrentMacroCycle: (c) => set({ currentMacroCycle: c, currentPhase: c.phase, currentWeek: c.weekNumber }),
  currentPhase: null,
  currentWeek: 1,
}));
