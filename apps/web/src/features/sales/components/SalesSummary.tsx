import type { ReactNode } from "react";

export default function SalesSummary({
	items,
}: {
	items: Array<{ label: string; value: ReactNode; hint: string }>;
}) {
	return (
		<section
			className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
			aria-label="Sales summary"
		>
			{items.map((item) => (
				<article
					key={item.label}
					className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02]"
				>
					<p className="text-sm font-medium text-slate-500">{item.label}</p>
					<strong className="mt-2 block text-2xl font-semibold tracking-tight text-slate-900">
						{item.value}
					</strong>
					<p className="mt-1 text-xs text-slate-400">{item.hint}</p>
				</article>
			))}
		</section>
	);
}
