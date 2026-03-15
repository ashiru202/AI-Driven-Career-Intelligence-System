import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SSEProvider } from "./context/SSEContext";
import WelcomePage from "./pages/WelcomePage";
import Ping from "./pages/Ping";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyRoadmap from "./pages/MyRoadmap";
import AllRoadmaps from "./pages/AllRoadmaps";
import Logout from "./pages/Logout";
import ProtectedRoute from "./auth/ProtectedRoute";
import StaffDashboard from "./pages/StaffDashboard";
import StaffHome from "./pages/StaffHome";
import RoleRoute from "./auth/RoleRoute";
import Health from "./pages/Health";

import ResumeAnalyze from "./pages/ResumeAnalyze";
import CompareJob from "./pages/CompareJob";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import Analytics from "./pages/Analytics";
import MyResumes from "./pages/MyResumes";
import StaffManagement from "./pages/StaffManagement";
import AdminReport from "./pages/AdminReport";
import AuditLog from "./pages/AuditLog";
import JobPostings from "./pages/JobPostings";
import SkillsInDemand from "./pages/SkillsInDemand";
import JobTracker from "./pages/JobTracker";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <SSEProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/ping" element={<Ping />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/health" element={<Health />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/my-roadmap"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <MyRoadmap />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume-analyze"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <ResumeAnalyze />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-resumes"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <MyResumes />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/compare-job"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <CompareJob />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <Analytics />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-postings"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <JobPostings />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/skills-in-demand"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <SkillsInDemand />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-tracker"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["USER"]}>
                <JobTracker />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* STAFF / ADMIN */}
        <Route
          path="/all-roadmaps"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["STAFF", "ADMIN"]}>
                <AllRoadmaps />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff-home"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["STAFF"]}>
                <StaffHome />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["STAFF", "ADMIN"]}>
                <StaffDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* ADMIN ONLY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <UserManagement />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Staff Management — ADMIN only */}
        <Route
          path="/staff-management"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <StaffManagement />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Platform Report — ADMIN only */}
        <Route
          path="/admin-report"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminReport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* User Reports — ADMIN only, dedicated route */}
        <Route
          path="/admin/user-reports"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <StaffDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Audit Log — ADMIN only */}
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AuditLog />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Legacy redirect */}
        <Route path="/user-report" element={<Navigate to="/staff" replace />} />

        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </SSEProvider>
  );
}
