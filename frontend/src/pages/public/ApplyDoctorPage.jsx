import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Stethoscope, Send, CheckCircle, Upload, X, FileText, Image, AlertCircle } from "lucide-react";
import "../auth/Auth.css";

const SPECIALTIES = [
  "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
  "General Medicine", "General Surgery", "Gynaecology", "Nephrology",
  "Neurology", "Oncology", "Ophthalmology", "Orthopaedics",
  "Paediatrics", "Psychiatry", "Pulmonology", "Radiology",
  "Rheumatology", "Urology", "ENT", "Anaesthesiology", "Other",
];

const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati"];

function FileUploadBox({ label, name, accept, multiple, files, onAdd, onRemove, required, hint }) {
  const inputRef = useRef();
  const handleChange = (e) => {
    const added = Array.from(e.target.files);
    onAdd(name, added, multiple);
    e.target.value = "";
  };
  return (
    <div className="form-group">
      <label className="label">{label}{required && <span style={{ color: "var(--accent-danger)", marginLeft: 2 }}>*</span>}</label>
      {hint && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{hint}</p>}
      <div
        className="upload-box"
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const dropped = Array.from(e.dataTransfer.files); onAdd(name, dropped, multiple); }}
      >
        <Upload size={20} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Click or drag & drop</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{accept?.replace(/,/g, " ·")}</span>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={handleChange} />
      </div>
      {files?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: "0.5rem" }}>
          {files.map((f, i) => (
            <div key={i} className="file-chip">
              {f.type?.startsWith("image") ? <Image size={13} /> : <FileText size={13} />}
              <span>{f.name}</span>
              <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button type="button" onClick={() => onRemove(name, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplyDoctorPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({
    profilePhoto: [], licenseDoc: [], idProof: [], certificates: [],
  });
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    dateOfBirth: "", gender: "prefer_not_to_say", address: "",
    specialty: "", subSpecialty: "", experienceYears: "",
    licenseNumber: "", licenseExpiry: "", qualifications: "",
    hospital: "", consultationFee: "", bio: "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFilesAdd = (name, files, multiple) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [name]: multiple ? [...(prev[name] || []), ...files].slice(0, 5) : [files[0]],
    }));
  };

  const handleFileRemove = (name, index) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index),
    }));
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uploadedFiles.licenseDoc[0]) {
      toast.error("Please upload your medical license document");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      selectedLanguages.forEach((l) => fd.append("languages", l));
      if (uploadedFiles.profilePhoto[0]) fd.append("profilePhoto", uploadedFiles.profilePhoto[0]);
      if (uploadedFiles.licenseDoc[0])   fd.append("licenseDoc",   uploadedFiles.licenseDoc[0]);
      if (uploadedFiles.idProof[0])      fd.append("idProof",      uploadedFiles.idProof[0]);
      uploadedFiles.certificates.forEach((c) => fd.append("certificates", c));

      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/applications`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed. Please try again.");
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
        <div className="auth-card auth-card-wide fade-in" style={{ textAlign: "center", background: "white" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <CheckCircle size={36} color="#059669" />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Application Submitted!</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Your application and documents have been submitted successfully.<br />
            Our senior medical team will review and verify your credentials.<br />
            <strong>You will receive a registration link once approved.</strong>
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  const steps = ["Personal Info", "Professional Info", "Documents"];

  return (
    <div className="auth-page" style={{ paddingTop: "5rem" }}>
      <div className="auth-navbar">
        <Link to="/" className="auth-navbar-brand">
          <div className="auth-navbar-logo"><Stethoscope size={20} /></div>
          <span className="auth-navbar-name">MediCare</span>
        </Link>
      </div>
      <div className="auth-bg"><div className="auth-bg-orb orb-1" /><div className="auth-bg-orb orb-2" /></div>

      <div className="auth-card auth-card-wide fade-in" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", maxWidth: "680px", padding: "2rem" }}>
        {/* Header */}
        <div className="auth-header" style={{ marginBottom: "1.5rem" }}>
          <div className="auth-logo"><Stethoscope size={26} /></div>
          <h1>Apply as a Doctor</h1>
          <p>Step {step} of {steps.length} — {steps[step - 1]}</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i + 1 <= step ? "var(--accent-primary)" : "var(--border)", transition: "var(--transition)" }} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="form-group"><label className="label">First Name *</label><input className="input" placeholder="Kavita" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required /></div>
                <div className="form-group"><label className="label">Last Name *</label><input className="input" placeholder="Sharma" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Email *</label><input type="email" className="input" placeholder="kavita@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
                <div className="form-group"><label className="label">Phone</label><input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Date of Birth</label><input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></div>
                <div className="form-group">
                  <label className="label">Gender</label>
                  <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="label">Address / City</label><input className="input" placeholder="Hyderabad, Telangana" value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
              <button type="button" className="btn btn-primary w-full" onClick={() => { if (!form.firstName || !form.lastName || !form.email) { toast.error("Please fill required fields"); return; } setStep(2); }}>Continue →</button>
            </>
          )}

          {/* ── Step 2: Professional Info ── */}
          {step === 2 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Specialty *</label>
                  <select className="input" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} required>
                    <option value="">Select specialty...</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="label">Sub-Specialty</label><input className="input" placeholder="Interventional Cardiology" value={form.subSpecialty} onChange={(e) => set("subSpecialty", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Experience (years) *</label><input type="number" min="0" className="input" placeholder="5" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} required /></div>
                <div className="form-group"><label className="label">Consultation Fee (₹) *</label><input type="number" min="0" className="input" placeholder="500" value={form.consultationFee} onChange={(e) => set("consultationFee", e.target.value)} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Medical License No. *</label><input className="input" placeholder="MCI-XXXX-XXXXXX" value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} required /></div>
                <div className="form-group"><label className="label">License Expiry</label><input type="date" className="input" value={form.licenseExpiry} onChange={(e) => set("licenseExpiry", e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="label">Qualifications *</label><input className="input" placeholder="MBBS - AIIMS Delhi, MD Cardiology - JIPMER" value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} required /></div>
              <div className="form-group"><label className="label">Hospital / Clinic</label><input className="input" placeholder="Apollo Hospital, Hyderabad" value={form.hospital} onChange={(e) => set("hospital", e.target.value)} /></div>
              <div className="form-group">
                <label className="label">Languages Spoken</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
                  {LANGUAGES.map((lang) => (
                    <button key={lang} type="button"
                      style={{ padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.8rem", border: `1px solid ${selectedLanguages.includes(lang) ? "var(--accent-primary)" : "var(--border)"}`, background: selectedLanguages.includes(lang) ? "rgba(37,99,235,0.1)" : "transparent", color: selectedLanguages.includes(lang) ? "var(--accent-primary)" : "var(--text-secondary)", cursor: "pointer", transition: "var(--transition)" }}
                      onClick={() => toggleLanguage(lang)}
                    >{lang}</button>
                  ))}
                </div>
              </div>
              <div className="form-group"><label className="label">Short Bio</label><textarea className="input" rows={3} placeholder="Tell us about your clinical practice and expertise..." value={form.bio} onChange={(e) => set("bio", e.target.value)} style={{ resize: "vertical" }} maxLength={600} /></div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={() => { if (!form.specialty || !form.experienceYears || !form.licenseNumber || !form.qualifications || !form.consultationFee) { toast.error("Please fill required fields"); return; } setStep(3); }}>Continue →</button>
              </div>
            </>
          )}

          {/* ── Step 3: Documents ── */}
          {step === 3 && (
            <>
              <div style={{ padding: "0.75rem 1rem", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <AlertCircle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: "0.8rem", color: "#92400e", lineHeight: 1.5 }}>All documents must be clear, readable scans or photos. PDFs and images (JPG/PNG) are accepted. Max 10MB per file.</p>
              </div>

              <FileUploadBox label="Profile Photo" name="profilePhoto" accept="image/jpeg,image/png,image/webp" multiple={false} files={uploadedFiles.profilePhoto} onAdd={handleFilesAdd} onRemove={handleFileRemove} hint="A clear headshot photo (JPG/PNG). Used as your profile picture." />
              <FileUploadBox label="Medical License Document" name="licenseDoc" accept="image/jpeg,image/png,application/pdf" multiple={false} files={uploadedFiles.licenseDoc} onAdd={handleFilesAdd} onRemove={handleFileRemove} required hint="Upload your current MCI/State Medical Council registration certificate." />
              <FileUploadBox label="Government ID Proof" name="idProof" accept="image/jpeg,image/png,application/pdf" multiple={false} files={uploadedFiles.idProof} onAdd={handleFilesAdd} onRemove={handleFileRemove} hint="Aadhar card, Passport, or PAN card." />
              <FileUploadBox label="Degree Certificates" name="certificates" accept="image/jpeg,image/png,application/pdf" multiple={true} files={uploadedFiles.certificates} onAdd={handleFilesAdd} onRemove={handleFileRemove} hint="Upload your MBBS, MD, MS, or other relevant degree certificates. Up to 5 files." />

              <div className="flex gap-2" style={{ marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? <><span className="spinner-sm" /> Uploading...</> : <><Send size={15} /> Submit Application</>}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-footer-text">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </div>
    </div>
  );
}
