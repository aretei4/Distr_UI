import React, { useState } from "react";
import { ApiEndpoints } from "../constants/config";

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false); // <-- NEW

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      if (!selectedFile.name.endsWith(".xlsx")) {
        setMessage("❌ Only .xlsx files allowed!");
        setFile(null);
        return;
      }
      setMessage("");
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    setErrors([]);
    setMessage("");

    if (!fileType) {
      setMessage("⚠️ Select file type!");
      return;
    }
    if (!file) {
      setMessage("⚠️ Select .xlsx file!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);

    try {
      setIsUploading(true); // <-- START LOADING

      const response = await fetch(ApiEndpoints.UPLOAD, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
          setMessage("⚠️ Validation errors found.");
        } else {
          setMessage("✅ File uploaded & processed successfully!");
        }
      } else {
        setMessage("❌ Server returned an error");
      }

    } catch (error) {
      console.error(error);
      setMessage("⚠️ Could not reach server");
    } finally {
      setIsUploading(false); // <-- STOP LOADING
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-md rounded-xl p-6">

      <h1 className="text-2xl font-semibold mb-4 text-center">Upload Excel</h1>

      <label className="font-medium">Select File Type</label>
      <select
        value={fileType}
        onChange={(e) => setFileType(e.target.value)}
        className="w-full border p-2 rounded mb-4"
      >
        <option value="">-- Select --</option>
        <option value="sales">Sales Master</option>
        <option value="agent">Delivery Agent List</option>
      </select>

      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="w-full border p-2 rounded"
      />

      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`w-full py-2 mt-4 rounded text-white
           ${isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {/* ⏳ Loader */}
      {isUploading && (
        <div className="flex items-center justify-center mt-4">
          <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-blue-700 font-medium">Uploading, please wait...</span>
        </div>
      )}

      {!isUploading && message && (
        <p className="mt-4 font-medium text-center">{message}</p>
      )}

      {!isUploading && errors.length > 0 && (
        <div className="mt-4 bg-red-100 p-4 rounded border border-red-300">
          <h2 className="font-semibold text-red-700 mb-2">Errors:</h2>
          <ul className="list-disc ml-6 text-red-800">
            {errors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Upload;
