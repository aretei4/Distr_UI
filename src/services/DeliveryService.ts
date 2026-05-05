import { Delivery } from "../models/DeliveryModel";
import { ApiEndpoints } from "../constants/config";

export const fetchDeliveryData = async (
  apiFrom: string,
  apiTo: string
): Promise<Delivery[]> => {
  const url = `${ApiEndpoints.DELIVERY_STATUS_LIST}?fromDate=${apiFrom}&toDate=${apiTo}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch delivery data");
  return response.json();
};

export const fetchDeliveryAgents = async () => {
  const response = await fetch(ApiEndpoints.DELIVERY_AGENTS);
  if (!response.ok) throw new Error("Failed to fetch delivery agents");
  return response.json();
};
