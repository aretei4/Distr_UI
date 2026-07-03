import '../styles/pages/DanClosePage.css';
import React, { useState, useCallback, useEffect } from "react";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";
import { PageHeader, Btn } from "../components/ui";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface DanItem   { serial: string; desc: string; billQty: number; billAmt: number; }
interface DanPicklist { no: number; direId?: number; invoiceNo?: string; picklistNo: string; custName: string; custNo: string; netValue: number; items: DanItem[]; }
interface Dan        { dan: string; date: string; agent: { id: string; name: string; code: string }; picklists: DanPicklist[]; _danId?: number; }

interface ReturnRow  extends DanItem { returnQty: string; returnAmt: string; reason: string; selected: boolean; isCustom?: boolean; }
type ReturnState   = Record<number, ReturnRow[]>;

interface ModeDetail { chequeNo: string; bankName: string; referenceNo: string; }
interface PicklistPayment {
  delivered:     boolean;
  selectedModes: string[];
  modeAmounts:   Record<string, string>;
  modeDetails:   Record<string, ModeDetail>;
  reason:        string;
}
type PaymentState = Record<number, PicklistPayment>;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS — identical palette to DayEnd
═══════════════════════════════════════════════════════════════ */
const PAYMENT_MODES = ["CASH", "UPI", "CHEQUE", "NEFT", "CARD", "CREDIT"];

const MODE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  CASH:   { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  UPI:    { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  CHEQUE: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  NEFT:   { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  CARD:   { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  CREDIT: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
};
const DEFAULT_MODE_STYLE = { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };

const STEPS = ["Choose agent", "Settle payment", "Settle returns", "Final review", "Print & submit"];

const fmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const initPayment = (): PicklistPayment => ({
  delivered: true, selectedModes: [], modeAmounts: {}, modeDetails: {}, reason: "",
});

const modeTotal = (p: PicklistPayment, excludeCredit = true) =>
  p.selectedModes
    .filter(m => !excludeCredit || m !== "CREDIT")
    .reduce((s, m) => s + (parseFloat(p.modeAmounts[m] ?? "0") || 0), 0);

interface PaymentEntry { mode: string; amount: number; chequeNo?: string; bankName?: string; referenceNo?: string; }

function parsePaymentMode(raw: string | null | undefined): PaymentEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PaymentEntry[];
  } catch { /* fall through to CSV */ }
  return raw.split(",")
    .map(s => { const [m, a] = s.trim().split(":"); return { mode: (m ?? "").trim(), amount: parseFloat(a ?? "0") || 0 }; })
    .filter(e => e.mode.length > 0);
}

function picklistToPayment(delivered: boolean, paymentMode: string | null, reason: string | null): PicklistPayment {
  const entries = parsePaymentMode(paymentMode);
  return {
    delivered,
    selectedModes: entries.map(e => e.mode),
    modeAmounts:   Object.fromEntries(entries.map(e => [e.mode, String(e.amount)])),
    modeDetails:   Object.fromEntries(entries.map(e => [e.mode, {
      chequeNo:    e.chequeNo    ?? "",
      bankName:    e.bankName    ?? "",
      referenceNo: e.referenceNo ?? "",
    }])),
    reason: reason ?? "",
  };
}


/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════════ */
function StepBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
              background: i <= step ? "var(--brand)" : "var(--ink-10)",
              color: i <= step ? "#fff" : "var(--ink-40)",
              boxShadow: i === step ? "0 0 0 3px var(--brand-light)" : "none",
              transition: "all 0.2s",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 10, fontWeight: i === step ? 700 : 400,
              color: i <= step ? "var(--brand)" : "var(--ink-40)",
              whiteSpace: "nowrap",
            }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: "0 4px", marginBottom: 14, borderRadius: 2,
              background: i < step ? "var(--brand)" : "var(--ink-10)",
              transition: "background 0.2s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const s = MODE_STYLE[mode] ?? DEFAULT_MODE_STYLE;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>{mode}</span>
  );
}

