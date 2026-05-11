import { Link } from "react-router-dom";
import { Stethoscope, Mail, Phone, MapPin } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="flex items-center gap-2" style={{ marginBottom: "1rem" }}>
              <div className="navbar-logo-icon"><Stethoscope size={20} /></div>
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)" }}>MediCare</span>
            </div>
            <p className="footer-desc">Providing comprehensive healthcare management and telemedicine solutions. Your health, our priority.</p>
          </div>

          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <Link to="/our-doctors">Our Doctors</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Services</h4>
            <div className="footer-links">
              <Link to="/register">Book Appointment</Link>
              <Link to="/register">Telemedicine</Link>
              <Link to="/register">Medical Records</Link>
              <Link to="/apply-doctor">Apply as Doctor</Link>
            </div>
          </div>

          <div>
            <h4 className="footer-heading">Contact</h4>
            <div className="footer-contact">
              <p><MapPin size={14} /> 123 Healthcare Ave, Medical District</p>
              <p><Phone size={14} /> +91 98765 43210</p>
              <p><Mail size={14} /> support@medicare.com</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} MediCare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
