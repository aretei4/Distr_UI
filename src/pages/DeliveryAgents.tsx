import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDeliveryAgents } from "../services/DeliveryService";

interface DeliveryBoy {
  id: number;
  name: string;
  phone: string;
}

const DeliveryAgents: React.FC = () => {
  const [data, setData] = useState<DeliveryBoy[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetchDeliveryAgents();
      setData(response);

      // ⭐ Save in localStorage so DeliveryTable can access agent details
      localStorage.setItem("DELIVERY_AGENTS", JSON.stringify(response));
    } catch (err) {
      console.error(err);
      alert("Failed to load delivery agents");
    }
  };

  const handleCheckbox = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRowClick = (id: number) => {
    navigate(`/agents/${id}`);
  };

  const handleDelete = () => {
    if (selected.length === 0) {
      alert("Please select at least one agent to delete");
      return;
    }

    const updated = data.filter((d) => !selected.includes(d.id));
    setData(updated);
    setSelected([]);

    // TODO: backend delete API call
  };

  return (
    <div style={{ width: "70%", margin: "20px auto" }}>
      <h2>Delivery Agents</h2>

      <button
        onClick={handleDelete}
        style={{
          background: "red",
          color: "white",
          padding: "8px 16px",
          borderRadius: "5px",
          cursor: "pointer",
          marginBottom: "10px",
          border: "none"
        }}
      >
        Delete Selected
      </button>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px"
        }}
      >
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th>Select</th>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
          </tr>
        </thead>

        <tbody>
          {data.map((boy) => (
            <tr
              key={boy.id}
              style={{ borderBottom: "1px solid #ccc", cursor: "pointer" }}
              onClick={() => handleRowClick(boy.contact)}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.includes(boy.id)}
                  onClick={(e) => handleCheckbox(boy.id, e)}
                />
              </td>
              <td>{boy.id}</td>
              <td>{boy.name}</td>
              <td>{boy.contact}</td>
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "10px" }}>
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryAgents;
