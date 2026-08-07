import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export const fetchFeatureFlags = async (): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.FEATURE_FLAGS);
};

export const toggleFeature = async (key: string, enabled: boolean): Promise<any> => {
  return api.put<any>(ApiEndpoints.FEATURE_TOGGLE(key), { enabled });
};

export const saveAllFeatures = async (payload: unknown): Promise<any> => {
  return api.post<any>(ApiEndpoints.FEATURE_SAVE_ALL, payload);
};
