import '../styles/pages/MobileDanClosePage.css';
import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/ui";
import {
  fetchOpenDans, fetchDanInvoices, fetchPaymentSummary, fetchPaymentDetail,
  storekeeperApprove, accountsApprove,
} from "../services/mobileDanService";
import { saveReturnsByDire, saveDanPayment } from "../services/danService";
import {
  MobileAgent, MobileInvoice, PaymentSummary, PaymentMode, SavedReturns, ApprovalStatus,
  InvoicePaymentDetail,
} from "../models/MobileDanModel";
import { authService } from "../services/authService";

const STEP_LABELS = ["", "Choose agent", "Settle returns", "Accounts"];
const DOT_LABELS  = ["Agent", "Returns", "Accounts"];
const MODES: { key: PaymentMode; label: string }[] = [
  { key: "cash",   label: "Cash"   },
  { key: "upi",    label: "UPI"    },
  { key: "cheque", label: "Cheque" },
  { key: "neft",   label: "NEFT"   },
];

const inr = (n: number) => "₹" + Math.abs(n).toLocaleString("en-IN");

/** Sum of saved return amounts across the given rows, skipping deleted ones. */
const sumReturns = (
  rowIds: string[],
  saved: SavedReturns,
  deleted: Set<string>,
): number =>
  rowIds
    .filter(id => !deleted.has(id))
    .reduce((a, id) => a + (parseFloat(saved[id]?.retAmt ?? "") || 0), 0);

