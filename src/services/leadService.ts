import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

/** One enquiry submitted from the public landing-page contact popup. */
export interface ContactLead {
  enquiryId:    string;
  name:         string;
  business:     string;
  phone:        string;
  email:        string;
  routesPerDay: number | null;
  message:      string;
}

export interface ContactLeadRecord extends ContactLead {
  id:        number;
  createdAt: string;
}

export interface SaveLeadResult {
  saved:      boolean;
  id?:        number;
  enquiryId?: string;
  error?:     string;
}

/** Saves an enquiry. Public endpoint — no auth required. */
export const saveContactLead = async (lead: ContactLead): Promise<SaveLeadResult> => {
  return (await api.post<SaveLeadResult>(ApiEndpoints.LEADS, lead)) ?? { saved: false };
};

/** Latest enquiries for the back office (authenticated). */
export const fetchRecentLeads = async (limit = 100): Promise<ContactLeadRecord[]> => {
  return api.get<ContactLeadRecord[]>(`${ApiEndpoints.LEADS_RECENT}?limit=${limit}`);
};
