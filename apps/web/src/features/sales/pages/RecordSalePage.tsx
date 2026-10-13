import { useCallback, useEffect, useState } from "react";
import SaleForm from "../components/SaleForm";
import SalesSummary from "../components/SalesSummary";
import SalesTable from "../components/SalesTable";
import { getSales, getSummary } from "../api";
import type { Sale, Summary } from "../types";
import { businessToday, businessTimezone, formatBusinessDate, formatNaira, wholeNumber } from "../../../lib/formatters";

export default function RecordSalePage() {
  const date = businessToday();
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const [rows, totals] = await Promise.all([getSales(date), getSummary(date)]);
    setSales(rows); setSummary(totals); setError("");
  }, [date]);

  useEffect(() => {
    let active = true;
    Promise.all([getSales(date), getSummary(date)])
      .then(([rows, totals]) => { if (active) { setSales(rows); setSummary(totals); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load today’s sales."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  async function refreshAfterSave() {
    try { await refresh(); }
    catch (reason) { setError(reason instanceof Error ? `Sale saved, but the session could not refresh: ${reason.message}` : "Sale saved, but the session could not refresh."); }
  }

  return <div className="space-y-7">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Daily operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Sales entry</h1><p className="mt-1 text-sm text-slate-500">Current session · {formatBusinessDate(date)} · {businessTimezone}</p></div>
    <SaleForm onSaved={refreshAfterSave} />
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <SalesSummary items={[
      { label: "Session revenue", value: summary ? formatNaira(summary.total_kobo) : loading ? "Loading…" : "—", hint: "Today’s business day · NGN" },
      { label: "Session transactions", value: summary ? wholeNumber.format(summary.transaction_count) : loading ? "Loading…" : "—", hint: "Saved transactions today" },
    ]} />
    <section className="space-y-3"><div><h2 className="font-semibold text-slate-900">Today’s activity</h2><p className="mt-1 text-sm text-slate-500">Running totals follow the order sales were recorded.</p></div>
      <SalesTable sales={sales} loading={loading} error={error} emptyMessage="No sales yet. Record your first sale above." />
    </section>
  </div>;
}