/* ── Payment breakdown (matches DayEnd expand/collapse style) ── */
function PaymentBreakdown({ payment, netValue }: { payment: PicklistPayment; netValue: number }) {
  const [expanded, setExpanded] = useState(false);
  const modes = payment.selectedModes;
  if (modes.length === 0) return <span style={{ color: "var(--ink-40)", fontSize: 12 }}>Not set</span>;

  const total    = modeTotal(payment, false);
  const overPaid = total > netValue * 1.05;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Total + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: overPaid ? "#991b1b" : "var(--ink)" }}>
          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          {overPaid && <span style={{ fontSize: 10, marginLeft: 4, color: "#ef4444" }}>⚠</span>}
        </span>
        <button onClick={() => setExpanded(v => !v)} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "1px 4px", borderRadius: 4, color: "var(--ink-40)", fontSize: 10,
        }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Collapsed: mode badges only */}
      {!expanded && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {modes.map(m => <ModeBadge key={m} mode={m} />)}
        </div>
      )}

      {/* Expanded: full detail cards */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {modes.map(m => {
            const s   = MODE_STYLE[m] ?? DEFAULT_MODE_STYLE;
            const amt = parseFloat(payment.modeAmounts[m] ?? "0") || 0;
            const d   = payment.modeDetails[m];
            return (
              <div key={m} style={{ padding: "6px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: s.color, minWidth: 50 }}>{m}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {d && (d.chequeNo || d.bankName || d.referenceNo) && (
                  <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${s.border}`, display: "flex", flexDirection: "column", gap: 2, fontSize: 10.5, color: s.color, opacity: 0.85 }}>
                    {d.chequeNo    && <span>Cheque No&nbsp;&nbsp;: <strong>{d.chequeNo}</strong></span>}
                    {d.bankName    && <span>Bank Name&nbsp;&nbsp;: <strong>{d.bankName}</strong></span>}
                    {d.referenceNo && <span>Reference No: <strong>{d.referenceNo}</strong></span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENT MODAL — same service integration as DayEnd
═══════════════════════════════════════════════════════════════ */
function PaymentModal({
  picklist, payment, onSave, onCancel,
}: {
  picklist: DanPicklist;
  payment:  PicklistPayment;
  onSave:   (p: PicklistPayment) => void;
  onCancel: () => void;
}) {
  const [p, setP]       = useState<PicklistPayment>({ ...payment });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const net = picklist.netValue;

  const upd = (key: keyof PicklistPayment, val: unknown) =>
    setP(prev => ({ ...prev, [key]: val }));

  const toggleMode = (m: string) => {
    const modes = p.selectedModes.includes(m)
      ? p.selectedModes.filter(x => x !== m)
      : [...p.selectedModes, m];
    setP(prev => ({
      ...prev,
      selectedModes: modes,
      modeDetails: prev.modeDetails[m]
        ? prev.modeDetails
        : { ...prev.modeDetails, [m]: { chequeNo: "", bankName: "", referenceNo: "" } },
    }));
  };

  const setAmount = (m: string, v: string) =>
    setP(prev => ({ ...prev, modeAmounts: { ...prev.modeAmounts, [m]: v } }));

  const setDetail = (m: string, field: keyof ModeDetail, v: string) =>
    setP(prev => ({
      ...prev,
      modeDetails: { ...prev.modeDetails, [m]: { ...(prev.modeDetails[m] ?? { chequeNo: "", bankName: "", referenceNo: "" }), [field]: v } },
    }));

  const collected   = modeTotal(p, false);   // CREDIT counts as collected
  const diff        = collected - net;
  const isOverPaid  = diff > net * 0.05;
  const isUnderPaid = p.delivered && collected > 0 && diff < -(net * 0.01);

  /* Build JSON payload — same format as DayEnd's buildPaymentModeJson */
  const buildPaymentModeJson = (): string | null => {
    if (p.selectedModes.length === 0) return null;
    const entries = p.selectedModes.map(m => {
      const d = p.modeDetails[m] ?? { chequeNo: "", bankName: "", referenceNo: "" };
      const obj: Record<string, unknown> = { mode: m, amount: parseFloat(p.modeAmounts[m] ?? "0") || 0 };
      if (m === "CHEQUE") {
        if (d.chequeNo.trim())   obj.chequeNo  = d.chequeNo.trim();
        if (d.bankName.trim())   obj.bankName  = d.bankName.trim();
      } else if (m === "UPI" || m === "NEFT" || m === "CREDIT") {
        if (d.referenceNo.trim()) obj.referenceNo = d.referenceNo.trim();
      }
      return obj;
    });
    return JSON.stringify(entries);
  };

  const validate = (): string | null => {
    if (p.delivered && p.selectedModes.length === 0) return "Select at least one payment mode for a delivered item";
    if (p.delivered && collected <= 0)               return "Payment amount must be greater than zero for delivered items";
    if (p.delivered && isOverPaid)                   return `Payment exceeds invoice by more than 5% — please verify`;
    if (!p.delivered && !p.reason.trim())             return "Please provide a reason for non-delivery";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    const paymentModeJson = p.delivered ? buildPaymentModeJson() : null;
    try {
      const res = await fetch(ApiEndpoints.UPDATE_PICKLIST(picklist.direId), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          delivered:     p.delivered,
          paymentAmount: p.delivered ? collected : 0,
          paymentMode:   paymentModeJson,
          reason:        p.reason.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to save");
      }
      onSave(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    flex: 1, padding: "8px 10px",
    border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)",
    fontSize: 13, fontFamily: "'Inter', sans-serif",
    background: "#fff", outline: "none", color: "var(--ink)",
  };
  const labelW: React.CSSProperties = { width: 110, fontSize: 12, color: "var(--ink-60)", flexShrink: 0 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div style={{
        background: "#fff", borderRadius: "var(--radius-xl)", width: 500,
        maxHeight: "88vh", overflowY: "auto",
        border: "1px solid var(--ink-10)", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px 14px", borderBottom: "1px solid var(--ink-10)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              Edit Delivery —{" "}
              {picklist.invoiceNo
                ? <span style={{ color: "var(--ink-60)", fontFamily: "monospace", fontSize: 13 }}>INV </span>
                : null}
              <span style={{ color: "var(--brand)", fontFamily: "monospace" }}>
                {picklist.invoiceNo || picklist.picklistNo}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 3 }}>
              {picklist.custName} &nbsp;·&nbsp; Invoice: {fmt(net)}
            </div>
          </div>
          <button onClick={onCancel} style={{
            width: 28, height: 28, border: "1px solid var(--ink-10)", borderRadius: 8,
            background: "var(--ink-5)", cursor: "pointer", fontSize: 14, color: "var(--ink-60)",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Delivery status */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Delivery Status
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => upd("delivered", val)} style={{
                  padding: "8px 18px", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  border: `1.5px solid ${p.delivered === val ? (val ? "#10b981" : "#ef4444") : "var(--ink-10)"}`,
                  background: p.delivered === val ? (val ? "#d1fae5" : "#fee2e2") : "#fff",
                  color: p.delivered === val ? (val ? "#065f46" : "#991b1b") : "var(--ink-60)",
                }}>
                  {val ? "✓ Delivered" : "✗ Not Delivered"}
                </button>
              ))}
            </div>
          </div>

          {/* Payment modes */}
          {p.delivered && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Payment Modes &amp; Amounts
              </div>
              {PAYMENT_MODES.map(mode => {
                const active = p.selectedModes.includes(mode);
                const s = MODE_STYLE[mode] ?? DEFAULT_MODE_STYLE;
                const d = p.modeDetails[mode] ?? { chequeNo: "", bankName: "", referenceNo: "" };
                return (
                  <div key={mode} style={{
                    borderRadius: 10, border: `1.5px solid ${active ? s.border : "var(--ink-10)"}`,
                    background: active ? s.bg : "#fafafa", overflow: "hidden", marginBottom: 6,
                  }}>
                    <button onClick={() => toggleMode(mode)} style={{
                      width: "100%", padding: "9px 14px", border: "none", cursor: "pointer",
                      background: "transparent", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${active ? s.color : "var(--ink-20)"}`,
                        background: active ? s.color : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {active && <span style={{ fontSize: 10, color: "#fff", fontWeight: 800 }}>✓</span>}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: active ? s.color : "var(--ink-60)" }}>{mode}</span>
                    </button>
                    {active && (
                      <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={labelW}>Amount (₹)</span>
                          <input type="number" min="0" step="0.01"
                            value={p.modeAmounts[mode] ?? ""}
                            onChange={e => setAmount(mode, e.target.value)}
                            placeholder="0.00" style={inp}
                          />
                        </div>
                        {mode === "CHEQUE" && (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={labelW}>Cheque No</span>
                              <input value={d.chequeNo} onChange={e => setDetail(mode, "chequeNo", e.target.value)} placeholder="e.g. 001234" style={inp}/>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={labelW}>Bank Name</span>
                              <input value={d.bankName} onChange={e => setDetail(mode, "bankName", e.target.value)} placeholder="e.g. SBI, HDFC…" style={inp}/>
                            </div>
                          </>
                        )}
                        {(mode === "UPI" || mode === "NEFT" || mode === "CREDIT") && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={labelW}>Reference No</span>
                            <input value={d.referenceNo} onChange={e => setDetail(mode, "referenceNo", e.target.value)} placeholder="UTR / UPI ref…" style={inp}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Validation panel */}
              {p.selectedModes.length > 0 && (
                <div style={{
                  marginTop: 10, borderRadius: "var(--radius-md)", overflow: "hidden",
                  border: `1.5px solid ${isOverPaid ? "#fca5a5" : isUnderPaid ? "#fcd34d" : "#6ee7b7"}`,
                }}>
                  <div style={{
                    padding: "8px 14px", fontSize: 11.5, fontWeight: 700,
                    background: isOverPaid ? "#fee2e2" : isUnderPaid ? "#fef3c7" : "#d1fae5",
                    color: isOverPaid ? "#991b1b" : isUnderPaid ? "#92400e" : "#065f46",
                  }}>
                    {isOverPaid ? "⚠ Overpaid" : isUnderPaid ? "⚠ Underpaid" : "✓ Amount looks good"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#fafafa" }}>
                    {[
                      { label: "Invoice",   val: net,       highlight: false },
                      { label: "Collected", val: collected, highlight: true  },
                      { label: "Difference",val: Math.abs(diff), highlight: false, prefix: diff === 0 ? "" : diff > 0 ? "+" : "−" },
                    ].map((c, i) => (
                      <div key={c.label} style={{ padding: "10px 14px", borderRight: i < 2 ? "1px solid #e2e8f0" : "none" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c.label === "Difference" ? (diff === 0 ? "#065f46" : isOverPaid ? "#991b1b" : "#92400e") : c.highlight ? "var(--brand)" : "var(--ink)" }}>
                          {c.label === "Difference" && diff !== 0 ? `${c.prefix}₹${Math.abs(diff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : c.label === "Difference" && diff === 0 ? "—" : fmt(c.val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {p.delivered ? "Remarks (optional)" : "Reason for Non-Delivery *"}
            </div>
            <textarea rows={2} value={p.reason} onChange={e => upd("reason", e.target.value)}
              placeholder={p.delivered ? "Any remarks…" : "e.g. Customer unavailable…"}
              style={{ ...inp, width: "100%", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--ink-10)", flexShrink: 0 }}>
          {error && (
            <div style={{ fontSize: 12, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              ⚠ {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED STEP NAVIGATION FOOTER
═══════════════════════════════════════════════════════════════ */
function StepNav({
  onBack, onNext, onSaveClose, nextLabel = "Next →", nextDisabled = false,
}: {
  onBack?:       () => void;
  onNext?:       () => void;
  onSaveClose:   () => void;
  nextLabel?:    string;
  nextDisabled?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--ink-10)",
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        {onBack && <Btn variant="secondary" onClick={onBack}>← Back</Btn>}
        <button onClick={onSaveClose} style={{
          padding: "9px 18px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600,
          border: "1.5px solid var(--ink-10)", background: "#fff", color: "var(--ink-60)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          💾 Save &amp; Close
        </button>
      </div>
      {onNext && (
        <Btn variant="primary" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Btn>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 1 — Choose Agent
═══════════════════════════════════════════════════════════════ */
function Step1({ dans, onNext, onSaveClose }: { dans: Dan[]; onNext: (d: Dan) => void; onSaveClose: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const chosen = dans.find(d => d.dan === sel) ?? null;
  return (
    <div>
      <SectionTitle>Choose agent</SectionTitle>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginBottom: 20 }}>Select the DAN to close for this agent</div>

      {dans.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 0",
          border: "1.5px dashed var(--ink-10)", borderRadius: 12,
          color: "var(--ink-40)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No active DANs for today</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>There are no agents with pending day-end settlement</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {dans.map(d => {
              const active = sel === d.dan;
              const total  = d.picklists.reduce((a, p) => a + p.netValue, 0);
              return (
                <div key={d.dan} onClick={() => setSel(d.dan)} style={{
                  border: `1.5px solid ${active ? "var(--brand)" : "var(--ink-10)"}`,
                  borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                  background: active ? "var(--brand-xlight)" : "#fff",
                  transition: "all 0.15s",
                }}>
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: active ? "var(--brand)" : "var(--brand-light)",
                        color: active ? "#fff" : "var(--brand)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, flexShrink: 0,
                      }}>{d.agent.name.slice(0, 2)}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                          {d.agent.name} <span style={{ color: "var(--ink-40)", fontWeight: 400, fontSize: 12 }}>ID {d.agent.code}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>{d.dan}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--ink-40)" }}>Date</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.date}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2 }}>
                          {d.picklists.length} orders · {fmt(total)}
                        </div>
                      </div>
                      {active && <span style={{ fontSize: 20, color: "var(--brand)" }}>✓</span>}
                    </div>
                  </div>

                  {/* Invoice number chips — shown for all cards */}
                  {d.picklists.length > 0 && (
                    <div style={{
                      marginTop: 10, paddingTop: 10,
                      borderTop: `1px solid ${active ? "var(--brand-light)" : "var(--ink-5)"}`,
                      display: "flex", flexWrap: "wrap", gap: 6,
                    }}>
                      {d.picklists.map(p => (
                        <span key={p.no} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 600, padding: "3px 8px",
                          borderRadius: 6, border: "1px solid",
                          borderColor: active ? "var(--brand-light)" : "var(--ink-10)",
                          background: active ? "#fff" : "var(--ink-5)",
                          color: "var(--ink)",
                          fontFamily: "monospace",
                        }}>
                          <span style={{ color: active ? "var(--brand)" : "var(--ink-40)", fontSize: 10 }}>#{p.no}</span>
                          {p.invoiceNo || p.picklistNo}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <StepNav onNext={() => chosen && onNext(chosen)} nextDisabled={!sel} onSaveClose={onSaveClose} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 2 — Settle Returns
═══════════════════════════════════════════════════════════════ */
function Step2({ dan, initialRows, payments, onNext, onBack, onSaveClose }: { dan: Dan; initialRows: ReturnState; payments?: PaymentState; onNext: (r: ReturnState) => void; onBack: () => void; onSaveClose: () => void }) {
  const emptyInit: ReturnState = dan.picklists.reduce((acc, p) => {
    acc[p.no] = p.items.map(it => ({
      ...it, returnQty: String(it.billQty), returnAmt: String(it.billAmt), reason: "", selected: true,
    }));
    return acc;
  }, {} as ReturnState);

  const [rows, setRows]       = useState<ReturnState>(
    Object.keys(initialRows).length > 0 ? initialRows : emptyInit
  );
  const picklistsWithDireId = dan.picklists.filter(p => p.direId);
  const [loading, setLoading] = useState(Object.keys(initialRows).length === 0 && picklistsWithDireId.length > 0);

  /* Fetch previously saved returns — one call per picklist direId, merged */
  useEffect(() => {
    if (Object.keys(initialRows).length > 0 || picklistsWithDireId.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      picklistsWithDireId.map(p =>
        fetch(ApiEndpoints.DAN_RETURNS(p.direId!), { headers: authHeaders() })
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    ).then((allResults: Array<Array<{
        direId?: number; serial: string; description: string;
        billQty: number; billAmt: number; returnQty: number; returnAmt: number;
        reason: string; custom: boolean;
      }>>) => {
      const loaded: ReturnState = {};
      picklistsWithDireId.forEach((p, i) => {
        const items = allResults[i];
        if (Array.isArray(items) && items.length > 0) {
          // Use saved returns
          loaded[p.no] = items.map(r => ({
            serial:    r.serial      ?? "",
            desc:      r.description ?? "",
            billQty:   r.billQty     ?? 0,
            billAmt:   r.billAmt     ?? 0,
            returnQty: String(r.returnQty ?? 0),
            returnAmt: String(r.returnAmt ?? 0),
            reason:    r.reason      ?? "",
            selected:  true,
            isCustom:  r.custom      ?? false,
          }));
        } else if (payments?.[p.no]?.delivered === false) {
          // Not delivered — auto-fill one full-return row from picklist header data
          loaded[p.no] = [{
            serial:    p.invoiceNo || String(p.no),
            desc:      p.custName  || "",
            billQty:   1,
            billAmt:   p.netValue  ?? 0,
            returnQty: "1",
            returnAmt: String(p.netValue ?? 0),
            reason:    "Not delivered",
            selected:  true,
            isCustom:  false,
          }];
        }
      });
      if (Object.keys(loaded).length > 0) setRows(loaded);
    }).finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  /* Save current returns to backend (per dire_id) then close */
  const handleSaveClose = useCallback(async () => {
    const byPicklist = dan.picklists
      .filter(p => p.direId)
      .map(p => ({
        direId: p.direId!,
        items: (rows[p.no] ?? []).filter(r => r.selected).map(r => ({
          serial:      r.serial,
          description: r.desc,
          billQty:     Number(r.billQty)   || 0,
          billAmt:     Number(r.billAmt)   || 0,
          returnQty:   Number(r.returnQty) || 0,
          returnAmt:   Number(r.returnAmt) || 0,
          reason:      r.reason,
          custom:      r.isCustom ?? false,
        })),
      }))
      .filter(x => x.items.length > 0);

    if (byPicklist.length > 0) {
      try {
        await Promise.all(byPicklist.map(x =>
          fetch(ApiEndpoints.DAN_RETURNS(x.direId), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(x.items),
          })
        ));
      } catch { /* proceed even if save fails */ }
    }
    onSaveClose();
  }, [rows, dan, onSaveClose]);

  /* When return qty changes → auto-calc return amt by unit price */
  const updateQty = (pno: number, idx: number, val: string) =>
    setRows(r => {
      const list      = r[pno] ?? [];
      const row       = list[idx];
      if (!row) return r;
      const unitPrice = row.billQty > 0 ? row.billAmt / row.billQty : 0;
      const qty       = parseFloat(val) || 0;
      const autoAmt   = unitPrice > 0
        ? (Math.round(unitPrice * qty * 100) / 100).toFixed(2)
        : row.returnAmt;
      return { ...r, [pno]: list.map((row, i) => i === idx ? { ...row, returnQty: val, returnAmt: autoAmt } : row) };
    });

  const updateField = (pno: number, idx: number, key: keyof ReturnRow, val: string) =>
    setRows(r => ({ ...r, [pno]: (r[pno] ?? []).map((row, i) => i === idx ? { ...row, [key]: val } : row) }));

  const toggleSel = (pno: number, idx: number) =>
    setRows(r => ({ ...r, [pno]: (r[pno] ?? []).map((row, i) => i === idx ? { ...row, selected: !row.selected } : row) }));

  /* Add a blank custom row to a picklist */
  const addCustomRow = (pno: number) =>
    setRows(r => ({
      ...r,
      [pno]: [...(r[pno] ?? []), {
        serial: "", desc: "", billQty: 0, billAmt: 0,
        returnQty: "", returnAmt: "", reason: "", selected: true, isCustom: true,
      }],
    }));

  /* Remove a custom row */
  const removeRow = (pno: number, idx: number) =>
    setRows(r => ({ ...r, [pno]: (r[pno] ?? []).filter((_, i) => i !== idx) }));

  const totalReturn = Object.values(rows).flatMap(r => r ?? []).filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);

  /** Collected amount for a picklist — CREDIT counts as collected */
  const collectedAmt = (pno: number): number => {
    const pay = payments?.[pno];
    if (!pay || !pay.delivered) return 0;
    return modeTotal(pay, false);
  };

  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  const handleNext = () => {
    const errs: Record<number, string> = {};
    dan.picklists.forEach(p => {
      const ret = (rows[p.no] ?? []).filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);
      const col = collectedAmt(p.no);
      const net = p.netValue;
      const diff = Math.abs(net - (ret + col));
      if (diff > 0.01) {
        errs[p.no] = `Net ₹${fmt(net)} ≠ Return ₹${fmt(ret)} + Collected ₹${fmt(col)} (diff ₹${fmt(diff)})`;
      }
    });
    setValidationErrors(errs);
    if (Object.keys(errs).length === 0) onNext(rows);
  };

  const inp: React.CSSProperties = {
    padding: "6px 8px", border: "1.5px solid var(--ink-10)", borderRadius: 7,
    fontSize: 12.5, outline: "none", background: "#fff", color: "var(--ink)",
    fontFamily: "'Inter', sans-serif",
    transition: "border 0.15s",
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-40)", fontSize: 14 }}>
      Loading saved returns…
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <SectionTitle>Settle returns</SectionTitle>
          <div style={{ fontSize: 13, color: "var(--ink-60)" }}>
            DAN: <strong style={{ color: "var(--brand)" }}>{dan.dan}</strong> · {dan.agent.name}
            <span style={{ marginLeft: 10, fontSize: 11.5, color: "var(--ink-40)" }}>— uncheck items with no return</span>
          </div>
        </div>
        {totalReturn > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>
            Total return: {fmt(totalReturn)}
          </div>
        )}
      </div>

      {dan.picklists.map(p => (
        <div key={p.no} style={{ border: "1px solid var(--ink-10)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          {/* Picklist header */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: "var(--ink-5)", borderBottom: "1px solid var(--ink-10)" }}>
            <div>
              <span style={{ fontWeight: 700, color: "var(--brand)", marginRight: 8 }}>#{p.no}</span>
              <span style={{ fontWeight: 600 }}>{p.custName}</span>
              <span style={{ fontSize: 11, color: "var(--ink-40)", marginLeft: 8 }}>{p.custNo}</span>
              {p.direId ? <span style={{ fontSize: 10, fontWeight: 700, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 4, padding: "1px 6px", marginLeft: 8 }}>DIRE #{p.direId}</span> : null}
              {p.invoiceNo ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-60)", background: "var(--ink-5)", border: "1px solid var(--ink-10)", borderRadius: 4, padding: "1px 6px", marginLeft: 4 }}>INV {p.invoiceNo}</span> : null}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, alignItems: "center" }}>
              <span>Net: <strong>{fmt(p.netValue)}</strong></span>
              <span style={{ color: "#0369a1" }}>
                Collected: <strong>{fmt(collectedAmt(p.no))}</strong>
              </span>
              <span style={{ color: "#991b1b" }}>
                Return: <strong>{fmt((rows[p.no] ?? []).filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0))}</strong>
              </span>
            </div>
          </div>
          {validationErrors[p.no] && (
            <div style={{ padding: "6px 16px", background: "#fef2f2", borderBottom: "1px solid #fca5a5", fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
              ⚠ {validationErrors[p.no]}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: 38, padding: "8px 10px" }}></th>
                  {[
                    { h: "Serial",     align: "left"  },
                    { h: "Description",align: "left"  },
                    { h: "Bill Qty",   align: "right" },
                    { h: "Bill Amt",   align: "right" },
                    { h: "Return Qty", align: "right" },
                    { h: "Return Amt", align: "right" },
                    { h: "Reason",     align: "left"  },
                    { h: "",           align: "left"  },
                  ].map(({ h, align }) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: align as "left"|"right", fontSize: 10, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--ink-10)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rows[p.no] ?? []).map((row, idx) => (
                  <tr key={idx} style={{
                    borderBottom: idx < (rows[p.no] ?? []).length - 1 ? "1px solid var(--ink-5)" : "none",
                    background: row.selected ? (row.isCustom ? "#f0fdf4" : "#fef9ec") : "#fafafa",
                  }}>
                    {/* Checkbox */}
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleSel(p.no, idx)}
                        style={{ cursor: "pointer", accentColor: "#d97706", width: 15, height: 15 }}/>
                    </td>

                    {/* Serial */}
                    <td style={{ padding: "8px 10px" }}>
                      <input value={row.serial} onChange={e => updateField(p.no, idx, "serial", e.target.value)}
                        placeholder="Serial…"
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        style={{ ...inp, width: 90, fontSize: 11.5, fontWeight: 700, color: "var(--brand)" }} />
                    </td>

                    {/* Description */}
                    <td style={{ padding: "8px 10px" }}>
                      <input value={row.desc} onChange={e => updateField(p.no, idx, "desc", e.target.value)}
                        placeholder="Description…"
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        style={{ ...inp, minWidth: 140 }} />
                    </td>

                    {/* Bill Qty */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <input type="number" min="0"
                        value={row.billQty === 0 && row.isCustom ? "" : row.billQty}
                        onChange={e => updateField(p.no, idx, "billQty", e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        placeholder="0"
                        style={{ ...inp, width: 64, textAlign: "right", color: "var(--ink-60)" }} />
                    </td>

                    {/* Bill Amt */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <input type="number" min="0"
                        value={row.billAmt === 0 && row.isCustom ? "" : row.billAmt}
                        onChange={e => updateField(p.no, idx, "billAmt", e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        placeholder="0.00"
                        style={{ ...inp, width: 90, textAlign: "right", fontWeight: 600 }} />
                    </td>

                    {/* Return Qty */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <input type="number" min="0"
                        value={row.returnQty}
                        onChange={e => updateQty(p.no, idx, e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        style={{ ...inp, width: 72, textAlign: "right" }}
                      />
                    </td>

                    {/* Return Amt */}
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <input type="number" min="0"
                        value={row.returnAmt}
                        onChange={e => updateField(p.no, idx, "returnAmt", e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        style={{ ...inp, width: 90, textAlign: "right" }}
                      />
                    </td>

                    {/* Reason */}
                    <td style={{ padding: "8px 10px" }}>
                      <input type="text"
                        value={row.reason}
                        onChange={e => updateField(p.no, idx, "reason", e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--ink-10)")}
                        placeholder="Reason…"
                        style={{ ...inp, minWidth: 120, width: "100%" }}
                      />
                    </td>

                    {/* Remove (custom rows only) */}
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {row.isCustom && (
                        <button onClick={() => removeRow(p.no, idx)} title="Remove row" style={{
                          width: 24, height: 24, borderRadius: 6,
                          border: "1px solid #fca5a5", background: "#fee2e2",
                          color: "#991b1b", cursor: "pointer", fontSize: 13, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Add custom row */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--ink-5)", background: "#fafafa" }}>
            <button onClick={() => addCustomRow(p.no)} style={{
              padding: "6px 14px", borderRadius: 8,
              border: "1.5px dashed var(--brand)", background: "var(--brand-xlight)",
              color: "var(--brand)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              + Add row
            </button>
          </div>
        </div>
      ))}

      <StepNav onBack={onBack} onNext={handleNext} onSaveClose={handleSaveClose} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 3 — Settle Payment
═══════════════════════════════════════════════════════════════ */
function Step3({ dan, returns, initialPayments, onNext, onBack, onSaveClose }: {
  dan: Dan; returns: ReturnState; initialPayments: PaymentState;
  onNext: (p: PaymentState) => void; onBack: () => void; onSaveClose: () => void;
}) {
  const emptyPay: PaymentState = dan.picklists.reduce((acc, p) => {
    acc[p.no] = initPayment();
    return acc;
  }, {} as PaymentState);

  const [pay, setPay]         = useState<PaymentState>(emptyPay);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /* Always fetch fresh payment data from delivery_status via dayend API */
  useEffect(() => {
    setLoading(true);
    fetch(ApiEndpoints.PICKLISTS_BY_AGENT(dan._danId!), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then((data: Array<{
        direId?: number; picklistNo?: string; delivered: boolean;
        paymentMode: string | null; reason: string | null;
      }>) => {
        const loaded: PaymentState = { ...emptyPay };
        if (Array.isArray(data)) {
          data.forEach(row => {
            const pl = row.direId
              ? dan.picklists.find(p => p.direId === row.direId)
              : dan.picklists.find(p => p.picklistNo === row.picklistNo);
            if (pl) loaded[pl.no] = picklistToPayment(row.delivered, row.paymentMode, row.reason);
          });
        }
        setPay(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dan._danId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEdit = (no: number, saved: PicklistPayment) => {
    setPay(prev => ({ ...prev, [no]: saved }));
    setEditing(null);
  };

  /* Payment totals per mode — CREDIT included as collected */
  const byMode: Record<string, number> = {};
  dan.picklists.forEach(p => {
    const py = pay[p.no];
    py.selectedModes.forEach(m => {
      byMode[m] = (byMode[m] ?? 0) + (parseFloat(py.modeAmounts[m] ?? "0") || 0);
    });
  });

  const totalNet       = dan.picklists.reduce((a, p) => a + p.netValue, 0);
  const grandTotal     = Object.values(byMode).reduce((a, v) => a + v, 0);
  const deliveredCount = dan.picklists.filter(p => pay[p.no].delivered).length;

  const validatePay = (p: typeof dan.picklists[0]): string | null => {
    const py  = pay[p.no];
    const col = modeTotal(py, false);   // CREDIT counts as collected
    if (!py.delivered) return null;
    if (py.selectedModes.length === 0) return "No payment mode selected";
    if (col > p.netValue * 1.05)       return `Overpaid by ${fmt(col - p.netValue)}`;
    return null;
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-40)", fontSize: 14 }}>
      Loading payment data…
    </div>
  );

  return (
    <div>
      {editing !== null && (
        <PaymentModal
          picklist={dan.picklists.find(p => p.no === editing)!}
          payment={pay[editing]}
          onSave={saved => saveEdit(editing, saved)}
          onCancel={() => setEditing(null)}
        />
      )}

      <SectionTitle>Settle payment</SectionTitle>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginBottom: 18 }}>
        DAN: <strong style={{ color: "var(--brand)" }}>{dan.dan}</strong> · {dan.agent.name} · click Edit to enter payment per picklist
      </div>

      <div style={{ border: "1px solid var(--ink-10)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--ink-5)" }}>
                {["NO.", "CUSTOMER", "NET VALUE", "PAYMENT", "COLLECTED", "STATUS", "ISSUE", "ACTION"].map(h => (
                  <th key={h} style={{
                    padding: "8px 14px",
                    textAlign: ["NET VALUE", "COLLECTED"].includes(h) ? "right" : "left",
                    fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)",
                    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dan.picklists.map((p, i) => {
                const py        = pay[p.no];
                const collected = modeTotal(py, false);   // CREDIT counts as collected
                const issue     = validatePay(p);
                return (
                  <tr key={p.no} style={{
                    borderBottom: i < dan.picklists.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: issue ? "rgba(254,243,199,0.25)" : "transparent",
                  }}>
                    {/* NO. */}
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 30, height: 30, borderRadius: "50%",
                        background: "#ede9fe", color: "#5b21b6", fontSize: 11.5, fontWeight: 800,
                      }}>#{p.no}</span>
                    </td>

                    {/* CUSTOMER */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{p.custName}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2, fontFamily: "monospace" }}>{p.custNo}</div>
                      <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                        {p.direId ? <span style={{ fontSize: 10, fontWeight: 700, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 4, padding: "1px 6px" }}>DIRE #{p.direId}</span> : null}
                        {p.invoiceNo ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-60)", background: "var(--ink-5)", border: "1px solid var(--ink-10)", borderRadius: 4, padding: "1px 6px" }}>INV {p.invoiceNo}</span> : null}
                      </div>
                    </td>

                    {/* NET VALUE */}
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                      ₹{p.netValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* PAYMENT — inline badges + details */}
                    <td style={{ padding: "10px 14px" }}>
                      {py.selectedModes.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--ink-30)" }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {py.selectedModes.map(m => {
                            const s   = MODE_STYLE[m] ?? DEFAULT_MODE_STYLE;
                            const d   = py.modeDetails[m];
                            const details: string[] = [];
                            if (d?.chequeNo)    details.push(`Chq: ${d.chequeNo}${d.bankName ? " · " + d.bankName : ""}`);
                            if (d?.referenceNo) details.push(`Ref: ${d.referenceNo}`);
                            return (
                              <div key={m}>
                                <span style={{
                                  fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50,
                                  background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                                  whiteSpace: "nowrap", display: "inline-block",
                                }}>{m}</span>
                                {details.map((det, di) => (
                                  <div key={di} style={{ fontSize: 10.5, color: "var(--ink-60)", marginTop: 2, paddingLeft: 2 }}>{det}</div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* COLLECTED */}
                    <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {collected > 0
                        ? <span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>₹{collected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        : <span style={{ color: "var(--ink-30)" }}>—</span>
                      }
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                        background: py.delivered ? "#d1fae5" : "#fee2e2",
                        color:      py.delivered ? "#065f46" : "#991b1b",
                        border: `1px solid ${py.delivered ? "#6ee7b7" : "#fca5a5"}`,
                      }}>{py.delivered ? "Delivered" : "Not Delivered"}</span>
                    </td>

                    {/* ISSUE */}
                    <td style={{ padding: "10px 14px", maxWidth: 160 }}>
                      {issue ? (
                        <span style={{ fontSize: 11, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <span style={{ fontSize: 13, lineHeight: "1", flexShrink: 0 }}>⚠</span>
                          <span style={{ lineHeight: "1.4" }}>{issue}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 15, color: "#10b981" }}>✓</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setEditing(p.no)} style={{
                        padding: "5px 11px", borderRadius: 6,
                        border: "1.5px solid var(--brand)", background: "var(--brand-light)",
                        color: "var(--brand)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}>✏</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* COLLECTED mode chips footer */}
        {Object.keys(byMode).length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #e2e8f0", background: "#fafafa", padding: "12px 20px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 4 }}>Collected</span>
              {Object.entries(byMode).map(([mode, amount]) => {
                const s = MODE_STYLE[mode] ?? DEFAULT_MODE_STYLE;
                return (
                  <div key={mode} style={{ padding: "6px 16px", borderRadius: 9, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{mode}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: s.color }}>₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--ink-60)" }}>
                {dan.picklists.length} picklist{dan.picklists.length !== 1 ? "s" : ""} · {deliveredCount} delivered · {dan.picklists.length - deliveredCount} pending/failed
              </span>
            </div>

            {/* Grand total bar */}
            <div style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Invoice Total</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>₹{totalNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ width: 1, background: "#e2e8f0" }} />
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Total Collected</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: grandTotal >= totalNet * 0.99 ? "#065f46" : "#b45309" }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                {Math.abs(grandTotal - totalNet) > 1 && (
                  <>
                    <div style={{ width: 1, background: "#e2e8f0" }} />
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Difference</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: grandTotal > totalNet ? "#991b1b" : "#b45309" }}>
                        {grandTotal > totalNet ? "+" : "−"}₹{Math.abs(grandTotal - totalNet).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ padding: "10px 24px", borderRadius: 10, background: "var(--ink)", color: "#fff", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 3 }}>Grand Total</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <StepNav onBack={onBack} onNext={() => onNext(pay)} onSaveClose={onSaveClose} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 4 — Final Review
═══════════════════════════════════════════════════════════════ */
function Step4({ dan, returns, payments, onNext, onBack, onSaveClose }: { dan: Dan; returns: ReturnState; payments: PaymentState; onNext: () => void; onBack: () => void; onSaveClose: () => void }) {
  const totalNet  = dan.picklists.reduce((a, p) => a + p.netValue, 0);
  const totalRet  = Object.values(returns).flat().filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);
  const totalColl = dan.picklists.reduce((a, p) => a + modeTotal(payments[p.no], false), 0); // CREDIT counts as collected
  const netSettle = totalNet - totalRet;   // expected cash from agent = invoices − goods returned
  const balance   = totalColl - netSettle; // positive = overpaid, negative = short

  const byMode: Record<string, number> = {};
  dan.picklists.forEach(p => {
    const py = payments[p.no];
    py.selectedModes.forEach(m => {
      byMode[m] = (byMode[m] ?? 0) + (parseFloat(py.modeAmounts[m] ?? "0") || 0);
    });
  });

  /* ── Per-picklist validation ── */
  const picklistErrors: { no: number; custName: string; msg: string; type: "error" | "warn" }[] = [];
  dan.picklists.forEach(p => {
    const py  = payments[p.no];
    const col = modeTotal(py, false);   // CREDIT counts as collected
    const ret = (returns[p.no] ?? []).filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);
    if (py.delivered && py.selectedModes.length === 0)
      picklistErrors.push({ no: p.no, custName: p.custName, msg: "No payment mode selected", type: "error" });
    else if (py.delivered && col <= 0)
      picklistErrors.push({ no: p.no, custName: p.custName, msg: "Collected amount is zero", type: "error" });
    else if (py.delivered && col > p.netValue * 1.05)
      picklistErrors.push({ no: p.no, custName: p.custName, msg: `Overpaid by ${fmt(col - p.netValue)} (>5%)`, type: "warn" });
    if (ret > p.netValue)
      picklistErrors.push({ no: p.no, custName: p.custName, msg: `Return ${fmt(ret)} exceeds invoice ${fmt(p.netValue)}`, type: "error" });
  });

  /* ── Summary-level checks ── */
  const summaryErrors: { msg: string; type: "error" | "warn" }[] = [];

  if (totalColl === 0)
    summaryErrors.push({ msg: "No payments have been collected for any picklist", type: "error" });

  if (totalRet > 0 && totalColl > netSettle * 1.05)
    summaryErrors.push({
      msg: `Collected ${fmt(totalColl)} exceeds expected ${fmt(netSettle)} (Invoice ${fmt(totalNet)} − Returns ${fmt(totalRet)}). Agent may have collected full amount despite returns.`,
      type: "error",
    });

  if (totalRet > totalNet)
    summaryErrors.push({ msg: `Total returns ${fmt(totalRet)} exceed invoice total ${fmt(totalNet)}`, type: "error" });

  if (balance < -0.01)
    summaryErrors.push({ msg: `Short by ${fmt(Math.abs(balance))} — agent collected less than expected (${fmt(netSettle)})`, type: "warn" });
  else if (balance > netSettle * 0.05 && balance > 0.01)
    summaryErrors.push({ msg: `Over-collected by ${fmt(balance)} (>5% of net settlement)`, type: "warn" });

  const allErrors = [...summaryErrors, ...picklistErrors];
  const hasErrors = allErrors.some(e => e.type === "error");

  const balanceColor = balance < -0.01 ? "#ef4444" : balance > 0.01 ? "#92400e" : "#065f46";
  const summaries = [
    { label: "Invoice total",   val: fmt(totalNet),   color: "var(--ink)",  dark: false },
    { label: "Total returns",   val: fmt(totalRet),   color: "#991b1b",     dark: false },
    { label: "Net settlement",  val: fmt(netSettle),  color: "var(--brand)", dark: false },
    { label: balance < -0.01 ? "Short" : balance > 0.01 ? "Over-collected" : "Collected",
      val: balance < -0.01 ? `−${fmt(Math.abs(balance))}` : balance > 0.01 ? `+${fmt(balance)}` : fmt(totalColl),
      color: balanceColor, dark: true },
  ];

  return (
    <div>
      <SectionTitle>Final review</SectionTitle>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginBottom: 20 }}>
        DAN: <strong style={{ color: "var(--brand)" }}>{dan.dan}</strong> · Agent: <strong>{dan.agent.name} {dan.agent.code}</strong>
      </div>

      {/* Validation banner */}
      {allErrors.length > 0 && (
        <div style={{
          borderRadius: 10, overflow: "hidden",
          border: `1px solid ${hasErrors ? "#fca5a5" : "#fcd34d"}`,
          marginBottom: 18,
        }}>
          <div style={{
            padding: "10px 14px",
            background: hasErrors ? "#fee2e2" : "#fef3c7",
            color: hasErrors ? "#991b1b" : "#92400e",
            fontSize: 12.5, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {hasErrors ? "⛔ Issues found — review before submitting" : "⚠ Warnings — you may still submit"}
          </div>
          <div style={{ background: "#fff" }}>
            {allErrors.map((e, i) => (
              <div key={i} style={{
                padding: "8px 14px", fontSize: 12,
                borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                display: "flex", alignItems: "flex-start", gap: 8,
                color: e.type === "error" ? "#991b1b" : "#92400e",
              }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>{e.type === "error" ? "⛔" : "⚠"}</span>
                <span>
                  {"custName" in e && <strong>{(e as typeof picklistErrors[0]).custName} (#{(e as typeof picklistErrors[0]).no}) — </strong>}
                  {e.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {summaries.map(c => (
          <div key={c.label} style={{ background: c.dark ? "var(--ink)" : "var(--ink-5)", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, color: c.dark ? "rgba(255,255,255,.5)" : "var(--ink-60)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.dark ? "#fff" : c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Mode breakdown */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {Object.entries(byMode).map(([mode, amt]) => {
          const s = MODE_STYLE[mode] ?? DEFAULT_MODE_STYLE;
          return (
            <span key={mode} style={{ fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 50, border: `1px solid ${s.border}`, background: s.bg, color: s.color }}>
              {mode}: {fmt(amt)}
            </span>
          );
        })}
      </div>

      {/* Per-picklist detail */}
      {(() => {
        /* Build a map: picklist no → list of errors for that picklist */
        const errMap: Record<number, typeof picklistErrors> = {};
        picklistErrors.forEach(e => {
          if (!errMap[e.no]) errMap[e.no] = [];
          errMap[e.no].push(e);
        });

        return dan.picklists.map(p => {
          const py      = payments[p.no];
          const pRet    = (returns[p.no] ?? []).filter(r => r.selected);
          const col     = modeTotal(py, false);   // CREDIT counts as collected
          const pErrors = errMap[p.no] ?? [];
          const pHasErr = pErrors.some(e => e.type === "error");
          const pHasWrn = pErrors.some(e => e.type === "warn");
          const borderColor = pHasErr ? "#fca5a5" : pHasWrn ? "#fcd34d" : "var(--ink-10)";
          const headerBg    = pHasErr ? "#fff5f5" : pHasWrn ? "#fffbeb" : "var(--ink-5)";

          return (
            <div key={p.no} style={{ border: `1.5px solid ${borderColor}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "var(--brand)", marginRight: 4 }}>#{p.no}</span>
                  <span style={{ fontWeight: 600 }}>{p.custName}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-40)" }}>{p.custNo}</span>
                  {pHasErr && <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 50, padding: "1px 8px" }}>⛔ {pErrors.filter(e => e.type === "error").length} error{pErrors.filter(e => e.type === "error").length > 1 ? "s" : ""}</span>}
                  {!pHasErr && pHasWrn && <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 50, padding: "1px 8px" }}>⚠ warning</span>}
                  {!pHasErr && !pHasWrn && <span style={{ fontSize: 11, color: "#065f46" }}>✓</span>}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span>Net: <strong>{fmt(p.netValue)}</strong></span>
                  <span style={{ color: col > 0 ? "#065f46" : "var(--ink-40)" }}>Collected: <strong>{fmt(col)}</strong></span>
                  {pRet.length > 0 && <span style={{ color: "#991b1b" }}>Return: <strong>{fmt(pRet.reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0))}</strong></span>}
                </div>
              </div>

              {/* Inline error list */}
              {pErrors.length > 0 && (
                <div style={{ background: pHasErr ? "#fff5f5" : "#fffbeb", borderBottom: `1px solid ${borderColor}` }}>
                  {pErrors.map((e, i) => (
                    <div key={i} style={{
                      padding: "7px 16px", fontSize: 12,
                      borderTop: i > 0 ? `1px solid ${borderColor}` : "none",
                      color: e.type === "error" ? "#991b1b" : "#92400e",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span>{e.type === "error" ? "⛔" : "⚠"}</span>
                      <span>{e.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment modes */}
              <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {py.selectedModes.map(m => {
                  const s   = MODE_STYLE[m] ?? DEFAULT_MODE_STYLE;
                  const d   = py.modeDetails[m];
                  const amt = parseFloat(py.modeAmounts[m] ?? "0") || 0;
                  return (
                    <span key={m} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 600 }}>
                      {m} {fmt(amt)}
                      {m === "CHEQUE" && (d?.chequeNo || d?.bankName) && ` · ${[d.chequeNo ? `Chq ${d.chequeNo}` : null, d.bankName, d.chequeDate ? `Dt ${d.chequeDate}` : null].filter(Boolean).join(" · ")}`}
                      {(m === "UPI" || m === "NEFT" || m === "CREDIT") && d?.referenceNo && ` · Ref: ${d.referenceNo}`}
                    </span>
                  );
                })}
                {py.selectedModes.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-40)" }}>No payment entered</span>}
              </div>

              {/* Return items */}
              {pRet.length > 0 && (
                <div style={{ padding: "0 16px 10px" }}>
                  <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Returns</div>
                  {pRet.map(r => (
                    <div key={r.serial} style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-60)", marginBottom: 3 }}>
                      <span style={{ color: "var(--brand)", fontWeight: 600 }}>{r.serial}</span>
                      <span>{r.desc}</span>
                      <span>Qty: <strong style={{ color: "#991b1b" }}>{r.returnQty}</strong></span>
                      <span>Amt: <strong style={{ color: "#991b1b" }}>{fmt(parseFloat(r.returnAmt) || 0)}</strong></span>
                      {r.reason && <span>· {r.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        });
      })()}

      <StepNav onBack={onBack} onNext={hasErrors ? undefined : onNext} nextLabel="Print &amp; submit →" onSaveClose={onSaveClose} />
      {hasErrors && (
        <div style={{ marginTop: 10, textAlign: "right", fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
          ⛔ Fix the errors above before submitting
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 5 — Print & Submit
═══════════════════════════════════════════════════════════════ */
function Step5({ dan, returns, payments, onReset, onBack, onSaveClose }: { dan: Dan; returns: ReturnState; payments: PaymentState; onReset: () => void; onBack: () => void; onSaveClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalNet    = dan.picklists.reduce((a, p) => a + p.netValue, 0);
  const totalRet    = Object.values(returns).flat().filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);
  const totalColl   = dan.picklists.reduce((a, p) => a + modeTotal(payments[p.no], true), 0);
  const netSettle   = totalNet - totalRet;
  const balance     = totalColl - netSettle;

  /* Per-mode grand totals */
  const modeTotals: Record<string, number> = {};
  dan.picklists.forEach(p => {
    const py = payments[p.no];
    if (!py) return;
    py.selectedModes.forEach(m => {
      modeTotals[m] = (modeTotals[m] ?? 0) + (parseFloat(py.modeAmounts[m] ?? "0") || 0);
    });
  });

  /* Reference & timestamp */
  const now      = new Date();
  const dateStr  = dan.date ?? `${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()}`;
  const compact  = dateStr.split("-").reverse().join(""); // yyyymmdd
  const refNo    = `DE-${compact}-${String(dan._danId ?? 0).padStart(3,"0")}`;
  const genTime  = now.toLocaleString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).replace(",","");

  const MODE_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
    UPI:    { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd", label: "UPI"    },
    CHEQUE: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "CHEQUE" },
    CASH:   { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "CASH"   },
    NEFT:   { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd", label: "NEFT"   },
    CREDIT: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4", label: "CREDIT" },
  };
  const modeStyle = (m: string) => MODE_STYLE[m] ?? DEFAULT_MODE_STYLE;

  const doSubmit = async () => {
    setSubmitting(true);
    const danId = dan._danId;
    if (!danId) { setSubmitted(true); setSubmitting(false); return; }
    try {
      // 1. Save returns
      const returnsByPicklist = dan.picklists
        .filter(p => p.direId)
        .map(p => ({
          direId: p.direId!,
          items: (returns[p.no] ?? []).filter(r => r.selected).map(r => ({
            serial: r.serial, description: r.desc,
            billQty: Number(r.billQty) || 0, billAmt: Number(r.billAmt) || 0,
            returnQty: Number(r.returnQty) || 0, returnAmt: Number(r.returnAmt) || 0,
            reason: r.reason, custom: r.isCustom ?? false,
          })),
        }))
        .filter(x => x.items.length > 0);
      await Promise.all(returnsByPicklist.map(x =>
        fetch(ApiEndpoints.DAN_RETURNS(x.direId), {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(x.items),
        })
      ));
      // 2. Save payments
      for (const p of dan.picklists) {
        const py = payments[p.no];
        if (!py || (py.selectedModes.length === 0 && py.delivered)) continue;
        const entries = py.selectedModes.map(m => {
          const d = py.modeDetails[m] ?? {};
          const obj: Record<string, unknown> = { mode: m, amount: parseFloat(py.modeAmounts[m] ?? "0") || 0 };
          if (m === "CHEQUE") { if (d.chequeNo) obj.chequeNo = d.chequeNo; if (d.bankName) obj.bankName = d.bankName; }
          if (m === "UPI" || m === "NEFT" || m === "CREDIT") { if (d.referenceNo) obj.referenceNo = d.referenceNo; }
          return obj;
        });
        await fetch(ApiEndpoints.DAN_PAYMENT(danId, p.direId), {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ delivered: py.delivered, paymentAmount: modeTotal(py, false), paymentMode: JSON.stringify(entries), reason: py.reason || null }),
        });
      }
      // 3. Submit DAN
      await fetch(ApiEndpoints.DAN_SUBMIT(danId), { method: "POST", headers: authHeaders() });
      setSubmitted(true);
    } catch { setSubmitted(true); }
    setSubmitting(false);
  };

  /* ── Success screen ── */
  if (submitted) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#065f46" }}>✓</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>DAN closed successfully!</div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginBottom: 20 }}>{dan.dan} · {dan.agent.name}</div>
      <div style={{ display: "inline-flex", gap: 24, background: "var(--ink-5)", borderRadius: 12, padding: "14px 28px", fontSize: 13, marginBottom: 24 }}>
        {[
          { l: "Invoice",        v: fmt(totalNet),   c: "var(--ink)"   },
          { l: "Returns",        v: fmt(totalRet),   c: "#991b1b"      },
          { l: "Net settlement", v: fmt(netSettle),  c: "var(--brand)" },
          { l: "Collected",      v: fmt(totalColl),  c: "#065f46"      },
        ].map(x => (
          <div key={x.l}>
            <div style={{ fontSize: 10, color: "var(--ink-40)", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>{x.l}</div>
            <div style={{ fontWeight: 700, color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>
      <div><Btn variant="primary" onClick={onReset}>Close another DAN</Btn></div>
    </div>
  );

  /* ── Settlement sheet ── */
  const handlePrint = () => {
    const el = document.getElementById("dan-settlement-print");
    if (!el) return;
    const win = window.open("", "_blank", "width=960,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Day End Settlement — ${refNo}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; color: #1e293b; background: #fff; padding: 28px 36px; }
    @media print { body { padding: 16px 24px; } @page { margin: 12mm 14mm; } }
  </style>
</head>
<body>
${el.innerHTML}
<script>window.onload=function(){window.print();}<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div>
      {/* Screen action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--ink-10)" }}>
        <div>
          <SectionTitle>Print &amp; Submit</SectionTitle>
          <div style={{ fontSize: 13, color: "var(--ink-60)" }}>Review the settlement sheet, print, then submit to finalise</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={onBack}>← Back</Btn>
          <button onClick={onSaveClose} style={{ padding: "9px 18px", background: "#fff", border: "1.5px solid var(--ink-10)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ink-60)" }}>
            💾 Save &amp; Close
          </button>
          <Btn variant="primary" onClick={doSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "✓ Submit & close DAN"}
          </Btn>
        </div>
      </div>

      {/* ════ SETTLEMENT SHEET ════ */}
      <div id="dan-settlement-print" style={{ background: "#fff", fontFamily: "'Inter', sans-serif", color: "#1e293b", maxWidth: 860, margin: "0 auto" }}>

        {/* ── Top header bar ── */}
        <div style={{ borderBottom: "3px solid #7c3aed", paddingBottom: 14, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚚</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>Direco</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Distributor to Retail Connect</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#7c3aed", letterSpacing: 1 }}>DAY END SETTLEMENT</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>REF: {refNo} &nbsp;|&nbsp; Generated: {genTime}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Printed by: System Administrator</div>
          </div>
        </div>

        {/* ── Info boxes ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "AGENT",          value: dan.agent.name },
            { label: "DAN ID",         value: dan.dan },
            { label: "REPORT DATE",    value: dateStr },
            { label: "TOTAL PICKLISTS",value: String(dan.picklists.length) },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Payment mode summary cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(modeTotals).length + 1}, 1fr)`, gap: 12, marginBottom: 24 }}>
          {Object.entries(modeTotals).map(([mode, amt]) => {
            const s = modeStyle(mode);
            return (
              <div key={mode} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{mode}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>₹{Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              </div>
            );
          })}
          {/* Grand total */}
          <div style={{ background: "#1e293b", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>GRAND TOTAL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>₹{Number(totalColl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* ── Picklist table ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 28 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              {[
                { h: "DIRE ID",    right: false },
                { h: "CUSTOMER",   right: false },
                { h: "NET VALUE",  right: true  },
                { h: "RETURN AMT", right: true  },
                { h: "PAYMENT",    right: true  },
              ].map(({ h, right }) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: right ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dan.picklists.map((p, pi) => {
              const py      = payments[p.no];
              const collected = py ? modeTotal(py, true) : 0;
              const retAmt  = (returns[p.no] ?? []).filter(r => r.selected).reduce((a, r) => a + (parseFloat(r.returnAmt) || 0), 0);
              return (
                <tr key={p.no} style={{ borderBottom: pi < dan.picklists.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  {/* DIRE ID */}
                  <td style={{ padding: "12px 12px", fontWeight: 700, color: "#7c3aed", fontSize: 15, verticalAlign: "top" }}>
                    {p.direId ? `#${p.direId}` : "—"}
                    {p.invoiceNo && <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>{p.invoiceNo}</div>}
                  </td>
                  {/* Customer */}
                  <td style={{ padding: "12px 12px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600 }}>{p.custName}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.custNo}</div>
                  </td>
                  {/* Net Value */}
                  <td style={{ padding: "12px 12px", textAlign: "right", verticalAlign: "top", fontWeight: 600 }}>
                    ₹{Number(p.netValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  {/* Return Amt */}
                  <td style={{ padding: "12px 12px", textAlign: "right", verticalAlign: "top", fontWeight: 700, color: retAmt > 0 ? "#dc2626" : "#94a3b8" }}>
                    {retAmt > 0 ? `₹${Number(retAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  {/* Payment modes + amount */}
                  <td style={{ padding: "12px 12px", textAlign: "right", verticalAlign: "top" }}>
                    {py && py.delivered ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        {py.selectedModes.map(m => {
                          const s   = modeStyle(m);
                          const amt = parseFloat(py.modeAmounts[m] ?? "0") || 0;
                          const d   = py.modeDetails[m] ?? {};
                          const chequeDetails = m === "CHEQUE" ? [
                            d.chequeNo  ? `Chq No: ${d.chequeNo}`  : null,
                            d.bankName  ? `Bank: ${d.bankName}`    : null,
                            d.chequeDate ? `Dt: ${d.chequeDate}`   : null,
                          ].filter(Boolean).join(" · ") : null;
                          const ref = chequeDetails || (d.referenceNo ? `Ref: ${d.referenceNo}` : "");
                          return (
                            <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{m}</span>
                                {ref && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, fontWeight: 500 }}>{ref}</div>}
                              </div>
                              <span style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>₹{Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                        {py.selectedModes.length > 1 && (
                          <div style={{ fontSize: 11, color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: 4, marginTop: 2, fontWeight: 600 }}>
                            Total: ₹{Number(collected).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Not delivered{py?.reason ? ` — ${py.reason}` : ""}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
              <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700, fontSize: 13 }}>TOTAL</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 14 }}>₹{Number(totalNet).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "#dc2626" }}>₹{Number(totalRet).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 14, color: "#065f46" }}>₹{Number(totalColl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style={{ background: "#1e293b" }}>
              <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700, fontSize: 13, color: "#94a3b8" }}>
                NET SETTLEMENT (Invoice − Returns)
              </td>
              <td colSpan={2} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, fontSize: 15, color: "#fff" }}>
                ₹{Number(netSettle).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                {Math.abs(balance) > 0.01 && (
                  <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 10, color: balance < 0 ? "#fca5a5" : "#fcd34d" }}>
                    {balance < 0 ? `Short ${fmt(Math.abs(balance))}` : `Over ${fmt(balance)}`}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Authorisation & Signature ── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>Authorisation &amp; Signature</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { title: "AGENT",                   name: dan.agent.name,         sub: `Delivery Agent · ID ${dan.agent.code}` },
              { title: "VERIFIED & APPROVED BY",  name: "System Administrator", sub: "ADMIN · City Mart Distributors" },
              { title: "RECEIVED BY (ACCOUNTS)",  name: "Accounts Department",  sub: "Finance team" },
            ].map(s => (
              <div key={s.title} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 24 }}>{s.sub}</div>
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: 10, color: "#94a3b8" }}>Signature &amp; stamp:</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Print button (inside sheet) ── */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handlePrint} style={{
            padding: "10px 28px", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
          }}>
            🖨 Print this page
          </button>
        </div>

      </div>{/* /print */}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const DanClosePage: React.FC = () => {
  const [dans, setDans]         = useState<Dan[]>([]);
  const [step, setStep]         = useState(0);
  const [dan,  setDan]          = useState<Dan | null>(null);
  const [returns, setReturns]   = useState<ReturnState>({});
  const [payments, setPayments] = useState<PaymentState>({});

  const loadDans = useCallback(() => {
    fetch(ApiEndpoints.DAN_LIST, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then((data: Array<{
        danId: number; danCode: string; date: string;
        agentId: string; agentName: string; agentCode: string;
        picklists: Array<{ no: number; direId?: number; invoiceNo?: string; picklistNo: string; custName: string; custNo: string; netValue: number }>;
      }>) => {
        setDans(!Array.isArray(data) ? [] : data.map(d => ({
          dan:       d.danCode,
          date:      d.date,
          agent:     { id: d.agentId, name: d.agentName, code: d.agentCode },
          picklists: (d.picklists ?? []).map(p => ({ ...p, items: [] })),
          _danId:    d.danId,
        } as Dan & { _danId: number })));
      })
      .catch(() => setDans([]));
  }, []);

  useEffect(() => { loadDans(); }, [loadDans]);

  const reset = () => { setStep(0); setDan(null); setReturns({}); setPayments({}); loadDans(); };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="DAN Close"
        subtitle="Close day-end for delivery agents — settle returns, payments and submit"
      />

      <div style={{ maxWidth: 900 }}>
        <StepBar step={step} />
        {step === 0 && <Step1 dans={dans} onNext={d => { setDan(d); setStep(1); }} onSaveClose={reset} />}
        {step === 1 && dan && <Step3 dan={dan} returns={returns} initialPayments={payments} onNext={p => { setPayments(p); setStep(2); }} onBack={() => setStep(0)} onSaveClose={reset} />}
        {step === 2 && dan && <Step2 dan={dan} initialRows={returns} payments={payments} onNext={r => { setReturns(r); setStep(3); }} onBack={() => setStep(1)} onSaveClose={reset} />}
        {step === 3 && dan && <Step4 dan={dan} returns={returns} payments={payments} onNext={() => setStep(4)} onBack={() => setStep(2)} onSaveClose={reset} />}
        {step === 4 && dan && <Step5 dan={dan} returns={returns} payments={payments} onReset={reset} onBack={() => setStep(3)} onSaveClose={reset} />}
      </div>
    </div>
  );
};

export default DanClosePage;
