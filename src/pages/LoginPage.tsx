import '../styles/pages/LoginPage.css';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { ApiEndpoints, setCompanyBaseUrl, setCompanyInfo } from "../constants/config";
import { api } from "../services/apiClient";

/* ── Company search result ────────────────────────────────────────────────── */
interface Company {
  id:      number;
  name:    string;
  code:    string;
  baseUrl: string;
}

/* ── Feature bullets for left panel ──────────────────────────────────────── */
const FEATURES = [
  {
    text: "Distributor to retail delivery management",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    text: "OTP-based delivery confirmation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
        <path d="M9 7h6"/><path d="M9 11h3"/>
      </svg>
    ),
  },
  {
    text: "Google Maps routing to retail outlets",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    text: "Day-end approval workflow",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
];

/* ── Shared input style ───────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px",
  border: "1.5px solid var(--ink-10)",
  borderRadius: "var(--radius-md)",
  fontSize: 14, fontFamily: "'Inter', sans-serif",
  background: "var(--white)", color: "var(--ink)",
  outline: "none", transition: "border 0.2s",
  boxSizing: "border-box",
};

/* ── Login page ───────────────────────────────────────────────────────────── */
const Login: React.FC = () => {
  const navigate = useNavigate();

  // Company search state
  const [companyQuery,    setCompanyQuery]    = useState("");
  const [companyResults,  setCompanyResults]  = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyLoading,  setCompanyLoading]  = useState(false);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Debounced company search */
  const searchCompany = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 1) { setCompanyResults([]); setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setCompanyLoading(true);
      try {
        const data: Company[] = await api.get<Company[]>(ApiEndpoints.COMPANY_SEARCH(q.trim()));
        setCompanyResults(data);
        setDropdownOpen(true);
      } catch {
        setCompanyResults([]);
      } finally {
        setCompanyLoading(false);
      }
    }, 300);
  }, []);

  const handleCompanyInput = (val: string) => {
    setCompanyQuery(val);
    setSelectedCompany(null);
    searchCompany(val);
  };

  const selectCompany = (c: Company) => {
    setSelectedCompany(c);
    setCompanyQuery(c.name);
    setDropdownOpen(false);
    setCompanyResults([]);
    setCompanyBaseUrl(c.baseUrl);                           // ← all API calls use this company's URL
    setCompanyInfo({ id: c.id, name: c.name, code: c.code }); // ← persist name for display
  };

  const clearCompany = () => {
    setSelectedCompany(null);
    setCompanyQuery("");
    setCompanyResults([]);
    setDropdownOpen(false);
    setCompanyBaseUrl(null);   // ← revert to default env URL
    setCompanyInfo(null);      // ← clear stored name
  };

  /* Login submit */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both user ID and password.");
      return;
    }
    setLoading(true);
    try {
      await authService.login(username.trim(), password, selectedCompany?.code);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "var(--ink)", overflow: "hidden",
    }}>
      {/* ── Left panel ── */}
      <div style={{
        width: "45%", flexShrink: 0,
        background: "linear-gradient(155deg, #7f35b2 0%, #1e0a3c 60%)",
        padding: "60px 56px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80,   right: -80,  width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", top:  20,   right: -120, width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom:-100, left: -60,  width: 350, height: 350, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />

        {/* Logo + headline */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>Direco</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Distributor to Retail Connect</div>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 16 }}>
            Distributor to<br />Retail Connect.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 360 }}>
            Seamlessly connect distributors with retail outlets — track deliveries, confirm orders with OTP, and navigate routes via Google Maps.
          </p>
        </div>

        {/* Feature bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{f.icon}</div>
              <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1, background: "var(--ink-5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px",
      }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.5s ease both" }}>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: "var(--ink-60)" }}>
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Error banner */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-md)", padding: "12px 16px",
                fontSize: 13, color: "#991b1b", display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* ── Company search ── */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink-60)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Company
              </label>
              <div ref={companyRef} style={{ position: "relative" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  {/* Search icon */}
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="var(--ink-40)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: "absolute", left: 12, pointerEvents: "none", flexShrink: 0 }}
                  >
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>

                  <input
                    value={companyQuery}
                    onChange={e => handleCompanyInput(e.target.value)}
                    onFocus={() => { if (companyResults.length > 0) setDropdownOpen(true); }}
                    placeholder="Search company name or code..."
                    autoComplete="off"
                    style={{
                      ...inputStyle,
                      paddingLeft: 36,
                      paddingRight: selectedCompany || companyLoading ? 36 : 14,
                      borderColor: selectedCompany ? "var(--brand)" : "var(--ink-10)",
                      background: selectedCompany ? "var(--brand-xlight)" : "var(--white)",
                    }}
                    onFocusCapture={e => { e.currentTarget.style.borderColor = selectedCompany ? "var(--brand)" : "var(--brand)"; }}
                    onBlurCapture={e => { e.currentTarget.style.borderColor = selectedCompany ? "var(--brand)" : "var(--ink-10)"; }}
                  />

                  {/* Loading spinner */}
                  {companyLoading && (
                    <div style={{
                      position: "absolute", right: 12,
                      width: 14, height: 14,
                      border: "2px solid var(--ink-10)",
                      borderTopColor: "var(--brand)",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      pointerEvents: "none",
                    }} />
                  )}

                  {/* Clear button */}
                  {selectedCompany && !companyLoading && (
                    <button
                      type="button"
                      onClick={clearCompany}
                      style={{
                        position: "absolute", right: 10,
                        width: 20, height: 20, borderRadius: "50%",
                        border: "none", background: "var(--brand)",
                        color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, lineHeight: 1,
                      }}
                    >✕</button>
                  )}
                </div>

                {/* Selected company chip */}
                {selectedCompany && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 50,
                      background: "var(--brand-light)", color: "var(--brand)",
                      border: "1px solid var(--brand)",
                    }}>{selectedCompany.code}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500 }}>{selectedCompany.name}</span>
                  </div>
                )}

                {/* Dropdown */}
                {dropdownOpen && companyResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "#fff",
                    border: "1.5px solid var(--brand)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 100,
                    maxHeight: 220, overflowY: "auto",
                  }}>
                    {companyResults.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectCompany(c)}
                        style={{
                          width: "100%", padding: "10px 14px",
                          background: "none", border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 12,
                          borderBottom: i < companyResults.length - 1 ? "1px solid var(--ink-5)" : "none",
                          textAlign: "left",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--brand-xlight)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: "var(--brand-light)", color: "var(--brand)",
                          flexShrink: 0, fontFamily: "monospace",
                        }}>{c.code}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {dropdownOpen && !companyLoading && companyResults.length === 0 && companyQuery.trim().length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "#fff", border: "1.5px solid var(--ink-10)",
                    borderRadius: "var(--radius-md)", padding: "14px 16px",
                    fontSize: 13, color: "var(--ink-40)", zIndex: 100,
                  }}>
                    No companies found for "{companyQuery}"
                  </div>
                )}
              </div>
            </div>

            {/* ── User ID ── */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink-60)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                User ID
              </label>
              <input
                name="uid" autoComplete="new-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your user ID"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={e =>  (e.currentTarget.style.borderColor = "var(--ink-10)")}
              />
            </div>

            {/* ── Password ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Password
                </label>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--brand)", fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  name="pwd" autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                  onBlur={e =>  (e.currentTarget.style.borderColor = "var(--ink-10)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--ink-40)", padding: 2, display: "flex", alignItems: "center",
                  }}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── Sign In button ── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "13px",
                background: loading ? "var(--ink-40)" : "var(--brand)",
                color: "#fff", border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 15, fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--brand-dark)"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--brand)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: "var(--ink-40)", textAlign: "center" }}>
            &copy; 2026 Direco &middot; Distributor to Retail Connect &middot; v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
