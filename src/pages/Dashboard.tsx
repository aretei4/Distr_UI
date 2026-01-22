import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDeliverySummary,
  DeliverySummary
} from "../services/dashboardService";

const TEN_MINUTES = 10 * 60 * 1000;

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const navigate = useNavigate();

  const loadSummary = async () => {
    try {
      const data = await getDeliverySummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSummary();

    const interval = setInterval(loadSummary, TEN_MINUTES);
    return () => clearInterval(interval);
  }, []);

  if (!summary) return <h3>Loading dashboard...</h3>;

  return (
    <div style={styles.container}>
      <h2>📦 Delivery Dashboard</h2>

      <div style={styles.grid}>
        <Card
          title="Total Deliveries"
          value={summary.totalDeliveries}
          onClick={() => navigate("/delivery")}
        />
        <Card
          title="Delivered"
          value={summary.delivered}
          onClick={() => navigate("/delivery")}
        />
        <Card
          title="Pending"
          value={summary.pending}
          onClick={() => navigate("/delivery")}
        />
        <Card
          title="Cancelled"
          value={summary.cancelled}
          onClick={() => navigate("/delivery")}
        />
      </div>
    </div>
  );
};

/* ---------- CARD COMPONENT ---------- */

interface CardProps {
  title: string;
  value: number;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ title, value, onClick }) => (
  <div style={styles.card} onClick={onClick}>
    <h4>{title}</h4>
    <h2>{value}</h2>
    <p style={{ color: "#1976d2" }}>View Details →</p>
  </div>
);

/* ---------- STYLES ---------- */

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16
  },
  card: {
    cursor: "pointer",
    background: "#fff",
    padding: 20,
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    textAlign: "center"
  }
};

export default Dashboard;
