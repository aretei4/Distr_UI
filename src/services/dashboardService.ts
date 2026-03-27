import { Delivery } from "../models/DeliveryModel";
import { ApiEndpoints } from "../constants/config";
import { convertToApiDate } from "../utils/dateUtils";

/* ---------- TYPES ---------- */
export interface DeliverySummary {
  totalDeliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;

  // NEW
  todayTotal: number;
  todayDelivered: number;
  todayPending: number;
  todayCancelled: number;
}

export interface DeliveryDetails {
  id: number;
  customerName: string;
  address: string;
  status: string;
}
export interface DeliveryBoy {
  id: number;
  name: string;
  phone: string;
}
/* ---------- API CALLS ---------- */
export async function getDeliverySummary(
  boyId
): Promise<DeliverySummary> {
console.log("Sending boyId:",boyId);
  let url = ApiEndpoints.DELIVERY_DASHBOARD;

  // ✅ Add query param only if boyId exists
  if (boyId !== null) {
    url += `?boyId=${boyId}`;
  }

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch delivery summary");
  }

  return res.json();
};

export const fetchDeliveryAgents = async (): Promise<DeliveryBoy[]> => {
  const res = await fetch(ApiEndpoints.DELIVERY_AGENTS);
  if (!res.ok) throw new Error("Failed to fetch delivery boys");

  return res.json();
};
export async function getDeliveryDetails(
  status: string
): Promise<DeliveryDetails[]> {
  const res = await fetch(
   ApiEndpoints.DELIVERY_STATUS
  );

  if (!res.ok) {
    throw new Error("Failed to fetch delivery details");
  }

  return res.json();
}

