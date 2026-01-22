import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getDeliveryDetails,
  DeliveryDetails as DeliveryDetailsType
} from "../services/dashboardService";

const DeliveryDetails: React.FC = () => {
  const { status } = useParams<{ status: string }>();
  const navigate = useNavigate();

  const [rows, setRows] = useState<DeliveryDetailsType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!status) return;

    getDeliveryDetails(status)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [status]);

  if (loading) return <h3>Loading details...</h3>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>⬅ Back</button>

      <h2>📋 {status} Deliveries</h2>

      <table border={1} cellPadding={8} width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.customerName}</td>
              <td>{row.address}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryDetails;
