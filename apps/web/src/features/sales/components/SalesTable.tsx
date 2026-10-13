import type { Sale } from "../types";
import { withRunningTotals } from "../runningTotals";
import { formatDateTime, formatNaira } from "../../../lib/formatters";

type Props = {
	sales: Sale[];
	loading?: boolean;
	error?: string;
	emptyMessage?: string;
	recent?: boolean;
};

export default function SalesTable({
	sales,
	loading = false,
	error = "",
	emptyMessage = "No transactions for this business day.",
	recent = false,
}: Props) {
	const rows = withRunningTotals(sales);
	if (recent) rows.reverse();
	return (
		<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
			<table className="w-full min-w-[620px] text-left text-sm">
				<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th className="px-4 py-3 font-medium">Item</th>
						<th className="px-4 py-3 font-medium">Date &amp; time</th>
						<th className="px-4 py-3 text-right font-medium">
							Amount <span className="normal-case">(NGN)</span>
						</th>
						{!recent && (
							<th className="px-4 py-3 text-right font-medium">
								Running total <span className="normal-case">(NGN)</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100">
					{loading ? (
						<tr>
							<td
								colSpan={recent ? 3 : 4}
								className="px-4 py-12 text-center text-slate-500"
								role="status"
							>
								Loading transactions…
							</td>
						</tr>
					) : error ? (
						<tr>
							<td
								colSpan={recent ? 3 : 4}
								className="px-4 py-12 text-center text-rose-700"
							>
								{error}
							</td>
						</tr>
					) : rows.length === 0 ? (
						<tr>
							<td
								colSpan={recent ? 3 : 4}
								className="px-4 py-12 text-center text-slate-500"
							>
								{emptyMessage}
							</td>
						</tr>
					) : (
						rows.map((sale) => (
							<tr key={sale.id} className="hover:bg-slate-50/70">
								<td className="px-4 py-3 font-medium text-slate-800">
									{sale.item_name}
								</td>
								<td className="px-4 py-3 text-slate-500">
									{formatDateTime(sale.created_at)}
								</td>
								<td className="px-4 py-3 text-right tabular-nums">
									{formatNaira(sale.amount_kobo)}
								</td>
								{!recent && (
									<td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-800">
										{formatNaira(sale.runningTotal)}
									</td>
								)}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
