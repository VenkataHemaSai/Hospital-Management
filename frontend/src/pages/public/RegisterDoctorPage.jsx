import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { applicationAPI } from "../../api/index.js";
import { useAuthStore } from "../../store/authStore.js";
import toast from "react-hot-toast";
import { Stethoscope, CheckCircle } from "lucide-react";
import "../auth/Auth.css";

export default function RegisterDoctorPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-navbar">
          <Link to="/" className="auth-navbar-brand">
            <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
            <span className="auth-navbar-name">MediCare</span>
          </Link>
        </div>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Invalid Link</h1>
          <p style={{ color: "var(--text-secondary)" }}>This registration link is missing a token. Please contact the MediCare team.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>Go Home</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      await applicationAPI.registerWithToken({ token, password });
      toast.success("Account created! Welcome aboard, Doctor.");
      await checkAuth();
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-navbar">
        <Link to="/" className="auth-navbar-brand">
          <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
          <span className="auth-navbar-name">MediCare</span>
        </Link>
      </div>
      <div className="auth-bg"><div className="auth-bg-orb orb-1" /><div className="auth-bg-orb orb-2" /></div>
      <div className="auth-card" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)" }}>
        <div className="auth-header">
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <CheckCircle size={28} color="#059669" />
          </div>
          <h1>Welcome, Doctor!</h1>
          <p>Your application was approved. Set a password to activate your account.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="form-group">
            <label className="label">Confirm Password</label>
            <input type="password" className="input" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
