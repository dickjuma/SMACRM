import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; 
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Quotations from "./pages/Quotations";
import AddQuotation from "./pages/AddQuotation";
import Invoices from "./pages/Invoices";
import AddInvoice from "./pages/AddInvoice";
import Receipts from "./pages/Receipts";
import EmailComposer from "./pages/EmailComposer";
import Login from "./pages/Login";
import UserAdmin from "./pages/UserAdmin";

function AppContent() {
  const location = useLocation();
  
  // Define pages where Navbar/Sidebar should be hidden (like Login)
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {/* 1. Only show navigation if NOT on login page */}
      {!isLoginPage && <Navbar />}
      
      <div className={isLoginPage ? "w-full" : "flex min-h-screen"}>
        {!isLoginPage && <Sidebar />}
        
        <main className={isLoginPage ? "w-full" : "flex-1 p-6 bg-gray-50"}>
          <Routes>
            {/* Core Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            
            {/* Finance Modules */}
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/new" element={<AddQuotation />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<AddInvoice />} />
            <Route path="/receipts" element={<Receipts />} />
            
            {/* Communication & Admin */}
            <Route path="/fincomm" element={<EmailComposer />} />
            <Route path="/useradmin" element={<UserAdmin />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

// 2. Wrap the entire app in the AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}