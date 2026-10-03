import type { Cause } from "./seed";

export interface UserSession {
  email: string;
  user_id: string;
  role: "analyst" | "approver";
  access_token: string;
}

export interface Batch {
  id: string;
  cause: Cause;
  remedy_code: string;
  unit_cost_bdt: number;
  wallet_count: number;
  status: "proposed" | "approved" | "rejected";
  proposed_by: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface ExportBatchResponse {
  batch_id: string;
  cause: Cause;
  remedy_code: string;
  wallet_ids: string[];
  cost_bdt: number;
  approved_by: string;
  approved_at: string;
}

const STORAGE_KEY_TOKEN = "wq_token";
const STORAGE_KEY_USER = "wq_user";

export function getStoredUser(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserSession): void {
  sessionStorage.setItem(STORAGE_KEY_TOKEN, user.access_token);
  sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function clearStoredUser(): void {
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_USER);
}

function getAuthHeader(): Record<string, string> {
  const token = sessionStorage.getItem(STORAGE_KEY_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err && err.detail) {
        detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      if (res.status === 503) {
        detail = "Write path offline. Read-only screens still work.";
      }
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<UserSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleApiResponse<{
    access_token: string;
    user_id: string;
    role: "analyst" | "approver";
  }>(res);

  const session: UserSession = {
    email,
    user_id: data.user_id,
    role: data.role,
    access_token: data.access_token,
  };
  setStoredUser(session);
  return session;
}

export async function listBatches(): Promise<{ batches: Batch[]; offline: boolean }> {
  try {
    const res = await fetch("/api/batches", {
      headers: { ...getAuthHeader() },
    });
    if (res.status === 503) {
      return { batches: [], offline: true };
    }
    const data = await handleApiResponse<Batch[]>(res);
    return { batches: data, offline: false };
  } catch {
    return { batches: [], offline: true };
  }
}

export async function proposeBatch(cause: Cause, walletIds: string[]): Promise<Batch> {
  const res = await fetch("/api/batches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      cause,
      wallet_ids: walletIds,
    }),
  });

  return handleApiResponse<Batch>(res);
}

export async function decideBatch(
  id: string,
  action: "approve" | "reject",
  note: string
): Promise<Batch> {
  const res = await fetch(`/api/batches/${id}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ note }),
  });

  return handleApiResponse<Batch>(res);
}

export async function exportBatch(id: string): Promise<ExportBatchResponse> {
  const res = await fetch(`/api/batches/${id}/export`, {
    headers: {
      ...getAuthHeader(),
    },
  });

  return handleApiResponse<ExportBatchResponse>(res);
}
