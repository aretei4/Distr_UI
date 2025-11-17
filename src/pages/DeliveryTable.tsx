import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QRCodeCanvas } from "qrcode.react";
import { ApiEndpoints, AppConfig } from "../constants/config";

interface DeliveryEntry {
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
  id: number;
  name: string;
  contact: string;
  vehicleNo: string;
  region: string;
}

const DeliveryTable: React.FC = () => {
  const { agentId } = useParams();
  const [deliveryData, setDeliveryData] = useState<DeliveryEntry[]>([]);
  const [filteredData, setFilteredData] = useState<DeliveryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mock agent list (replace with API later)
  useEffect(() => {
    const allAgents: DeliveryAgent[] = [
      { id: 1, name: "Santosh Muduli", contact: "+91 9876543210", vehicleNo: "OD02-AB-1234", region: "Bhubaneswar" },
      { id: 2, name: "Ramesh Rout", contact: "+91 9998822110", vehicleNo: "OD07-CD-5678", region: "Cuttack" },
      { id: 3, name: "Prakash Das", contact: "+91 9123456789", vehicleNo: "OD33-EF-1111", region: "Puri" },
    ];
    const selected = allAgents.find((a) => a.id.toString() === agentId);
    setAgent(selected || null);
  }, [agentId]);

  // Fetch delivery data for that agent
  useEffect(() => {
    if (!agentId) return;
	 fetch(ApiEndpoints.SALES)
	 //fetch("http://localhost:8080/api/sales?Picklist_No=${agentId}")
     .then((res) => res.json())
      .then((data) => {
        setDeliveryData(data);
        setFilteredData(data);
      })
      .catch((err) => console.error("Error fetching delivery data:", err));
  }, [agentId]);

  // Search filter
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredData(deliveryData);
    } else {
      setFilteredData(
        deliveryData.filter(
          (entry) =>
            entry.custDesc.toLowerCase().includes(search.toLowerCase()) ||
            entry.picklistNo.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, deliveryData]);

  // Export PDF
  const exportToPDF = () => {
    if (!agent) return;
    const doc = new jsPDF();
    const canvas = qrCanvasRef.current;
    let qrImage = canvas ? canvas.toDataURL("image/png") : "";

    // Header
    doc.setFontSize(16);
    doc.text(`Delivery Details - ${agent.name}`, 14, 15);
    if (qrImage) doc.addImage(qrImage, "PNG", 150, 5, 40, 40);

    doc.setFontSize(11);
    doc.text(`Name: ${agent.name}`, 14, 30);
    doc.text(`Contact: ${agent.contact}`, 14, 37);
    doc.text(`Vehicle: ${agent.vehicleNo}`, 14, 44);
    doc.text(`Region: ${agent.region}`, 14, 51);
    doc.line(14, 54, 200, 54);

    // Table
    autoTable(doc, {
      startY: 60,
      head: [["Picklist No", "Order","Customer","Net Value","Signature"]],
      body: filteredData.map((e) => [
        e.picklistNo,
		e.salesOrderNo,
        e.custDesc,
       e.netValue.toFixed(2),
	   "---------------"
      ]),
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    // Print view
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const pdfWin = window.open(url);
    if (pdfWin) pdfWin.onload = () => pdfWin.print();
  };

  return (
    <div className="p-6">
      {/* Header */}
      {agent && (
        <div className="mb-6 border-b pb-3">
          <h2 className="text-2xl font-semibold text-blue-800">
            Delivery Agent: {agent.name}
          </h2>
          <p className="text-gray-600 text-sm">
            📞 {agent.contact} &nbsp; | &nbsp; 🚚 {agent.vehicleNo} &nbsp; | &nbsp; 📍 {agent.region}
          </p>
        </div>
      )}

      {/* Hidden QR Canvas */}
      <div style={{ display: "none" }}>
        <QRCodeCanvas
          ref={qrCanvasRef}
          value={`Agent: ${agent?.name}\nContact: ${agent?.contact}\nVehicle: ${agent?.vehicleNo}\nRegion: ${agent?.region}`}
          size={200}
          level="H"
          includeMargin
        />
      </div>

      {/* Controls */}
      <div className="flex justify-between mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or picklist..."
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
              <th className="border px-4 py-2 text-left">Picklist No</th>
              <th className="border px-4 py-2 text-left">Sales Order No</th>
              <th className="border px-4 py-2 text-left">Customer</th>
              <th className="border px-4 py-2 text-left">Signature</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((entry, idx) => (
                <tr key={idx} className="hover:bg-blue-50 text-center text-sm">
                  <td className="border px-4 py-2">{entry.picklistNo}</td>
                <td className="border px-4 py-2">{entry.salesOrderNo}</td>
                <td className="border px-4 py-2">{entry.custDesc}</td>
                <td className="border px-4 py-2 text-gray-400 italic">
                  ______________________
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

export default DeliveryTable;
