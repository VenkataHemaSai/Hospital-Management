import { useEffect, useState } from "react";
import { appointmentAPI, userAPI } from "../../api/index.js";
import { Users, Calendar, Stethoscope, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptRes, docRes, patRes] = await Promise.all([
          appointmentAPI.getAll({ limit: 8 }),
          userAPI.getDoctors({ limit: 100 }),
          userAPI.getPatients({ limit: 100 }),
        ]);
        setAppointments(apptRes.data.data);
        setDoctors(docRes.data.data);
        setPatients(patRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statusBadge = {
    pending: "badge badge-yellow",
    approved: "badge badge-blue",
    completed: "badge badge-green",
    cancelled: "badge badge-red",
    ongoing: "badge badge-cyan",
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and management</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Users size={22} color="#60a5fa" />
          </div>
          <div className="stat-info">
            <h3>{patients.length}</h3>
            <p>Total Patients</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Stethoscope size={22} color="#34d399" />
          </div>
          <div className="stat-info">
            <h3>{doctors.length}</h3>
            <p>Active Doctors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>
            <Calendar size={22} color="#fbbf24" />
          </div>
          <div className="stat-info">
            <h3>{appointments.length}</h3>
            <p>Total Appointments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(6,182,212,0.15)" }}>
            <Activity size={22} color="#22d3ee" />
          </div>
          <div className="stat-info">
            <h3>{appointments.filter((a) => a.status === "ongoing").length}</h3>
            <p>Live Sessions</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Recent Appointments</h2>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
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
    </div>
  );
}
