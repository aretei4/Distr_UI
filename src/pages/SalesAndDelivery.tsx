import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QRCodeCanvas } from "qrcode.react"; // ✅ Browser-safe QR library

interface SalesEntry {
  picklistNo: string;
  salesOrderNo: string;
  customerNo: string;
  custDesc: string;
  salesRepNo: string;
  salesRepName: string;
  route: string;
  routeName: string;
  billingDate: number;
  warehouse: string;
  netValue: number;
  updateDate: number;
  buId: number;
}

interface DeliveryAgent {
  name: string;
  contact: string;
  vehicleNo: string;
}

const SalesTable: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState<SalesEntry[]>([]);
  const [deliveryAgent] = useState<DeliveryAgent>({
    name: "Santosh Muduli",
    contact: "+91 9876543210",
    vehicleNo: "OD02-AB-1234",
  });

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch Data
  useEffect(() => {
  fetch(ApiEndpoints.SALES)
      .then((res) => res.json())
      .then((data) => {
        setSalesData(data);
        setFilteredData(data);
      })
      .catch((err) => console.error("Error fetching sales data:", err));
  }, []);

  // Filter
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredData(salesData);
    } else {
      setFilteredData(
        salesData.filter(
          (entry) =>
            entry.custDesc.toLowerCase().includes(search.toLowerCase()) ||
            entry.picklistNo.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, salesData]);

  // Export to PDF with QR Code
  const exportToPDF = async () => {
    const doc = new jsPDF();

    // Get QR code as image
    const canvas = qrCanvasRef.current;
    let qrImage = "";
    if (canvas) {
      qrImage = canvas.toDataURL("image/png");
    }

    // Header
    doc.setFontSize(16);
    doc.text("Delivery Agent Details", 14, 15);
    if (qrImage) doc.addImage(qrImage, "PNG", 150, 5, 40, 40);

    doc.setFontSize(11);
    doc.text(`Name: ${deliveryAgent.name}`, 14, 30);
    doc.text(`Contact: ${deliveryAgent.contact}`, 14, 37);
    doc.text(`Vehicle: ${deliveryAgent.vehicleNo}`, 14, 44);
    doc.line(14, 47, 200, 47);

    // Table
    autoTable(doc, {
      startY: 55,
      head: [
        [
          "Picklist No",
          "Customer",
          "Sales Order",
          "Route",
          "Warehouse",
          "Net Value",
        ],
      ],
      body: filteredData.map((entry) => [
        entry.picklistNo,
        entry.custDesc,
        entry.salesOrderNo,
        entry.routeName,
        entry.warehouse,
        entry.netValue.toFixed(2),
      ]),
      theme: "grid",
      headStyles: { fillColor: [22, 78, 99] },
      styles: { fontSize: 10 },
    });

    // Print
    const blob = doc.output("blob");
    const blobURL = URL.createObjectURL(blob);
    const pdfWindow = window.open(blobURL);
    if (pdfWindow) {
      pdfWindow.onload = () => pdfWindow.print();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4 text-blue-700">
        Sales Records
      </h2>

      {/* Hidden QR Code Canvas */}
      <div style={{ display: "none" }}>
        <QRCodeCanvas
          ref={qrCanvasRef}
          value={`Name: ${deliveryAgent.name}\nContact: ${deliveryAgent.contact}\nVehicle: ${deliveryAgent.vehicleNo}`}
          size={200}
          level="H"
          includeMargin
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Search by customer or picklist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
        <button
          onClick={exportToPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export & Print PDF
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Picklist No</th>
              <th className="border px-4 py-2">Customer</th>
              <th className="border px-4 py-2">Sales Order</th>
              <th className="border px-4 py-2">Route</th>
              <th className="border px-4 py-2">Warehouse</th>
              <th className="border px-4 py-2">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((entry, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-blue-50 transition text-center text-sm"
                >
                  <td className="border px-4 py-2">{entry.picklistNo}</td>
                  <td className="border px-4 py-2">{entry.custDesc}</td>
                  <td className="border px-4 py-2">{entry.salesOrderNo}</td>
                  <td className="border px-4 py-2">{entry.routeName}</td>
                  <td className="border px-4 py-2">{entry.warehouse}</td>
                  <td className="border px-4 py-2">
                    {entry.netValue.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesTable;
