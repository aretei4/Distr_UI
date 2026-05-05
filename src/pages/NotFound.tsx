import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "60vh", textAlign: "center",
  }}>
    <div style={{
      fontFamily: "'Syne', sans-serif", fontSize: 80, fontWeight: 800,
      color: "var(--ink-20)", lineHeight: 1,
    }}>404</div>
    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: "16px 0 8px" }}>
      Page not found
    </h2>
    <p style={{ fontSize: 14, color: "var(--ink-60)", marginBottom: 24 }}>
      The page you're looking for doesn't exist or was moved.
    </p>
    <Link to="/dashboard" style={{
      padding: "10px 24px", background: "var(--brand)", color: "#fff",
      borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600,
      textDecoration: "none",
    }}>← Back to Dashboard</Link>
  </div>
);

export default NotFound;
