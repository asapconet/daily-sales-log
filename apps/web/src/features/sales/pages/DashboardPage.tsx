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

	const [allTimeLoading, setAllTimeLoading] = useState(true);
	const [todayLoading, setTodayLoading] = useState(true);
	const [salesLoading, setSalesLoading] = useState(true);

	const [allTimeError, setAllTimeError] = useState("");
	const [todayError, setTodayError] = useState("");
	const [salesError, setSalesError] = useState("");

	useEffect(() => {
		let active = true;

		void getAllTimeSummary()
			.then((summary) => {
				if (active) setAllTime(summary);
			})
			.catch((reason: unknown) => {
				if (active) {
					setAllTimeError(
						reason instanceof Error
							? reason.message
							: "Could not load all-time summary.",
					);
				}
			})
			.finally(() => {
				if (active) setAllTimeLoading(false);
			});

		void getRecentSales()
			.then((recent) => {
				if (active) setSales(recent);
			})
			.catch((reason: unknown) => {
				if (active) {
					setSalesError(
						reason instanceof Error
							? reason.message
							: "Could not load recent transactions.",
					);
				}
			})
			.finally(() => {
				if (active) setSalesLoading(false);
			});

		void getSummary(businessToday())
			.then((summary) => {
				if (active) setToday(summary);
			})
			.catch((reason: unknown) => {
				if (active) {
					setTodayError(
						reason instanceof Error
							? reason.message
							: "Could not load today's summary.",
					);
				}
			})
			.finally(() => {
				if (active) setTodayLoading(false);
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

			<SalesSummary
				items={[
					{
						label: "All-time revenue",
						value: allTime
							? formatNaira(allTime.total_kobo)
							: allTimeLoading
								? "Loading…"
								: "Unavailable",
						hint: allTimeError || "All recorded sales · NGN",
					},
					{
						label: "All-time transactions",
						value: allTime
							? wholeNumber.format(allTime.transaction_count)
							: allTimeLoading
								? "Loading…"
								: "Unavailable",
						hint: allTimeError || "Across all business days",
					},
					{
						label: "Today’s revenue",
						value: today
							? formatNaira(today.total_kobo)
							: todayLoading
								? "Loading…"
								: "Unavailable",
						hint:
							todayError ||
							`Business day · ${businessToday()} · NGN`,
					},
				]}
			/>

			{(allTimeError || todayError) && (
				<div
					role="alert"
					className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
				>
					{allTimeError && (
						<p>All-time summary: {allTimeError}</p>
					)}
					{todayError && <p>Today’s summary: {todayError}</p>}
				</div>
			)}

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
					loading={salesLoading}
					error={salesError}
					emptyMessage="No sales have been recorded yet."
				/>
			</section>
		</div>
	);
}
