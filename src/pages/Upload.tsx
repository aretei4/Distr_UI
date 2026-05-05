import React, { useEffect, useState, useRef } from "react";
import { ApiEndpoints } from "../constants/config";
import { PageHeader, Card, Btn, Select, Field, Toast } from "../components/ui";

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("");
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(ApiEndpoints.ALL_TEMPLATE)
      .then(r => r.json())
      .then((data: string[]) => setFileTypes(data))
      .catch(() => setFileTypes(["customer", "delivery", "sales"]));
  }, []);

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
    setErrors([]);
    setMessage(null);
    if (!fileType) { setMessage({ text: "Please select a file type.", type: "error" }); return; }
    if (!file)     { setMessage({ text: "Please select a .xlsx file.", type: "error" }); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);

    try {
      setIsUploading(true);
      const res = await fetch(ApiEndpoints.UPLOAD, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        if (data.errors?.length > 0) {
          setErrors(data.errors);
          setMessage({ text: `Uploaded with ${data.errors.length} validation error(s).`, type: "error" });
        } else {
          setMessage({ text: "File uploaded and processed successfully!", type: "success" });
          setFile(null);
        }
      } else {
        setMessage({ text: "Server returned an error.", type: "error" });
      }
    } catch {
      setMessage({ text: "Could not reach server. Check your connection.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-up">
      {message && <Toast message={message.text} type={message.type} />}

      <PageHeader
        title="Upload Excel"
        subtitle="Upload .xlsx invoices or data sheets for processing"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, maxWidth: 860 }}>
        {/* Main upload card */}
        <Card>
          <Field label="File Type" required>
            <Select value={fileType} onChange={setFileType}>
              <option value="">Select type…</option>
              {fileTypes.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
          </Field>

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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDragging ? "var(--brand)" : "var(--ink-40)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              {isDragging ? "Drop file here" : "Drag & drop your Excel file"}
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-40)" }}>
              or <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse to choose</span> · .xlsx only
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
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
              disabled={isUploading || !file || !fileType}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {isUploading ? (
                <>
                  <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Uploading…
                </>
              ) : "Upload File"}
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => { setFile(null); setFileType(""); setErrors([]); setMessage(null); }}
            >Clear</Btn>
          </div>

          {/* Errors */}
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
        </Card>

        {/* Side info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Upload Guide</p>
            {[
              { step: "1", text: "Select the correct file type from the dropdown" },
              { step: "2", text: "Drag & drop or browse to select your .xlsx file" },
              { step: "3", text: "Click Upload File to process the data" },
              { step: "4", text: "Review any validation errors and fix your sheet" },
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

          <Card>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Supported Types</p>
            {(fileTypes.length ? fileTypes : ["customer", "delivery", "sales"]).map(t => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0", borderBottom: "1px solid var(--ink-5)",
              }}>
                <span style={{ fontSize: 13, color: "var(--ink-60)", textTransform: "capitalize" }}>{t}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Upload;
