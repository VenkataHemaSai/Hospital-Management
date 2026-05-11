import { useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { userAPI } from "../api/index.js";
import toast from "react-hot-toast";
import { User, Mail, Phone, Save } from "lucide-react";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    medicalHistorySummary: user?.medicalHistorySummary || "",
    allergies: user?.allergies?.join(", ") || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (user?.role === "patient" && form.allergies) {
        payload.allergies = form.allergies.split(",").map((a) => a.trim()).filter(Boolean);
      }
      const res = await userAPI.updateMyProfile(payload);
      updateUser(res.data.data);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Profile Card */}
        <div className="card" style={{ textAlign: "center" }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: "1.75rem", margin: "0 auto 1rem" }}>
            {initials}
          </div>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-muted" style={{ textTransform: "capitalize", marginTop: "0.25rem" }}>{user?.role}</p>

          <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", textAlign: "left" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: "0.75rem" }}>
              <Mail size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm text-secondary">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} style={{ color: "var(--text-muted)" }} />
                <span className="text-sm text-secondary">{user?.phone}</span>
              </div>
            )}
          </div>

          {user?.role === "patient" && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", textAlign: "left" }}>
              <p className="text-xs text-muted" style={{ marginBottom: "0.35rem" }}>Blood Group</p>
              <p className="text-sm" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{user?.bloodGroup || "—"}</p>
            </div>
          )}

          {user?.role === "doctor" && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", textAlign: "left" }}>
              <p className="text-xs text-muted" style={{ marginBottom: "0.35rem" }}>Specialty</p>
              <p className="text-sm" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{user?.specialty}</p>
              <p className="text-xs text-muted" style={{ marginTop: "0.5rem", marginBottom: "0.35rem" }}>Experience</p>
              <p className="text-sm" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{user?.experienceYears} years</p>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem" }}>Edit Information</h2>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label className="label">First Name</label>
                <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Last Name</label>
                <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            {(user?.role === "doctor") && (
              <div className="form-group">
                <label className="label">Bio</label>
                <textarea className="input" rows={3} placeholder="Tell patients about yourself..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} style={{ resize: "vertical" }} />
              </div>
            )}

            {user?.role === "patient" && (
              <>
                <div className="form-group">
                  <label className="label">Medical History Summary</label>
                  <textarea className="input" rows={3} placeholder="Brief summary of past medical conditions..." value={form.medicalHistorySummary} onChange={(e) => setForm({ ...form, medicalHistorySummary: e.target.value })} style={{ resize: "vertical" }} />
                </div>
                <div className="form-group">
                  <label className="label">Allergies (comma-separated)</label>
                  <input className="input" placeholder="Penicillin, Aspirin, Peanuts..." value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner-sm" /> : <><Save size={15} /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
