import { ApiEndpoints } from "../constants/config";

export const saveTemplate = async (payload: any) => {
  const response = await fetch(ApiEndpoints.SAVE_TEMPLATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to save template");
  return response.json();
};
