import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Calendar, FileText, FolderOpen,
  MessageSquare, Users, User, LogOut, Stethoscope
} from "lucide-react";
import "./MainLayout.css";

const navItems = {
  patient: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/doctors", icon: Stethoscope, label: "Find Doctors" },
    { to: "/appointments", icon: Calendar, label: "Appointments" },
    { to: "/prescriptions", icon: FileText, label: "Prescriptions" },
    { to: "/records", icon: FolderOpen, label: "Medical Records" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
  ],
  doctor: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/appointments", icon: Calendar, label: "Appointments" },
    { to: "/prescriptions", icon: FileText, label: "Prescriptions" },
    { to: "/records", icon: FolderOpen, label: "Records" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
  ],
  admin: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/doctors", icon: Stethoscope, label: "Doctors" },
    { to: "/appointments", icon: Calendar, label: "Appointments" },
  ],
};

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const items = navItems[user?.role] || [];
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><Stethoscope size={22} /></div>
          <span className="logo-text">MediCare</span>
        </div>

        <nav className="sidebar-nav">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/profile" className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.firstName} {user?.lastName}</p>
              <p className="sidebar-user-role">{user?.role}</p>
            </div>
          </NavLink>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
