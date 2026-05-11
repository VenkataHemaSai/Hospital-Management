import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { appointmentAPI, prescriptionAPI } from "../../api/index.js";
import { Calendar, FileText, Clock, CheckCircle, AlertCircle, Stethoscope } from "lucide-react";
import { format } from "date-fns";

const statusBadge = {
  pending: "badge badge-yellow",
  approved: "badge badge-blue",
  completed: "badge badge-green",
  cancelled: "badge badge-red",
  ongoing: "badge badge-cyan",
  no_show: "badge badge-gray",
};

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [apptRes, rxRes] = await Promise.all([
          appointmentAPI.getAll({ limit: 5 }),
          prescriptionAPI.getAll({ limit: 3 }),
        ]);
        setAppointments(apptRes.data.data);
        setPrescriptions(rxRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const upcoming = appointments.filter((a) => ["pending", "approved"].includes(a.status));
  const completed = appointments.filter((a) => a.status === "completed");
  const activePrescriptions = prescriptions.filter((p) => p.status === "active");

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Good {getGreeting()}, {user?.firstName} 👋</h1>
        <p>Here's your health overview for today</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Calendar size={22} color="#60a5fa" />
          </div>
          <div className="stat-info">
            <h3>{upcoming.length}</h3>
            <p>Upcoming Appointments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>
            <CheckCircle size={22} color="#34d399" />
          </div>
          <div className="stat-info">
            <h3>{completed.length}</h3>
            <p>Consultations Done</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>
            <FileText size={22} color="#fbbf24" />
          </div>
          <div className="stat-info">
            <h3>{activePrescriptions.length}</h3>
            <p>Active Prescriptions</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Recent Appointments */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Recent Appointments</h2>
            <Link to="/appointments" className="btn btn-secondary" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}>View All</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <p>No appointments yet</p>
              <Link to="/doctors" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>Book Now</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {appointments.map((appt) => (
                <div key={appt._id} className="appt-item">
                  <div className="avatar" style={{ width: 38, height: 38, fontSize: "0.8rem" }}>
                    {appt.doctor?.firstName?.[0]}{appt.doctor?.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
                    </p>
                    <p className="text-xs text-muted">
                      {appt.appointmentDate ? format(new Date(appt.appointmentDate), "MMM d, yyyy") : "—"} · {appt.timeSlot?.start}
                    </p>
                  </div>
                  <span className={statusBadge[appt.status] || "badge badge-gray"}>{appt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Prescriptions */}
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Active Prescriptions</h2>
            <Link to="/prescriptions" className="btn btn-secondary" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}>View All</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : activePrescriptions.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <p>No active prescriptions</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {activePrescriptions.map((rx) => (
                <div key={rx._id} className="appt-item">
                  <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)", width: 38, height: 38 }}>
                    <FileText size={16} color="#fbbf24" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {rx.prescriptionNumber}
                    </p>
                    <p className="text-xs text-muted">
                      Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {rx.medicationCount} medication(s)
                    </p>
                  </div>
                  <span className="badge badge-green">active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
