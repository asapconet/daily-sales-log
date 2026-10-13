import { useEffect, useState } from "react";
import { getSales, getSummary } from "../api";
import type { Sale, Summary } from "../types";
import SalesTable from "../components/SalesTable";
import { businessToday, businessLocationLabel, businessTimezone, formatBusinessDate, formatNaira, wholeNumber } from "../../../lib/formatters";

export default function SalesLogPage() {
  const [date, setDate] = useState(businessToday);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSales([]); setSummary(null);
    Promise.all([getSales(date), getSummary(date)])
      .then(([rows, totals]) => { if (active) { setSales(rows); setSummary(totals); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load this business day."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Records</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Sales log</h1><p className="mt-1 text-sm text-slate-500">Inspect transactions by business date.</p></div>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Business date
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20" />
      </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-xs text-slate-500">Selected business day</p><p className="mt-0.5 font-medium text-slate-900">{formatBusinessDate(date)}</p></div><div className="flex gap-6 text-right"><div><p className="text-xs text-slate-500">Revenue · NGN</p><p className="font-semibold text-slate-900">{summary ? formatNaira(summary.total_kobo) : "—"}</p></div><div><p className="text-xs text-slate-500">Transactions</p><p className="font-semibold text-slate-900">{summary ? wholeNumber.format(summary.transaction_count) : "—"}</p></div></div></div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <section className="space-y-3"><div><h2 className="font-semibold text-slate-900">Transactions</h2><p className="mt-1 text-sm text-slate-500">Newest first. Running totals reflect chronological order. Times use {businessLocationLabel} ({businessTimezone}).</p></div><SalesTable sales={sales} recent loading={loading} error={error} emptyMessage="No sales were recorded on this business date." /></section>
  </div>;
}
