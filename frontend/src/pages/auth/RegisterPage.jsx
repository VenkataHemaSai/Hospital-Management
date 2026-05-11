import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import toast from "react-hot-toast";
import { Stethoscope, Mail, Lock, User, Phone } from "lucide-react";
import "./Auth.css";

const roles = [
  { value: "patient", label: "Patient", desc: "Book appointments & manage health" },
  { value: "doctor", label: "Doctor", desc: "Manage patients & consultations" },
];

export default function RegisterPage() {
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    phone: "", dateOfBirth: "", gender: "male",
    specialty: "", experienceYears: "", consultationFee: { amount: "", currency: "INR" },
  });
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, role };
      if (role === "doctor") {
        payload.experienceYears = Number(payload.experienceYears);
        payload.consultationFee = { amount: Number(form.consultationFee.amount), currency: "INR" };
      }
      await register(payload);
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
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
      </div>

      <div className="auth-card auth-card-wide glass fade-in">
        <div className="auth-header">
          <div className="auth-logo"><Stethoscope size={28} /></div>
          <h1>Create Account</h1>
          <p>Join MediCare today</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`role-option ${role === r.value ? "active" : ""}`}
              onClick={() => setRole(r.value)}
            >
              <strong>{r.label}</strong>
              <span>{r.desc}</span>
            </button>
          ))}
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
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          {role === "patient" && (
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
          )}

          {role === "doctor" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Specialty</label>
                  <input className="input" placeholder="Cardiology" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="label">Experience (years)</label>
                  <input type="number" min="0" className="input" placeholder="5" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Consultation Fee (INR)</label>
                <input type="number" min="0" className="input" placeholder="500" value={form.consultationFee.amount} onChange={(e) => setForm((p) => ({ ...p, consultationFee: { ...p.consultationFee, amount: e.target.value } }))} required />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
