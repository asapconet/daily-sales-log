import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSale, getSales, getSummary, Sale, Summary } from "./api";

const businessTimezone = import.meta.env.VITE_BUSINESS_TIMEZONE || "Africa/Lagos";
const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});
const wholeNumber = new Intl.NumberFormat("en-NG");

function businessToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatNaira(kobo: number): string {
  return `${currency.format(Math.floor(kobo / 100))}.${String(kobo % 100).padStart(2, "0")}`;
}

function parseKobo(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [naira, fraction = ""] = value.split(".");
  const kobo = Number(naira) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: businessTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: businessTimezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+01:00`));
}

export default function App() {
  const [date, setDate] = useState(businessToday);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadSequence = useRef(0);

  const loadDay = useCallback(async (selectedDate: string) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    setSales([]);
    setSummary(null);
    try {
      const [nextSales, nextSummary] = await Promise.all([
        getSales(selectedDate),
        getSummary(selectedDate),
      ]);
      if (sequence === loadSequence.current) {
        setSales(nextSales);
        setSummary(nextSummary);
      }
    } catch (reason) {
      if (sequence === loadSequence.current) {
        setError(reason instanceof Error ? reason.message : "Could not load sales. Try again.");
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDay(date);
  }, [date, loadDay]);

  const rows = useMemo(() => {
    let running = 0;
    const chronological = [...sales]
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((sale) => {
        running += sale.amount_kobo;
        return { ...sale, runningTotal: running };
      });
    return chronological.reverse();
  }, [sales]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const cleanName = itemName.trim();
    const amountKobo = parseKobo(amount);
    if (!cleanName) {
      setError("Enter an item name.");
      return;
    }
    if (cleanName.length > 120) {
      setError("Item name must be 120 characters or fewer.");
      return;
    }
    if (amountKobo === null) {
      setError("Enter an amount greater than ₦0 with up to two decimal places.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await createSale(cleanName, amountKobo);
      setItemName("");
      setAmount("");
      setSuccess("Sale recorded successfully.");
      await loadDay(date);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this sale. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isToday = date === businessToday();

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daily Sales Log home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Daily Sales Log</span>
        </a>
        <span className="timezone-label"><span className="live-dot" /> Lagos business day</span>
      </header>

      <main className="content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">SALES OVERVIEW</p>
            <h1>{isToday ? "Today’s sales" : "Sales history"}</h1>
            <p className="date-label">{formatDateLabel(date)}</p>
          </div>
          <label className="date-control">
            <span>Business date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </section>

        <section className="summary-grid" aria-label="Daily sales summary">
          <article className="summary-card total-card">
            <div className="summary-card-top"><span>Total sales</span><span className="card-icon">₦</span></div>
            <strong>{summary ? formatNaira(summary.total_kobo) : "—"}</strong>
            <span className="card-caption">Revenue for this business day · NGN</span>
          </article>
          <article className="summary-card">
            <div className="summary-card-top"><span>Transactions</span><span className="card-icon count-icon">#</span></div>
            <strong>{summary ? wholeNumber.format(summary.transaction_count) : "—"}</strong>
            <span className="card-caption">Completed sales today</span>
          </article>
        </section>

        <section className="entry-card">
          <div className="section-intro">
            <div className="section-icon add-icon" aria-hidden="true">+</div>
            <div><h2>Record a sale</h2><p>Add a completed transaction to today’s log.</p></div>
          </div>
          {!isToday && <p className="message history-message">Sales can only be recorded for today. Choose today’s date to add a transaction.</p>}
          <form className="sale-form" onSubmit={handleSubmit} noValidate>
            <label className="field item-field">
              <span>Item name</span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Fresh bread"
                maxLength={120}
                autoComplete="off"
                disabled={!isToday || submitting}
                required
              />
            </label>
            <label className="field amount-field">
              <span>Amount <small>(NGN)</small></span>
              <div className="amount-input-wrap"><span>₦</span><input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                disabled={!isToday || submitting}
                required
              /></div>
            </label>
            <button type="submit" disabled={submitting || !isToday}>
              {submitting ? <><span className="spinner" /> Saving…</> : <><span aria-hidden="true">＋</span> Add sale</>}
            </button>
          </form>
          <div className="form-messages" aria-live="polite">
            {error && <p className="message error-message">{error}</p>}
            {success && <p className="message success-message">{success}</p>}
          </div>
        </section>

        <section className="transactions-section">
          <div className="transactions-heading">
            <div><h2>Transactions</h2><p>Running totals follow the order each sale was recorded.</p></div>
            <span className="transaction-count">{summary ? wholeNumber.format(summary.transaction_count) : "—"} entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Time</th><th className="numeric">Amount <small>(NGN)</small></th><th className="numeric">Running total <small>(NGN)</small></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="table-state"><span className="spinner dark-spinner" /> Loading transactions…</td></tr> : error && sales.length === 0 ? <tr><td colSpan={4} className="table-state">{error} <button className="retry-button" onClick={() => void loadDay(date)}>Try again</button></td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="table-state empty-state"><span className="empty-mark">↗</span><strong>No sales yet</strong><span>Record your first sale above to start the day’s log.</span></td></tr> : rows.map((sale) => (
                  <tr key={sale.id}><td className="item-cell">{sale.item_name}</td><td className="time-cell">{formatTime(sale.created_at)}</td><td className="numeric amount-cell">{formatNaira(sale.amount_kobo)}</td><td className="numeric running-cell">{formatNaira(sale.runningTotal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-footnote">All times shown in West Africa Time (WAT).</p>
        </section>
      </main>
      <footer className="footer"><span>Daily Sales Log</span><span>Simple records. Clear numbers.</span></footer>
    </div>
  );
}
