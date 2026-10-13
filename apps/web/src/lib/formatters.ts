export const businessTimezone =
	import.meta.env.VITE_BUSINESS_TIMEZONE || "Africa/Lagos";
export const businessLocationLabel = "Abuja, Nigeria · WAT";
const currency = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});
export const wholeNumber = new Intl.NumberFormat("en-NG");

export function formatNaira(kobo: number): string {
	return `${currency.format(Math.floor(kobo / 100))}.${String(kobo % 100).padStart(2, "0")}`;
}

export function businessToday(): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: businessTimezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const values = Object.fromEntries(
		parts.map(({ type, value }) => [type, value]),
	);
	return `${values.year}-${values.month}-${values.day}`;
}

export function formatBusinessDate(date: string): string {
	return new Intl.DateTimeFormat("en-NG", {
		timeZone: businessTimezone,
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(`${date}T12:00:00+01:00`));
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-NG", {
		timeZone: businessTimezone,
		day: "2-digit",
		month: "short",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date(value));
}

export function parseKobo(input: string): number | null {
	const value = input.trim();
	if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
	const [naira, fraction = ""] = value.split(".");
	const kobo = Number(naira) * 100 + Number(fraction.padEnd(2, "0"));
	return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
}
