import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from './db';
import { useAppStore } from './stores/appStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import OnboardingReport from './pages/OnboardingReport';
import BodyMetricsPage from './pages/BodyMetricsPage';
import RecoveryPage from './pages/RecoveryPage';
import CalendarPage from './pages/CalendarPage';
import PerformancePage from './pages/PerformancePage';
import TrainingPage from './pages/TrainingPage';
import TrainingHistory from './pages/TrainingHistory';
import ExerciseLibrary from './pages/ExerciseLibrary';
import MatchLogPage from './pages/MatchLogPage';
import DietPage from './pages/DietPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { setOnboardingCompleted, setInitialAssessment, setUserProfile } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [hasAssessment, setHasAssessment] = useState(false);

  useEffect(() => {
    async function load() {
      const assessment = await db.initialAssessments.orderBy('date').last();
      if (assessment) {
        setHasAssessment(true);
        setInitialAssessment(assessment);
        setOnboardingCompleted(true);
      }
      const profile = await db.userProfile.orderBy('id').last();
      if (profile) {
        setUserProfile(profile);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/report" element={<OnboardingReport />} />
        <Route
          path="/"
          element={hasAssessment ? <Layout /> : <Navigate to="/onboarding" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="body" element={<BodyMetricsPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="training/history" element={<TrainingHistory />} />
          <Route path="training/exercises" element={<ExerciseLibrary />} />
          <Route path="match" element={<MatchLogPage />} />
          <Route path="diet" element={<DietPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
