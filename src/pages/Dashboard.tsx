import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDeliverySummary,
  fetchDeliveryAgents,
  DeliverySummary,
  DeliveryBoy
} from "../services/dashboardService";

const TEN_MINUTES = 10 * 60 * 1000;

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [selectedBoy, setSelectedBoy] = useState<DeliveryBoy | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const navigate = useNavigate();

  /* ---------- LOAD SUMMARY ---------- */
  const loadSummary = async () => {
    try {
   const data = await getDeliverySummary(selectedBoy?.id ?? null);
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- LOAD DELIVERY BOYS ---------- */
 const loadDeliveryBoys = async () => {
  try {
    const res = await fetchDeliveryAgents();

    const mapped = res.map((b: any) => ({
      id: b.id,
      name: b.name || "",
      phone: b.contact || "" // ✅ FIX HERE
    }));

    setDeliveryBoys(mapped);
    localStorage.setItem("DELIVERY_BOYS", JSON.stringify(mapped));
  } catch (err) {
    console.error(err);
  }
};

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    loadDeliveryBoys();
  }, []);

  useEffect(() => {
    loadSummary();

    const interval = setInterval(loadSummary, TEN_MINUTES);
    return () => clearInterval(interval);
  }, [selectedBoy]);

  /* ---------- FILTER ---------- */
  const filteredBoys = deliveryBoys.filter((boy) =>
    boy.name.toLowerCase().includes(search.toLowerCase()) ||
    boy.phone.includes(search)
  );

  /* ---------- OUTSIDE CLICK ---------- */
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!summary) return <h3>Loading dashboard...</h3>;

  return (
    <div style={styles.container}>
      <h2>📦 Delivery Dashboard</h2>

      {/* ---------- SEARCH DROPDOWN ---------- */}
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Search Delivery Boy..."
          value={search}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          style={styles.input}
        />

        {showDropdown && search && (
          <div style={styles.dropdown}>
            <div
              style={styles.option}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBoy(null);
                setSearch("");
                setShowDropdown(false);
              }}
            >
              All Delivery Boys
            </div>

            {filteredBoys.map((boy) => (
              <div
                key={boy.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBoy(boy);
                  setSearch(boy.name);
                  setShowDropdown(false);
                }}
                style={styles.option}
              >
                {boy.name} ({boy.phone})
              </div>
            ))}

            {filteredBoys.length === 0 && (
              <div style={styles.noResult}>No results found</div>
            )}
          </div>
        )}
      </div>

      {/* ---------- DAILY STATUS ---------- */}
      <h3>📅 Today's Status</h3>
      <div style={styles.grid}>
        <Card title="Today Total" value={summary.todayTotal} onClick={() => navigate("/delivery")} />
        <Card title="Delivered" value={summary.todayDelivered} onClick={() => navigate("/delivery")} />
        <Card title="Pending" value={summary.todayPending} onClick={() => navigate("/delivery")} />
        <Card title="Cancelled" value={summary.todayCancelled} onClick={() => navigate("/delivery")} />
      </div>

      {/* ---------- OVERALL STATUS ---------- */}
      <h3 style={{ marginTop: 30 }}>📊 Overall Status</h3>
      <div style={styles.grid}>
        <Card title="Total Deliveries" value={summary.totalDeliveries} onClick={() => navigate("/delivery")} />
        <Card title="Delivered" value={summary.delivered} onClick={() => navigate("/delivery")} />
        <Card title="Pending" value={summary.pending} onClick={() => navigate("/delivery")} />
        <Card title="Cancelled" value={summary.cancelled} onClick={() => navigate("/delivery")} />
      </div>
    </div>
  );
};

/* ---------- CARD ---------- */

const Card: React.FC<{ title: string; value: number; onClick: () => void }> = ({
  title,
  value,
  onClick
}) => (
  <div style={styles.card} onClick={onClick}>
    <h4>{title}</h4>
    <h2>{value}</h2>
    <p style={{ color: "#1976d2" }}>View Details →</p>
  </div>
);

/* ---------- STYLES ---------- */

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 20 },

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
  },

  searchBox: {
    marginBottom: 20,
    position: "relative",
    width: 300
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc"
  },

  dropdown: {
    position: "absolute",
    top: 45,
    width: "100%",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 6,
    maxHeight: 200,
    overflowY: "auto",
    zIndex: 10
  },

  option: {
    padding: 10,
    cursor: "pointer",
    borderBottom: "1px solid #eee"
  },

  noResult: {
    padding: 10,
    color: "gray"
  }
};

export default Dashboard;