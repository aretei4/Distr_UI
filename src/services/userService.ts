import { AppConfig } from "../constants/config";
import { authHeaders } from "./authService";

export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface UserRecord {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  role?: UserRole;
  enabled?: boolean;
  password?: string;
}

const BASE = `${AppConfig.API_BASE_URL}/users`;

export const userService = {
  async getAll(): Promise<UserRecord[]> {
    const res = await fetch(BASE, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to load users");
    return res.json();
  },

  async create(payload: CreateUserPayload): Promise<UserRecord> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ?? "Failed to create user");
    }
    return res.json();
  },

  async update(id: number, payload: UpdateUserPayload): Promise<UserRecord> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ?? "Failed to update user");
    }
    return res.json();
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to delete user");
  },
};
