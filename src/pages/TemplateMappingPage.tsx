import '../styles/pages/TemplateMappingPage.css';
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveTemplate } from "../services/template.service";
import { ApiEndpoints } from "../constants/config";
import { PageHeader, Card, Btn, Field, Select, TextInput } from "../components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

const colLetter = (num: number) => {
  let letters = "";
  while (num >= 0) {
    letters = String.fromCharCode((num % 26) + 65) + letters;
    num = Math.floor(num / 26) - 1;
  }
  return letters;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_FIELDS: Record<string, string[]> = {
  delivery: [
    "Name", "Mobile", "Alternative Mobile",
    "Address Line 1", "Address Line 2", "Address Line 3",
    "City", "Pin Code", "Father Name",
    "Aadhar No", "PAN Card", "Bank Account", "Date of Joining",
  ],
  sales: ["PicklistNo", "InvoiceNo", "CustomerName", "CustomerNo", "SalesRepName", "NetValue", "BillingDate"],
  customer: [
    "Customer No", "Customer Name", "Mobile",
    "Address Line 1", "Address Line 2", "Pin Code", "Lat", "Lon",
  ],
};

const OPTIONAL_FIELDS: Record<string, string[]> = {
  sales:    ["PicklistNo"],
  customer: ["Address Line 2", "Lat", "Lon"],
};

// Template types that contain date columns
const HAS_DATE_FIELDS = new Set(["sales", "delivery"]);

const DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "YYYY/MM/DD",
];

const TYPE_LABELS: Record<string, string> = {
  delivery: "Delivery Agent",
  sales:    "Invoice / Sales",
  customer: "Customer Master",
};

// ── Step indicator ────────────────────────────────────────────────────────────

const StepBadge: React.FC<{ n: number; active: boolean; done: boolean }> = ({ n, active, done }) => (
  <div style={{
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
    background: done ? "var(--brand)" : active ? "var(--brand-light)" : "var(--ink-5)",
    color: done ? "#fff" : active ? "var(--brand)" : "var(--ink-40)",
    border: active && !done ? "2px solid var(--brand)" : "2px solid transparent",
    transition: "all 0.2s",
  }}>
    {done
      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      : n}
  </div>
);

