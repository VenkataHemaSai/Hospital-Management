import { Link } from "react-router-dom";
import { Calendar, Video, FileText, Shield, ArrowRight, Star, Users, Clock, Stethoscope, Heart, Zap } from "lucide-react";
import "./Public.css";

const features = [
  { icon: Calendar, title: "Easy Scheduling", desc: "Book appointments with top specialists in just a few clicks. No phone calls needed.", color: "#2563eb", bg: "#dbeafe" },
  { icon: Video, title: "Telemedicine", desc: "Connect with your doctor from anywhere through secure video consultations.", color: "#0891b2", bg: "#cffafe" },
  { icon: FileText, title: "Digital Records", desc: "Access your medical records, prescriptions, and reports anytime, anywhere.", color: "#7c3aed", bg: "#ede9fe" },
  { icon: Shield, title: "Secure & Private", desc: "Your health data is encrypted and protected with industry-standard security.", color: "#059669", bg: "#d1fae5" },
];

const stats = [
  { value: "50+", label: "Expert Doctors" },
  { value: "10K+", label: "Happy Patients" },
  { value: "24/7", label: "Support" },
  { value: "98%", label: "Satisfaction Rate" },
];

export default function HomePage() {
  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-inner">
          <div className="hero-content">
            <span className="hero-badge"><Zap size={14} /> Trusted by 10,000+ patients</span>
            <h1 className="hero-title">Your Health, <br /><span className="hero-highlight">Our Priority</span></h1>
            <p className="hero-subtitle">Experience modern healthcare with easy appointment booking, telemedicine consultations, and secure digital health records — all in one platform.</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started Free <ArrowRight size={18} /></Link>
              <Link to="/our-doctors" className="btn btn-outline-primary btn-lg">Browse Doctors</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-main">
              <div className="hero-card-header">
                <div className="avatar" style={{ width: 48, height: 48, fontSize: "1.1rem" }}>DK</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1rem" }}>Dr. Kavita Sharma</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Cardiologist · 15 yrs exp</p>
                </div>
              </div>
              <div className="hero-card-stats">
                <div><Star size={14} color="#f59e0b" /> <strong>4.9</strong> Rating</div>
                <div><Users size={14} color="#2563eb" /> <strong>2.4K</strong> Patients</div>
                <div><Clock size={14} color="#059669" /> <strong>Available</strong> Today</div>
              </div>
              <Link to="/register" className="btn btn-primary w-full" style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>Book Appointment</Link>
            </div>
            <div className="hero-floating-badge badge-1"><Heart size={16} color="#ef4444" /> Healthy Heart ✓</div>
            <div className="hero-floating-badge badge-2"><Stethoscope size={16} color="#2563eb" /> 50+ Specialists</div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-bar">
            {stats.map((s) => (
              <div key={s.label} className="stats-item">
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Why MediCare</span>
            <h2>Everything You Need For Better Healthcare</h2>
            <p>A complete platform designed to make healthcare simple, accessible, and efficient for everyone.</p>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" style={{ background: f.bg }}><f.icon size={24} color={f.color} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2>Get Started in 3 Simple Steps</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Create Account</h3>
              <p>Sign up as a patient in under a minute. It's completely free.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Find a Doctor</h3>
              <p>Browse verified specialists, check availability, and read reviews.</p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Book & Consult</h3>
              <p>Schedule an appointment, get consulted online or in-person, and receive prescriptions digitally.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to Take Control of Your Health?</h2>
            <p>Join thousands of patients and doctors who trust MediCare for their healthcare needs.</p>
            <div className="flex gap-3 justify-center" style={{ marginTop: "1.5rem" }}>
              <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link to="/contact" className="btn btn-outline-primary btn-lg" style={{ borderColor: "white", color: "white" }}>Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
