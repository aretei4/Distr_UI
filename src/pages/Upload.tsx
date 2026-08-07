import '../styles/pages/Upload.css';
import React, { useEffect, useState, useRef } from "react";
import { fetchTemplateCompanies, fetchTemplatesByCompany, uploadSalesFile } from "../services/template.service";
import { PageHeader, Card, Btn, Select, Field, Toast } from "../components/ui";

interface ExcelTemplate {
  templateName: string;
  templateType: string;
  companyName:  string;
  mappings:     Record<string, string>;
}

const TYPE_LABELS: Record<string, string> = {
  customer: "Customer",
  delivery: "Delivery Agent",
  sales:    "Invoice / Sales",
};

// ── Step indicator ────────────────────────────────────────────────────────────

const StepDot: React.FC<{ done: boolean; active: boolean }> = ({ done, active }) => (
  <div style={{
    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
    background: done ? "var(--brand)" : active ? "var(--brand)" : "var(--ink-10)",
    opacity: active || done ? 1 : 0.4,
    transition: "all 0.2s",
  }} />
);

// ── Upload component ──────────────────────────────────────────────────────────

const Upload: React.FC = () => {
  // Step 1 – company
  const [companies, setCompanies]       = useState<string[]>([]);
  const [companyName, setCompanyName]   = useState("");

  // Step 2 – template type
  const [templates, setTemplates]       = useState<ExcelTemplate[]>([]);
  const [templateType, setTemplateType] = useState("");
  const [selected, setSelected]         = useState<ExcelTemplate | null>(null);

  // Step 3 – file
  const [file, setFile]                 = useState<File | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const inputRef                        = useRef<HTMLInputElement>(null);

  // feedback
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors]   = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const step = !companyName ? 1 : !templateType ? 2 : 3;

  // Load companies on mount
  useEffect(() => {
    fetchTemplateCompanies()
      .then((data: string[]) => setCompanies(data ?? []))
      .catch(() => {});
  }, []);

  // Load templates when company selected
  useEffect(() => {
    if (!companyName) return;
    setTemplates([]);
    setTemplateType("");
    setSelected(null);
    setFile(null);
    fetchTemplatesByCompany(companyName)
      .then((data: ExcelTemplate[]) => setTemplates(data ?? []))
      .catch(() => {});
  }, [companyName]);

  // When type selected, find the template
  useEffect(() => {
    if (!templateType) { setSelected(null); return; }
    const t = templates.find(t => t.templateType === templateType) ?? null;
    setSelected(t);
    setFile(null);
    setErrors([]);
    setMessage(null);
  }, [templateType, templates]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith(".xlsx")) {
      setMessage({ text: "Only .xlsx files are supported.", type: "error" });
      return;
    }
    setFile(f);
    setMessage(null);
    setErrors([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selected || !file) return;
    setErrors([]);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selected.templateName);   // e.g. "Devine Distributors_sales"
    try {
      setIsUploading(true);
      const data = await uploadSalesFile(formData);
      if (data?.errors?.length > 0) {
        setErrors(data.errors);
        setMessage({ text: `Uploaded with ${data.errors.length} validation error(s).`, type: "error" });
      } else {
        setMessage({ text: "File uploaded and processed successfully!", type: "success" });
        setFile(null);
      }
    } catch (e: any) {
      setMessage({ text: e?.message ?? "Could not reach server. Check your connection.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` :
    bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` :
    `${(bytes / 1048576).toFixed(1)} MB`;

  // Derive ordered field list from mappings (sort by column letter)
  const templateFields = selected?.mappings
    ? Object.entries(selected.mappings)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([col, field]) => ({ col, field }))
    : [];

  return (
    <div className="animate-fade-up">
      {message && <Toast message={message.text} type={message.type} />}

      <PageHeader
        title="Upload Excel"
        subtitle="Select company and template, then upload your .xlsx file"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, maxWidth: 860 }}>

        {/* ── Main card ──────────────────────────────────────────────── */}
        <Card>

          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 22 }}>
            {["Company", "Template Type", "Upload File"].map((label, i) => (
              <React.Fragment key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StepDot done={step > i + 1} active={step === i + 1} />
                  <span style={{
                    fontSize: 12, fontWeight: step === i + 1 ? 700 : 500,
                    color: step === i + 1 ? "var(--ink)" : step > i + 1 ? "var(--brand)" : "var(--ink-30)",
                  }}>{label}</span>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 1, background: step > i + 1 ? "var(--brand)" : "var(--ink-10)", minWidth: 20 }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Company */}
          <Field label="Company" required>
            <Select value={companyName} onChange={v => { setCompanyName(v); setTemplateType(""); }}>
              <option value="">Select company…</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          {companies.length === 0 && !companyName && (
            <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 6 }}>
              No companies yet. Go to <strong>Master Template</strong> to add one.
            </p>
          )}

          {/* Step 2: Template Type (shown after company) */}
          {companyName && (
            <div style={{ marginTop: 16 }}>
              <Field label="Template Type" required>
                <Select
                  value={templateType}
                  onChange={v => setTemplateType(v)}
                  disabled={templates.length === 0}
                >
                  <option value="">
                    {templates.length === 0 ? "No templates for this company…" : "Select type…"}
                  </option>
                  {templates.map(t => (
                    <option key={t.templateName} value={t.templateType}>
                      {TYPE_LABELS[t.templateType] ?? t.templateType}
                    </option>
                  ))}
                </Select>
              </Field>
              {templates.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 6 }}>
                  No templates saved for <strong>{companyName}</strong>. Create one in Master Template first.
                </p>
              )}
            </div>
          )}

          {/* Step 3: File (shown after template selected) */}
          {selected && (
            <>
              <div style={{ height: 20 }} />

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "var(--brand)" : "var(--ink-20)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "44px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragging ? "var(--brand-xlight)" : "var(--ink-5)",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  ref={inputRef}
                  type="file" accept=".xlsx"
                  style={{ display: "none" }}
                  onChange={e => handleFile(e.target.files?.[0] ?? null)}
                />
                <div style={{
                  width: 56, height: 56, margin: "0 auto 16px",
                  background: isDragging ? "var(--brand-light)" : "var(--white)",
                  border: "1px solid var(--ink-10)",
                  borderRadius: "var(--radius-md)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke={isDragging ? "var(--brand)" : "var(--ink-40)"}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                  {isDragging ? "Drop file here" : "Drag & drop your Excel file"}
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-40)" }}>
                  or <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span> · .xlsx only
                </p>
              </div>

              {/* File chip */}
              {file && (
                <div style={{
                  marginTop: 14, padding: "12px 16px",
                  background: "var(--brand-light)",
                  border: "1px solid rgba(13,92,58,0.15)",
                  borderRadius: "var(--radius-md)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, background: "var(--brand)",
                    borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", padding: 4 }}
                  >✕</button>
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <Btn
                  variant="primary"
                  onClick={handleUpload}
                  disabled={isUploading || !file}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {isUploading ? (
                    <>
                      <div style={{
                        width: 14, height: 14,
                        border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                        borderRadius: "50%", animation: "spin 0.7s linear infinite",
                      }} />
                      Uploading…
                    </>
                  ) : "Upload File"}
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => { setFile(null); setErrors([]); setMessage(null); }}
                >Clear</Btn>
              </div>

              {errors.length > 0 && (
                <div style={{
                  marginTop: 16,
                  background: "var(--danger-bg)", border: "1px solid #fca5a5",
                  borderRadius: "var(--radius-md)", padding: "14px 16px",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", marginBottom: 10 }}>
                    {errors.length} validation error{errors.length > 1 ? "s" : ""}
                  </p>
                  <ul style={{ paddingLeft: 16 }}>
                    {errors.map((err, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: "var(--danger)", marginBottom: 4 }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Side panel ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Template fields preview */}
          {selected && templateFields.length > 0 ? (
            <Card>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                Template Fields
              </p>
              <p style={{ fontSize: 11.5, color: "var(--ink-40)", marginBottom: 12 }}>
                {TYPE_LABELS[selected.templateType]} · {companyName}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {templateFields.map(({ col, field }) => (
                  <div key={col} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderRadius: "var(--radius-sm)",
                    background: "var(--ink-3)",
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{field}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "var(--brand)",
                      background: "var(--brand-light)", padding: "2px 8px", borderRadius: 50,
                      fontFamily: "monospace",
                    }}>Col {col}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-30)", marginTop: 10 }}>
                Your Excel must have data in the columns shown above.
              </p>
            </Card>
          ) : (
            <Card>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
                Upload Guide
              </p>
              {[
                { step: "1", text: "Select your company from the dropdown" },
                { step: "2", text: "Choose the template type for your Excel file" },
                { step: "3", text: "Review the required columns in the preview" },
                { step: "4", text: "Drop or browse to select your .xlsx file" },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "var(--brand-light)", color: "var(--brand)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{step}</div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </Card>
          )}

          {/* Company summary chip */}
          {companyName && (
            <Card padding="14px 16px">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 9l9-6 9 6M5 21V9M19 21V9M9 21v-6h6v6"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-60)" }}>Company</span>
              </div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}>
                {companyName}
              </p>
              {templateType && (
                <p style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
                  {TYPE_LABELS[templateType] ?? templateType}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
