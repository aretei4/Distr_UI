import React from 'react';

const Loader: React.FC = () => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", height: "100vh",
    background: "var(--ink-5, #f4f7f8)",
  }}>
    <div style={{
      width: 36, height: 36,
      border: "3px solid #e8eef0",
      borderTopColor: "#7f35b2",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ marginTop: 14, fontSize: 13, color: "#8fa0a8", fontFamily: "'Inter', sans-serif" }}>
      Loading…
    </p>
  </div>
);

export default Loader;