const Step: React.FC<{ n: number; label: string; current: number; children: React.ReactNode }> = ({
  n, label, current, children,
}) => {
  const active = current === n;
  const done   = current > n;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: active ? 14 : 0 }}>
        <StepBadge n={n} active={active} done={done} />
        <span style={{
          fontSize: 13.5, fontWeight: 700,
          color: active ? "var(--ink)" : done ? "var(--brand)" : "var(--ink-40)",
        }}>{label}</span>
        {done && (
          <span style={{
            fontSize: 11.5, color: "var(--brand)",
            background: "var(--brand-light)", padding: "2px 10px", borderRadius: 50,
          }}>✓ Done</span>
        )}
      </div>
      {active && (
        <div style={{ marginLeft: 38, paddingLeft: 10, borderLeft: "2px solid var(--ink-10)" }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const TemplateMappingPage: React.FC = () => {
  // companies
  const [companies, setCompanies]         = useState<string[]>([]);
  const [companyName, setCompanyName]     = useState("");
  const [addingNew, setAddingNew]         = useState(false);
  const [newCompany, setNewCompany]       = useState("");

  // template type
  const [templateType, setTemplateType]   = useState("");
  const [fields, setFields]               = useState<string[]>([]);

  // file / headers
  const [headers, setHeaders]             = useState<string[]>([]);
  const [uploadMsg, setUploadMsg]         = useState("");

  // mappings
  const [mappings, setMappings]           = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat]       = useState("DD/MM/YYYY");
  const [errorMsg, setErrorMsg]           = useState("");
  const [saving, setSaving]               = useState(false);

  // which step is active 1-4
  const step =
    !companyName ? 1 :
    !templateType ? 2 :
    headers.length === 0 ? 3 : 4;

  // Load company list on mount
  useEffect(() => {
    fetch(ApiEndpoints.TEMPLATE_COMPANIES)
      .then(r => r.ok ? r.json() : [])
      .then((data: string[]) => setCompanies(data))
      .catch(() => {});
  }, []);

  // When company + type combo changes, try to pre-load existing mappings
  useEffect(() => {
    if (!companyName || !templateType) return;
    fetch(ApiEndpoints.TEMPLATES_BY_COMPANY(companyName))
      .then(r => r.ok ? r.json() : [])
      .then((list: { templateType: string; mappings: Record<string, string> }[]) => {
        const existing = list.find(t => t.templateType === templateType);
        if (existing?.mappings) {
          const { _dateFormat, ...rest } = existing.mappings as Record<string, string>;
          setMappings(rest);
          if (_dateFormat) setDateFormat(_dateFormat);
        } else setMappings({});
      })
      .catch(() => setMappings({}));
  }, [companyName, templateType]);

  const confirmCompany = () => {
    const name = addingNew ? newCompany.trim() : companyName;
    if (!name) return;
    setCompanyName(name);
    setAddingNew(false);
    setNewCompany("");
    if (!companies.includes(name)) setCompanies(prev => [...prev, name].sort());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    setHeaders(rows[0] || []);
    setUploadMsg(`✅ "${file.name}" — ${(rows[0] || []).length} columns detected`);
    setMappings({});
    setErrorMsg("");
  };

  const handleColumnSelect = (field: string, column: string) => {
    if (!column) {
      setMappings(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k] === field) delete next[k]; });
        return next;
      });
      return;
    }
    const dup = Object.entries(mappings).find(([col, f]) => col === column && f !== field);
    if (dup) { setErrorMsg(`Column ${column} is already mapped to "${dup[1]}"`); return; }
    setMappings(prev => {
      const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== field));
      next[column] = field;
      return next;
    });
    setErrorMsg("");
  };

  const handleSave = async () => {
    if (!companyName || !templateType) return;
    const optionals = OPTIONAL_FIELDS[templateType] ?? [];
    const requiredFields = fields.filter(f => !optionals.includes(f));
    const mappedFields = Object.values(mappings);
    const unmapped = requiredFields.filter(f => !mappedFields.includes(f));
    if (unmapped.length > 0) {
      setErrorMsg(`Map all required fields before saving. Missing: ${unmapped.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const payload = HAS_DATE_FIELDS.has(templateType)
        ? { companyName, templateType, mappings: { ...mappings, _dateFormat: dateFormat } }
        : { companyName, templateType, mappings };
      await saveTemplate(payload);
      if (!companies.includes(companyName)) setCompanies(prev => [...prev, companyName].sort());
      alert("✅ Template saved!");
    } catch {
      alert("❌ Save failed. Check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setCompanyName(""); setTemplateType(""); setHeaders([]);
    setMappings({}); setDateFormat("DD/MM/YYYY"); setUploadMsg(""); setErrorMsg("");
    setAddingNew(false); setNewCompany("");
  };

  const activeCompany = addingNew ? newCompany.trim() : companyName;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Master Template"
        subtitle="Map your Excel columns to system fields"
        action={companyName && (
          <Btn variant="ghost" onClick={resetAll}>Start Over</Btn>
        )}
      />

      <Card style={{ maxWidth: 700 }}>

        {/* ── Step 1: Company ─────────────────────────────────────────── */}
        <Step n={1} label="Select Company" current={step}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!addingNew ? (
              <>
                <Field label="Company Name" required>
                  <Select
                    value={companyName}
                    onChange={v => {
                      if (v === "__add__") { setAddingNew(true); setCompanyName(""); }
                      else { setCompanyName(v); setTemplateType(""); setHeaders([]); setMappings({}); }
                    }}
                  >
                    <option value="">Choose company…</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">＋ Add new company</option>
                  </Select>
                </Field>
                {companyName && (
                  <Btn variant="primary" onClick={() => setTemplateType("")}>
                    Continue with {companyName} →
                  </Btn>
                )}
              </>
            ) : (
              <>
                <Field label="New Company Name" required>
                  <TextInput
                    value={newCompany}
                    onChange={setNewCompany}
                    placeholder="e.g. Devine Distributors Pvt. Ltd."
                  />
                </Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="primary" onClick={confirmCompany} disabled={!newCompany.trim()}>
                    Add Company →
                  </Btn>
                  <Btn variant="secondary" onClick={() => setAddingNew(false)}>Cancel</Btn>
                </div>
              </>
            )}
          </div>

          {/* summary when done */}
          {step > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{companyName}</span>
              <button
                onClick={() => { setCompanyName(""); setTemplateType(""); setHeaders([]); setMappings({}); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--brand)", padding: 0 }}
              >change</button>
            </div>
          )}
        </Step>

        {/* ── Step 2: Template Type ───────────────────────────────────── */}
        {step >= 2 && (
          <Step n={2} label="Select Template Type" current={step}>
            <Field label="Template Type" required>
              <Select
                value={templateType}
                onChange={v => {
                  setTemplateType(v);
                  setFields(TEMPLATE_FIELDS[v] || []);
                  setHeaders([]);
                  setUploadMsg("");
                  setMappings({});
                }}
              >
                <option value="">Select type…</option>
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </Select>
            </Field>

            {/* Date format — only for templates with date columns */}
            {templateType && HAS_DATE_FIELDS.has(templateType) && (
              <Field label="Date Format" required style={{ marginTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {DATE_FORMATS.map(f => (
                    <button
                      key={f}
                      onClick={() => setDateFormat(f)}
                      style={{
                        padding: "5px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                        cursor: "pointer", transition: "all .12s",
                        border: dateFormat === f ? "2px solid var(--brand)" : "1.5px solid var(--ink-10)",
                        background: dateFormat === f ? "var(--brand)" : "#fff",
                        color: dateFormat === f ? "#fff" : "var(--ink-60)",
                      }}>
                      {f}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 6 }}>
                  Selected: <strong>{dateFormat}</strong> — used when parsing date columns from the Excel file
                </p>
              </Field>
            )}

            {step > 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                  {TYPE_LABELS[templateType]}
                  {HAS_DATE_FIELDS.has(templateType) && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "var(--brand)", background: "var(--brand-light)", padding: "2px 8px", borderRadius: 4 }}>
                      {dateFormat}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => { setTemplateType(""); setHeaders([]); setMappings({}); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--brand)", padding: 0 }}
                >change</button>
              </div>
            )}
          </Step>
        )}

        {/* ── Step 3: Upload sample Excel ─────────────────────────────── */}
        {step >= 3 && (
          <Step n={3} label="Upload Sample Excel (to detect columns)" current={step}>
            <Field label="Sample .xlsx file">
              <input
                type="file" accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ padding: "8px 0", fontSize: 13, fontFamily: "'Inter', sans-serif" }}
              />
            </Field>
            {uploadMsg && (
              <p style={{ fontSize: 12.5, color: "var(--brand)", marginTop: 8 }}>{uploadMsg}</p>
            )}

            {/* fields list as a hint */}
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-40)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Required fields
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {fields.map(f => (
                  <span key={f} style={{
                    fontSize: 11.5, padding: "3px 10px",
                    borderRadius: 50, fontWeight: 600,
                    background: "var(--ink-5)", color: "var(--ink-60)",
                  }}>{f}</span>
                ))}
              </div>
            </div>

            {step > 3 && (
              <p style={{ fontSize: 12.5, color: "var(--brand)", marginTop: 8 }}>{uploadMsg}</p>
            )}
          </Step>
        )}

        {/* ── Step 4: Map fields ──────────────────────────────────────── */}
        {step >= 4 && (
          <Step n={4} label="Map Fields" current={step}>
            {errorMsg && (
              <p style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 12 }}>{errorMsg}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fields.map(field => {
                const mapped = Object.entries(mappings).find(([, v]) => v === field)?.[0] || "";
                const isOptional = (OPTIONAL_FIELDS[templateType] ?? []).includes(field);
                return (
                  <div key={field} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ minWidth: 150, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      {field}
                      {isOptional && (
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, padding: "1px 6px" }}>optional</span>
                      )}
                    </span>
                    <Select
                      value={mapped}
                      onChange={v => handleColumnSelect(field, v)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select column…</option>
                      {headers.map((h, i) => {
                        const letter = colLetter(i);
                        return <option key={letter} value={letter}>{letter} — {h}</option>;
                      })}
                    </Select>
                    {mapped && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d7a4e" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            {(() => {
              const optionals = OPTIONAL_FIELDS[templateType] ?? [];
              const requiredFields = fields.filter(f => !optionals.includes(f));
              const mappedFields = Object.values(mappings);
              const allRequiredMapped = requiredFields.every(f => mappedFields.includes(f));
              const mappedCount = fields.filter(f => mappedFields.includes(f)).length;
              const requiredRemaining = requiredFields.filter(f => !mappedFields.includes(f)).length;
              return (
                <>
                  <div style={{ marginTop: 22, display: "flex", gap: 10, alignItems: "center" }}>
                    <Btn variant="primary" onClick={handleSave} disabled={saving || !allRequiredMapped}>
                      {saving ? "Saving…" : "Save Template"}
                    </Btn>
                    <Btn variant="secondary" onClick={() => { setMappings({}); setHeaders([]); setUploadMsg(""); }}>
                      Reset Mappings
                    </Btn>
                    <p style={{ fontSize: 11.5, color: "var(--ink-40)", margin: 0 }}>
                      {mappedCount} / {fields.length} mapped{requiredRemaining > 0 ? ` · ${requiredRemaining} required remaining` : ""}
                    </p>
                  </div>
                </>
              );
            })()}
          </Step>
        )}
      </Card>
    </div>
  );
};

export default TemplateMappingPage;
