import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore.js";

// Public Pages
import PublicLayout from "./components/public/PublicLayout.jsx";
import HomePage from "./pages/public/HomePage.jsx";
import AboutPage from "./pages/public/AboutPage.jsx";
import ContactPage from "./pages/public/ContactPage.jsx";
import PublicDoctorsPage from "./pages/public/PublicDoctorsPage.jsx";
import ApplyDoctorPage from "./pages/public/ApplyDoctorPage.jsx";
import RegisterDoctorPage from "./pages/public/RegisterDoctorPage.jsx";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";

// Protected Pages
import MainLayout from "./components/layout/MainLayout.jsx";
import PatientDashboard from "./pages/patient/PatientDashboard.jsx";
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AppointmentsPage from "./pages/AppointmentsPage.jsx";
import PrescriptionsPage from "./pages/PrescriptionsPage.jsx";
import MedicalRecordsPage from "./pages/MedicalRecordsPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ApplicationsPage from "./pages/ApplicationsPage.jsx";

const RoleDashboard = () => {
  const { user } = useAuthStore();
  if (user?.role === "doctor") return <DoctorDashboard />;
  if (user?.role === "admin") return <AdminDashboard />;
  return <PatientDashboard />;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="loading-screen"><div className="spinner" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
          success: { iconTheme: { primary: "#059669", secondary: "#fff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
      <Routes>
        {/* Public pages with Navbar + Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/our-doctors" element={<PublicDoctorsPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Public standalone pages (no nav/footer) */}
        <Route path="/apply-doctor" element={<ApplyDoctorPage />} />
        <Route path="/register-doctor" element={<RegisterDoctorPage />} />

        {/* Auth pages */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected — sidebar layout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<RoleDashboard />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/records" element={<MedicalRecordsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
