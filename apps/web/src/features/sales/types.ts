export type Sale = {
	id: string;
	item_name: string;
	amount_kobo: number;
	created_at: string;
};

export type Summary = {
	date: string;
	total_kobo: number;
	transaction_count: number;
};
export type AllTimeSummary = { total_kobo: number; transaction_count: number };
