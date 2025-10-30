import React, { useState } from "react";

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("⚠️ Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:3050/distr/api/excel/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setMessage("✅ File uploaded successfully!");
      } else {
        setMessage("❌ Upload failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Server not reachable.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-md rounded-xl p-6">
      <h1 className="text-2xl font-semibold mb-4 text-center">Upload File</h1>

      <input
        type="file"
        onChange={handleFileChange}
        className="w-full border border-gray-300 p-2 rounded-md"
      />

      {file && (
        <p className="mt-2 text-sm text-gray-600">
          Selected: <strong>{file.name}</strong>
        </p>
      )}

      <button
        onClick={handleUpload}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
      >
        Upload
      </button>

      {message && (
        <p className="mt-3 text-center text-gray-700 font-medium">{message}</p>
      )}
    </div>
  );
};

export default Upload;
