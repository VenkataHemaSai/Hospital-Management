import { useEffect, useState } from "react";
import { applicationAPI } from "../api/index.js";
import toast from "react-hot-toast";
import { FileText, Check, X } from "lucide-react";

const statusBadge = {
  pending: "badge badge-yellow",
  approved: "badge badge-green",
  rejected: "badge badge-red",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);
  const [registrationLink, setRegistrationLink] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const res = await applicationAPI.getAll(params);
      setApplications(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, [filter]);

  const handleApprove = async (id) => {
    setActionLoading(id + "approve");
    try {
      const res = await applicationAPI.approve(id, { note: "Approved by senior reviewer" });
      toast.success("Application approved!");
      setRegistrationLink({ link: res.data.registrationLink, email: res.data.applicantEmail });
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    setActionLoading(id + "reject");
    try {
      await applicationAPI.reject(id, { reason });
      toast.success("Application rejected");
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Registration link copied!");
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Doctor Applications</h1>
        <p>Review and manage doctor registration requests</p>
      </div>

      {registrationLink && (
        <div className="modal-overlay" onClick={() => setRegistrationLink(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <Check size={28} color="#059669" />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Application Approved!</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Share this one-time registration link with <strong>{registrationLink.email}</strong>
              </p>
            </div>
            <div style={{ padding: "0.875rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", wordBreak: "break-all", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {registrationLink.link}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => copyLink(registrationLink.link)}><Check size={15} /> Copy Link</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRegistrationLink(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="filter-tabs">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : applications.length === 0 ? (
        <div className="empty-state card"><FileText size={48} /><p>No {filter === "all" ? "" : filter} applications found</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {applications.map((app) => (
            <div key={app._id} className="card appt-card">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: "1rem" }}>{app.firstName?.[0]}{app.lastName?.[0]}</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1rem" }}>Dr. {app.firstName} {app.lastName}</p>
                    <p className="text-sm text-secondary">{app.specialty} · {app.experienceYears} years exp</p>
                  </div>
                </div>
                <span className={statusBadge[app.status]}>{app.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "1rem", padding: "0.875rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                <div><p className="text-xs text-muted">Email</p><p className="text-sm">{app.email}</p></div>
                <div><p className="text-xs text-muted">License</p><p className="text-sm">{app.licenseNumber}</p></div>
                <div><p className="text-xs text-muted">Fee</p><p className="text-sm">₹{app.consultationFee}</p></div>
              </div>

              <div style={{ marginTop: "0.75rem" }}>
                <p className="text-xs text-muted">Qualifications</p>
                <p className="text-sm text-secondary">{app.qualifications}</p>
              </div>

              <div className="flex justify-between items-center" style={{ marginTop: "1rem" }}>
                <p className="text-xs text-muted">Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""}</p>
                {app.status === "pending" && (
                  <div className="flex gap-2">
                    <button className="btn btn-success" disabled={actionLoading === app._id + "approve"} onClick={() => handleApprove(app._id)}><Check size={15} /> Approve</button>
                    <button className="btn btn-danger" disabled={actionLoading === app._id + "reject"} onClick={() => handleReject(app._id)}><X size={15} /> Reject</button>
                  </div>
                )}
                {app.status !== "pending" && app.reviewedBy && (
                  <p className="text-xs text-muted">Reviewed by {app.reviewedBy?.firstName} {app.reviewedBy?.lastName}{app.reviewNote ? ` · "${app.reviewNote}"` : ""}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
