import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    try {
      await authService.login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--ink)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Left decorative panel */}
      <div style={{
        width: "45%",
        background: "linear-gradient(155deg, #0d5c3a 0%, #0b1215 60%)",
        padding: "60px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", top: 20, right: -120, width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 350, height: 350, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />

        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "var(--brand-mid)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>Device4Autism</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Distributor Delivery System</div>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 16 }}>
            Smarter delivery,<br />every single day.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 360 }}>
            Manage your delivery agents, track picklist assignments, upload invoices and monitor day-end settlements — all in one place.
          </p>
        </div>

        {/* Feature bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "📦", text: "Real-time delivery tracking" },
            { icon: "📊", text: "Excel invoice upload & processing" },
            { icon: "🚚", text: "Agent assignment & routing" },
            { icon: "✅", text: "Day-end approval workflow" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>{f.icon}</div>
              <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div style={{
        flex: 1,
        background: "var(--ink-5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 380,
          animation: "fadeUp 0.5s ease both",
        }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 28, fontWeight: 800,
              color: "var(--ink)", marginBottom: 8,
            }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: "var(--ink-60)" }}>
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{
                background: "var(--danger-bg)", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-md)", padding: "12px 16px",
                fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-60)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                User ID
              </label>
              <input
                name="fake-username" autoComplete="new-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your user ID"
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1.5px solid var(--ink-10)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  background: "var(--white)", color: "var(--ink)",
                  outline: "none", transition: "border 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--brand)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
              />
              <p style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 5 }}>Default accounts: admin / manager / staff</p>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-60)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Password
              </label>
              <input
                type="password" name="fake-password" autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%", padding: "12px 14px",
                  border: "1.5px solid var(--ink-10)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                  background: "var(--white)", color: "var(--ink)",
                  outline: "none", transition: "border 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--brand)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px",
                background: loading ? "var(--ink-40)" : "var(--brand)",
                color: "#fff", border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#0a4a2e"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--brand)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Signing in…
                </>
              ) : "Sign In →"}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: "var(--ink-40)", textAlign: "center" }}>
            © 2026 Devine Distributors Pvt. Ltd. · v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
