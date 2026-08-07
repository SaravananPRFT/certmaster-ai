import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import CertificationsPage from "@/pages/CertificationsPage";
import PracticePage from "@/pages/PracticePage";
import MockExamPage from "@/pages/MockExamPage";
import AiAssistantPage from "@/pages/AiAssistantPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import StudyPlannerPage from "@/pages/StudyPlannerPage";
import DashboardLayout from "@/layouts/DashboardLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/certifications" element={<ProtectedRoute><DashboardLayout><CertificationsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><DashboardLayout><PracticePage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/mock-exam" element={<ProtectedRoute><DashboardLayout><MockExamPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><DashboardLayout><AiAssistantPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><AnalyticsPage /></DashboardLayout></ProtectedRoute>} />
          <Route path="/study-planner" element={<ProtectedRoute><DashboardLayout><StudyPlannerPage /></DashboardLayout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
