import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext"; 
import { useAuth } from "./context/AuthContext";
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
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

function AppContent() {
  const location = useLocation();
  const { user, token } = useAuth();
  const isLoginPage = location.pathname === "/login";
  const isAdmin = ["admin", "superadmin"].includes(String(user?.role || "").toLowerCase());
  const isAuthenticated = Boolean(token && user);
  const moduleRoutes = new Set(["/", "/clients", "/quotations", "/invoices", "/receipts", "/fincomm", "/useradmin"]);
  const isModulePage = moduleRoutes.has(location.pathname);

  const RequireAuth = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
  };

  const RequireAdmin = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Navbar will now correctly see 'user' because it's inside AuthProvider */}
      {!isLoginPage && <Navbar />}
      
      <div className={`flex flex-1 ${isLoginPage ? "w-full" : "relative"}`}>
        
        {/* Sidebar will also correctly see 'user' */}
        {!isLoginPage && <Sidebar />}
        
        {/* MAIN CONTENT: flex-1 and min-w-0 ensures it shrinks when Sidebar opens */}
        <main className={`
          flex-1 min-w-0 flex flex-col
          ${isLoginPage ? "w-full" : "transition-all duration-300 ease-in-out"}
        `}>
          
          <div className={`${isLoginPage ? "" : isModulePage ? "" : "px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5 lg:px-6 lg:py-6 xl:p-8"}`}>
            <div className={isLoginPage ? "" : isModulePage ? "w-full" : "max-w-[1600px] mx-auto w-full"}>
               
              {!isLoginPage && !isModulePage && (
                <div className="mb-4 sm:mb-5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight capitalize">
                    {location.pathname.split('/')[1] || 'Overview'}
                  </h1>
                  <p className="hidden text-xs font-medium text-slate-500 sm:block md:text-sm">
                    Enterprise Resource Management / {location.pathname === "/" ? "Dashboard" : location.pathname.substring(1)}
                  </p>
                </div>
              )}

              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
                <Route path="/quotations" element={<RequireAuth><Quotations /></RequireAuth>} />
                <Route path="/quotations/new" element={<RequireAuth><AddQuotation /></RequireAuth>} />
                <Route path="/invoices" element={<RequireAuth><Invoices /></RequireAuth>} />
                <Route path="/invoices/new" element={<RequireAuth><AddInvoice /></RequireAuth>} />
                <Route path="/receipts" element={<RequireAuth><Receipts /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/fincomm" element={<RequireAdmin><EmailComposer /></RequireAdmin>} />
                <Route path="/useradmin" element={<RequireAdmin><UserAdmin /></RequireAdmin>} />
                <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
