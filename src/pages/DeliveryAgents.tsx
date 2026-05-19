import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fetchDeliveryAgents } from "../services/DeliveryService";
import { AppConfig } from "../constants/config";
import { authHeaders } from "../services/authService";
import {
  PageHeader, DataTable, TR, TD, SearchInput,
  Btn, Field, TextInput, Select, Toast,
} from "../components/ui";

// ── Agent model ───────────────────────────────────────────────────────────────

interface DeliveryAgent {
  id:              number;
  name:            string;
  contact:         string;
  altContact?:     string;
  address1?:       string;
  address2?:       string;
  address3?:       string;
  city?:           string;
  pinCode?:        string;
  fatherName?:     string;
  aadharNo?:       string;
  panCard?:        string;
  bankAccount?:    string;
  dateOfJoining?:  string;
}

interface AgentForm {
  name:           string;
  contact:        string;
  altContact:     string;
  address1:       string;
  address2:       string;
  address3:       string;
  city:           string;
  pinCode:        string;
  fatherName:     string;
  aadharNo:       string;
  panCard:        string;
  bankAccount:    string;
  dateOfJoining:  string;
}

const EMPTY_FORM: AgentForm = {
  name: "", contact: "", altContact: "",
  address1: "", address2: "", address3: "",
  city: "", pinCode: "", fatherName: "",
  aadharNo: "", panCard: "", bankAccount: "",
  dateOfJoining: "",
};

// ── Overlay ───────────────────────────────────────────────────────────────────

const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) =>
  createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--white)", borderRadius: "var(--radius-xl)",
          width: "100%", maxWidth: 640,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeUp 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );

// ── Section divider inside form ───────────────────────────────────────────────

const FormSection: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    gridColumn: "1 / -1",
    borderBottom: "1px solid var(--ink-10)",
    paddingBottom: 6, marginBottom: 4, marginTop: 8,
  }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-40)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {title}
    </span>
  </div>
);

// ── Add Agent form modal ──────────────────────────────────────────────────────

const AgentFormModal: React.FC<{
  onClose:  () => void;
  onSaved:  (agent: DeliveryAgent) => void;
}> = ({ onClose, onSaved }) => {
  const [form, setForm]     = useState<AgentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: keyof AgentForm) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())    { setError("Agent name is required");    return; }
    if (!form.contact.trim()) { setError("Mobile number is required"); return; }
    if (!/^\d{10}$/.test(form.contact)) { setError("Mobile must be 10 digits"); return; }
    if (form.aadharNo && !/^\d{12}$/.test(form.aadharNo)) { setError("Aadhar must be 12 digits"); return; }
    if (!form.address1.trim()) { setError("Address Line 1 is required"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${AppConfig.API_BASE_URL}/delivery/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name:          form.name.trim(),
          contact:       form.contact.trim(),
          altContact:    form.altContact.trim() || null,
          address1:      form.address1.trim(),
          address2:      form.address2.trim() || null,
          address3:      form.address3.trim() || null,
          city:          form.city.trim() || null,
          pinCode:       form.pinCode.trim() || null,
          fatherName:    form.fatherName.trim() || null,
          aadharNo:      form.aadharNo.trim() || null,
          panCard:       form.panCard.trim().toUpperCase() || null,
          bankAccount:   form.bankAccount.trim() || null,
          dateOfJoining: form.dateOfJoining || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? err?.message ?? "Failed to create agent");
      }
      const created: DeliveryAgent = await res.json().catch(() => ({
        id: Date.now(), ...form,
      }));
      onSaved(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: "22px 28px 18px",
        borderBottom: "1px solid var(--ink-10)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>
            Add Delivery Agent
          </h2>
          <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 2 }}>
            Fill in the agent's details below
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: "var(--radius-md)",
            border: "none", background: "var(--ink-5)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-60)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px" }}>
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-md)",
            background: "var(--danger-bg)", border: "1px solid #fca5a5",
            fontSize: 13, color: "var(--danger)",
            display: "flex", alignItems: "center", gap: 8, marginBottom: 18,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* ── Personal Details ── */}
          <FormSection title="Personal Details" />

          <Field label="Full Name" required>
            <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Ravi Kumar" />
          </Field>
          <Field label="Father's Name">
            <TextInput value={form.fatherName} onChange={set("fatherName")} placeholder="e.g. Suresh Kumar" />
          </Field>
          <Field label="Mobile" required>
            <TextInput value={form.contact} onChange={set("contact")} placeholder="10-digit mobile" type="tel" />
          </Field>
          <Field label="Alternative Mobile">
            <TextInput value={form.altContact} onChange={set("altContact")} placeholder="Optional" type="tel" />
          </Field>
          <Field label="Date of Joining">
            <input
              type="date"
              value={form.dateOfJoining}
              onChange={e => set("dateOfJoining")(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 14px", border: "1.5px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", fontSize: 13.5,
                fontFamily: "'Inter', sans-serif", outline: "none", color: "var(--ink)",
              }}
            />
          </Field>

          {/* ── Address ── */}
          <FormSection title="Address" />

          <Field label="Address Line 1" required style={{ gridColumn: "1 / -1" }}>
            <TextInput value={form.address1} onChange={set("address1")} placeholder="House / Flat / Building" />
          </Field>
          <Field label="Address Line 2">
            <TextInput value={form.address2} onChange={set("address2")} placeholder="Street / Colony" />
          </Field>
          <Field label="Address Line 3">
            <TextInput value={form.address3} onChange={set("address3")} placeholder="Landmark / Area" />
          </Field>
          <Field label="City">
            <TextInput value={form.city} onChange={set("city")} placeholder="e.g. Mumbai" />
          </Field>
          <Field label="Pin Code">
            <TextInput value={form.pinCode} onChange={set("pinCode")} placeholder="6-digit pin" type="tel" />
          </Field>

          {/* ── Identity & Banking ── */}
          <FormSection title="Identity & Banking" />

          <Field label="Aadhar Number">
            <TextInput value={form.aadharNo} onChange={set("aadharNo")} placeholder="12-digit Aadhar" type="tel" />
          </Field>
          <Field label="PAN Card">
            <TextInput
              value={form.panCard}
              onChange={v => set("panCard")(v.toUpperCase())}
              placeholder="e.g. ABCDE1234F"
            />
          </Field>
          <Field label="Bank Account Number" style={{ gridColumn: "1 / -1" }}>
            <TextInput value={form.bankAccount} onChange={set("bankAccount")} placeholder="Account number" type="tel" />
          </Field>

        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid var(--ink-10)",
        display: "flex", gap: 10, justifyContent: "flex-end",
      }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving…" : "Add Agent"}
        </Btn>
      </div>
    </Overlay>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUSES = ["Online", "Busy", "Offline"] as const;
