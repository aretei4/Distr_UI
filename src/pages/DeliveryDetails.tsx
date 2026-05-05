import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDeliveryDetails, DeliveryDetails as DDType } from "../services/dashboardService";
import { PageHeader, DataTable, TR, TD, StatusBadge, Btn } from "../components/ui";

const DeliveryDetails: React.FC = () => {
  const { status } = useParams<{ status: string }>();
  const navigate   = useNavigate();
  const [rows, setRows]     = useState<DDType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!status) return;
    getDeliveryDetails(status).then(setRows).finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="animate-fade-up">
      <Btn variant="ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</Btn>
      <PageHeader title={`${status} Deliveries`} subtitle={`${rows.length} records`} />
      <DataTable headers={["ID", "Customer", "Address", "Status"]} loading={loading} empty={rows.length === 0}>
        {rows.map(r => (
          <TR key={r.id}>
            <TD style={{ fontWeight: 700 }}>{r.id}</TD>
            <TD style={{ fontWeight: 500 }}>{r.customerName}</TD>
            <TD style={{ color: "var(--ink-60)" }}>{r.address}</TD>
            <TD><StatusBadge status={r.status} /></TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default DeliveryDetails;
