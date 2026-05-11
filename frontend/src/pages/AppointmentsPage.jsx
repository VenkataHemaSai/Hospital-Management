import { useEffect, useState } from "react";
import { appointmentAPI } from "../api/index.js";
import { useAuthStore } from "../store/authStore.js";
import toast from "react-hot-toast";
import { Calendar, Clock, Video, MapPin, X, Check } from "lucide-react";
import { format } from "date-fns";

const statusBadge = {
  pending: "badge badge-yellow",
  approved: "badge badge-blue",
  completed: "badge badge-green",
  cancelled: "badge badge-red",
  ongoing: "badge badge-cyan",
  no_show: "badge badge-gray",
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const res = await appointmentAPI.getAll(params);
      setAppointments(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [filter]);

  const updateStatus = async (id, status, extra = {}) => {
    setActionLoading(id + status);
    try {
      await appointmentAPI.updateStatus(id, { status, ...extra });
      toast.success(`Appointment ${status}`);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filters = ["all", "pending", "approved", "completed", "cancelled"];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Appointments</h1>
        <p>Manage your consultation schedule</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : appointments.length === 0 ? (
        <div className="empty-state card">
          <Calendar size={48} />
          <p>No appointments found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {appointments.map((appt) => (
            <div key={appt._id} className="card appt-card">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="avatar" style={{ width: 44, height: 44 }}>
                    {user?.role === "patient"
                      ? `${appt.doctor?.firstName?.[0]}${appt.doctor?.lastName?.[0]}`
                      : `${appt.patient?.firstName?.[0]}${appt.patient?.lastName?.[0]}`}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {user?.role === "patient"
                        ? `Dr. ${appt.doctor?.firstName} ${appt.doctor?.lastName}`
                        : `${appt.patient?.firstName} ${appt.patient?.lastName}`}
                    </p>
                    <p className="text-xs text-muted">
                      {user?.role === "patient" ? appt.doctor?.specialty : "Patient"}
                    </p>
                  </div>
                </div>
                <span className={statusBadge[appt.status] || "badge badge-gray"}>{appt.status}</span>
              </div>

              <div className="appt-meta">
                <span><Calendar size={14} /> {appt.appointmentDate ? format(new Date(appt.appointmentDate), "MMMM d, yyyy") : "—"}</span>
                <span><Clock size={14} /> {appt.timeSlot?.start} – {appt.timeSlot?.end}</span>
                <span>
                  {appt.appointmentType === "telemedicine" ? <Video size={14} /> : <MapPin size={14} />}
                  {appt.appointmentType === "telemedicine" ? "Telemedicine" : "In-Person"}
                </span>
              </div>

              {appt.symptoms && (
                <p className="text-sm text-secondary" style={{ marginTop: "0.5rem" }}>
                  <strong>Symptoms:</strong> {appt.symptoms}
                </p>
              )}

              {appt.meetingLink && appt.status === "approved" && (
                <a href={appt.meetingLink} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: "0.75rem", width: "fit-content" }}>
                  <Video size={16} /> Join Session
                </a>
              )}

              {/* Doctor Actions */}
              {user?.role === "doctor" && appt.status === "pending" && (
                <div className="flex gap-2" style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn btn-success"
                    disabled={actionLoading === appt._id + "approved"}
                    onClick={() => updateStatus(appt._id, "approved")}
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={actionLoading === appt._id + "cancelled"}
                    onClick={() => updateStatus(appt._id, "cancelled")}
                  >
                    <X size={15} /> Decline
                  </button>
                </div>
              )}

              {user?.role === "doctor" && appt.status === "approved" && (
                <div className="flex gap-2" style={{ marginTop: "0.75rem" }}>
                  <button className="btn btn-success" onClick={() => updateStatus(appt._id, "completed")}>
                    <Check size={15} /> Mark Completed
                  </button>
                  <button className="btn btn-secondary" onClick={() => updateStatus(appt._id, "no_show")}>
                    No Show
                  </button>
                </div>
              )}

              {/* Patient Cancel */}
              {user?.role === "patient" && appt.status === "pending" && (
                <button
                  className="btn btn-danger"
                  style={{ marginTop: "0.75rem", width: "fit-content" }}
                  onClick={() => updateStatus(appt._id, "cancelled")}
                >
                  <X size={15} /> Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
