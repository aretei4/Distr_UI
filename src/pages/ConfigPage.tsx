import '../styles/pages/ConfigPage.css';
import React, { useEffect, useState, useCallback } from "react";
import { PageHeader, Card, Toast } from "../components/ui";
import { ApiEndpoints } from "../constants/config";
import { authService } from "../services/authService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureFlag {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
  category: string;
  updatedAt: string | null;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = authService.getToken?.() ?? localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Category icon map ─────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Delivery: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  "Day End": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  "Payment Modes": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Operations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
  Dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
};

const CATEGORY_COLOR: Record<string, { accent: string; bg: string }> = {
  Delivery:        { accent: "#7c3aed", bg: "#f5f3ff" },
  "Day End":       { accent: "#0369a1", bg: "#f0f9ff" },
  "Payment Modes": { accent: "#0d7a4e", bg: "#f0fdf4" },
  Operations:      { accent: "#b45309", bg: "#fffbeb" },
  Dashboard:       { accent: "#be185d", bg: "#fdf2f8" },
};

// ── Toggle switch ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  saving?: boolean;
}> = ({ checked, onChange, saving }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !saving && onChange(!checked)}
      disabled={saving}
      style={{
        position: "relative",
        width: 48, height: 26,
        borderRadius: 13,
        border: "none",
        cursor: saving ? "wait" : "pointer",
        background: checked ? "#7c3aed" : "#d1d5db",
        transition: "background 0.2s ease",
        flexShrink: 0,
        outline: "none",
        opacity: saving ? 0.7 : 1,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3, left: checked ? 25 : 3,
        width: 20, height: 20,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        transition: "left 0.2s ease",
      }} />
    </button>
  );
};

// ── Feature row ───────────────────────────────────────────────────────────────

const FeatureRow: React.FC<{
  feature: FeatureFlag;
  onToggle: (key: string, val: boolean) => void;
  saving: boolean;
}> = ({ feature, onToggle, saving }) => (
  <div style={{
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 0",
    borderBottom: "1px solid var(--ink-5)",
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 13.5, fontWeight: 600, color: "var(--ink)",
          fontFamily: "'Inter', sans-serif",
        }}>
          {feature.label}
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          color: feature.enabled ? "#065f46" : "#991b1b",
          background: feature.enabled ? "#d1fae5" : "#fee2e2",
          padding: "2px 8px", borderRadius: 50,
          letterSpacing: "0.04em",
        }}>
          {feature.enabled ? "ON" : "OFF"}
        </span>
      </div>
      <p style={{
        fontSize: 12.5, color: "var(--ink-60)",
        lineHeight: 1.6, margin: 0,
      }}>
        {feature.description}
      </p>
      {feature.updatedAt && (
        <p style={{ fontSize: 11, color: "var(--ink-40)", margin: "4px 0 0" }}>
          Last changed: {new Date(feature.updatedAt).toLocaleString("en-IN")}
        </p>
      )}
    </div>
    <div style={{ paddingTop: 2 }}>
      <Toggle
        checked={feature.enabled}
        onChange={(v) => onToggle(feature.key, v)}
        saving={saving}
      />
    </div>
  </div>
);

// ── Category section ──────────────────────────────────────────────────────────

