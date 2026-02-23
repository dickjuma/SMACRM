import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  FileText,
  Globe,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/http";
import { defaultAppSettings, getDocumentSettings, mergeAppSettings } from "../utils/documentSettings";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  { id: "company", label: "Company", icon: <Building2 size={16} /> },
  { id: "general", label: "General", icon: <SettingsIcon size={16} /> },
  { id: "documents", label: "Documents", icon: <FileText size={16} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  { id: "security", label: "Security", icon: <Shield size={16} /> },
  { id: "integrations", label: "Integrations", icon: <Globe size={16} /> }
];

const docTypes = ["invoice", "quotation", "receipt"];

const Settings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = user?.role || "user";
  const isAdmin = role === "admin" || role === "superadmin";
  const [activeTab, setActiveTab] = useState("appearance");
  const [docType, setDocType] = useState("invoice");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [settings, setSettings] = useState(defaultAppSettings);

  const adminOnlyTabs = new Set(["company", "documents", "notifications", "security", "integrations"]);
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => (adminOnlyTabs.has(tab.id) ? isAdmin : true)),
    [isAdmin]
  );

  const currentDoc = useMemo(() => getDocumentSettings(settings, docType), [settings, docType]);

  const applyTheme = (theme) => {
    const root = window.document.documentElement;
    const isDark = theme === "dark";
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme_dark", JSON.stringify(isDark));
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      const merged = mergeAppSettings(data?.data || {});
      setSettings(merged);
      applyTheme(merged.appearance.theme);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab) && visibleTabs[0]) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  const updateSection = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const updateDoc = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: {
          ...(prev.documents?.[docType] || {}),
          [key]: value
        }
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = isAdmin
        ? settings
        : {
            appearance: settings.appearance,
            general: settings.general
          };

      const { data } = await api.put("/settings", payload);
      const merged = mergeAppSettings(data?.data || {});
      setSettings(merged);
      applyTheme(merged.appearance.theme);
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setResetting(true);
    try {
      const { data } = await api.post("/settings/reset");
      const merged = mergeAppSettings(data?.data || {});
      setSettings(merged);
      applyTheme(merged.appearance.theme);
      toast.success("Settings reset to defaults");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset settings");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-3 py-4 text-slate-900 sm:px-4 sm:py-5 lg:px-6 lg:py-6 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Settings Hub</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-semibold transition-colors sm:text-sm lg:justify-start lg:px-3 lg:py-2 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white dark:bg-slate-700"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={resetSettings}
              disabled={resetting || loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} />
              {resetting ? "Resetting..." : "Reset Defaults"}
            </button>
          )}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <p className="text-sm text-slate-500">Loading settings...</p>
          ) : (
            <>
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Appearance</h2>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      onClick={() => {
                        updateSection("appearance", "theme", "light");
                        applyTheme("light");
                      }}
                      className={`rounded-xl border p-4 text-left ${settings.appearance.theme === "light" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                    >
                      <Sun size={18} className="mb-2 text-amber-500" />
                      <p className="font-semibold text-slate-900">Light Mode</p>
                    </button>
                    <button
                      onClick={() => {
                        updateSection("appearance", "theme", "dark");
                        applyTheme("dark");
                      }}
                      className={`rounded-xl border p-4 text-left ${settings.appearance.theme === "dark" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                    >
                      <Moon size={18} className="mb-2 text-indigo-500" />
                      <p className="font-semibold text-slate-900">Dark Mode</p>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Density</label>
                      <select
                        value={settings.appearance.density}
                        onChange={(e) => updateSection("appearance", "density", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="compact">Compact</option>
                        <option value="cozy">Cozy</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Primary Color</label>
                      <input
                        type="text"
                        value={settings.appearance.primaryColor}
                        onChange={(e) => updateSection("appearance", "primaryColor", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && activeTab === "company" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900">Company Profile</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      ["legalName", "Legal Name"],
                      ["supportEmail", "Support Email"],
                      ["supportPhone", "Support Phone"],
                      ["website", "Website"],
                      ["city", "City"],
                      ["country", "Country"],
                      ["taxPin", "Tax PIN"],
                      ["addressLine1", "Address Line 1"],
                      ["addressLine2", "Address Line 2"]
                    ].map(([key, label]) => (
                      <div key={key} className={key === "addressLine2" ? "md:col-span-2" : ""}>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
                        <input
                          value={settings.company[key] || ""}
                          onChange={(e) => updateSection("company", key, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900">General</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Default Currency</label>
                      <select
                        value={settings.general.defaultCurrency}
                        onChange={(e) => updateSection("general", "defaultCurrency", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option>KES</option>
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>UGX</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Timezone</label>
                      <input
                        value={settings.general.timezone}
                        onChange={(e) => updateSection("general", "timezone", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Date Format</label>
                      <input
                        value={settings.general.dateFormat}
                        onChange={(e) => updateSection("general", "dateFormat", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Language</label>
                      <input
                        value={settings.general.language}
                        onChange={(e) => updateSection("general", "language", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fiscal Year Start (MM-DD)</label>
                      <input
                        value={settings.general.fiscalYearStart}
                        onChange={(e) => updateSection("general", "fiscalYearStart", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && activeTab === "documents" && (
                <div className="space-y-6">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-black text-slate-900">Document Engine</h2>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold uppercase sm:w-auto"
                    >
                      {docTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      ["title", "Document Title"],
                      ["companyName", "Company Name"],
                      ["tagline", "Tagline"],
                      ["logoUrl", "Logo URL"],
                      ["addressLine1", "Address Line 1"],
                      ["addressLine2", "Address Line 2"],
                      ["phone", "Phone"],
                      ["email", "Email"],
                      ["website", "Website"],
                      ["taxIdLabel", "Tax Label"],
                      ["taxIdValue", "Tax Value"],
                      ["prefix", "Number Prefix"],
                      ["suffix", "Number Suffix"],
                      ["nextNumber", "Next Number"],
                      ["paymentTermsDays", "Payment Terms (Days)"]
                    ].map(([key, label]) => (
                      <div key={key} className={["taxIdValue"].includes(key) ? "md:col-span-2" : ""}>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
                        <input
                          value={currentDoc[key] ?? ""}
                          onChange={(e) =>
                            updateDoc(
                              key,
                              ["nextNumber", "paymentTermsDays"].includes(key) ? Number(e.target.value || 0) : e.target.value
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Default Notes</label>
                      <textarea
                        value={currentDoc.defaultNotes || ""}
                        onChange={(e) => updateDoc("defaultNotes", e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Footer Note</label>
                      <textarea
                        value={currentDoc.footerNote || ""}
                        onChange={(e) => updateDoc("footerNote", e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(currentDoc.showLogo)}
                        onChange={(e) => updateDoc("showLogo", e.target.checked)}
                      />
                      Show logo on generated documents
                    </label>
                  </div>
                </div>
              )}

              {isAdmin && activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900">Notification Rules</h2>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      ["emailNotifications", "Enable Email Notifications"],
                      ["invoicePaid", "Invoice Paid Alerts"],
                      ["invoiceOverdue", "Invoice Overdue Alerts"],
                      ["newClientCreated", "New Client Created Alerts"],
                      ["dailyDigest", "Daily Digest"],
                      ["weeklyReport", "Weekly Report"]
                    ].map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(settings.notifications[key])}
                          onChange={(e) => updateSection("notifications", key, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900">Security & Sessions</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Session Timeout (Minutes)</label>
                      <input
                        type="number"
                        value={settings.security.sessionTimeoutMins}
                        onChange={(e) => updateSection("security", "sessionTimeoutMins", Number(e.target.value || 0))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Minimum Password Length</label>
                      <input
                        type="number"
                        value={settings.security.passwordMinLength}
                        onChange={(e) => updateSection("security", "passwordMinLength", Number(e.target.value || 8))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.security.require2FA)}
                        onChange={(e) => updateSection("security", "require2FA", e.target.checked)}
                      />
                      Require 2FA
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.security.allowConcurrentSessions)}
                        onChange={(e) => updateSection("security", "allowConcurrentSessions", e.target.checked)}
                      />
                      Allow Concurrent Sessions
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "integrations" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-slate-900">Integrations</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">SMTP From Name</label>
                      <input
                        value={settings.integrations.smtpFromName}
                        onChange={(e) => updateSection("integrations", "smtpFromName", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">SMTP Reply-To</label>
                      <input
                        value={settings.integrations.smtpReplyTo}
                        onChange={(e) => updateSection("integrations", "smtpReplyTo", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Finance Webhook URL</label>
                      <input
                        value={settings.integrations.financeWebhookUrl}
                        onChange={(e) => updateSection("integrations", "financeWebhookUrl", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex justify-stretch border-t border-slate-200 pt-4 sm:justify-end">
            <button
              onClick={saveSettings}
              disabled={saving || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
