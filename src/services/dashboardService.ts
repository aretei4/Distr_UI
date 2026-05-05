import { ApiEndpoints } from "../constants/config";

export interface DeliverySummary {
  totalDeliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;
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

export async function getDeliverySummary(boyId: number | null): Promise<DeliverySummary> {
  let url = ApiEndpoints.DELIVERY_DASHBOARD;
  if (boyId !== null) url += `?boyId=${boyId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch delivery summary");
  return res.json();
}

export const fetchDeliveryAgents = async (): Promise<DeliveryBoy[]> => {
  const res = await fetch(ApiEndpoints.DELIVERY_AGENTS);
  if (!res.ok) throw new Error("Failed to fetch delivery boys");
  return res.json();
};

export async function getDeliveryDetails(status: string): Promise<DeliveryDetails[]> {
  const res = await fetch(ApiEndpoints.DELIVERY_STATUS);
  if (!res.ok) throw new Error("Failed to fetch delivery details");
  return res.json();
}
