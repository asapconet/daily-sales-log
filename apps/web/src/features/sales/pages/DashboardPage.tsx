import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getAllTimeSummary, getRecentSales, getSummary } from "../api";
import type { AllTimeSummary, Sale, Summary } from "../types";
import SalesSummary from "../components/SalesSummary";
import SalesTable from "../components/SalesTable";
import {
	businessToday,
	formatNaira,
	wholeNumber,
} from "../../../lib/formatters";

export default function DashboardPage() {
	const [allTime, setAllTime] = useState<AllTimeSummary | null>(null);
	const [today, setToday] = useState<Summary | null>(null);
	const [sales, setSales] = useState<Sale[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		Promise.all([
			getAllTimeSummary(),
			getRecentSales(),
			getSummary(businessToday()),
		])
			.then(([summary, recent, day]) => {
				if (active) {
					setAllTime(summary);
					setSales(recent);
					setToday(day);
				}
			})
			.catch((reason: unknown) => {
				if (active)
					setError(
						reason instanceof Error
							? reason.message
							: "Could not load dashboard.",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	return (
		<div className="space-y-7">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
						Overview
					</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Business-wide performance across all recorded sales.
					</p>
				</div>
				<Link
					to="/sales/new"
					className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
				>
					+ Record a sale
				</Link>
			</div>
			{error && (
				<p
					role="alert"
					className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
				>
					{error}
				</p>
			)}
			<SalesSummary
				items={[
					{
						label: "All-time revenue",
						value: allTime
							? formatNaira(allTime.total_kobo)
							: loading
								? "Loading…"
								: "—",
						hint: "All recorded sales · NGN",
					},
					{
						label: "All-time transactions",
						value: allTime
							? wholeNumber.format(allTime.transaction_count)
							: loading
								? "Loading…"
								: "—",
						hint: "Across all business days",
					},
					{
						label: "Today’s revenue",
						value: today
							? formatNaira(today.total_kobo)
							: loading
								? "Loading…"
								: "—",
						hint: `Business day · ${businessToday()} · NGN`,
					},
				]}
			/>
			<section className="space-y-3">
				<div className="flex items-end justify-between gap-3">
					<div>
						<h2 className="font-semibold text-slate-900">
							Recent transactions
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Latest activity from all business days.
						</p>
					</div>
					<Link
						to="/sales"
						className="text-sm font-medium text-emerald-800 hover:underline"
					>
						View sales log →
					</Link>
				</div>
				<SalesTable
					sales={sales}
					recent
					loading={loading}
					error={error}
					emptyMessage="No sales have been recorded yet."
				/>
			</section>
		</div>
	);
}
