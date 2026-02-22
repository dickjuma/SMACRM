import {
  Building2,
  FileSignature,
  FileText,
  LayoutGrid,
  Mail,
  Receipt,
  Settings,
  Users
} from "lucide-react";

export const sidebarNavigation = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", link: "/", icon: LayoutGrid },
      { label: "Clients", link: "/clients", icon: Building2 }
    ]
  },
  {
    title: "Sales",
    items: [
      { label: "Quotations", link: "/quotations", icon: FileSignature },
      { label: "Invoices", link: "/invoices", icon: FileText },
      { label: "Receipts", link: "/receipts", icon: Receipt }
    ]
  },
  {
    title: "System",
    items: [
      { label: "SMA Mailer", link: "/fincomm", icon: Mail, roles: ["admin", "superadmin"] },
      { label: "User Manager", link: "/useradmin", icon: Users, roles: ["admin", "superadmin"] },
      { label: "Settings", link: "/settings", icon: Settings }
    ]
  }
];

const canAccessItem = (item, role) => {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(role);
};

export const getSidebarNavigationForRole = (role) =>
  sidebarNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessItem(item, role))
    }))
    .filter((group) => group.items.length > 0);

export const getRouteSearchIndexForRole = (role) =>
  getSidebarNavigationForRole(role).flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      link: item.link
    }))
  );
