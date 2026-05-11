import { useEffect, useState } from "react";
import { userAPI, chatAPI } from "../api/index.js";
import { useAuthStore } from "../store/authStore.js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Star, MessageSquare, Calendar, Search, Filter } from "lucide-react";

export default function DoctorsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 400);
    return () => clearTimeout(timer);
  }, [specialty]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getDoctors({ specialty });
      setDoctors(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (doctorId) => {
    try {
      const res = await chatAPI.createOrGet(doctorId);
      navigate("/chat");
      toast.success("Conversation opened");
    } catch {
      toast.error("Could not start conversation");
    }
  };

  const filtered = doctors.filter((d) =>
    `${d.firstName} ${d.lastName} ${d.specialty}`.toLowerCase().includes(search.toLowerCase())
  );

  const specialties = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Find Doctors</h1>
        <p>Browse and book appointments with verified specialists</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3" style={{ marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="input" placeholder="Search by name or specialty..." style={{ paddingLeft: "2.5rem" }} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: "auto", minWidth: "160px" }} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">All Specialties</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card"><p>No doctors found</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((doc) => (
            <div key={doc._id} className="card doctor-card">
              {/* Header */}
              <div className="flex items-center gap-3" style={{ marginBottom: "1rem" }}>
                <div className="avatar" style={{ width: 52, height: 52, fontSize: "1.1rem" }}>
                  {doc.firstName?.[0]}{doc.lastName?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                    Dr. {doc.firstName} {doc.lastName}
                  </p>
                  <p className="text-sm text-secondary">{doc.specialty}</p>
                </div>
                {doc.isVerified && <span className="badge badge-green">Verified</span>}
              </div>

              {/* Stats Row */}
              <div style={{ display: "flex", gap: "1rem", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{doc.experienceYears}y</p>
                  <p className="text-xs text-muted">Experience</p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                    {doc.rating?.count > 0 ? (doc.rating.totalScore / doc.rating.count).toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-muted">Rating</p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--accent-success)" }}>
                    ₹{doc.consultationFee?.amount}
                  </p>
                  <p className="text-xs text-muted">Fee</p>
                </div>
              </div>

              {doc.bio && <p className="text-sm text-secondary" style={{ marginBottom: "1rem", lineHeight: 1.5 }}>{doc.bio.substring(0, 100)}{doc.bio.length > 100 ? "..." : ""}</p>}

              {/* Actions */}
              <div className="flex gap-2">
                {user?.role === "patient" && (
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => navigate("/appointments")} disabled={!doc.acceptingNewPatients}>
                    <Calendar size={15} />
                    {doc.acceptingNewPatients ? "Book" : "Unavailable"}
                  </button>
                )}
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => startChat(doc._id)}>
                  <MessageSquare size={15} /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
