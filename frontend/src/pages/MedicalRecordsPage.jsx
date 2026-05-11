import { useEffect, useState, useRef } from "react";
import { recordAPI } from "../api/index.js";
import { useAuthStore } from "../store/authStore.js";
import toast from "react-hot-toast";
import { FolderOpen, Upload, File, Trash2, Eye, X } from "lucide-react";
import { format } from "date-fns";

const fileTypeColors = {
  lab_report: "badge-blue", imaging: "badge-cyan", prescription: "badge-yellow",
  vaccination: "badge-green", discharge_summary: "badge-gray", insurance: "badge-gray", other: "badge-gray",
};

export default function MedicalRecordsPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: "", fileType: "lab_report", description: "", recordDate: "" });
  const fileRef = useRef();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await recordAPI.getAll();
      setRecords(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files[0]) return toast.error("Please select a file");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", fileRef.current.files[0]);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await recordAPI.upload(fd);
      toast.success("Record uploaded successfully");
      setShowUpload(false);
      setForm({ title: "", fileType: "lab_report", description: "", recordDate: "" });
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await recordAPI.delete(id);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center page-header">
        <div>
          <h1>Medical Records</h1>
          <p>Manage and access your health documents</p>
        </div>
        {(user?.role === "patient" || user?.role === "doctor") && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={16} /> Upload Record
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Upload Medical Record</h2>
              <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem" }} onClick={() => setShowUpload(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="label">Title</label>
                <input className="input" placeholder="e.g., Blood Test Report" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">File Type</label>
                  <select className="input" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
                    {["lab_report", "imaging", "prescription", "vaccination", "discharge_summary", "insurance", "other"].map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Record Date</label>
                  <input type="date" className="input" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Optional notes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
              </div>
              <div className="form-group">
                <label className="label">File (PDF, JPG, PNG, DOC — max 10MB)</label>
                <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="input" style={{ paddingTop: "0.5rem" }} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={uploading}>
                {uploading ? <span className="spinner-sm" /> : <><Upload size={15} /> Upload</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : records.length === 0 ? (
        <div className="empty-state card">
          <FolderOpen size={48} />
          <p>No records uploaded yet</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {records.map((record) => (
            <div key={record._id} className="card">
              <div className="flex justify-between items-center" style={{ marginBottom: "0.75rem" }}>
                <div className="stat-icon" style={{ background: "rgba(59,130,246,0.1)", width: 40, height: 40 }}>
                  <File size={18} color="#60a5fa" />
                </div>
                <span className={`badge ${fileTypeColors[record.fileType] || "badge-gray"}`}>
                  {record.fileType?.replace(/_/g, " ")}
                </span>
              </div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>{record.title}</p>
              {record.description && <p className="text-xs text-muted" style={{ marginBottom: "0.5rem" }}>{record.description}</p>}
              <p className="text-xs text-muted">
                Uploaded by {record.uploadedBy?.firstName} {record.uploadedBy?.lastName} · {record.createdAt ? format(new Date(record.createdAt), "MMM d, yyyy") : ""}
              </p>
              <div className="flex gap-2" style={{ marginTop: "0.875rem" }}>
                <a href={record.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem" }}>
                  <Eye size={14} /> View
                </a>
                {user?.role !== "doctor" && (
                  <button className="btn btn-danger" style={{ padding: "0.5rem 0.75rem" }} onClick={() => handleDelete(record._id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
