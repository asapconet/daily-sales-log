import type { Sale } from "./types";

export function withRunningTotals(sales: Sale[]) {
	let total = 0;
	return [...sales]
		.sort(
			(a, b) =>
				Date.parse(a.created_at) - Date.parse(b.created_at) ||
				a.id.localeCompare(b.id),
		)
		.map((sale) => {
			total += sale.amount_kobo;
			return { ...sale, runningTotal: total };
		});
}
