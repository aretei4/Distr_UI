import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveTemplate } from "../services/template.service";

// Convert column index → Excel Letter (A, B, C...)
const numberToColumnLetter = (num: number) => {
  let letters = "";
  while (num >= 0) {
    letters = String.fromCharCode((num % 26) + 65) + letters;
    num = Math.floor(num / 26) - 1;
  }
  return letters;
};

// Template field sets
const TEMPLATE_FIELDS: Record<string, string[]> = {
  customer: ["Name", "Mobile", "address", "lat", "lon", "pin"],
  delivery: ["Name", "Mobile", "address", "lat", "lon", "pin"],
  sales: ["PicklistNo", "CustomerName", "CustomerNo", "NetValue", "BillingDate"],
};

const TemplateMappingPage: React.FC = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // XLSX Upload
  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    setHeaders(rows[0] || []);
    setUploadMessage(`✅ File "${file.name}" uploaded successfully`);
    setMappings({});
    setErrorMessage("");
  };

  // Handle column selection (prevent duplicates)
  const handleColumnSelect = (field: string, column: string) => {
    // If column already selected for another field
    const alreadyMappedField = Object.entries(mappings).find(
      ([col]) => col === column
    );

    if (alreadyMappedField) {
      setErrorMessage(
        `⚠️ Column ${column} already mapped to "${alreadyMappedField[1]}"`
      );
      return;
    }

    // Remove old mapping for this field
    const updatedMappings = Object.fromEntries(
      Object.entries(mappings).filter(([, v]) => v !== field)
    );

    updatedMappings[column] = field;

    setMappings(updatedMappings);
    setErrorMessage("");
  };

  // Save Template
  const saveTemplateHandler = async () => {
    if (!templateName || !templateType) {
      alert("Please select template type and enter template name.");
      return;
    }

    if (Object.keys(mappings).length !== fields.length) {
      alert("Please map all fields before saving.");
      return;
    }

    const payload = {
      templateName,
      templateType,
      mappings,
    };

    try {
      await saveTemplate(payload);
      alert("✅ Template saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving template");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>Create XLSX Upload Template</h2>

      {/* Template Type */}
      <div style={{ marginBottom: 15 }}>
        <label>Template Type: </label>
        <select
          value={templateType}
          onChange={(e) => {
            const type = e.target.value;
            setTemplateType(type);
            setFields(TEMPLATE_FIELDS[type] || []);
            setMappings({});
            setHeaders([]);
            setUploadMessage("");
          }}
          style={{ padding: 6 }}
        >
          <option value="">Select Template Type</option>
          <option value="delivery">Delivery</option>
          <option value="customer">Customer</option>
          <option value="sales">Sales</option>
        </select>
      </div>

      {/* Template Name */}
      <div style={{ marginBottom: 15 }}>
        <label>Template Name: </label>
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Enter template name"
          style={{ padding: 6, width: 250 }}
        />
      </div>

      {/* File Upload */}
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />

      {uploadMessage && (
        <div style={{ marginTop: 8, color: "green" }}>{uploadMessage}</div>
      )}

      {errorMessage && (
        <div style={{ marginTop: 8, color: "red" }}>{errorMessage}</div>
      )}

      {/* Mapping Section */}
      {headers.length > 0 && fields.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Map Fields</h3>

          {fields.map((field) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <strong>{field}</strong>

              <select
                style={{ marginLeft: 10, padding: 6 }}
                value={
                  Object.entries(mappings).find(([, v]) => v === field)?.[0] ||
                  ""
                }
                onChange={(e) =>
                  handleColumnSelect(field, e.target.value)
                }
              >
                <option value="">Select Column</option>
                {headers.map((header, colIndex) => {
                  const letter = numberToColumnLetter(colIndex);
                  return (
                    <option key={letter} value={letter}>
                      {letter} - {header}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}

          {/* Save Button */}
          <button
            onClick={saveTemplateHandler}
            disabled={
              !templateName ||
              !templateType ||
              Object.keys(mappings).length !== fields.length
            }
            style={{
              marginTop: 20,
              padding: "10px 28px",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              opacity:
                !templateName ||
                !templateType ||
                Object.keys(mappings).length !== fields.length
                  ? 0.6
                  : 1,
            }}
          >
            Save Template
          </button>
        </>
      )}
    </div>
  );
};

export default TemplateMappingPage;
