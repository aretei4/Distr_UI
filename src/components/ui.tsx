import React from "react";

/* ── STAT CARD ─────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  colorBg?: string;
  delta?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, color = "var(--brand)", colorBg = "var(--brand-light)",
  delta, onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: "var(--white)",
      border: "1px solid var(--ink-10)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 22px",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s ease",
      animation: "fadeUp 0.4s ease both",
    }}
    onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; } }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "var(--radius-md)",
        background: colorBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>{icon}</div>
      {delta && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: delta.startsWith("+") ? "var(--success)" : "var(--danger)",
          background: delta.startsWith("+") ? "var(--success-bg)" : "var(--danger-bg)",
          padding: "3px 8px", borderRadius: 50,
        }}>{delta}</span>
      )}
    </div>
    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 5, fontWeight: 500 }}>{label}</div>
  </div>
);

/* ── STATUS BADGE ───────────────────────────── */
interface BadgeProps {
  status: string;
}

const BADGE_MAP: Record<string, { color: string; bg: string; dot: string }> = {
  PENDING:   { color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  APPROVED:  { color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  REJECTED:  { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  Delivered: { color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  Pending:   { color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  Cancelled: { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  YES:       { color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  NO:        { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  DELIVERED: { color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  FAILED:    { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  CLOSED:    { color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  ASSIGNED:  { color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
};

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const cfg = BADGE_MAP[status] ?? { color: "var(--ink-60)", bg: "var(--ink-5)", dot: "var(--ink-40)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 50,
      fontSize: 11.5, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      letterSpacing: "0.02em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

/* ── PAGE HEADER ───────────────────────────── */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 24,
  }}>
    <div>
      <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: "var(--ink-60)" }}>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* ── CARD ───────────────────────────────────── */
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = "20px 22px" }) => (
  <div style={{
    background: "var(--white)",
    border: "1px solid var(--ink-10)",
    borderRadius: "var(--radius-lg)",
    padding,
    ...style,
  }}>
    {children}
  </div>
);

/* ── TABLE WRAPPER ─────────────────────────── */
interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
  loading?: boolean;
  topRow?: React.ReactNode;   // optional extra <tr> rendered at top of <thead>
}

export const DataTable: React.FC<DataTableProps> = ({
  headers, children, empty, emptyText = "No records found", loading, topRow
}) => (
  <div style={{
    background: "var(--white)",
    border: "1px solid var(--ink-10)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  }}>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
        <thead>
          {topRow}
          <tr style={{ background: "var(--ink-5)", borderBottom: "1px solid var(--ink-10)" }}>
            {headers.map(h => (
              <th key={h} style={{
                padding: "11px 16px", fontSize: 11, fontWeight: 700,
                color: "var(--ink-40)", textTransform: "uppercase",
                letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} style={{ padding: 40, textAlign: "center", color: "var(--ink-40)", fontSize: 13 }}>Loading…</td></tr>
          ) : empty ? (
            <tr><td colSpan={headers.length} style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📭</div>
              <p style={{ fontSize: 13, color: "var(--ink-40)" }}>{emptyText}</p>
            </td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  </div>
);

/* ── TABLE ROW ─────────────────────────────── */
export const TR: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <tr
    onClick={onClick}
    style={{
      borderBottom: "1px solid var(--ink-5)",
      cursor: onClick ? "pointer" : "default",
      transition: "background 0.12s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--ink-5)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
  >
    {children}
  </tr>
);

export const TD: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; colSpan?: number }> = ({ children, style, colSpan }) => (
  <td colSpan={colSpan} style={{ padding: "13px 16px", fontSize: 13.5, color: "var(--ink-80)", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

/* ── BUTTON ─────────────────────────────────── */
interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
}

export const Btn: React.FC<BtnProps> = ({
  children, onClick, variant = "secondary", size = "md", disabled, type = "button", style,
}) => {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "none", borderRadius: "var(--radius-md)",
    fontFamily: "'Inter', sans-serif", fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.55 : 1,
    padding: size === "sm" ? "6px 14px" : "10px 20px",
    fontSize: size === "sm" ? 12 : 13.5,
    whiteSpace: "nowrap" as const,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--brand)",   color: "#fff" },
    secondary: { background: "var(--ink-5)",   color: "var(--ink-80)", border: "1px solid var(--ink-10)" },
    danger:    { background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fca5a5" },
    ghost:     { background: "transparent",    color: "var(--ink-60)" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => {
        if (!disabled) {
          if (variant === "primary") (e.currentTarget as HTMLElement).style.background = "var(--brand-dark)";
          else if (variant === "danger") (e.currentTarget as HTMLElement).style.background = "#fee2e2";
          else (e.currentTarget as HTMLElement).style.background = "var(--ink-10)";
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = variants[variant].background as string;
        }
      }}
    >
      {children}
    </button>
  );
};

/* ── SEARCH INPUT ───────────────────────────── */
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value, onChange, placeholder = "Search…", width = "280px",
}) => (
  <div style={{ position: "relative", width }}>
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-40)" }}
    >
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "9px 12px 9px 36px",
        border: "1.5px solid var(--ink-10)",
        borderRadius: "var(--radius-md)",
        fontSize: 13, fontFamily: "'Inter', sans-serif",
        background: "var(--white)", color: "var(--ink)",
        outline: "none", transition: "border 0.2s",
      }}
      onFocus={e => e.currentTarget.style.borderColor = "var(--brand)"}
      onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
    />
  </div>
);

/* ── SELECT ─────────────────────────────────── */
interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, children, style }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      padding: "9px 32px 9px 12px",
      border: "1.5px solid var(--ink-10)",
      borderRadius: "var(--radius-md)",
      fontSize: 13, fontFamily: "'Inter', sans-serif",
      background: "var(--white)", color: "var(--ink)",
      outline: "none", cursor: "pointer", appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238fa0a8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      transition: "border 0.2s",
      ...style,
    }}
    onFocus={e => e.currentTarget.style.borderColor = "var(--brand)"}
    onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
  >
    {children}
  </select>
);

/* ── TOAST ──────────────────────────────────── */
interface ToastProps { message: string; type: "success" | "error"; }

export const Toast: React.FC<ToastProps> = ({ message, type }) => (
  <div style={{
    position: "fixed", top: 20, right: 20, zIndex: 9999,
    background: type === "success" ? "var(--brand)" : "var(--danger)",
    color: "#fff", padding: "12px 20px",
    borderRadius: "var(--radius-md)",
    fontSize: 13.5, fontWeight: 600,
    boxShadow: "var(--shadow-lg)",
    animation: "fadeUp 0.3s ease both",
    display: "flex", alignItems: "center", gap: 8,
  }}>
    {type === "success"
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
    {message}
  </div>
);

/* ── FORM FIELD ─────────────────────────────── */
interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  style?: React.CSSProperties;
}

export const Field: React.FC<FieldProps> = ({ label, children, required, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
    <label style={{
      fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)",
      textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

export const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      padding: "10px 14px",
      border: "1.5px solid var(--ink-10)",
      borderRadius: "var(--radius-md)",
      fontSize: 13.5, fontFamily: "'Inter', sans-serif",
      background: "var(--white)", color: "var(--ink)",
      outline: "none", transition: "border 0.2s",
    }}
    onFocus={e => e.currentTarget.style.borderColor = "var(--brand)"}
    onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
  />
);