const CategorySection: React.FC<{
  category: string;
  features: FeatureFlag[];
  onToggle: (key: string, val: boolean) => void;
  savingKey: string | null;
}> = ({ category, features, onToggle, savingKey }) => {
  const cfg = CATEGORY_COLOR[category] ?? { accent: "#6b7280", bg: "#f9fafb" };
  const icon = CATEGORY_ICON[category];
  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <Card style={{ marginBottom: 20, overflow: "hidden" }} padding="0">
      {/* Category header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: cfg.bg,
        borderBottom: "1px solid var(--ink-10)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "var(--radius-md)",
            background: cfg.accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: cfg.accent,
          }}>
            {icon}
          </div>
          <div>
            <h3 style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0,
            }}>
              {category}
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--ink-40)", margin: 0, marginTop: 1 }}>
              {enabledCount} of {features.length} features enabled
            </p>
          </div>
        </div>
        {/* Mini progress bar */}
        <div style={{ width: 80, height: 5, background: "var(--ink-10)", borderRadius: 3 }}>
          <div style={{
            width: `${features.length ? (enabledCount / features.length) * 100 : 0}%`,
            height: "100%", background: cfg.accent, borderRadius: 3,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Feature rows */}
      <div style={{ padding: "0 20px" }}>
        {features.map((f, i) => (
          <FeatureRow
            key={f.key}
            feature={f}
            onToggle={onToggle}
            saving={savingKey === f.key}
          />
        ))}
      </div>
    </Card>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ConfigPage: React.FC = () => {
  const [features, setFeatures]   = useState<FeatureFlag[]>([]);
  const [loading, setLoading]     = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast]         = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(ApiEndpoints.FEATURE_FLAGS, {
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeatureFlag[] = await res.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast("Failed to load feature configuration", "error");
      // Fallback demo data so the page is still usable
      setFeatures(DEMO_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toggle ────────────────────────────────────────────────────────────────

  const handleToggle = async (key: string, enabled: boolean) => {
    // Optimistic update
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
    setSavingKey(key);
    try {
      const res = await fetch(ApiEndpoints.FEATURE_TOGGLE(key), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: FeatureFlag = await res.json();
      // Sync with server response (picks up updatedAt)
      setFeatures(prev => prev.map(f => f.key === key ? updated : f));
      const label = features.find(f => f.key === key)?.label ?? key;
      showToast(`${label} ${enabled ? "enabled" : "disabled"}`, "success");
    } catch {
      // Rollback on failure
      setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f));
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSavingKey(null);
    }
  };

  // ── Group by category ─────────────────────────────────────────────────────

  const grouped = features.reduce<Record<string, FeatureFlag[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const categoryOrder = ["Delivery", "Day End", "Payment Modes", "Operations", "Dashboard"];
  const sortedCategories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)),
  ];

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalEnabled  = features.filter(f => f.enabled).length;
  const totalDisabled = features.length - totalEnabled;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-up">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="Feature Configuration"
        subtitle="Enable or disable app features across all delivery agents and staff"
      />

      {/* ── Summary chips ── */}
      {!loading && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <SummaryChip
            label="Total Features"
            value={features.length}
            color="#6b7280"
            bg="#f3f4f6"
          />
          <SummaryChip
            label="Enabled"
            value={totalEnabled}
            color="#065f46"
            bg="#d1fae5"
          />
          <SummaryChip
            label="Disabled"
            value={totalDisabled}
            color="#991b1b"
            bg="#fee2e2"
          />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <button
              onClick={load}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--ink-10)", background: "var(--white)",
                cursor: "pointer", fontSize: 13, color: "var(--ink-60)",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 180, borderRadius: "var(--radius-lg)",
              background: "var(--ink-5)", animation: "pulse 1.5s ease infinite",
            }} />
          ))}
        </div>
      )}

      {/* ── Category sections ── */}
      {!loading && sortedCategories.map(cat => (
        <CategorySection
          key={cat}
          category={cat}
          features={grouped[cat]}
          onToggle={handleToggle}
          savingKey={savingKey}
        />
      ))}

      {/* ── Empty state ── */}
      {!loading && features.length === 0 && (
        <Card padding="40px" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
          <p style={{ color: "var(--ink-60)", fontSize: 14 }}>
            No feature flags found. Run the SQL seed script to populate defaults.
          </p>
        </Card>
      )}

      {/* ── SQL hint for setup ── */}
      {!loading && features.length === 0 && (
        <Card padding="20px" style={{ marginTop: 16, background: "#1e1e2e", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontFamily: "monospace", fontSize: 11.5, color: "#a6e3a1", margin: 0, lineHeight: 1.8 }}>
            {`-- Run in your PostgreSQL database:\nCREATE TABLE IF NOT EXISTS feature_config (\n  key VARCHAR(100) PRIMARY KEY,\n  enabled BOOLEAN DEFAULT TRUE,\n  label VARCHAR(200) NOT NULL,\n  description TEXT,\n  category VARCHAR(100) DEFAULT 'General',\n  updated_at TIMESTAMP DEFAULT NOW()\n);`}
          </p>
        </Card>
      )}
    </div>
  );
};

