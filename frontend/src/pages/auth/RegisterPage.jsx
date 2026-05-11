import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import toast from "react-hot-toast";
import { Stethoscope, Stethoscope as DoctorIcon } from "lucide-react";
import "./Auth.css";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    phone: "", dateOfBirth: "", gender: "male",
  });
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, role: "patient" });
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Navbar with back-to-home link */}
      <div className="auth-navbar">
        <Link to="/" className="auth-navbar-brand">
          <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
          <span className="auth-navbar-name">MediCare</span>
        </Link>
      </div>

      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
      </div>

      <div className="auth-card auth-card-wide glass fade-in">
        <div className="auth-header">
          <div className="auth-logo"><Stethoscope size={28} /></div>
          <h1>Create Patient Account</h1>
          <p>Join MediCare to book appointments and manage your health</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">First Name</label>
              <input className="input" placeholder="John" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input className="input" placeholder="Doe" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="label">Phone (optional)</label>
              <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : "Create Account"}
          </button>
        </form>

        {/* Doctor CTA */}
        <div className="doctor-cta-box">
          <span>Are you a doctor?</span>
          <Link to="/apply-doctor" className="auth-link">Apply to join as a Doctor →</Link>
        </div>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
