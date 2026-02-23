import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const logo = "/logos.jpg";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: localStorage.getItem("rememberMe") === "true"
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const email = form.email.trim();
    const password = form.password;
    if (!email || !password) return "Email and password are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        rememberMe: form.rememberMe
      };

      const response = await api.post("/auth/login", payload);
      const data = response.data;

      if (!data?.success || !data?.token || !data?.user) {
        throw new Error(data?.message || "Invalid login response from server.");
      }

      if (form.rememberMe) {
        localStorage.setItem("rememberMe", "true");
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("refreshToken");
      }

      if (data.sessionId) localStorage.setItem("sessionId", data.sessionId);

      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name || "User"}!`);
      navigate("/");
    } catch (err) {
      const errorMap = {
        VALIDATION_ERROR: "Please check your input and try again.",
        INVALID_CREDENTIALS: "Invalid email or password.",
        ACCOUNT_DEACTIVATED: "Your account is deactivated. Contact an administrator.",
        USER_NOT_FOUND: "No account found with this email.",
        SERVER_ERROR: "Server error. Please try again later.",
        TOO_MANY_ATTEMPTS: "Too many login attempts. Please try again later."
      };

      const backendError = err?.response?.data;
      const message =
        (backendError?.error && errorMap[backendError.error]) ||
        backendError?.message ||
        err?.message ||
        "Login failed. Please try again.";

      console.error("Login error:", err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #1e293b"
          }
        }}
      />

      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-6 px-3 py-8 sm:gap-8 sm:px-4 sm:py-10 lg:grid-cols-[1.2fr_460px]">
        <section className="hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Trusted Workspace
          </div>
          <h1 className="mt-6 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">SMA Core CRM</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            A unified workspace for sales operations, invoicing, quotations, clients, and team productivity.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">Pipeline</p>
              <p className="mt-1 sm:mt-2 text-base sm:text-lg font-bold text-slate-900">Clients</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">Finance</p>
              <p className="mt-1 sm:mt-2 text-base sm:text-lg font-bold text-slate-900">Invoices</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">Ops</p>
              <p className="mt-1 sm:mt-2 text-base sm:text-lg font-bold text-slate-900">Reports</p>
            </div>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 sm:p-8">
          <div className="absolute right-4 sm:right-6 top-4 sm:top-6">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <img src={logo} alt="SMA logo" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover" />
            </div>
          </div>
          <div className="mb-6 sm:mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sign In</p>
            <h2 className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 sm:mt-2 text-sm text-slate-500">Use your work email and password to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Work Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 sm:py-3 pl-9 sm:pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                <span className="text-xs font-medium text-slate-400">Forgot password</span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 sm:py-3 pl-9 sm:pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => updateField("rememberMe", e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/10"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 sm:py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
