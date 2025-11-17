import { Delivery } from "../models/DeliveryModel";
import { ApiEndpoints } from "../constants/config";
import { convertToApiDate } from "../utils/dateUtils";

export const fetchDeliveryData = async (
  apiFrom: string,
  apiTo: string
): Promise<Delivery[]> => {
  
  //const apiFrom = convertToApiDate(fromDate);
  //const apiTo = convertToApiDate(toDate);

  const url = `${ApiEndpoints.DELIVERY_STATUS_LIST}?fromDate=${apiFrom}&toDate=${apiTo}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch delivery data");
  }

  return response.json();
};
