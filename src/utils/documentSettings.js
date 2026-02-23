const defaultDoc = {
  title: "INVOICE",
  companyName: "SMA TECHNOLOGIES",
  tagline: "Enterprise Resource Management",
  addressLine1: "123 Business Street",
  addressLine2: "Nairobi, Kenya",
  phone: "+254 719 832 719",
  email: "finance@smassystems.com",
  website: "www.smacore.co.ke",
  taxIdLabel: "KRA PIN",
  taxIdValue: "",
  footerNote: "Thank you for your business!",
  logoUrl: "",
  prefix: "INV",
  suffix: "",
  nextNumber: 1,
  paymentTermsDays: 30,
  defaultNotes: "",
  showLogo: true,
};

export const defaultAppSettings = {
  appearance: {
    theme: "dark",
    density: "cozy",
    primaryColor: "#0f172a",
  },
  company: {
    legalName: "SMA Technologies Limited",
    supportEmail: "finance@smassystems.com",
    supportPhone: "+254 719 832 719",
    website: "www.smacore.co.ke",
    addressLine1: "123 Business Street",
    addressLine2: "Nairobi, Kenya",
    city: "Nairobi",
    country: "Kenya",
    taxPin: "",
  },
  general: {
    defaultCurrency: "KES",
    timezone: "Africa/Nairobi",
    dateFormat: "DD/MM/YYYY",
    language: "en",
    fiscalYearStart: "01-01",
  },
  notifications: {
    emailNotifications: true,
    invoicePaid: true,
    invoiceOverdue: true,
    newClientCreated: true,
    dailyDigest: false,
    weeklyReport: true,
  },
  security: {
    sessionTimeoutMins: 480,
    passwordMinLength: 8,
    require2FA: false,
    allowConcurrentSessions: true,
  },
  integrations: {
    smtpFromName: "SMA System",
    smtpReplyTo: "finance@smassystems.com",
    financeWebhookUrl: "",
  },
  documents: {
    invoice: { ...defaultDoc, title: "INVOICE" },
    quotation: { ...defaultDoc, title: "QUOTATION", prefix: "QTN" },
    receipt: { ...defaultDoc, title: "RECEIPT", prefix: "RCT" },
  },
};

export const mergeAppSettings = (remote = {}) => ({
  appearance: { ...defaultAppSettings.appearance, ...(remote.appearance || {}) },
  company: { ...defaultAppSettings.company, ...(remote.company || {}) },
  general: { ...defaultAppSettings.general, ...(remote.general || {}) },
  notifications: { ...defaultAppSettings.notifications, ...(remote.notifications || {}) },
  security: { ...defaultAppSettings.security, ...(remote.security || {}) },
  integrations: { ...defaultAppSettings.integrations, ...(remote.integrations || {}) },
  documents: {
    invoice: {
      ...defaultAppSettings.documents.invoice,
      ...(remote.documents?.invoice || {}),
    },
    quotation: {
      ...defaultAppSettings.documents.quotation,
      ...(remote.documents?.quotation || {}),
    },
    receipt: {
      ...defaultAppSettings.documents.receipt,
      ...(remote.documents?.receipt || {}),
    },
  },
});

export const getDocumentSettings = (settings, type) =>
  settings?.documents?.[type] || defaultAppSettings.documents[type] || defaultDoc;
