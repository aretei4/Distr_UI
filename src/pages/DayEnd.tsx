import '../styles/pages/DayEnd.css';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { DayEndRecord, ToastState } from "./types";
import { fetchDayEndSummary, approveDayEnd, rejectDayEnd } from "../services/dayEndService";
import { getCompanyInfo } from "../constants/config";
import { authService } from "../services/authService";
import { updatePicklist, deletePicklist, fetchPicklistsByDayend } from "../services/danService";
import {
  PageHeader, Card, DataTable, TR, TD, StatusBadge,
  SearchInput, Select, Btn, Toast,
} from "../components/ui";

/* ── Picklist model (enhanced with payment info) ──────────────────────────── */
interface Picklist {
  direId?:       number;
  invoiceNo?:     string;
  picklistNo:     string;
  customerNo:     string;
  custDesc:       string;
  netValue:       string;
  assignStatus:   number;   // 0=PENDING, 1=FAILED, 2=DELIVERED
  delivered:      boolean;
  paymentAmount:  number;
  paymentMode:    string | null;
  reason:         string | null;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function statusLabel(p: Picklist) {
  if (p.assignStatus === 2) return "Delivered";
  if (p.assignStatus === 1) return "Failed";
  return "Pending";
}

function statusStyle(p: Picklist): React.CSSProperties {
  if (p.assignStatus === 2) return { background: "#d1fae5", color: "#065f46" };
  if (p.assignStatus === 1) return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#fef3c7", color: "#92400e" };
}

/** Returns a validation issue string or null if OK */
function validatePicklist(p: Picklist): string | null {
  const net = parseFloat(p.netValue) || 0;
  if (p.assignStatus === 2) {
    if (p.paymentAmount <= 0) return "Delivered but no payment recorded";
    if (!p.paymentMode)       return "Payment mode missing";
    if (p.paymentAmount > net * 1.05)
      return `Payment ₹${p.paymentAmount.toLocaleString("en-IN")} exceeds invoice ₹${net.toLocaleString("en-IN")}`;
  }
  if (p.assignStatus === 1 && !p.reason) return "Failed delivery — reason missing";
  return null;
}

const PAYMENT_MODES = ["CASH", "UPI", "CHEQUE", "NEFT", "CARD", "CREDIT"];

/* ── Payment mode entry (JSON format from mobile app) ─────────────────────── */
interface PaymentEntry {
  mode:         string;
  amount:       number;
  chequeNo?:    string;
  bankName?:    string;
  referenceNo?: string;
}

/**
 * Parses payment_mode from either format:
 *  - New JSON:  '[{"mode":"CHEQUE","amount":3900,"chequeNo":"56789","bankName":"uti"}]'
 *  - Old CSV:   'CASH:500.0,UPI:300.0'
 */
function parsePaymentMode(raw: string | null | undefined): PaymentEntry[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed as PaymentEntry[];
    } catch { /* fall through */ }
  }
  // Old CSV format: "CASH:500.0,UPI:300.0"
  return trimmed.split(",")
    .map(s => { const [m, a] = s.trim().split(":"); return { mode: (m ?? "").trim(), amount: parseFloat(a ?? "0") || 0 }; })
    .filter(e => e.mode.length > 0);
}

