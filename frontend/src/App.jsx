import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Requirements from "./pages/Requirements";
import RequirementDetail from "./pages/RequirementDetail";
import Traceability from "./pages/Traceability";
import Drift from "./pages/Drift";

export default function App() {
  return (
    <div className="flex min-h-screen bg-ink text-white font-body">
      <Sidebar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/requirements/:id" element={<RequirementDetail />} />
          <Route path="/traceability" element={<Traceability />} />
          <Route path="/drift" element={<Drift />} />
        </Routes>
      </main>
    </div>
  );
}
