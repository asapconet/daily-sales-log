import { Navigate, Route, Routes } from "react-router";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../features/sales/pages/DashboardPage";
import RecordSalePage from "../features/sales/pages/RecordSalePage";
import SalesLogPage from "../features/sales/pages/SalesLogPage";

export default function App() {
  return <Routes><Route element={<AppLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="sales/new" element={<RecordSalePage />} />
    <Route path="sales" element={<SalesLogPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
