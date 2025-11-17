// src/constants/config.ts

// Read from environment (.env files)
//const API_BASE_URL: string ="https://device4autism.in/api";
const API_BASE_URL: string ="http://localhost:8080/api";

// ✅ Global App Config Constants
export const AppConfig = {
  APP_NAME: "Distributor Delivery System",
  API_BASE_URL,
  VERSION: "1.0.0",
  DATE_FORMAT: "DD/MM/YYYY",
  COMPANY_NAME: "Devine Distributors Pvt. Ltd.",
};

// ✅ Common REST API Endpoints
export const ApiEndpoints = {
  SALES: `${API_BASE_URL}/sales?Picklist_No=E587P22657`,
  DELIVERY_AGENTS: `${API_BASE_URL}/sales?Picklist_No=E587P22657`,
   DELIVERY_STATUS_LIST: `${API_BASE_URL}/delivery/statusList`,
  UPLOAD: `${API_BASE_URL}/upload`,
};
