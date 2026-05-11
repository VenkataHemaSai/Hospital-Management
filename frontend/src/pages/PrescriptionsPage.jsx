import { useEffect, useState } from "react";
import { prescriptionAPI } from "../api/index.js";
import { useAuthStore } from "../store/authStore.js";
import { FileText, Pill, Calendar } from "lucide-react";
import { format } from "date-fns";

const statusBadge = {
  active: "badge badge-green",
  dispensed: "badge badge-blue",
  expired: "badge badge-red",
  cancelled: "badge badge-gray",
};

export default function PrescriptionsPage() {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    prescriptionAPI.getAll().then((res) => {
      setPrescriptions(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Prescriptions</h1>
        <p>Your complete prescription history</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : prescriptions.length === 0 ? (
        <div className="empty-state card">
          <FileText size={48} />
          <p>No prescriptions found</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.2fr" : "1fr", gap: "1.5rem" }}>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {prescriptions.map((rx) => (
              <div
                key={rx._id}
                className={`card ${selected?._id === rx._id ? "card-selected" : ""}`}
                style={{ cursor: "pointer", transition: "var(--transition)" }}
                onClick={() => setSelected(selected?._id === rx._id ? null : rx)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)", width: 40, height: 40 }}>
                      <FileText size={18} color="#fbbf24" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{rx.prescriptionNumber}</p>
                      <p className="text-xs text-muted">
                        {user?.role === "patient"
                          ? `Dr. ${rx.doctor?.firstName} ${rx.doctor?.lastName}`
                          : `${rx.patient?.firstName} ${rx.patient?.lastName}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                    <span className={statusBadge[rx.status] || "badge badge-gray"}>{rx.status}</span>
                    <span className="text-xs text-muted">{rx.issuedAt ? format(new Date(rx.issuedAt), "MMM d, yyyy") : ""}</span>
                  </div>
                </div>
                <p className="text-sm text-secondary" style={{ marginTop: "0.5rem" }}>
                  {rx.medicationCount} medication(s) · Valid until {rx.validUntil ? format(new Date(rx.validUntil), "MMM d, yyyy") : "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card fade-in" style={{ height: "fit-content", position: "sticky", top: "2rem" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{selected.prescriptionNumber}</h2>
                <button className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={() => setSelected(null)}>Close</button>
              </div>

              {selected.diagnosis && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  <p className="text-xs text-muted" style={{ marginBottom: "0.25rem" }}>Diagnosis</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{selected.diagnosis}</p>
                </div>
              )}

              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Medications</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {selected.medications?.map((med) => (
                  <div key={med._id} style={{ padding: "0.875rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{med.drugName}</p>
                    {med.genericName && <p className="text-xs text-muted">{med.genericName}</p>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <span className="badge badge-blue">{med.dosage?.amount} {med.dosage?.unit}</span>
                      <span className="badge badge-gray">{med.frequency?.replace(/_/g, " ")}</span>
                      <span className="badge badge-gray">{med.duration?.value} {med.duration?.unit}</span>
                      <span className="badge badge-gray">{med.route}</span>
                    </div>
                    {med.instructions && <p className="text-xs text-secondary" style={{ marginTop: "0.5rem" }}>{med.instructions}</p>}
                  </div>
                ))}
              </div>

              {selected.clinicalNotes && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  <p className="text-xs text-muted" style={{ marginBottom: "0.25rem" }}>Clinical Notes</p>
                  <p className="text-sm text-secondary">{selected.clinicalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
