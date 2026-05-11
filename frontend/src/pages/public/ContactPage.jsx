import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import "./Public.css";

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+91 98765 43210", sub: "Mon-Sat, 9am-6pm IST", color: "#2563eb", bg: "#dbeafe" },
  { icon: Mail, label: "Email", value: "support@medicare.com", sub: "Typically replies within 2 hours", color: "#059669", bg: "#d1fae5" },
  { icon: MapPin, label: "Address", value: "123 Healthcare Ave, Medical District", sub: "Hyderabad, Telangana 500001", color: "#f97316", bg: "#fff7ed" },
  { icon: Clock, label: "Working Hours", value: "Mon-Sat: 9AM - 8PM", sub: "Sun: Emergency Only", color: "#7c3aed", bg: "#ede9fe" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you shortly.");
      setForm({ name: "", email: "", subject: "", message: "" });
      setSending(false);
    }, 800);
  };

  return (
    <div className="fade-in">
      <section className="about-hero">
        <div className="container">
          <span className="section-label">Contact Us</span>
          <h1>We'd Love to Hear From You</h1>
          <p>Have questions? Suggestions? Need support? Reach out to us anytime.</p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="contact-grid">
            <div className="contact-info-cards">
              {contactInfo.map((c) => (
                <div key={c.label} className="contact-info-card">
                  <div className="contact-icon-box" style={{ background: c.bg }}><c.icon size={22} color={c.color} /></div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{c.label}</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{c.value}</p>
                    <p className="text-xs text-muted">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Send us a Message</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Full Name</label>
                    <input className="input" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input className="input" placeholder="How can we help?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="label">Message</label>
                  <textarea className="input" rows={5} placeholder="Describe your query..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required style={{ resize: "vertical" }} />
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={sending}>
                  {sending ? <span className="spinner-sm" /> : <><Send size={16} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
