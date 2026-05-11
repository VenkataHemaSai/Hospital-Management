import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { appointmentAPI, prescriptionAPI } from "../../api/index.js";
import { Calendar, FileText, Users, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const statusBadge = {
  pending: "badge badge-yellow",
  approved: "badge badge-blue",
  completed: "badge badge-green",
  cancelled: "badge badge-red",
  ongoing: "badge badge-cyan",
};

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, rxRes] = await Promise.all([
          appointmentAPI.getAll({ limit: 6 }),
          prescriptionAPI.getAll({ limit: 4 }),
        ]);
        setAppointments(apptRes.data.data);
        setPrescriptions(rxRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pending = appointments.filter((a) => a.status === "pending");
  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.appointmentDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const completed = appointments.filter((a) => a.status === "completed");

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Welcome, Dr. {user?.firstName} 👨‍⚕️</h1>
        <p>Here's your practice overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>
            <Clock size={22} color="#fbbf24" />
          </div>
          <div className="stat-info">
            <h3>{pending.length}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Calendar size={22} color="#60a5fa" />
          </div>
          <div className="stat-info">
            <h3>{todayAppts.length}</h3>
            <p>Today's Appointments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>
            <CheckCircle size={22} color="#34d399" />
          </div>
          <div className="stat-info">
            <h3>{completed.length}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}>
            <TrendingUp size={22} color="#a78bfa" />
          </div>
          <div className="stat-info">
            <h3>{user?.averageRating || "N/A"}</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Today's Schedule */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Today's Schedule</h2>
            <Link to="/appointments" className="btn btn-secondary" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}>View All</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : todayAppts.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <p>No appointments today</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {todayAppts.map((appt) => (
                <div key={appt._id} className="appt-item">
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: "0.8rem" }}>
                    {appt.patient?.firstName?.[0]}{appt.patient?.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {appt.patient?.firstName} {appt.patient?.lastName}
                    </p>
                    <p className="text-xs text-muted">{appt.timeSlot?.start} – {appt.timeSlot?.end}</p>
                  </div>
                  <span className={statusBadge[appt.status] || "badge badge-gray"}>{appt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Pending Approvals</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : pending.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={40} />
              <p>All caught up!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {pending.map((appt) => (
                <div key={appt._id} className="appt-item">
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: "0.8rem" }}>
                    {appt.patient?.firstName?.[0]}{appt.patient?.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {appt.patient?.firstName} {appt.patient?.lastName}
                    </p>
                    <p className="text-xs text-muted">
                      {appt.appointmentDate ? format(new Date(appt.appointmentDate), "MMM d") : ""} · {appt.timeSlot?.start}
                    </p>
                  </div>
                  <Link to="/appointments" className="btn btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