/* ── Step indicator ───────────────────────────────────────────────────────── */
const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <div className="mdan-step-indicator">
    {DOT_LABELS.map((label, i) => {
      const n = i + 1;
      const state = n < step ? "done" : n === step ? "active" : "idle";
      return (
        <React.Fragment key={label}>
          {i > 0 && <div className={`mdan-step-line ${n <= step ? "done" : ""}`} />}
          <div className="mdan-dot-wrap">
            <div className={`mdan-dot ${state}`}>{state === "done" ? "✓" : n}</div>
            <div className={`mdan-dot-label ${state === "active" ? "active" : ""}`}>{label}</div>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

/* ── Step 2 — one store card ──────────────────────────────────────────────── */
const StoreReturnCard: React.FC<{
  invoice: MobileInvoice;
  saved: SavedReturns;
  editingRow: string | null;
  deleted: Set<string>;
  onEdit: (rowId: string) => void;
  onSave: (rowId: string, v: SavedReturns[string]) => void;
  onDelete: (rowId: string) => void;
}> = ({ invoice, saved, editingRow, deleted, onEdit, onSave, onDelete }) => {
  const [draft, setDraft] = useState<SavedReturns[string]>(
    { billQty: "", billAmt: "", retQty: "", retAmt: "" }
  );

  // Load the row's saved values into the draft when its edit panel opens
  useEffect(() => {
    if (editingRow && invoice.rows.some(r => r.rowId === editingRow)) {
      setDraft(saved[editingRow] ?? { billQty: "", billAmt: "", retQty: "", retAmt: "" });
    }
  }, [editingRow]);   // eslint-disable-line react-hooks/exhaustive-deps

  const cell = (v: string | undefined) =>
    <span className={`mdan-cell-view ${v ? "" : "empty"}`}>{v || "—"}</span>;

  const storeTotal = sumReturns(invoice.rows.map(r => r.rowId), saved, deleted);

  /* Ret amt = (bill amt / bill qty) × ret qty — re-derived as the user types
     in any of the three driving fields. Editing ret amt itself overrides it. */
  const applyEdit = (field: keyof SavedReturns[string], val: string) =>
    setDraft(p => {
      const next = { ...p, [field]: val };
      if (field === "retAmt") return next;
      const billQty = parseFloat(next.billQty) || 0;
      const billAmt = parseFloat(next.billAmt) || 0;
      if (billQty <= 0 || billAmt <= 0) return next;
      const retQty = parseFloat(next.retQty) || 0;
      return { ...next, retAmt: (Math.round((billAmt / billQty) * retQty * 100) / 100).toFixed(2) };
    });

  return (
    <div className="mdan-store-card">
      <div className="mdan-store-head">
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <span className="mdan-store-num">#{invoice.no}</span>
          <span className="mdan-store-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {invoice.storeName}
          </span>
        </div>
        <span className="mdan-badge-inv">{invoice.invoiceNo}</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="mdan-ret-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>Sl</th>
              <th style={{ width: 60 }}>Bill qty</th>
              <th style={{ width: 68 }}>Bill amt</th>
              <th style={{ width: 60 }}>Ret qty</th>
              <th style={{ width: 68 }}>Ret amt</th>
              <th style={{ width: 50 }}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {invoice.rows.filter(r => !deleted.has(r.rowId)).map(row => {
              const d = saved[row.rowId];
              const isEditing = editingRow === row.rowId;
              return (
                <React.Fragment key={row.rowId}>
                  <tr>
                    <td style={{ color: "#bbb", fontSize: 11, textAlign: "center" }}>{row.sl}</td>
                    <td>{cell(d?.billQty)}</td>
                    <td>{cell(d?.billAmt)}</td>
                    <td>{cell(d?.retQty)}</td>
                    <td>{cell(d?.retAmt)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className={`mdan-row-edit-btn ${isEditing ? "editing" : ""}`}
                        onClick={() => onEdit(row.rowId)}
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr className="mdan-edit-row">
                      <td colSpan={6}>
                        <div className="mdan-edit-wrap">
                          {([
                            ["billQty", "Bill qty"], ["billAmt", "Bill amt"],
                            ["retQty",  "Ret qty"],  ["retAmt",  "Ret amt"],
                          ] as const).map(([field, placeholder]) => (
                            <input
                              key={field}
                              className="mdan-amt-input"
                              type="number"
                              placeholder={placeholder}
                              value={draft[field]}
                              onChange={e => applyEdit(field, e.target.value)}
                            />
                          ))}
                          <button
                            className="mdan-amt-save-btn"
                            onClick={() => onSave(row.rowId, draft)}
                          >Save</button>
                          <button
                            className="mdan-amt-del-btn"
                            onClick={() => onDelete(row.rowId)}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mdan-store-total">
        <span>Return total</span>
        <strong>{inr(storeTotal)}</strong>
      </div>
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
/**
 * `standalone` renders full-screen with no app chrome — used by the /m/dan-close
 * route that a phone / webview opens directly. Inside the desktop shell the page
 * renders as a centered phone-shaped preview card instead.
 */
const MobileDanClosePage: React.FC<{ standalone?: boolean }> = ({ standalone = false }) => {
  const [step, setStep] = useState(1);

  const [agents,   setAgents]   = useState<MobileAgent[]>([]);
  const [selected, setSelected] = useState<MobileAgent | null>(null);
  const [invoices, setInvoices] = useState<MobileInvoice[]>([]);
  const [summary,  setSummary]  = useState<PaymentSummary | null>(null);
  const [payDetail, setPayDetail] = useState<InvoicePaymentDetail[]>([]);

  const [saved,      setSaved]      = useState<SavedReturns>({});
  const [deletedRows, setDeletedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);

  /* Return value across every invoice in the DAN — recomputed as rows are
     edited or deleted, so it always matches the per-store subtotals. */
  const totalReturn = sumReturns(
    invoices.flatMap(inv => inv.rows.map(r => r.rowId)),
    saved,
    deletedRows,
  );

  const [amounts,  setAmounts]  = useState<Record<PaymentMode, string>>(
    { cash: "0", upi: "0", cheque: "0", neft: "0" }
  );
  const [openMode, setOpenMode] = useState<PaymentMode | null>(null);
  // Modal for editing one invoice's payment (amount + mode-specific details)
  const [editInvoice, setEditInvoice] = useState<InvoicePaymentDetail | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", chequeNo: "", bankName: "", referenceNo: "" });
  const [savingInvoice, setSavingInvoice] = useState<number | null>(null);

  const [loading,  setLoading]  = useState(false);
  const [approved, setApproved] = useState(false);
  const [error,    setError]    = useState("");
  const [approval, setApproval] = useState<ApprovalStatus | null>(null);

  /* Session handoff from the Android app: ?code= is exchanged for user details
     via /auth/web-session/{code} before any data loads. */
  const [sessionReady, setSessionReady] = useState(
    () => !new URLSearchParams(window.location.search).get("code")
  );
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    authService.adoptWebSession(code).finally(() => {
      // strip the one-time code from the URL either way
      window.history.replaceState({}, "", window.location.pathname);
      setSessionReady(true);
    });
  }, []);

  /* Step 1 — load open DANs (re-used after an approval closes one) */
  const loadOpenDans = useCallback(() => {
    setLoading(true);
    return fetchOpenDans()
      .then(list => { setAgents(list); setSelected(list[0] ?? null); })
      .catch(() => setError("Could not load open DANs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    loadOpenDans();
  }, [sessionReady, loadOpenDans]);

  /** Clears the wizard and returns to step 1 with a freshly-loaded DAN list. */
  const goHome = useCallback(() => {
    setStep(1);
    setSaved({});
    setEditingRow(null);
    setApproval(null);
    setApproved(false);
    setError("");
    setInvoices([]);
    setSummary(null);
    setPayDetail([]);
    setOpenMode(null);
    setEditInvoice(null);
    setDeletedRows(new Set());
    setAmounts({ cash: "0", upi: "0", cheque: "0", neft: "0" });
    loadOpenDans();
  }, [loadOpenDans]);

  /* After the accounts sign-off, show the confirmation briefly then go home */
  useEffect(() => {
    if (!approved) return;
    const t = setTimeout(goHome, 2000);
    return () => clearTimeout(t);
  }, [approved, goHome]);

  /* Step 2/3 — load the selected DAN's data */
  useEffect(() => {
    if (!selected) return;
    fetchDanInvoices(selected.danId)
      .then(list => {
        setInvoices(list);
        // Seed the return grid with any values the backend pre-loaded
        const seed: SavedReturns = {};
        for (const inv of list) {
          for (const r of inv.rows) {
            if (r.billQty != null || r.billAmt != null || r.retQty != null || r.retAmt != null) {
              seed[r.rowId] = {
                billQty: r.billQty != null ? String(r.billQty) : "",
                billAmt: r.billAmt != null ? String(r.billAmt) : "",
                retQty:  r.retQty  != null ? String(r.retQty)  : "",
                retAmt:  r.retAmt  != null ? String(r.retAmt)  : "",
              };
            }
          }
        }
        setSaved(seed);
        setDeletedRows(new Set());
      })
      .catch(() => {});
    fetchPaymentDetail(selected.danId).then(setPayDetail).catch(() => setPayDetail([]));
    fetchPaymentSummary(selected.danId)
      .then(s => {
        setSummary(s);
        setAmounts({
          cash:   String(s.cash),   upi:  String(s.upi),
          cheque: String(s.cheque), neft: String(s.neft),
        });
      })
      .catch(() => {});
  }, [selected]);

  const totalCollected = MODES.reduce((sum, m) => sum + (parseFloat(amounts[m.key]) || 0), 0);
  const credit         = (summary?.netValue ?? 0) - totalCollected;

  /* ── Per-invoice payment editing (while a mode is open) ─────────────────── */
  const invAmountForMode = (inv: InvoicePaymentDetail, m: PaymentMode) =>
    inv.payments.find(p => p.mode.toUpperCase() === m.toUpperCase())?.amount ?? 0;

  // Invoices that used the mode being edited — "all invoices with the same payment mode"
  const invoicesForMode = openMode
    ? payDetail.filter(inv => invAmountForMode(inv, openMode) > 0)
    : [];

  /** Opens the edit modal for one invoice, pre-filled from its current entry for this mode. */
  const openInvoiceEditor = (inv: InvoicePaymentDetail) => {
    if (!openMode) return;
    const entry = inv.payments.find(p => p.mode.toUpperCase() === openMode.toUpperCase());
    setEditForm({
      amount:      entry ? String(entry.amount) : "",
      chequeNo:    entry?.chequeNo    ?? "",
      bankName:    entry?.bankName    ?? "",
      referenceNo: entry?.referenceNo ?? "",
    });
    setEditInvoice(inv);
  };

  /** Saves the modal's amount + mode details, then refreshes detail + summary. */
  const handleSaveInvoicePayment = async () => {
    const inv = editInvoice;
    if (!selected || !openMode || !inv) return;
    setSavingInvoice(inv.direId);
    setError("");
    try {
      const modeU  = openMode.toUpperCase();
      const newAmt = parseFloat(editForm.amount) || 0;
      const detailFields = {
        chequeNo:    editForm.chequeNo.trim()    || undefined,
        bankName:    editForm.bankName.trim()    || undefined,
        referenceNo: editForm.referenceNo.trim() || undefined,
      };

      // Rebuild the invoice's mode list: update this mode (amount + details), keep the rest intact
      let modes = inv.payments.map(p =>
        p.mode.toUpperCase() === modeU
          ? { ...p, amount: newAmt, ...detailFields }
          : p);
      if (!modes.some(p => p.mode.toUpperCase() === modeU) && newAmt > 0)
        modes = [...modes, { mode: modeU, amount: newAmt, ...detailFields }];
      modes = modes.filter(p => p.amount > 0);

      const total = modes.reduce((s, p) => s + p.amount, 0);
      await saveDanPayment(selected.danId, inv.direId, {
        delivered: true,
        paymentAmount: total,
        paymentMode: JSON.stringify(modes),
        reason: null,
      });

      // Reflect the new totals everywhere
      const [detail, sum] = await Promise.all([
        fetchPaymentDetail(selected.danId),
        fetchPaymentSummary(selected.danId),
      ]);
      setPayDetail(detail);
      setSummary(sum);
      setAmounts({
        cash:   String(sum.cash),   upi:  String(sum.upi),
        cheque: String(sum.cheque), neft: String(sum.neft),
      });
      setEditInvoice(null);   // close the modal on success
    } catch {
      setError("Could not save invoice payment");
    } finally {
      setSavingInvoice(null);
    }
  };

  /** Persists all remaining rows for one invoice (dire) to the DB. Empty list clears it. */
  const persistDire = async (direId: number, savedMap: SavedReturns) => {
    const items = Object.entries(savedMap)
      .filter(([id]) => id.startsWith(`${direId}_`))
      .map(([, r]) => ({
        serial: "", description: "",
        billQty:   parseFloat(r.billQty) || 0,
        billAmt:   parseFloat(r.billAmt) || 0,
        returnQty: parseFloat(r.retQty)  || 0,
        returnAmt: parseFloat(r.retAmt)  || 0,
        reason: "", custom: true,
      }));
    try {
      await saveReturnsByDire(direId, items);
    } catch {
      setError("Could not save the return — it will be retried on approval");
    }
  };

  const handleSaveRow = async (rowId: string, v: SavedReturns[string]) => {
    const next = { ...saved, [rowId]: v };
    setSaved(next);
    setEditingRow(null);
    const direId = Number(rowId.split("_")[0]);   // rowId = "{direId}_{sl}"
    if (direId) await persistDire(direId, next);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm("Delete this return?")) return;
    const next = { ...saved };
    delete next[rowId];
    setSaved(next);
    setDeletedRows(prev => new Set(prev).add(rowId));
    setEditingRow(null);
    const direId = Number(rowId.split("_")[0]);
    if (direId) await persistDire(direId, next);   // re-saves without the deleted row
  };

  const returnsPayload = () => Object.fromEntries(
    Object.entries(saved).map(([rowId, v]) => [rowId, {
      billQty: parseFloat(v.billQty) || 0,
      billAmt: parseFloat(v.billAmt) || 0,
      retQty:  parseFloat(v.retQty)  || 0,
      retAmt:  parseFloat(v.retAmt)  || 0,
    }])
  );

  /** Step 2 — save returns, record the storekeeper sign-off, then advance. */
  const handleStorekeeperApprove = async () => {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const status = await storekeeperApprove(selected.danId, {
        agentId: selected.agentId,
        returns: returnsPayload(),
      });
      setApproval(status);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Storekeeper approval failed");
    } finally {
      setLoading(false);
    }
  };

  /** Step 3 — save payments, close the DAN, record the accounts sign-off. */
  const handleAccountsApprove = async () => {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const status = await accountsApprove(selected.danId, {
        agentId: selected.agentId,
        payments: {
          cash:   parseFloat(amounts.cash)   || 0,
          upi:    parseFloat(amounts.upi)    || 0,
          cheque: parseFloat(amounts.cheque) || 0,
          neft:   parseFloat(amounts.neft)   || 0,
        },
      });
      setApproval(status);
      setApproved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Accounts approval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={standalone ? "mdan-standalone-root" : "animate-fade-up"}>
      {!standalone && (
        <PageHeader
          title="Mobile DAN Close"
          subtitle="Agent-facing DAN settlement flow"
        />
      )}

      <div className={`mdan-phone ${standalone ? "standalone" : ""}`}>
        {/* Topbar */}
        <div className="mdan-topbar">
          <div className="mdan-back-btn" onClick={() => step > 1 && setStep(step - 1)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
          <div>
            <div className="mdan-topbar-title">DAN close</div>
            <div className="mdan-topbar-sub">Step {step} of 3 — {STEP_LABELS[step]}</div>
          </div>
        </div>

        <StepIndicator step={step} />

        {error && <div className="mdan-error" style={{ marginTop: 10 }}>{error}</div>}

        {/* ── Step 1 — choose agent ── */}
        {step === 1 && (
          <div className="mdan-page">
            <div className="mdan-step-heading">Choose agent</div>
            <div className="mdan-step-subheading">Select the DAN to close for this agent</div>

            {agents.length === 0 && !loading && (
              <div className="mdan-empty">No open DANs right now</div>
            )}

            {agents.map(a => (
              <div
                key={a.danId}
                className={`mdan-agent-card ${selected?.danId === a.danId ? "selected" : ""}`}
                onClick={() => setSelected(a)}
              >
                <div className="mdan-agent-avatar">{a.agentName.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div className="mdan-agent-name">{a.agentName}</div>
                  <div className="mdan-agent-dan">{a.danCode}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mdan-date-label">Date</div>
                  <div className="mdan-date">{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 2 — settle returns ── */}
        {step === 2 && (
          <div className="mdan-page">
            <div className="mdan-step-heading">Settle returns</div>

            {invoices.length === 0 && (
              <div className="mdan-empty">No invoices for this DAN</div>
            )}

            {invoices.length > 0 && (
              <div className="mdan-return-total">
                <span>Total return</span>
                <strong>{inr(totalReturn)}</strong>
              </div>
            )}

            {invoices.map(inv => (
              <StoreReturnCard
                key={inv.no}
                invoice={inv}
                saved={saved}
                editingRow={editingRow}
                deleted={deletedRows}
                onEdit={rowId => setEditingRow(editingRow === rowId ? null : rowId)}
                onSave={handleSaveRow}
                onDelete={handleDeleteRow}
              />
            ))}
          </div>
        )}

        {/* ── Step 3 — accounts ── */}
        {step === 3 && (
          <div className="mdan-page">

            {/* Per-invoice, customer-wise editing of the mode being edited */}
            {openMode !== null && (
              <>
                <div className="mdan-section-head">
                  {MODES.find(m => m.key === openMode)?.label} — edit by customer
                </div>
                {invoicesForMode.length === 0 ? (
                  <div className="mdan-empty" style={{ padding: "16px" }}>
                    No invoice used {MODES.find(m => m.key === openMode)?.label}
                  </div>
                ) : (
                  invoicesForMode.map(inv => {
                    const entry = inv.payments.find(
                      p => p.mode.toUpperCase() === openMode.toUpperCase());
                    return (
                      <div className="mdan-store-card" key={inv.direId} style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="mdan-store-num">{inv.invoiceNo || "—"}</span>
                          <span
                            className="mdan-store-name"
                            style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >{inv.custName}</span>
                          <span className="mdan-mode-amt">{inr(entry?.amount ?? 0)}</span>
                          <button
                            className="mdan-mode-edit-btn"
                            onClick={() => openInvoiceEditor(inv)}
                          >Edit</button>
                        </div>
                        {(entry?.chequeNo || entry?.bankName || entry?.referenceNo) && (
                          <div style={{ fontSize: 10.5, color: "#888", marginTop: 3 }}>
                            {entry?.chequeNo    ? `Cheque ${entry.chequeNo}` : ""}
                            {entry?.bankName    ? ` · ${entry.bankName}`     : ""}
                            {entry?.referenceNo ? `Ref ${entry.referenceNo}` : ""}
                          </div>
                        )}
                        {inv.returnAmt > 0 && (
                          <div style={{ fontSize: 10.5, color: "#c0392b", marginTop: 3 }}>
                            Return −{inr(inv.returnAmt)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            <div className="mdan-section-head">Payment mode collection</div>

            {MODES.map(m => (
              <div className="mdan-mode-row" key={m.key}>
                <div className="mdan-mode-main">
                  <div className="mdan-mode-left">
                    <div className={`mdan-mode-icon ${m.key}`}>●</div>
                    <span className="mdan-mode-name">{m.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mdan-mode-amt">{inr(parseFloat(amounts[m.key]) || 0)}</span>
                    <button
                      className="mdan-mode-edit-btn"
                      onClick={() => setOpenMode(openMode === m.key ? null : m.key)}
                    >Edit</button>
                  </div>
                </div>

                {openMode === m.key && (
                  <div className="mdan-mode-panel">
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      value={amounts[m.key]}
                      onChange={e => setAmounts(p => ({ ...p, [m.key]: e.target.value }))}
                    />
                    <button className="mdan-mode-save-btn" onClick={() => setOpenMode(null)}>Save</button>
                  </div>
                )}
              </div>
            ))}

            <div className="mdan-section-head">Summary</div>
            <div className="mdan-summary-block">
              <div className="mdan-summary-row">
                <span className="mdan-summary-key">Total collected</span>
                <span className="mdan-summary-val">{inr(totalCollected)}</span>
              </div>
              <div className="mdan-summary-row">
                <span className="mdan-summary-key">Net value</span>
                <span className="mdan-summary-val">{inr(summary?.netValue ?? 0)}</span>
              </div>
              <div className="mdan-summary-row">
                <span className="mdan-summary-key">Return deduction</span>
                <span className="mdan-summary-val" style={{ color: "#c0392b" }}>
                  −{inr(summary?.returnAmt ?? 0)}
                </span>
              </div>
              <div className="mdan-summary-row credit-row">
                <span className="mdan-credit-key">Credit</span>
                <span className="mdan-credit-val" style={{ color: credit > 0 ? "#c0392b" : "#1a7a4a" }}>
                  {credit < 0 ? "-" : ""}{inr(credit)}
                </span>
              </div>
            </div>

            {/* Storekeeper sign-off confirmation carried over from step 2 */}
            {approval?.storekeeperApproved && (
              <div style={{
                margin: "0 12px 10px", padding: "8px 12px", borderRadius: 8,
                background: "#e6f9f0", border: "1px solid #a7e8c8",
                fontSize: 11.5, color: "#1a7a4a",
              }}>
                ✓ Storekeeper approved{approval.storekeeperBy ? ` by ${approval.storekeeperBy}` : ""}
                {approval.storekeeperAt ? ` · ${approval.storekeeperAt}` : ""}
              </div>
            )}

            <button
              className={`mdan-approve-btn ${approved ? "done" : ""}`}
              onClick={handleAccountsApprove}
              disabled={approved || loading}
            >
              {approved
                ? `✓ Accounts approved${approval?.accountsBy ? ` — ${approval.accountsBy}` : ""}`
                : loading ? "Approving…" : "✓ Accounts approve"}
            </button>

            {/* DAN is closed — the wizard resets to the agent list shortly */}
            {approved && (
              <div style={{
                margin: "0 12px 12px", textAlign: "center",
                fontSize: 12, color: "#1a7a4a",
              }}>
                DAN closed · returning to agent list…{" "}
                <button
                  onClick={goHome}
                  style={{
                    background: "none", border: "none", padding: 0,
                    color: "#6c3fc5", fontSize: 12, fontWeight: 600,
                    textDecoration: "underline", cursor: "pointer",
                  }}
                >Go now</button>
              </div>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div className="mdan-bottom-bar">
          {step > 1 && (
            <button className="mdan-nav-btn" onClick={() => setStep(step - 1)} disabled={loading}>
              ← Back
            </button>
          )}

          {/* Step 1 — plain advance */}
          {step === 1 && (
            <button
              className="mdan-nav-btn primary"
              onClick={() => setStep(2)}
              disabled={!selected}
            >Next →</button>
          )}

          {/* Step 2 — storekeeper signs off the returns, then advances */}
          {step === 2 && (
            <button
              className="mdan-nav-btn primary"
              onClick={handleStorekeeperApprove}
              disabled={loading}
            >
              {loading ? "Approving…" : "✓ Storekeeper approve & Next →"}
            </button>
          )}
        </div>
      </div>

      {/* ── Edit payment modal — amount + mode-specific details ── */}
      {editInvoice && openMode && (
        <div className="mdan-modal-backdrop" onClick={() => setEditInvoice(null)}>
          <div className="mdan-modal" onClick={e => e.stopPropagation()}>
            <div className="mdan-modal-head">
              <div style={{ minWidth: 0 }}>
                <div className="mdan-modal-title">
                  {MODES.find(m => m.key === openMode)?.label} payment
                </div>
                <div className="mdan-modal-sub">
                  {editInvoice.invoiceNo || "—"} · {editInvoice.custName}
                </div>
              </div>
              <button className="mdan-modal-close" onClick={() => setEditInvoice(null)}>✕</button>
            </div>

            <div className="mdan-modal-body">
              <label className="mdan-field-label">Amount (₹)</label>
              <input
                className="mdan-modal-input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={editForm.amount}
                onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
              />

              {openMode === "cheque" && (
                <>
                  <label className="mdan-field-label">Cheque no</label>
                  <input
                    className="mdan-modal-input"
                    placeholder="e.g. 566789"
                    value={editForm.chequeNo}
                    onChange={e => setEditForm(p => ({ ...p, chequeNo: e.target.value }))}
                  />
                  <label className="mdan-field-label">Bank</label>
                  <input
                    className="mdan-modal-input"
                    placeholder="e.g. SBI"
                    value={editForm.bankName}
                    onChange={e => setEditForm(p => ({ ...p, bankName: e.target.value }))}
                  />
                </>
              )}

              {(openMode === "upi" || openMode === "neft") && (
                <>
                  <label className="mdan-field-label">
                    {openMode === "upi" ? "UPI reference" : "NEFT reference"}
                  </label>
                  <input
                    className="mdan-modal-input"
                    placeholder="Reference / UTR no"
                    value={editForm.referenceNo}
                    onChange={e => setEditForm(p => ({ ...p, referenceNo: e.target.value }))}
                  />
                </>
              )}

              <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                Invoice net {inr(editInvoice.amount)}
                {editInvoice.returnAmt > 0 && ` · return −${inr(editInvoice.returnAmt)}`}
              </div>
            </div>

            <div className="mdan-modal-foot">
              <button className="mdan-nav-btn" onClick={() => setEditInvoice(null)}>Cancel</button>
              <button
                className="mdan-nav-btn primary"
                disabled={savingInvoice === editInvoice.direId}
                onClick={handleSaveInvoicePayment}
              >
                {savingInvoice === editInvoice.direId ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDanClosePage;
