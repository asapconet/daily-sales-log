export type Sale = {
  id: string;
  item_name: string;
  amount_kobo: number;
  created_at: string;
};

export type Summary = {
  date: string;
  total_kobo: number;
  transaction_count: number;
};

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
    } catch {
      // Keep the status-based message when the server response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function getSales(date: string): Promise<Sale[]> {
  return request(`/api/sales?date=${encodeURIComponent(date)}`);
}

export function getSummary(date: string): Promise<Summary> {
  return request(`/api/sales/summary?date=${encodeURIComponent(date)}`);
}

export function createSale(itemName: string, amountKobo: number): Promise<Sale> {
  return request("/api/sales", {
    method: "POST",
    body: JSON.stringify({ item_name: itemName, amount_kobo: amountKobo }),
  });
}
