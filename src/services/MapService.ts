import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export interface MapPoint {
  picklist_no:     string;   // carries dire_id as string for ASSIGNED map points
  deliveryBoyName: string;
  status:          string;   // ASSIGNED | PENDING
  lat:             number;
  lon:             number;
  delivery_date:   string;
  address:         string;
  sequence:        number;
  net_value:       number;   // invoice net value from stage_sales_entery (0 if not found)
}

export interface RouteAssignStop {
  direId:   number;
  sequence: number;
}

/** ASSIGNED/PENDING stops for one agent — coordinates from customer master. */
export const fetchMapPoints = async (deliveryId: string | number): Promise<MapPoint[]> => {
  return api.get<MapPoint[]>(`${ApiEndpoints.DELIVERY_MAP}?deliveryId=${deliveryId}`);
};

/** Saves the route order (sequence) for the agent's assigned stops. */
export const assignRoute = async (stops: RouteAssignStop[]): Promise<void> => {
  await api.post(ApiEndpoints.SMART_ROUTE_ASSIGN, stops);
};

export interface Warehouse {
  id: number; name: string; address: string; lat: number; lon: number; active?: boolean;
}

export const fetchWarehouses = async (): Promise<Warehouse[]> => {
  return api.get<Warehouse[]>(ApiEndpoints.WAREHOUSES);
};
