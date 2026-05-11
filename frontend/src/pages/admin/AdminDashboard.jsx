import { useEffect, useState } from "react";
import { appointmentAPI, userAPI, applicationAPI } from "../../api/index.js";
import { Users, Calendar, Stethoscope, Activity, Shield, ShieldCheck, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const statusBadge = {
  pending: "badge badge-yellow",
  approved: "badge badge-blue",
  completed: "badge badge-green",
  cancelled: "badge badge-red",
  ongoing: "badge badge-cyan",
};

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [promoting, setPromoting] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, docRes, patRes, appRes] = await Promise.all([
          appointmentAPI.getAll({ limit: 8 }),
          userAPI.getDoctors({ limit: 100 }),
          userAPI.getPatients({ limit: 100 }),
          applicationAPI.getAll({ status: "pending" }),
        ]);
        setAppointments(apptRes.data.data);
        setDoctors(docRes.data.data);
        setPatients(patRes.data.data);
        setPendingApps(appRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePromote = async (doctorId) => {
    setPromoting(doctorId);
    try {
      const res = await userAPI.promoteDoctorToSenior(doctorId);
      toast.success(res.data.message);
      // Refresh doctors list
      const docRes = await userAPI.getDoctors({ limit: 100 });
      setDoctors(docRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Promotion failed");
    } finally {
      setPromoting(null);
    }
  };

  const stats = [
    { icon: Users, label: "Total Patients", value: patients.length, color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
    { icon: Stethoscope, label: "Active Doctors", value: doctors.length, color: "#059669", bg: "rgba(5,150,105,0.12)" },
    { icon: Calendar, label: "Appointments", value: appointments.length, color: "#d97706", bg: "rgba(217,119,6,0.12)" },
    { icon: ClipboardList, label: "Pending Applications", value: pendingApps.length, color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div className="stat-info">
              <h3>{loading ? "—" : s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="filter-tabs">
        {[
          { key: "overview", label: "Recent Appointments" },
          { key: "doctors", label: "Manage Doctors" },
        ].map((t) => (
          <button key={t.key} className={`filter-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Recent Appointments</h2>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : appointments.length === 0 ? (
            <div className="empty-state"><Calendar size={40} /><p>No appointments yet</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt._id}>
                      <td>{appt.patient?.firstName} {appt.patient?.lastName}</td>
                      <td>Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}</td>
                      <td>{appt.appointmentDate ? format(new Date(appt.appointmentDate), "MMM d, yyyy") : "—"}</td>
                      <td><span className="badge badge-gray">{appt.appointmentType}</span></td>
                      <td><span className={statusBadge[appt.status] || "badge badge-gray"}>{appt.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "doctors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : doctors.length === 0 ? (
            <div className="empty-state card"><Stethoscope size={48} /><p>No doctors registered yet</p></div>
          ) : doctors.map((doc) => (
            <div key={doc._id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem" }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: "1rem", flexShrink: 0 }}>
                {doc.firstName?.[0]}{doc.lastName?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>Dr. {doc.firstName} {doc.lastName}</p>
                  {doc.isSeniorDoctor && <span className="badge badge-purple">Senior Doctor</span>}
                  {doc.isVerified && <span className="badge badge-green">Verified</span>}
                </div>
                <p className="text-sm text-secondary">{doc.specialty} · {doc.experienceYears} yrs experience</p>
              </div>
              <button
                className={`btn ${doc.isSeniorDoctor ? "btn-secondary" : "btn-primary"}`}
                style={{ flexShrink: 0, fontSize: "0.8rem" }}
                disabled={promoting === doc._id}
                onClick={() => handlePromote(doc._id)}
              >
                {promoting === doc._id ? <span className="spinner-sm" /> : (
                  <>
                    {doc.isSeniorDoctor ? <Shield size={14} /> : <ShieldCheck size={14} />}
                    {doc.isSeniorDoctor ? "Demote" : "Make Senior"}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
