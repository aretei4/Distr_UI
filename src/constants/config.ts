// src/constants/config.ts
// VITE_API_BASE_URL is injected at build time:
//   dev:    http://localhost:8080/api   (vite dev server proxies)
//   docker: /api                        (nginx proxies to backend container)
//   prod:   https://device4autism.in/api
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) ?? "https://device4autism.in/api";

export const AppConfig = {
  APP_NAME:     "Direco — Distributor to Retail Connect",
  API_BASE_URL,
  VERSION:      "1.0.0",
  DATE_FORMAT:  "DD/MM/YYYY",
  COMPANY_NAME: "Devine Distributors Pvt. Ltd.",
};

export const AuthEndpoints = {
  LOGIN:       `${API_BASE_URL}/auth/login`,
  USERS:       `${API_BASE_URL}/users`,
  USER_BY_ID:  (id: number) => `${API_BASE_URL}/users/${id}`,
};

export const ApiEndpoints = {
  SALES:                `${API_BASE_URL}/sales?Picklist_No=E587P22657`,
  SALES_DELETE:         `${API_BASE_URL}/sales/delete`,
  DELIVERY_AGENTS:      `${API_BASE_URL}/delivery/allAgents`,
  CUSTOMER_LIST:        `${API_BASE_URL}/excel/customerList`,
  DELIVERY_ASIGN:       `${API_BASE_URL}/delivery/assign`,
  DELIVERY_STATUS_LIST: `${API_BASE_URL}/delivery/statusList`,
  DELETE_DELIVERY:      `${API_BASE_URL}/delivery/delete`,
  DELIVERY_ASIGN_LIST:  `${API_BASE_URL}/delivery/deliveryList?deliveri_id=`,
  UPLOAD:               `${API_BASE_URL}/excel/upload`,
  ALL_TEMPLATE:         `${API_BASE_URL}/template/names`,
  SAVE_TEMPLATE:        `${API_BASE_URL}/template/save`,
  SALES_COMPANIES:      `${API_BASE_URL}/template/sales-companies`,
  TEMPLATE_COMPANIES:   `${API_BASE_URL}/template/companies`,
  TEMPLATES_BY_COMPANY: (company: string) => `${API_BASE_URL}/template/by-company/${encodeURIComponent(company)}`,
  DELIVERY_DASHBOARD:   `${API_BASE_URL}/dashboard/delivery-summary`,
  DELIVERY_STATUS:      `${API_BASE_URL}/dashboard/delivery-summary`,
  DAY_END_SUMMARY:      `${API_BASE_URL}/dayend/dayEndSummery`,
  DAY_END_APPROVE:      `${API_BASE_URL}/dayend/approve`,
  DAY_END_REJECT:       `${API_BASE_URL}/dayend/reject`,
  DELIVERY_MAP:         `${API_BASE_URL}/delivery/map`,
  WAREHOUSES:           `${API_BASE_URL}/warehouse`,
};
