import type { AllTimeSummary, Sale, Summary } from "./types";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch { /* retain status-based message */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const getSales = (date: string) => request<Sale[]>(`/api/sales?date=${encodeURIComponent(date)}`);
export const getRecentSales = () => request<Sale[]>("/api/sales/recent");
export const getSummary = (date: string) => request<Summary>(`/api/sales/summary?date=${encodeURIComponent(date)}`);
export const getAllTimeSummary = () => request<AllTimeSummary>("/api/sales/summary/all-time");
export const createSale = (itemName: string, amountKobo: number) => request<Sale>("/api/sales", {
  method: "POST",
  body: JSON.stringify({ item_name: itemName, amount_kobo: amountKobo }),
});
