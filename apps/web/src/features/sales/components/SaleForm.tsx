import { useState, type FormEvent } from "react";
import { createSale } from "../api";
import { parseKobo } from "../../../lib/formatters";

export default function SaleForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const cleanName = name.trim();
    const kobo = parseKobo(amount);
    setSuccess("");
    if (!cleanName) return setError("Enter an item name.");
    if (cleanName.length > 120) return setError("Item name must be 120 characters or fewer.");
    if (kobo === null) return setError("Enter an amount greater than ₦0 with up to two decimal places.");
    setBusy(true); setError("");
    try {
      await createSale(cleanName, kobo);
      await onSaved();
      setName(""); setAmount(""); setSuccess("Sale recorded successfully.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this sale. Try again.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} noValidate className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
    <div className="mb-5"><h2 className="font-semibold text-slate-900">Record a sale</h2><p className="mt-1 text-sm text-slate-500">Add a completed transaction to today’s business log.</p></div>
    <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Item name
        <input autoComplete="off" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} placeholder="e.g. Fresh bread" className="h-10 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-50" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Amount <span className="font-normal text-slate-400">NGN</span>
        <span className="flex h-10 items-center rounded-lg border border-slate-300 pl-3 text-slate-400 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20">₦<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} placeholder="0.00" className="h-full w-full rounded-lg border-0 bg-transparent px-2 text-slate-800 outline-none" /></span>
      </label>
      <button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-70">{busy ? "Saving…" : "+ Add sale"}</button>
    </div>
    <div aria-live="polite" className="mt-3 min-h-5 text-sm">{error && <p className="text-rose-700">{error}</p>}{success && <p className="text-emerald-800">{success}</p>}</div>
  </form>;
}
