import { useState } from "react";
import { Link } from "react-router-dom";
import { applicationAPI } from "../../api/index.js";
import toast from "react-hot-toast";
import { Stethoscope, Send, CheckCircle } from "lucide-react";
import "../auth/Auth.css";

export default function ApplyDoctorPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    specialty: "", experienceYears: "", licenseNumber: "",
    qualifications: "", hospital: "", consultationFee: "", bio: "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await applicationAPI.submit({ ...form, experienceYears: Number(form.experienceYears), consultationFee: Number(form.consultationFee) });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-navbar">
          <Link to="/" className="auth-navbar-brand">
            <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
            <span className="auth-navbar-name">MediCare</span>
          </Link>
        </div>
        <div className="auth-card auth-card-wide" style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <CheckCircle size={32} color="#059669" />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Application Submitted!</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>Your application is under review by our senior medical team.<br />You'll receive a registration link once approved.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-navbar">
        <Link to="/" className="auth-navbar-brand">
          <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
          <span className="auth-navbar-name">MediCare</span>
        </Link>
      </div>
      <div className="auth-bg"><div className="auth-bg-orb orb-1" /><div className="auth-bg-orb orb-2" /></div>
      <div className="auth-card auth-card-wide" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", maxWidth: "620px" }}>
        <div className="auth-header">
          <div className="auth-logo"><Stethoscope size={28} /></div>
          <h1>Apply as a Doctor</h1>
          <p>Fill out the form below. A senior doctor will review your application.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label className="label">First Name</label><input className="input" placeholder="Kavita" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required /></div>
            <div className="form-group"><label className="label">Last Name</label><input className="input" placeholder="Sharma" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Email</label><input type="email" className="input" placeholder="kavita@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
            <div className="form-group"><label className="label">Phone</label><input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Specialty</label><input className="input" placeholder="Cardiology" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} required /></div>
            <div className="form-group"><label className="label">Experience (years)</label><input type="number" min="0" className="input" placeholder="5" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Medical License Number</label><input className="input" placeholder="MCI-XXXX-XXXXXX" value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} required /></div>
            <div className="form-group"><label className="label">Consultation Fee (INR)</label><input type="number" min="0" className="input" placeholder="500" value={form.consultationFee} onChange={(e) => set("consultationFee", e.target.value)} required /></div>
          </div>
          <div className="form-group"><label className="label">Qualifications</label><input className="input" placeholder="MBBS - AIIMS Delhi, MD Cardiology - JIPMER" value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} required /></div>
          <div className="form-group"><label className="label">Hospital / Clinic (optional)</label><input className="input" placeholder="Apollo Hospital, Hyderabad" value={form.hospital} onChange={(e) => set("hospital", e.target.value)} /></div>
          <div className="form-group"><label className="label">Short Bio (optional)</label><textarea className="input" rows={3} placeholder="Tell us about your practice..." value={form.bio} onChange={(e) => set("bio", e.target.value)} style={{ resize: "vertical" }} /></div>
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : <><Send size={16} /> Submit Application</>}
          </button>
        </form>
        <p className="auth-footer-text">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </div>
    </div>
  );
}
