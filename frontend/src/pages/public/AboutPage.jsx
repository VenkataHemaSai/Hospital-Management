import { Heart, Users, Award, Target, Clock, ShieldCheck } from "lucide-react";
import "./Public.css";

const values = [
  { icon: Heart, title: "Patient First", desc: "Every decision we make is centered around patient well-being and comfort.", color: "#ef4444", bg: "#fee2e2" },
  { icon: Users, title: "Expert Team", desc: "Our doctors are vetted specialists with years of proven clinical experience.", color: "#2563eb", bg: "#dbeafe" },
  { icon: Award, title: "Quality Care", desc: "We follow the highest medical standards and continuously improve our services.", color: "#f97316", bg: "#fff7ed" },
  { icon: Target, title: "Accessible", desc: "Healthcare should be available to everyone. Our platform breaks geographical barriers.", color: "#7c3aed", bg: "#ede9fe" },
  { icon: Clock, title: "24/7 Available", desc: "Access your health records, book appointments, and chat with doctors anytime.", color: "#0891b2", bg: "#cffafe" },
  { icon: ShieldCheck, title: "Data Privacy", desc: "Your health data is protected with end-to-end encryption and strict access controls.", color: "#059669", bg: "#d1fae5" },
];

export default function AboutPage() {
  return (
    <div className="fade-in">
      <section className="about-hero">
        <div className="container">
          <span className="section-label">About Us</span>
          <h1>Transforming Healthcare, One Patient at a Time</h1>
          <p>MediCare is a comprehensive hospital management and telemedicine platform built to make healthcare accessible, efficient, and human.</p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Our Mission</span>
            <h2>What Drives Us</h2>
            <p>We believe that quality healthcare should not be a privilege. Our mission is to leverage technology to bridge the gap between patients and healthcare providers.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Our Values</span>
            <h2>What We Stand For</h2>
          </div>
          <div className="values-grid">
            {values.map((v) => (
              <div key={v.title} className="value-card">
                <div className="feature-icon" style={{ background: v.bg, margin: "0 auto" }}><v.icon size={24} color={v.color} /></div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
