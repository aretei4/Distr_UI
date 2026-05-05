import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveTemplate } from "../services/template.service";
import { PageHeader, Card, Btn, Field, Select } from "../components/ui";

const numberToColumnLetter = (num: number) => {
  let letters = "";
  while (num >= 0) {
    letters = String.fromCharCode((num % 26) + 65) + letters;
    num = Math.floor(num / 26) - 1;
  }
  return letters;
};

const TEMPLATE_FIELDS: Record<string, string[]> = {
  customer: ["Name", "Mobile", "address", "lat", "lon", "pin"],
  delivery: ["Name", "Mobile", "address", "lat", "lon", "pin"],
  sales:    ["PicklistNo", "CustomerName", "CustomerNo", "NetValue", "BillingDate"],
};

const TemplateMappingPage: React.FC = () => {
  const [templateName, setTemplateName]   = useState("");
  const [templateType, setTemplateType]   = useState("");
  const [fields, setFields]               = useState<string[]>([]);
  const [headers, setHeaders]             = useState<string[]>([]);
  const [mappings, setMappings]           = useState<Record<string, string>>({});
  const [uploadMsg, setUploadMsg]         = useState("");
  const [errorMsg, setErrorMsg]           = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    setHeaders(rows[0] || []);
    setUploadMsg(`✅ "${file.name}" uploaded`);
    setMappings({});
    setErrorMsg("");
  };

  const handleColumnSelect = (field: string, column: string) => {
    const dup = Object.entries(mappings).find(([col]) => col === column);
    if (dup) { setErrorMsg(`Column ${column} already mapped to "${dup[1]}"`); return; }
    const updated = Object.fromEntries(Object.entries(mappings).filter(([, v]) => v !== field));
    updated[column] = field;
    setMappings(updated);
    setErrorMsg("");
  };

  const handleSave = async () => {
    if (!templateName || !templateType) { alert("Fill template type and name."); return; }
    if (Object.keys(mappings).length !== fields.length) { alert("Map all fields first."); return; }
    try {
      await saveTemplate({ templateName, templateType, mappings });
      alert("✅ Template saved!");
    } catch { alert("❌ Save failed"); }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Master Template" subtitle="Map Excel columns to system fields" />

      <Card style={{ maxWidth: 680 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="Template Type" required>
            <Select value={templateType} onChange={v => { setTemplateType(v); setFields(TEMPLATE_FIELDS[v] || []); setMappings({}); setHeaders([]); setUploadMsg(""); }}>
              <option value="">Select type…</option>
              <option value="delivery">Delivery Agent</option>
              <option value="customer">Customer</option>
              <option value="sales">Invoice / Sales</option>
            </Select>
          </Field>
          <Field label="Template Name" required>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. April Invoice Template"
              style={{ padding: "10px 14px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
          </Field>
        </div>

        <Field label="Upload Sample Excel">
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload}
            style={{ padding: "8px 0", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }} />
        </Field>
        {uploadMsg && <p style={{ fontSize: 12.5, color: "var(--success)", marginTop: 8 }}>{uploadMsg}</p>}
        {errorMsg  && <p style={{ fontSize: 12.5, color: "var(--danger)",  marginTop: 8 }}>{errorMsg}</p>}

        {headers.length > 0 && fields.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>Map Fields</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fields.map(field => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ minWidth: 140, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{field}</span>
                  <Select
                    value={Object.entries(mappings).find(([, v]) => v === field)?.[0] || ""}
                    onChange={v => handleColumnSelect(field, v)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select column…</option>
                    {headers.map((h, i) => {
                      const letter = numberToColumnLetter(i);
                      return <option key={letter} value={letter}>{letter} — {h}</option>;
                    })}
                  </Select>
                  {Object.entries(mappings).find(([, v]) => v === field) && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d7a4e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <Btn variant="primary" onClick={handleSave}
                disabled={!templateName || !templateType || Object.keys(mappings).length !== fields.length}>
                Save Template
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TemplateMappingPage;
