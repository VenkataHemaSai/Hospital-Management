import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userAPI } from "../../api/index.js";
import { Search, Users } from "lucide-react";
import "./Public.css";

export default function PublicDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");

  useEffect(() => {
    userAPI.getDoctors({ limit: 50, specialty })
      .then((res) => setDoctors(res.data.data))
      .finally(() => setLoading(false));
  }, [specialty]);

  const filtered = doctors.filter((d) =>
    `${d.firstName} ${d.lastName} ${d.specialty}`.toLowerCase().includes(search.toLowerCase())
  );

  const specialties = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))];

  return (
    <div className="fade-in">
      <section className="doc-hero">
        <div className="container">
          <span className="section-label">Our Specialists</span>
          <h1>Meet Our Expert Doctors</h1>
          <p>Browse through our team of verified medical professionals and book your consultation today.</p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-primary)", paddingTop: "2rem" }}>
        <div className="container">
          <div className="flex gap-3" style={{ marginBottom: "2rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input" placeholder="Search by name or specialty..." style={{ paddingLeft: "2.5rem" }} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input" style={{ width: "auto", minWidth: "180px" }} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="">All Specialties</option>
              {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state card" style={{ padding: "4rem" }}>
              <Users size={48} />
              <p>No doctors found. Try adjusting your search.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
              {filtered.map((doc) => (
                <div key={doc._id} className="card doctor-card">
                  <div className="flex items-center gap-3" style={{ marginBottom: "1rem" }}>
                    <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
                      {doc.firstName?.[0]}{doc.lastName?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>Dr. {doc.firstName} {doc.lastName}</p>
                      <p className="text-sm text-secondary">{doc.specialty}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.875rem", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p style={{ fontWeight: 800, color: "var(--text-primary)" }}>{doc.experienceYears}y</p>
                      <p className="text-xs text-muted">Experience</p>
                    </div>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                        {doc.rating?.count > 0 ? (doc.rating.totalScore / doc.rating.count).toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-muted">Rating</p>
                    </div>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p style={{ fontWeight: 800, color: "var(--accent-success)" }}>₹{doc.consultationFee?.amount}</p>
                      <p className="text-xs text-muted">Fee</p>
                    </div>
                  </div>

                  {doc.bio && <p className="text-sm text-secondary" style={{ marginBottom: "1rem", lineHeight: 1.6 }}>{doc.bio.substring(0, 120)}{doc.bio.length > 120 ? "..." : ""}</p>}
                  <Link to="/register" className="btn btn-primary w-full">Book Appointment</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
