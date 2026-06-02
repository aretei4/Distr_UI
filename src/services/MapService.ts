import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "./authService";

export interface MapPoint {
  picklist_no:     string;
  deliveryBoyName: string;
  status:          "DELIVERED" | "FAILED" | "PENDING";
  lat:             number;
  lon:             number;
  delivery_date:   string;
  address:         string;
  sequence:        number;
  net_value:       number;   // invoice net value from stage_sales_entery (0 if not found)
}

export const fetchMapPoints = async (fromDate: string, toDate: string): Promise<MapPoint[]> => {
  const url = `${ApiEndpoints.DELIVERY_MAP}?fromDate=${fromDate}&toDate=${toDate}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to fetch map data");
  return res.json();
};
