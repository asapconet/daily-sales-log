import { describe, expect, test } from "bun:test";
import { withRunningTotals } from "../src/features/sales/runningTotals";
import type { Sale } from "../src/features/sales/types";

const sale = (id: string, amount_kobo: number, created_at: string): Sale => ({
	id,
	amount_kobo,
	created_at,
	item_name: "Item",
});

describe("withRunningTotals", () => {
	test("calculates totals in chronological order regardless of input order", () => {
		const rows = withRunningTotals([
			sale("3", 200_000, "2026-10-13T09:30:00Z"),
			sale("1", 100_000, "2026-10-13T08:00:00Z"),
			sale("2", 50_000, "2026-10-13T09:00:00Z"),
		]);
		expect(rows.map((row) => row.runningTotal)).toEqual([
			100_000, 150_000, 350_000,
		]);
	});
});
