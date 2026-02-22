const RAW_API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:5000/api";

const API_BASE_URL = String(RAW_API_BASE_URL || "").replace(/\/+$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export const getInitials = (name = "") =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

export const resolveAvatarUrl = (avatar = "") => {
  const value = String(avatar || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/uploads/")) return `${API_ORIGIN}${value}`;
  if (value.startsWith("uploads/")) return `${API_ORIGIN}/${value}`;
  return "";
};

