import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export const saveTemplate = async (payload: any) => {
  return api.post<any>(ApiEndpoints.SAVE_TEMPLATE, payload);
};

export const fetchTemplateCompanies = async (): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.TEMPLATE_COMPANIES);
};

export const fetchTemplatesByCompany = async (companyName: string): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.TEMPLATES_BY_COMPANY(companyName));
};

export const uploadSalesFile = async (form: FormData): Promise<any> => {
  return api.postForm<any>(ApiEndpoints.UPLOAD, form);
};
