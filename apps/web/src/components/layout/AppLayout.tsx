import { NavLink, Outlet } from "react-router";

const links = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/sales/new", label: "Sales Entry", icon: "+" },
  { to: "/sales", label: "Sales Log", icon: "≡" },
];

export default function AppLayout() {
  return <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
      <NavLink to="/" className="mb-10 flex items-center gap-3 font-semibold text-slate-900">
        <span className="grid size-9 place-items-center rounded-lg bg-emerald-700 text-lg font-bold text-white">R</span>
        <span>Daily Sales Log<small className="block text-xs font-normal text-slate-500">Retail operations</small></span>
      </NavLink>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
      <nav className="space-y-1">{links.map(({ to, label, icon, end }) => <NavLink key={to} to={to} end={end}
        className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100"}`}>
        <span aria-hidden="true" className="w-5 text-center text-base">{icon}</span>{label}
      </NavLink>)}</nav>
      <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Business day<br/><strong className="mt-1 block text-slate-700">Africa/Lagos</strong></div>
    </aside>
    <div className="min-w-0 flex-1 pb-16 md:pb-0">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <NavLink to="/" className="flex items-center gap-2 font-semibold text-slate-900"><span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">R</span>Daily Sales Log</NavLink>
        <span className="text-xs text-slate-500">Africa/Lagos</span>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8"><Outlet /></main>
    </div>
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-slate-200 bg-white px-2 py-1 md:hidden">
      {links.map(({ to, label, icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-md py-2 text-xs ${isActive ? "font-semibold text-emerald-800" : "text-slate-500"}`}>
        <span className="text-lg leading-5">{icon}</span>{label}
      </NavLink>)}
    </nav>
  </div>;
}