/* ── Per-mode colour palette ─────────────────────────────────────────────── */
const MODE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  CASH:   { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  UPI:    { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  CHEQUE: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  NEFT:   { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  CARD:   { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  CREDIT: { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
};
const DEFAULT_MODE_STYLE = { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };

/* ── PaymentBreakdown component (with expand/collapse) ───────────────────── */
function PaymentBreakdown({ raw, netAmount }: { raw: string | null | undefined; netAmount: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const entries = parsePaymentMode(raw);
  if (entries.length === 0) return <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>;

  const total    = entries.reduce((s, e) => s + e.amount, 0);
  const overPaid = total > netAmount * 1.05;
  const hasDetails = entries.some(e => e.chequeNo || e.bankName || e.referenceNo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Total + expand toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: overPaid ? "#991b1b" : "var(--ink)" }}>
          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          {overPaid && <span style={{ fontSize: 10, marginLeft: 4, color: "#ef4444" }}>⚠</span>}
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          title={expanded ? "Collapse" : "Expand payment details"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1px 4px", borderRadius: 4, color: "var(--ink-40)",
            fontSize: 10, display: "flex", alignItems: "center", gap: 2,
            transition: "color 0.15s",
          }}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Collapsed: compact mode badges */}
      {!expanded && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {entries.map((e, idx) => {
            const s = MODE_STYLE[e.mode] ?? DEFAULT_MODE_STYLE;
            return (
              <span key={idx} style={{
                fontSize: 10.5, fontWeight: 700, padding: "1px 8px", borderRadius: 50,
                background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              }}>
                {e.mode}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded: full detail cards */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.map((e, idx) => {
            const s = MODE_STYLE[e.mode] ?? DEFAULT_MODE_STYLE;
            return (
              <div key={idx} style={{
                padding: "6px 10px", borderRadius: 8,
                background: s.bg, border: `1px solid ${s.border}`,
                fontSize: 11,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: s.color, minWidth: 50 }}>{e.mode}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>
                    ₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {(e.chequeNo || e.bankName || e.referenceNo) && (
                  <div style={{
                    marginTop: 4, paddingTop: 4,
                    borderTop: `1px solid ${s.border}`,
                    display: "flex", flexDirection: "column", gap: 2,
                    fontSize: 10.5, color: s.color, opacity: 0.85,
                  }}>
                    {e.chequeNo    && <span>Cheque No&nbsp;&nbsp;: <strong>{e.chequeNo}</strong></span>}
                    {e.bankName    && <span>Bank Name&nbsp;&nbsp;: <strong>{e.bankName}</strong></span>}
                    {e.referenceNo && <span>Reference No: <strong>{e.referenceNo}</strong></span>}
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

/* ── Overlay wrapper ──────────────────────────────────────────────────────── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(11,18,21,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--white)", borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)", animation: "fadeUp 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── Reject modal ─────────────────────────────────────────────────────────── */
function RejectModal({
  record, onClose, onConfirm,
}: {
  record: DayEndRecord;
  onClose: () => void;
  onConfirm: (id: number, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(record.dayendId, reason);
    setLoading(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px 28px 24px", width: 440 }}>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          Reject Request
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-60)", marginBottom: 20 }}>
          Provide a reason for rejecting{" "}
          <strong style={{ color: "var(--ink)" }}>{record.deliveryBoyName}</strong>'s day-end.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Enter rejection reason..."
          style={{
            width: "100%", padding: "12px 14px",
            border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)",
            fontSize: 13.5, fontFamily: "'Inter', sans-serif",
            color: "var(--ink)", resize: "none", outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={confirm} disabled={!reason.trim() || loading}>
            {loading ? "Rejecting…" : "Reject"}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Edit picklist modal ──────────────────────────────────────────────────── */
function EditPicklistModal({
  picklist,
  onClose,
  onSaved,
}: {
  picklist: Picklist;
  onClose: () => void;
  onSaved: (updated: Picklist) => void;
}) {
  const net = parseFloat(picklist.netValue) || 0;

  // Initialise from existing paymentMode (handles JSON array and old CSV)
  const initEntries = parsePaymentMode(picklist.paymentMode);
  const initModes   = initEntries.map(e => e.mode);
  const initAmounts = Object.fromEntries(initEntries.map(e => [e.mode, String(e.amount)]));
  const initDetails = Object.fromEntries(initEntries.map(e => [e.mode, {
    chequeNo:    e.chequeNo    ?? "",
    bankName:    e.bankName    ?? "",
    referenceNo: e.referenceNo ?? "",
  }]));

  const [delivered,     setDelivered]     = useState(picklist.assignStatus === 2);
  const [selectedModes, setSelectedModes] = useState<string[]>(initModes);
  const [modeAmounts,   setModeAmounts]   = useState<Record<string, string>>(initAmounts);
  const [modeDetails,   setModeDetails]   = useState<Record<string, { chequeNo: string; bankName: string; referenceNo: string }>>(initDetails);
  const [reason,        setReason]        = useState(picklist.reason ?? "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const totalPayment = selectedModes.reduce((s, m) => s + (parseFloat(modeAmounts[m] ?? "0") || 0), 0);

  const toggleMode = (m: string) => {
    setSelectedModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    // initialise detail fields if first time selecting
    setModeDetails(prev => prev[m] ? prev : { ...prev, [m]: { chequeNo: "", bankName: "", referenceNo: "" } });
  };

  const setDetail = (mode: string, field: string, value: string) =>
    setModeDetails(prev => ({ ...prev, [mode]: { ...prev[mode], [field]: value } }));

  // Serialize as JSON array to preserve all extra fields
  const buildPaymentModeJson = (): string | null => {
    if (selectedModes.length === 0) return null;
    const entries: Record<string, unknown>[] = selectedModes.map(m => {
      const d   = modeDetails[m] ?? { chequeNo: "", bankName: "", referenceNo: "" };
      const obj: Record<string, unknown> = { mode: m, amount: parseFloat(modeAmounts[m] ?? "0") || 0 };
      if (m === "CHEQUE") {
        if (d.chequeNo.trim())  obj.chequeNo  = d.chequeNo.trim();
        if (d.bankName.trim())  obj.bankName  = d.bankName.trim();
      } else if (m === "UPI" || m === "NEFT" || m === "CREDIT") {
        if (d.referenceNo.trim()) obj.referenceNo = d.referenceNo.trim();
      }
      return obj;
    });
    return JSON.stringify(entries);
  };

  const diff       = totalPayment - net;            // positive = overpaid, negative = underpaid
  const isOverPaid  = diff > net * 0.05;             // > 5% over invoice
  const isUnderPaid = delivered && totalPayment > 0 && diff < -(net * 0.01); // > 1% under

  const validate = () => {
    if (delivered && selectedModes.length === 0)
      return "Select at least one payment mode for a delivered item";
    if (delivered && totalPayment <= 0)
      return "Payment amount must be greater than zero for delivered items";
    if (delivered && isOverPaid)
      return `Payment ₹${totalPayment.toLocaleString("en-IN")} exceeds invoice ₹${net.toLocaleString("en-IN")} by more than 5% — please verify`;
    if (!delivered && !reason.trim())
      return "Please provide a reason for non-delivery";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    const paymentModeJson = delivered ? buildPaymentModeJson() : null;
    try {
      await updatePicklist(picklist.direId!, {
        delivered,
        paymentAmount: delivered ? totalPayment : 0,
        paymentMode:   paymentModeJson,
        reason:        reason.trim() || null,
      });
      onSaved({
        ...picklist,
        delivered,
        assignStatus:  delivered ? 2 : 1,
        paymentAmount: delivered ? totalPayment : 0,
        paymentMode:   paymentModeJson,
        reason:        reason.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    padding: "7px 10px", border: "1.5px solid var(--ink-10)",
    borderRadius: "var(--radius-md)", fontSize: 13,
    fontFamily: "'Inter', sans-serif", color: "var(--ink)",
    outline: "none", width: "100%", boxSizing: "border-box", background: "#fff",
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px", borderBottom: "1px solid var(--ink-10)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", fontFamily: "'Inter', sans-serif" }}>
              Edit Delivery — <span style={{ fontFamily: "monospace", color: "var(--brand)" }}>{picklist.picklistNo}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 3 }}>
              {picklist.custDesc} &nbsp;·&nbsp; Invoice: ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "var(--radius-md)", border: "none",
            background: "var(--ink-5)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-60)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "var(--radius-md)",
              background: "#fee2e2", border: "1px solid #fca5a5",
              fontSize: 13, color: "#991b1b", display: "flex", gap: 8, alignItems: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Delivery Status ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Delivery Status
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setDelivered(val)} style={{
                  padding: "8px 20px", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  border: `1.5px solid ${delivered === val ? (val ? "#10b981" : "#ef4444") : "var(--ink-10)"}`,
                  background: delivered === val ? (val ? "#d1fae5" : "#fee2e2") : "var(--white)",
                  color: delivered === val ? (val ? "#065f46" : "#991b1b") : "var(--ink-60)",
                }}>
                  {val ? "✓ Delivered" : "✗ Not Delivered"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Payment Modes ── */}
          {delivered && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Payment Modes &amp; Amounts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PAYMENT_MODES.map(mode => {
                  const active = selectedModes.includes(mode);
                  const s      = MODE_STYLE[mode] ?? DEFAULT_MODE_STYLE;
                  const d      = modeDetails[mode] ?? { chequeNo: "", bankName: "", referenceNo: "" };
                  return (
                    <div key={mode} style={{
                      borderRadius: 10,
                      border: `1.5px solid ${active ? s.border : "var(--ink-10)"}`,
                      background: active ? s.bg : "#fafafa",
                      overflow: "hidden", transition: "all 0.15s",
                    }}>
                      {/* Mode toggle header */}
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
                          {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: active ? s.color : "var(--ink-60)" }}>{mode}</span>
                      </button>

                      {/* Expanded fields */}
                      {active && (
                        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Amount */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-60)", minWidth: 90 }}>Amount (₹)</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={modeAmounts[mode] ?? ""}
                              onChange={e => setModeAmounts(prev => ({ ...prev, [mode]: e.target.value }))}
                              placeholder="0.00"
                              style={inp}
                            />
                          </div>

                          {/* CHEQUE extras */}
                          {mode === "CHEQUE" && (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-60)", minWidth: 90 }}>Cheque No</span>
                                <input
                                  type="text"
                                  value={d.chequeNo}
                                  onChange={e => setDetail(mode, "chequeNo", e.target.value)}
                                  placeholder="e.g. 001234"
                                  style={inp}
                                />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-60)", minWidth: 90 }}>Bank Name</span>
                                <input
                                  type="text"
                                  value={d.bankName}
                                  onChange={e => setDetail(mode, "bankName", e.target.value)}
                                  placeholder="e.g. SBI, HDFC…"
                                  style={inp}
                                />
                              </div>
                            </>
                          )}

                          {/* UPI / NEFT / CREDIT extras */}
                          {(mode === "UPI" || mode === "NEFT" || mode === "CREDIT") && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-60)", minWidth: 90 }}>Reference No</span>
                              <input
                                type="text"
                                value={d.referenceNo}
                                onChange={e => setDetail(mode, "referenceNo", e.target.value)}
                                placeholder="e.g. UTR / UPI ref…"
                                style={inp}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Invoice vs Collected summary */}
              <div style={{
                marginTop: 12, borderRadius: "var(--radius-md)",
                border: `1.5px solid ${isOverPaid ? "#fca5a5" : isUnderPaid ? "#fcd34d" : "#6ee7b7"}`,
                overflow: "hidden",
              }}>
                {/* Header bar */}
                <div style={{
                  background: isOverPaid ? "#fee2e2" : isUnderPaid ? "#fef3c7" : "#d1fae5",
                  padding: "8px 14px",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, fontWeight: 700,
                  color: isOverPaid ? "#991b1b" : isUnderPaid ? "#92400e" : "#065f46",
                }}>
                  <span>{isOverPaid ? "⚠ Overpaid" : isUnderPaid ? "⚠ Underpaid" : "✓ Amount looks good"}</span>
                </div>

                {/* Three columns: Invoice | Collected | Difference */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  background: "#fafafa",
                }}>
                  {/* Invoice */}
                  <div style={{ padding: "12px 14px", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Invoice
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>
                      ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Collected */}
                  <div style={{ padding: "12px 14px", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Collected
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: isOverPaid ? "#991b1b" : "var(--brand)" }}>
                      ₹{totalPayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Difference */}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Difference
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: diff === 0 ? "#065f46" : isOverPaid ? "#991b1b" : "#92400e",
                    }}>
                      {diff === 0 ? "—" : (diff > 0 ? "+" : "−") + " ₹" + Math.abs(diff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Reason ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {delivered ? "Remarks (optional)" : "Reason for Non-Delivery *"}
            </div>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={delivered ? "Any remarks…" : "e.g. Customer unavailable, address incorrect…"}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--ink-10)",
          display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0,
        }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Delete confirmation modal ────────────────────────────────────────────── */
function DeleteConfirmModal({
  direId,
  onClose,
  onDeleted,
}: {
  direId: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const confirm = async () => {
    setLoading(true); setError("");
    try {
      await deletePicklist(direId);
      onDeleted();
    } catch {
      setError("Failed to delete. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px", width: 400 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
          Delete Picklist
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-60)", marginBottom: 20, lineHeight: 1.5 }}>
          Are you sure you want to remove picklist <strong style={{ color: "var(--ink)", fontFamily: "monospace" }}>{picklistNo}</strong> from the delivery assignment? This cannot be undone.
        </p>
        {error && (
          <p style={{ fontSize: 13, color: "#991b1b", marginBottom: 14 }}>{error}</p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="danger" onClick={confirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Status card theme ────────────────────────────────────────────────────── */
const CARD_THEME: Record<string, { border: string; headerBg: string; footerBg: string; footerBorder: string; textColor: string }> = {
  APPROVED: { border: "#10b981", headerBg: "#f0fdf4", footerBg: "#f0fdf4", footerBorder: "#a7f3d0", textColor: "#065f46" },
  PENDING:  { border: "#f59e0b", headerBg: "#fffbeb", footerBg: "#fffbeb", footerBorder: "#fde68a", textColor: "#92400e" },
  REJECTED: { border: "#ef4444", headerBg: "#fef2f2", footerBg: "#fef2f2", footerBorder: "#fca5a5", textColor: "#991b1b" },
};
const DEFAULT_CARD_THEME = { border: "#e2e8f0", headerBg: "#f8fafc", footerBg: "#f8fafc", footerBorder: "#e2e8f0", textColor: "#64748b" };

/* ── Picklist expanded card ────────────────────────────────────────────────── */
function PicklistRow({
  dayendId,
  colSpan,
  row,
  onApprove,
  onReject,
}: {
  dayendId: number;
  colSpan: number;
  row: DayEndRecord;
  onApprove: () => void;
  onReject:  () => void;
}) {
  const [items,    setItems]    = useState<Picklist[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [editing,  setEditing]  = useState<Picklist | null>(null);
  const [deleting, setDeleting] = useState<Picklist | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const printCard = () => {
    const company  = getCompanyInfo();
    const authUser = authService.getUser();

    /* ── Payment totals per mode ── */
    const totals: Record<string, number> = {};
    items.forEach(p => parsePaymentMode(p.paymentMode).forEach(e => {
      totals[e.mode] = (totals[e.mode] ?? 0) + e.amount;
    }));
    const grandTotal = Object.entries(totals)
      .filter(([mode]) => mode.toUpperCase() !== "CREDIT")
      .reduce((s, [, v]) => s + v, 0);

    /* ── REF — prefer backend-generated code, fall back to derived ── */
    const now      = new Date();
    const rawDate  = row.deliveryDate ?? row.requestDate?.split(" ")[0] ?? "";
    const dp       = rawDate.split(/[-\/]/);
    const mmdd     = dp.length >= 2 ? dp[1].padStart(2,"0") + dp[0].padStart(2,"0") : "0000";
    const ref      = row.dayEndCode ?? `DE-${now.getFullYear()}-${mmdd}-${String(row.dayendId).padStart(3,"0")}`;
    const genTime  = now.toLocaleDateString("en-IN",{ day:"2-digit", month:"2-digit", year:"numeric" })
                   + " " + now.toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit", hour12:false });

    const approvedBy   = authUser?.fullName ?? authUser?.username ?? "System Administrator";
    const approvedRole = (authUser?.role ?? "Admin") + " · " + (company?.name ?? "Direco");
    const agentName    = row.deliveryBoyName ?? "Agent";

    /* ── Mode badge HTML ── */
    const BADGE_STYLES: Record<string,string> = {
      CASH:   "background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;",
      CHEQUE: "background:#fef3c7;color:#92400e;border:1px solid #fcd34d;",
      UPI:    "background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;",
      NEFT:   "background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;",
      CARD:   "background:#fce7f3;color:#9d174d;border:1px solid #f9a8d4;",
    };
    const DEFAULT_BADGE = "background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;";
    const badge = (mode: string) => {
      const s = BADGE_STYLES[mode.toUpperCase()] ?? DEFAULT_BADGE;
      return `<span style="${s}display:inline-block;border-radius:50px;padding:2px 10px;font-size:10.5px;font-weight:700;">${mode}</span>`;
    };

    /* ── Payment totals strip ── */
    const totalsHtml = Object.entries(totals).map(([mode, amount]) => {
      const s = BADGE_STYLES[mode.toUpperCase()] ?? DEFAULT_BADGE;
      const bg    = (s.match(/background:([^;]+)/) ?? [])[1] ?? "#f1f5f9";
      const color = (s.match(/color:([^;]+)/)      ?? [])[1] ?? "#374151";
      const bdr   = (s.match(/border:[^;]+solid ([^;]+)/) ?? [])[1] ?? "#e2e8f0";
      return `<div style="border:1px solid ${bdr};border-radius:10px;padding:14px 20px;background:${bg};">
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${mode}</div>
        <div style="font-size:20px;font-weight:800;color:${color};">&#8377;${amount.toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
      </div>`;
    }).join("");

    /* ── Picklist table rows ── */
    const tableRows = items.map(p => {
      const net     = parseFloat(p.netValue) || 0;
      const entries = parsePaymentMode(p.paymentMode);
      const payHtml = entries.length === 0
        ? `<span style="color:#94a3b8;">—</span>`
        : entries.map(e => {
            const details: string[] = [];
            if (e.chequeNo)    details.push(`Chq No: ${e.chequeNo}${e.bankName ? " &nbsp;·&nbsp; " + e.bankName : ""}`);
            if (e.referenceNo) details.push(`Ref: ${e.referenceNo}`);
            return `<div style="margin-bottom:8px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                ${badge(e.mode)}
                <span style="font-weight:700;font-size:13px;color:#1a1a2e;">&#8377;${e.amount.toLocaleString("en-IN",{minimumFractionDigits:2})}</span>
              </div>
              ${details.length ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${details.join(" ")}</div>` : ""}
            </div>`;
          }).join("");
      return `<tr>
        <td style="padding:14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#7c3aed;font-size:13px;white-space:nowrap;vertical-align:top;">${p.picklistNo}</td>
        <td style="padding:14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <div style="font-weight:600;font-size:13px;color:#1a1a2e;">${p.custDesc || "—"}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">${p.customerNo}</div>
        </td>
        <td style="padding:14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;font-size:13px;color:#1a1a2e;white-space:nowrap;vertical-align:top;">&#8377;${net.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
        <td style="padding:14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">${payHtml}</td>
      </tr>`;
    }).join("");

    /* ── Signature boxes ── */
    const sigBoxes = [
      { label:"AGENT",                    name:agentName,            sub:`Delivery Agent · ID #${row.deliveryId}`, sig:"Signature & date:" },
      { label:"VERIFIED & APPROVED BY",   name:approvedBy,           sub:approvedRole,                             sig:"Signature & stamp:" },
      { label:"RECEIVED BY (ACCOUNTS)",   name:"Accounts Department",sub:"Finance team",                           sig:"Signature & stamp:" },
    ].map(s => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between;min-height:120px;">
        <div>
          <div style="font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${s.label}</div>
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">${s.name}</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">${s.sub}</div>
        </div>
        <div style="border-top:1px solid #cbd5e1;padding-top:6px;margin-top:20px;">
          <span style="font-size:11px;color:#94a3b8;">${s.sig}</span>
        </div>
      </div>`).join("");

    /* ── Info summary boxes ── */
    const infoBoxes = [
      { label:"AGENT",           value: agentName },
      { label:"DAY END ID",      value: ref.includes("-") ? ref.split("-").pop()! : ref },
      { label:"REPORT DATE",     value: row.deliveryDate ?? row.requestDate?.split(" ")[0] ?? "—" },
      { label:"TOTAL PICKLISTS", value: String(items.length) },
    ].map(b => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
        <div style="font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${b.label}</div>
        <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${b.value}</div>
      </div>`).join("");

    const totalsCount = Object.keys(totals).length;
    const gridCols    = `repeat(${totalsCount + 1},1fr)`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Day End Settlement — ${ref}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,'Helvetica Neue',sans-serif;background:#fff;color:#1a1a2e;padding:32px;}
  @media print{body{padding:0;} @page{margin:12mm;size:A4;}}
</style>
</head><body>

<!-- HEADER -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #7c3aed;margin-bottom:20px;">
  <div style="display:flex;align-items:center;gap:12px;">
    <div style="width:44px;height:44px;border-radius:10px;background:#7c3aed;display:flex;align-items:center;justify-content:center;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
    <div>
      <div style="font-size:18px;font-weight:800;color:#1a1a2e;">Direco</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:1px;">Distributor to Retail Connect</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:22px;font-weight:900;color:#7c3aed;letter-spacing:0.04em;">DAY END SETTLEMENT</div>
    <div style="font-size:11.5px;color:#64748b;margin-top:5px;">REF: ${ref} &nbsp;|&nbsp; Generated: ${genTime}</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Printed by: ${approvedBy}</div>
  </div>
</div>

<!-- INFO BOXES -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">${infoBoxes}</div>

<!-- PAYMENT TOTALS -->
<div style="display:grid;grid-template-columns:${gridCols};gap:12px;margin-bottom:24px;">
  ${totalsHtml}
  <div style="border-radius:10px;padding:14px 20px;background:#1a1a2e;">
    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">GRAND TOTAL</div>
    <div style="font-size:20px;font-weight:800;color:#fff;">&#8377;${grandTotal.toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
  </div>
</div>

<!-- PICKLIST TABLE -->
<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:28px;">
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Picklist No.</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Customer</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Net Value</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;">Payment</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>

<!-- AUTHORISATION & SIGNATURE -->
<div>
  <div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Authorisation &amp; Signature</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">${sigBoxes}</div>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const load = useCallback(() => {
    setLoading(true); setError("");
    fetchPicklistsByDayend(dayendId)
      .then((data: Picklist[]) => { setItems(data); setLoading(false); })
      .catch(() => { setError("Could not load picklists"); setLoading(false); });
  }, [dayendId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated: Picklist) => {
    setItems(prev => prev.map(p => p.direId === updated.direId ? updated : p));
    setEditing(null);
  };

  const handleDeleted = (direId: number) => {
    setItems(prev => prev.filter(p => p.direId !== direId));
    setDeleting(null);
  };

  /* Aggregate payment totals per mode across all picklists */
  const paymentTotals: Record<string, number> = {};
  items.forEach(p => {
    parsePaymentMode(p.paymentMode).forEach(e => {
      paymentTotals[e.mode] = (paymentTotals[e.mode] ?? 0) + e.amount;
    });
  });

  const theme    = CARD_THEME[row.status] ?? DEFAULT_CARD_THEME;
  const initials = (row.deliveryBoyName ?? "DA").slice(0, 2).toUpperCase();
  const issueCount = items.filter(p => validatePicklist(p) !== null).length;
  const dateLabel  = row.deliveryDate ?? row.requestDate?.split(" ")[0] ?? "—";

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "0 0 4px" }}>
        {editing  && <EditPicklistModal picklist={editing}  onClose={() => setEditing(null)}  onSaved={handleSaved} />}
        {deleting && <DeleteConfirmModal direId={deleting.direId!} onClose={() => setDeleting(null)} onDeleted={() => handleDeleted(deleting.direId!)} />}

        {/* ── Card ── */}
        <div ref={cardRef} style={{
          margin: "4px 12px 14px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          borderLeft: `4px solid ${theme.border}`,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          overflow: "hidden",
          animation: "fadeUp 0.2s ease",
        }}>

          {/* ── Card Header ─────────────────────────────────────────────── */}
          <div style={{
            padding: "14px 20px",
            background: theme.headerBg,
            borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            {/* Avatar */}
            <div style={{
              width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
              background: theme.border, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, letterSpacing: "0.04em",
            }}>{initials}</div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", fontFamily: "'Inter', sans-serif" }}>
                  {row.deliveryBoyName}
                </span>
                <StatusBadge status={row.status} />
                {issueCount > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 50,
                    background: "#fef3c7", color: "#92400e",
                  }}>
                    ⚠ {issueCount} issue{issueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-40)", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                {row.dayEndCode && (
                  <span style={{
                    fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                    color: "var(--brand)", background: "var(--brand-xlight)",
                    padding: "1px 7px", borderRadius: 5,
                    border: "1px solid var(--brand-light)",
                  }}>{row.dayEndCode}</span>
                )}
                <span>ID #{row.deliveryId}&nbsp;·&nbsp;{dateLabel}</span>
              </div>
            </div>

            {/* PENDING actions */}
            {row.status === "PENDING" && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={onApprove} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 12.5,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Approve
                </button>
                <button onClick={onReject} style={{
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                  border: "1.5px solid #fca5a5", background: "#fee2e2",
                  color: "#991b1b", fontWeight: 700, fontSize: 12.5,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                  Delete all
                </button>
              </div>
            )}
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 8, color: "var(--ink-40)", fontSize: 13 }}>
              <div style={{ width: 14, height: 14, border: "2px solid var(--ink-20)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Loading picklists…
            </div>
          ) : error ? (
            <div style={{ padding: 20, fontSize: 13, color: "var(--danger)" }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: "var(--ink-40)" }}>No picklists found for this delivery.</div>
          ) : (
            <>
              {/* ── Picklist Table ── */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["NO.", "CUSTOMER", "NET VALUE", "PAYMENT", "COLLECTED", "STATUS", "ISSUE",
                        ...(row.status === "PENDING" ? [""] : [])
                      ].map((h, hi) => (
                        <th key={hi} style={{
                          padding: "8px 14px",
                          textAlign: h === "NET VALUE" || h === "COLLECTED" ? "right" : "left",
                          fontSize: 10.5, fontWeight: 700,
                          color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => {
                      const issue   = validatePicklist(p);
                      const net     = parseFloat(p.netValue) || 0;
                      const entries = parsePaymentMode(p.paymentMode);
                      return (
                        <tr key={i} style={{
                          borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none",
                          background: issue ? "rgba(254,243,199,0.25)" : "transparent",
                        }}>

                          {/* NO. */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: "50%",
                              background: "#ede9fe", color: "#5b21b6",
                              fontSize: 11.5, fontWeight: 800,
                            }}>#{i + 1}</span>
                          </td>

                          {/* CUSTOMER */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{p.custDesc || "—"}</div>
                            <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2, fontFamily: "monospace" }}>{p.customerNo}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                              {p.direId ? <span style={{ fontSize: 10, fontWeight: 700, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 4, padding: "1px 6px" }}>DIRE #{p.direId}</span> : null}
                              {p.invoiceNo ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-60)", background: "var(--ink-5)", border: "1px solid var(--ink-10)", borderRadius: 4, padding: "1px 6px" }}>INV {p.invoiceNo}</span> : null}
                            </div>
                          </td>

                          {/* NET VALUE */}
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
                            ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* PAYMENT — badge + reference details */}
                          <td style={{ padding: "10px 14px" }}>
                            {entries.length === 0 ? (
                              <span style={{ fontSize: 12, color: "var(--ink-30)" }}>—</span>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {entries.map((e, ei) => {
                                  const s = MODE_STYLE[e.mode.toUpperCase()] ?? DEFAULT_MODE_STYLE;
                                  const details: string[] = [];
                                  if (e.chequeNo)    details.push(`Chq: ${e.chequeNo}${e.bankName ? " · " + e.bankName : ""}`);
                                  if (e.referenceNo) details.push(`Ref: ${e.referenceNo}`);
                                  return (
                                    <div key={ei}>
                                      <span style={{
                                        fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50,
                                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                                        whiteSpace: "nowrap", display: "inline-block",
                                      }}>{e.mode}</span>
                                      {details.map((d, di) => (
                                        <div key={di} style={{ fontSize: 10.5, color: "var(--ink-60)", marginTop: 2, paddingLeft: 2 }}>{d}</div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* COLLECTED */}
                          <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                            {p.paymentAmount > 0 ? (
                              <span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>
                                ₹{p.paymentAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-30)" }}>—</span>
                            )}
                          </td>

                          {/* STATUS */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                              ...statusStyle(p),
                            }}>{statusLabel(p)}</span>
                          </td>

                          {/* ISSUE */}
                          <td style={{ padding: "10px 14px", maxWidth: 160 }}>
                            {issue ? (
                              <span style={{ fontSize: 11, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 4 }}>
                                <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>⚠</span>
                                <span style={{ lineHeight: 1.4 }}>{issue}</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: 15, color: "#10b981" }}>✓</span>
                            )}
                          </td>

                          {/* ACTIONS — only editable while PENDING */}
                          {row.status === "PENDING" && (
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", gap: 5 }}>
                                <button onClick={() => setEditing(p)} title="Edit" style={{
                                  padding: "5px 11px", borderRadius: 6,
                                  border: "1.5px solid var(--brand)", background: "var(--brand-light)",
                                  color: "var(--brand)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                }}>✏</button>
                                <button onClick={() => setDeleting(p)} title="Delete" style={{
                                  padding: "5px 11px", borderRadius: 6,
                                  border: "1.5px solid #fca5a5", background: "#fee2e2",
                                  color: "#991b1b", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                }}>🗑</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Payment Summary + Grand Total ── */}
              {Object.keys(paymentTotals).length > 0 && (() => {
                const grandTotal = Object.entries(paymentTotals)
                  .filter(([mode]) => mode.toUpperCase() !== "CREDIT")
                  .reduce((s, [, v]) => s + v, 0);
                const totalNetValue = items.reduce((s, p) => s + (parseFloat(p.netValue) || 0), 0);
                return (
                  <div style={{ borderTop: "1px solid #e2e8f0", background: "#fafafa" }}>
                    {/* Mode breakdown row */}
                    <div style={{
                      padding: "12px 20px",
                      display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
                    }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)",
                        textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 4,
                      }}>Collected</span>
                      {Object.entries(paymentTotals).map(([mode, amount]) => {
                        const s = MODE_STYLE[mode.toUpperCase()] ?? DEFAULT_MODE_STYLE;
                        return (
                          <div key={mode} style={{
                            padding: "6px 16px", borderRadius: 9,
                            background: s.bg, border: `1px solid ${s.border}`,
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{mode}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: s.color }}>
                              ₹{amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}
                      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--ink-60)" }}>
                        {items.length} picklist{items.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
                        {items.filter(p => p.assignStatus === 2).length} delivered&nbsp;·&nbsp;
                        {items.filter(p => p.assignStatus !== 2).length} pending/failed
                      </span>
                    </div>

                    {/* Grand total bar */}
                    <div style={{
                      padding: "12px 20px",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#fff",
                    }}>
                      <div style={{ display: "flex", gap: 28 }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                            Invoice Total
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>
                            ₹{totalNetValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div style={{ width: 1, background: "#e2e8f0" }} />
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                            Total Collected
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: grandTotal >= totalNetValue * 0.99 ? "#065f46" : "#b45309" }}>
                            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        {Math.abs(grandTotal - totalNetValue) > 1 && (
                          <>
                            <div style={{ width: 1, background: "#e2e8f0" }} />
                            <div>
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                                Difference
                              </div>
                              <div style={{ fontSize: 17, fontWeight: 800, color: grandTotal > totalNetValue ? "#991b1b" : "#b45309" }}>
                                {grandTotal > totalNetValue ? "+" : "−"}₹{Math.abs(grandTotal - totalNetValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Grand total pill */}
                      <div style={{
                        padding: "10px 24px", borderRadius: 10,
                        background: "var(--ink)", color: "#fff",
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 3 }}>
                          Grand Total
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>
                          ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Signature section (APPROVED only) ── */}
              {row.status === "APPROVED" && (
                <div style={{
                  padding: "16px 20px 20px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#fafafa",
                }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)",
                    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14,
                  }}>Signature</div>
                  <div style={{ display: "flex", gap: 20 }}>
                    {["Verified by", "Authorised by"].map(label => (
                      <div key={label} style={{
                        flex: 1,
                        border: "1px dashed #cbd5e1",
                        borderRadius: 10,
                        padding: "12px 18px 10px",
                        minHeight: 72,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        background: "#fff",
                      }}>
                        <div style={{
                          borderTop: "1px solid #94a3b8",
                          paddingTop: 7, marginTop: 28,
                        }}>
                          <span style={{ fontSize: 11.5, color: "var(--ink-40)", fontWeight: 600 }}>{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Print footer (APPROVED only) ── */}
              {row.status === "APPROVED" && (
                <div style={{
                  padding: "12px 20px",
                  borderTop: `1px solid ${theme.footerBorder}`,
                  background: theme.footerBg,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, color: "#10b981", lineHeight: 1 }}>✓</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>
                      Approved — ready to print
                    </span>
                  </div>
                  <button
                    onClick={printCard}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 13,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print DA{row.deliveryId}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function DayEnd() {
  const [data, setData]           = useState<DayEndRecord[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("ALL");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");
  const [actionLoading, setAL]    = useState<Record<string, boolean>>({});
  const [toast, setToast]         = useState<ToastState | null>(null);
  const [rejectRec, setRejectRec] = useState<DayEndRecord | null>(null);
  const [expandedId, setExpanded] = useState<number | null>(null);

  const showToast = (message: string, type: ToastState["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchDayEndSummary();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: number) => {
    setAL(p => ({ ...p, [`a_${id}`]: true }));
    try {
      await approveDayEnd(id);
      setData(prev => prev.map(r => r.dayendId === id ? { ...r, status: "APPROVED" as const } : r));
      showToast("Approved successfully", "success");
    } catch { showToast("Failed to approve", "error"); }
    finally { setAL(p => ({ ...p, [`a_${id}`]: false })); }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await rejectDayEnd(id, reason);
      setData(prev => prev.map(r => r.dayendId === id ? { ...r, status: "REJECTED" as const, rejectReason: reason } : r));
      setRejectRec(null);
      showToast("Request rejected", "error");
    } catch { showToast("Failed to reject", "error"); }
  };

  const filtered = data.filter(r => {
    const nameOk   = r.deliveryBoyName?.toLowerCase().includes(search.toLowerCase());
    const statusOk = status === "ALL" || r.status === status;
    let   dateOk   = true;
    if (from || to) {
      const d = r.requestDate?.split(" ")[0] ?? "";
      if (from && d < from) dateOk = false;
      if (to   && d > to)   dateOk = false;
    }
    return nameOk && statusOk && dateOk;
  });

  const COL_SPAN = 5;

  return (
    <div className="animate-fade-up">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {rejectRec && (
        <RejectModal
          record={rejectRec}
          onClose={() => setRejectRec(null)}
          onConfirm={handleReject}
        />
      )}

      <PageHeader
        title="Day End"
        subtitle="Review and settle delivery day-end requests"
        action={
          <Btn variant="secondary" onClick={load} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </Btn>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 16 }} padding="14px 18px">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search agent name..." />
          <Select value={status} onChange={setStatus}>
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 600 }}>From</span>
            <input
              type="date" value={from}
              onChange={e => setFrom(e.target.value)}
              style={{
                padding: "8px 12px", border: "1.5px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", fontSize: 13,
                fontFamily: "'Inter', sans-serif", background: "var(--white)",
                color: "var(--ink)", outline: "none", cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 600 }}>To</span>
            <input
              type="date" value={to}
              onChange={e => setTo(e.target.value)}
              style={{
                padding: "8px 12px", border: "1.5px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", fontSize: 13,
                fontFamily: "'Inter', sans-serif", background: "var(--white)",
                color: "var(--ink)", outline: "none", cursor: "pointer",
              }}
            />
            {(from || to) && (
              <Btn size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>✕ Clear</Btn>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        headers={["Agent", "Day End ID", "Date", "Status", "Action"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No day-end records match your filters"
      >
        {filtered.map(row => {
          const isOpen = expandedId === row.dayendId;
          return (
            <React.Fragment key={row.dayendId}>
              <TR
                style={{ background: isOpen ? "var(--brand-xlight)" : undefined }}
              >
                {/* Agent */}
                <TD>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: isOpen ? "var(--brand)" : "var(--brand-light)",
                      color: isOpen ? "#fff" : "var(--brand)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      transition: "all 0.2s",
                    }}>{row.deliveryBoyName?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{row.deliveryBoyName}</span>
                      <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 1 }}>
                        ID #{row.deliveryId}
                      </div>
                    </div>
                  </div>
                </TD>

                {/* Day End ID */}
                <TD>
                  <span style={{
                    fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                    color: "var(--brand)", background: "var(--brand-xlight)",
                    padding: "3px 8px", borderRadius: 6,
                    border: "1px solid var(--brand-light)",
                    whiteSpace: "nowrap",
                  }}>
                    {row.dayEndCode ?? `#${row.dayendId}`}
                  </span>
                </TD>

                {/* Date */}
                <TD style={{ color: "var(--ink-60)" }}>{row.requestDate?.split(" ")[0] ?? "—"}</TD>

                {/* Status */}
                <TD><StatusBadge status={row.status} /></TD>

                {/* Action */}
                <TD onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.dayendId)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isOpen ? "var(--brand)" : "var(--ink-10)"}`,
                      background: isOpen ? "var(--brand-light)" : "var(--white)",
                      color: isOpen ? "var(--brand)" : "var(--ink-60)",
                      fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    {isOpen ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15"/>
                        </svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        Show
                      </>
                    )}
                  </button>
                </TD>
              </TR>

              {/* Expanded picklist card */}
              {isOpen && (
                <PicklistRow
                  dayendId={row.dayendId}
                  colSpan={COL_SPAN}
                  row={row}
                  onApprove={() => handleApprove(row.dayendId)}
                  onReject={() => setRejectRec(row)}
                />
              )}
            </React.Fragment>
          );
        })}
      </DataTable>
    </div>
  );
}
