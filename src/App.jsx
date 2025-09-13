import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Header from "./components/common/Header.jsx";
import Footer from "./components/common/Footer.jsx";

const CustomerApp = lazy(() => import("./pages/CustomerApp.jsx"));
const OwnerApp    = lazy(() => import("./pages/OwnerApp.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/shop" replace />} />
            <Route path="/shop"  element={<CustomerApp />} />
            <Route path="/owner" element={<OwnerApp />} />
            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