// ── Summary chip ──────────────────────────────────────────────────────────────

const SummaryChip: React.FC<{
  label: string; value: number; color: string; bg: string;
}> = ({ label, value, color, bg }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 18px", borderRadius: "var(--radius-lg)",
    background: bg, border: `1px solid ${color}22`,
  }}>
    <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Inter', sans-serif" }}>
      {value}
    </span>
    <span style={{ fontSize: 12.5, color, fontWeight: 500 }}>{label}</span>
  </div>
);

// ── Demo fallback data ────────────────────────────────────────────────────────

const DEMO_FLAGS: FeatureFlag[] = [
  { key: "OTP_VERIFICATION",         enabled: true,  label: "OTP Verification",           description: "Require OTP from customer to confirm delivery",              category: "Delivery",       updatedAt: null },
  { key: "SMART_ROUTE",              enabled: true,  label: "Smart Route",                 description: "Enable smart route optimisation for delivery agents",        category: "Delivery",       updatedAt: null },
  { key: "DELIVERY_MAP",             enabled: true,  label: "Delivery Map",                description: "Show real-time delivery locations on map",                   category: "Delivery",       updatedAt: null },
  { key: "CUSTOMER_LOCATION_UPDATE", enabled: true,  label: "Customer Location Update",    description: "Auto-update customer coordinates from delivery GPS",         category: "Delivery",       updatedAt: null },
  { key: "DAY_END_APPROVAL",         enabled: true,  label: "Day-End Approval",            description: "Require manager approval before day-end is closed",          category: "Day End",        updatedAt: null },
  { key: "DAY_END_AUTO_REJECT",      enabled: false, label: "Auto-Reject After 24h",       description: "Automatically reject pending day-end after 24 hours",        category: "Day End",        updatedAt: null },
  { key: "PAYMENT_CASH",             enabled: true,  label: "Cash Payment",                description: "Allow CASH as payment mode in delivery app",                 category: "Payment Modes",  updatedAt: null },
  { key: "PAYMENT_UPI",              enabled: true,  label: "UPI Payment",                 description: "Allow UPI as payment mode in delivery app",                  category: "Payment Modes",  updatedAt: null },
  { key: "PAYMENT_CHEQUE",           enabled: true,  label: "Cheque Payment",              description: "Allow CHEQUE as payment mode in delivery app",               category: "Payment Modes",  updatedAt: null },
  { key: "PAYMENT_NEFT",             enabled: true,  label: "NEFT / Bank Transfer",        description: "Allow NEFT as payment mode in delivery app",                 category: "Payment Modes",  updatedAt: null },
  { key: "PAYMENT_CARD",             enabled: false, label: "Card Payment",                description: "Allow CARD as payment mode in delivery app",                 category: "Payment Modes",  updatedAt: null },
  { key: "PARTIAL_DELIVERY",         enabled: false, label: "Partial Delivery",            description: "Allow agents to mark partial delivery for a picklist",       category: "Operations",     updatedAt: null },
  { key: "ROUTE_SHARING",            enabled: false, label: "Route Sharing",               description: "Allow agents to share their route link with customers",      category: "Operations",     updatedAt: null },
  { key: "SALES_EDIT",               enabled: true,  label: "Sales Edit",                  description: "Allow staff to edit sales entry values in the portal",       category: "Operations",     updatedAt: null },
  { key: "DASHBOARD_NET_VALUE",      enabled: true,  label: "Show Net Value on Dashboard", description: "Display net value totals on the delivery dashboard",         category: "Dashboard",      updatedAt: null },
];

export default ConfigPage;
