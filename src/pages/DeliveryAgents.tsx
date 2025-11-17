import React from "react";
import { useNavigate } from "react-router-dom";

interface DeliveryAgent {
  id: number;
  name: string;
  contact: string;
  vehicleNo: string;
  region: string;
}

const DeliveryAgents: React.FC = () => {
  const navigate = useNavigate();

  // Mock delivery agent list (replace with API later)
  const agents: DeliveryAgent[] = [
    { id: 1, name: "Santosh Muduli", contact: "+91 9876543210", vehicleNo: "OD02-AB-1234", region: "Bhubaneswar" },
    { id: 2, name: "Ramesh Rout", contact: "+91 9998822110", vehicleNo: "OD07-CD-5678", region: "Cuttack" },
    { id: 3, name: "Prakash Das", contact: "+91 9123456789", vehicleNo: "OD33-EF-1111", region: "Puri" },
    { id: 4, name: "Suresh Nayak", contact: "+91 9312345678", vehicleNo: "OD14-GH-2222", region: "Balasore" },
  ];

  const handleSelect = (agentId: number) => {
    navigate(`/agents/${agentId}`); // Go to DeliveryTable
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-blue-800 mb-4">
        🚚 Delivery Agent List
      </h2>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="border px-4 py-2 text-left">#</th>
              <th className="border px-4 py-2 text-left">Agent Name</th>
              <th className="border px-4 py-2 text-left">Contact</th>
              <th className="border px-4 py-2 text-left">Vehicle No</th>
              <th className="border px-4 py-2 text-left">Region</th>
              <th className="border px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, index) => (
              <tr
                key={agent.id}
                className="hover:bg-blue-50 cursor-pointer"
                onClick={() => handleSelect(agent.id)}
              >
                <td className="border px-4 py-2">{index + 1}</td>
                <td className="border px-4 py-2">{agent.name}</td>
                <td className="border px-4 py-2">{agent.contact}</td>
                <td className="border px-4 py-2">{agent.vehicleNo}</td>
                <td className="border px-4 py-2">{agent.region}</td>
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(agent.id);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    View Deliveries
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryAgents;
