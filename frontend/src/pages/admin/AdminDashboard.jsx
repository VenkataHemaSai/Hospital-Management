import { useEffect, useState, useMemo } from "react";
import { appointmentAPI, userAPI, applicationAPI } from "../../api/index.js";
import {
  Users, Calendar, Stethoscope, Activity, Shield, ShieldCheck,
  ClipboardList, Trash2, ChevronDown, X, AlertTriangle,
} from "lucide-react";
import { format, getMonth, getYear } from "date-fns";
import toast from "react-hot-toast";

/* ── Shared status badge map ─────────────────────────────────── */
const statusBadge = {
  pending: "badge badge-yellow", approved: "badge badge-blue",
  completed: "badge badge-green", cancelled: "badge badge-red",
  ongoing: "badge badge-cyan",
};

/* ── Reason Modal ─────────────────────────────────────────────── */
function ReasonModal({ title, description, confirmLabel, confirmClass = "btn-danger", onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3" style={{ marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{description}</p>
          </div>
        </div>
        <div className="form-group">
          <label className="label">Reason <span style={{ color: "var(--accent-danger)" }}>*</span></label>
          <textarea
            className="input"
            rows={3}
            placeholder="Provide a clear reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ resize: "vertical" }}
            autoFocus
          />
        </div>
        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${confirmClass}`} disabled={!reason.trim()} onClick={() => reason.trim() && onConfirm(reason)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Months for filter ───────────────────────────────────────── */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  /* Doctor filters */
  const [filterRole, setFilterRole] = useState("all");       // "all" | "senior" | "regular"
  const [filterMonth, setFilterMonth] = useState("");        // "" | "0".."11"

  /* Action modals */
  const [modal, setModal] = useState(null); // { type: "remove"|"demote", doctor }
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDoctors = async () => {
    const res = await userAPI.getDoctors({ limit: 200 });
    setDoctors(res.data.data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, patRes, appRes] = await Promise.all([
          appointmentAPI.getAll({ limit: 8 }),
          userAPI.getPatients({ limit: 100 }),
          applicationAPI.getAll({ status: "pending" }),
        ]);
        setAppointments(apptRes.data.data);
        setPatients(patRes.data.data);
        setPendingApps(appRes.data.data);
        await fetchDoctors();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* Filtered doctors list */
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const roleMatch =
        filterRole === "all" ? true :
        filterRole === "senior" ? doc.isSeniorDoctor :
        !doc.isSeniorDoctor;
      const monthMatch =
        filterMonth === "" ? true :
        getMonth(new Date(doc.createdAt)) === Number(filterMonth);
      return roleMatch && monthMatch;
    });
  }, [doctors, filterRole, filterMonth]);

  /* Promote / Demote */
  const handlePromote = async (doctor) => {
    if (doctor.isSeniorDoctor) {
      // Demote — needs reason modal
      setModal({ type: "demote", doctor });
    } else {
      // Promote — no reason needed
      setActionLoading(doctor._id + "_promote");
      try {
        const res = await userAPI.promoteDoctorToSenior(doctor._id, {});
        toast.success(res.data.message);
        await fetchDoctors();
      } catch (err) {
        toast.error(err.response?.data?.message || "Action failed");
      } finally {
        setActionLoading(null);
      }
    }
  };

  const confirmDemote = async (reason) => {
    const { doctor } = modal;
    setModal(null);
    setActionLoading(doctor._id + "_demote");
    try {
      const res = await userAPI.promoteDoctorToSenior(doctor._id, { reason });
      toast.success(res.data.message);
      await fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Demotion failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* Remove doctor */
  const confirmRemove = async (reason) => {
    const { doctor } = modal;
    setModal(null);
    setActionLoading(doctor._id + "_remove");
    try {
      const res = await userAPI.deactivateDoctor(doctor._id, { reason });
      toast.success(res.data.message);
      await fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Removal failed");
    } finally {
      setActionLoading(null);
    }
  };

  const stats = [
    { icon: Users,         label: "Total Patients",        value: patients.length,    color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
    { icon: Stethoscope,   label: "Active Doctors",        value: doctors.length,     color: "#059669", bg: "rgba(5,150,105,0.12)" },
    { icon: Calendar,      label: "Appointments",          value: appointments.length,color: "#d97706", bg: "rgba(217,119,6,0.12)" },
    { icon: ClipboardList, label: "Pending Applications",  value: pendingApps.length, color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  ];

  return (
    <div className="fade-in">
      {/* Modals */}
      {modal?.type === "demote" && (
        <ReasonModal
          title={`Demote Dr. ${modal.doctor.firstName} ${modal.doctor.lastName}?`}
          description="This will remove their Senior Doctor privileges."
          confirmLabel="Demote to Doctor"
          confirmClass="btn-danger"
          onConfirm={confirmDemote}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "remove" && (
        <ReasonModal
          title={`Remove Dr. ${modal.doctor.firstName} ${modal.doctor.lastName}?`}
          description="Their account will be deactivated. This action cannot be undone easily."
          confirmLabel="Remove Doctor"
          confirmClass="btn-danger"
          onConfirm={confirmRemove}
          onClose={() => setModal(null)}
        />
      )}

      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><s.icon size={22} color={s.color} /></div>
            <div className="stat-info"><h3>{loading ? "—" : s.value}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="filter-tabs">
        {[{ key: "overview", label: "Appointments" }, { key: "doctors", label: "Manage Doctors" }].map((t) => (
          <button key={t.key} className={`filter-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Appointments ── */}
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
                  <tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Type</th><th>Status</th></tr>
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

      {/* ── Tab: Manage Doctors ── */}
      {tab === "doctors" && (
        <>
          {/* Filter bar */}
          <div className="flex gap-3" style={{ marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Role filter */}
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {[["all", "All Doctors"], ["regular", "Doctors"], ["senior", "Senior Doctors"]].map(([val, label]) => (
                <button
                  key={val}
                  className={`filter-tab ${filterRole === val ? "active" : ""}`}
                  onClick={() => setFilterRole(val)}
                  style={{ fontSize: "0.8rem" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Month filter */}
            <select
              className="input"
              style={{ width: "auto", minWidth: 160, fontSize: "0.85rem" }}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">All Join Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "auto" }}>
              {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Doctors list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : filteredDoctors.length === 0 ? (
            <div className="empty-state card"><Stethoscope size={48} /><p>No doctors match your filters</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredDoctors.map((doc) => {
                const isPromoting = actionLoading === doc._id + "_promote";
                const isDemoting  = actionLoading === doc._id + "_demote";
                const isRemoving  = actionLoading === doc._id + "_remove";
                const anyLoading  = isPromoting || isDemoting || isRemoving;

                return (
                  <div key={doc._id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem" }}>
                    {/* Avatar */}
                    <div className="avatar" style={{ width: 48, height: 48, fontSize: "1rem", flexShrink: 0 }}>
                      {doc.firstName?.[0]}{doc.lastName?.[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                        <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          Dr. {doc.firstName} {doc.lastName}
                        </p>
                        {doc.isSeniorDoctor && <span className="badge badge-purple">Senior Doctor</span>}
                        {doc.isVerified    && <span className="badge badge-green">Verified</span>}
                      </div>
                      <p className="text-sm text-secondary">
                        {doc.specialty}
                        {doc.experienceYears ? ` · ${doc.experienceYears} yrs` : ""}
                        {doc.createdAt ? ` · Joined ${format(new Date(doc.createdAt), "MMM yyyy")}` : ""}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" style={{ flexShrink: 0 }}>
                      {/* Promote / Demote */}
                      <button
                        className={`btn ${doc.isSeniorDoctor ? "btn-secondary" : "btn-primary"}`}
                        style={{ fontSize: "0.8rem", opacity: doc.isSeniorDoctor ? 0.7 : 1 }}
                        disabled={anyLoading}
                        onClick={() => handlePromote(doc)}
                        title={doc.isSeniorDoctor ? "Demote to regular Doctor" : "Promote to Senior Doctor"}
                      >
                        {(isPromoting || isDemoting) ? <span className="spinner-sm" /> : (
                          <>
                            {doc.isSeniorDoctor ? <Shield size={14} /> : <ShieldCheck size={14} />}
                            {doc.isSeniorDoctor ? "Demote" : "Make Senior"}
                          </>
                        )}
                      </button>

                      {/* Remove */}
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: "0.8rem" }}
                        disabled={anyLoading}
                        onClick={() => setModal({ type: "remove", doctor: doc })}
                        title="Remove doctor from platform"
                      >
                        {isRemoving ? <span className="spinner-sm" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
