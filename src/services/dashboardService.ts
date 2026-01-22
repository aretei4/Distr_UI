import { Delivery } from "../models/DeliveryModel";
import { ApiEndpoints } from "../constants/config";
import { convertToApiDate } from "../utils/dateUtils";

/* ---------- TYPES ---------- */

export interface DeliverySummary {
  totalDeliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;
}

export interface DeliveryDetails {
  id: number;
  customerName: string;
  address: string;
  status: string;
}

/* ---------- API CALLS ---------- */

export async function getDeliverySummary(): Promise<DeliverySummary> {
  const res = await fetch(ApiEndpoints.DELIVERY_DASHBOARD);

  if (!res.ok) {
    throw new Error("Failed to fetch delivery summary");
  }

  return res.json();
}

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