type Status = typeof STATUSES[number];

const StatusBadgeInline: React.FC<{ status: Status }> = ({ status }) => {
  const cfg = {
    Online:  { color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
    Busy:    { color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
    Offline: { color: "var(--ink-60)", bg: "var(--ink-5)", dot: "var(--ink-40)" },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {status}
    </span>
  );
};

// ── Expanded detail panel ─────────────────────────────────────────────────────

const DetailRow: React.FC<{ agent: DeliveryAgent; colCount: number }> = ({ agent, colCount }) => {
  const Item: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 13, color: value ? "var(--ink)" : "var(--ink-30)", fontWeight: value ? 500 : 400 }}>{value || "—"}</span>
    </div>
  );

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <p style={{ fontSize: 10.5, fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px 20px" }}>
        {children}
      </div>
    </div>
  );

  const fullAddress = [agent.address1, agent.address2, agent.address3].filter(Boolean).join(", ");

  return (
    <tr>
      <td colSpan={colCount} style={{ padding: 0 }}>
        <div style={{
          background: "linear-gradient(to bottom, var(--brand-light), var(--white))",
          borderBottom: "2px solid var(--brand)",
          padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
        }}>
          <Section title="Personal">
            <Item label="Full Name"    value={agent.name} />
            <Item label="Father's Name" value={agent.fatherName} />
            <Item label="Mobile"       value={agent.contact} />
            <Item label="Alt. Mobile"  value={agent.altContact} />
            <Item label="Date of Joining"
              value={agent.dateOfJoining
                ? new Date(agent.dateOfJoining).toLocaleDateString("en-IN")
                : null}
            />
          </Section>

          <Section title="Address">
            <Item label="Address"      value={fullAddress || null} />
            <Item label="City"         value={agent.city} />
            <Item label="Pin Code"     value={agent.pinCode} />
          </Section>

          <Section title="Identity & Banking">
            <Item label="Aadhar No"    value={agent.aadharNo} />
            <Item label="PAN Card"     value={agent.panCard} />
            <Item label="Bank Account" value={agent.bankAccount} />
          </Section>
        </div>
      </td>
    </tr>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const DeliveryAgents: React.FC = () => {
  const [data, setData]           = useState<DeliveryAgent[]>([]);
  const [filtered, setFiltered]   = useState<DeliveryAgent[]>([]);
  const [selected, setSelected]   = useState<number[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [expandedId, setExpanded] = useState<number | null>(null);
  const [toast, setToast]         = useState<{ message: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    fetchDeliveryAgents()
      .then(res => {
        setData(res);
        setFiltered(res);
        localStorage.setItem("DELIVERY_AGENTS", JSON.stringify(res));
      })
      .catch(() => showToast("Failed to load agents", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(data.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.contact?.includes(q) ||
      (d.city ?? "").toLowerCase().includes(q)
    ));
  }, [search, data]);

  const toggle = (id: number) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleDelete = () => {
    if (!selected.length) { showToast("Select at least one agent", "error"); return; }
    setData(p => p.filter(d => !selected.includes(d.id)));
    setSelected([]);
    showToast(`${selected.length} agent(s) removed`, "success");
  };

  const handleAgentSaved = (agent: DeliveryAgent) => {
    setShowAdd(false);
    showToast(`Agent "${agent.name}" added successfully`, "success");
    load();
  };

  return (
    <div className="animate-fade-up">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        title="Delivery Agents"
        subtitle={`${data.length} registered agent${data.length !== 1 ? "s" : ""}`}
        action={
          selected.length > 0 ? (
            <Btn variant="danger" onClick={handleDelete}>
              Delete {selected.length} selected
            </Btn>
          ) : (
            <Btn variant="primary" onClick={() => setShowAdd(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Agent
            </Btn>
          )
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone or city…"
          width="320px"
        />
      </div>

      <DataTable
        headers={["", "ID", "Agent Name", "Phone", "City", "Status", "Joined", "Action"]}
        loading={loading}
        empty={!loading && filtered.length === 0}
        emptyText="No agents found"
      >
        {filtered.map(agent => {
          const status    = STATUSES[agent.id % 3];
          const isOpen    = expandedId === agent.id;
          return (
            <React.Fragment key={agent.id}>
              <TR onClick={() => setExpanded(isOpen ? null : agent.id)}>
                {/* Checkbox */}
                <TD style={{ width: 48 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(agent.id)}
                    onChange={() => toggle(agent.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
                  />
                </TD>

                {/* ID */}
                <TD style={{ color: "var(--ink-40)", fontSize: 12 }}>#{agent.id}</TD>

                {/* Name + avatar */}
                <TD>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: isOpen ? "var(--brand)" : "var(--brand-light)",
                      color: isOpen ? "#fff" : "var(--brand)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      transition: "all 0.2s",
                    }}>
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{agent.name}</div>
                      {agent.fatherName && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-40)" }}>S/o {agent.fatherName}</div>
                      )}
                    </div>
                  </div>
                </TD>

                {/* Phone */}
                <TD style={{ color: "var(--ink-60)", fontFamily: "monospace" }}>
                  {agent.contact}
                  {agent.altContact && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-40)", marginTop: 2 }}>{agent.altContact}</div>
                  )}
                </TD>

                {/* City */}
                <TD style={{ color: "var(--ink-60)" }}>
                  {agent.city ?? "—"}
                  {agent.pinCode && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-40)" }}>{agent.pinCode}</div>
                  )}
                </TD>

                {/* Status */}
                <TD><StatusBadgeInline status={status} /></TD>

                {/* DOJ */}
                <TD style={{ fontSize: 12.5, color: "var(--ink-40)" }}>
                  {agent.dateOfJoining
                    ? new Date(agent.dateOfJoining).toLocaleDateString("en-IN")
                    : "—"}
                </TD>

                {/* Action */}
                <TD>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant={isOpen ? "primary" : "ghost"}
                      onClick={e => { (e as React.MouseEvent).stopPropagation(); setExpanded(isOpen ? null : agent.id); }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Details"}
                    </Btn>
                    <Btn size="sm" variant="ghost"
                      onClick={e => { (e as React.MouseEvent).stopPropagation(); navigate(`/agents/${agent.id}`); }}
                    >
                      →
                    </Btn>
                  </div>
                </TD>
              </TR>

              {/* Expanded detail row */}
              {isOpen && <DetailRow agent={agent} colCount={8} />}
            </React.Fragment>
          );
        })}
      </DataTable>

      {/* Add Agent modal */}
      {showAdd && (
        <AgentFormModal
          onClose={() => setShowAdd(false)}
          onSaved={handleAgentSaved}
        />
      )}
    </div>
  );
};

export default DeliveryAgents;
