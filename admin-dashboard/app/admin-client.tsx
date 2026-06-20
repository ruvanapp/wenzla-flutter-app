'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAdminToken } from '../lib/api';
import HomeCmsPanel from './components/HomeCmsPanel';
import { HomeCmsPage } from './cms/pages/HomeCmsPage';
import { ToastProvider, useToast } from './cms/components/Toast';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://wenzla-backend-production.up.railway.app';

// ── Types ────────────────────────────────────────────────────────────────────

type Overview = {
  merchants: number;
  products: number;
  orders: number;
  sales: number;
  commission: number;
  ordersToday?: number;
  revenueToday?: number;
  revenueMonth?: number;
  activeCustomers?: number;
  averageOrderValue?: number;
};

type OrdersDayPoint = { date: string; orderCount: number; revenue: number };
type StatusCount = { status: string; count: number };
type GovernorateStat = { governorate: string; orderCount: number; totalRevenue: number };

type UserStats = {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomersToday: number;
  newCustomersThisWeek: number;
};

type Merchant = {
  id: string;
  storeName: string;
  description?: string;
  address?: string;
  businessHours?: string;
  logoUrl?: string;
  bannerUrl?: string;
  isVisible?: boolean;
  status: string;
  blockedReason?: string;
  commissionPercentage?: number | null;
  effectiveCommissionPercentage?: number;
  createdAt?: string;
  user: { id?: string; phone: string; name?: string };
};

type Product = {
  id: string;
  name: string;
  description?: string;
  weight?: string;
  price: string;
  oldPrice?: string | null;
  imageUrl?: string | null;
  extraImages?: string[];
  stock: number;
  status: string;
  displayRating?: number | null;
  displayReviewCount?: number | null;
  displaySalesCount?: number | null;
  categoryId?: string | null;
  merchantId: string;
  merchant: { id: string; storeName: string };
  category?: { id: string; name: string } | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  total: string;
  variantName?: string;
  product: { id: string; name: string; imageUrl?: string; weight?: string };
};

type FullOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
  supportNotes?: string;
  status: string;
  total: string;
  subtotal: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  merchant: {
    id: string;
    storeName: string;
    user: { phone: string; name?: string };
  };
  items: OrderItem[];
  customer?: { name?: string; phone?: string };
};

type OrdersResponse = {
  orders: FullOrder[];
  total: number;
  page: number;
  pageSize: number;
};

type OrderStats = {
  totalToday: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalSalesAmount: number;
};

type Commission = {
  merchant: { storeName: string };
  deliveredOrders: number;
  totalSales: number;
  commissionOwed: number;
};

type HomeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  imageUrl?: string;
  color1: string;
  color2: string;
  sortOrder: number;
  enabled: boolean;
};

type HomePromotion = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  targetUrl?: string;
  sortOrder: number;
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
};

type HomeSection = {
  id: string;
  key: string;
  title?: string;
  subtitle?: string;
  enabled: boolean;
  sortOrder: number;
};

type RevenuePoint = { date: string; revenue: number; orders: number };
type TopProduct = { name: string; storeName: string; totalSold: number; totalRevenue: number };
type TopVendor = { storeName: string; totalOrders: number; totalRevenue: number };
type AdminUser = { id: string; name?: string; phone: string; role: string; createdAt: string; isBanned?: boolean; walletBalance?: string | number; _count?: { orders: number } };
type DashboardRoleKey = 'SUPER_ADMIN' | 'ADMIN' | 'ORDER_MANAGER' | 'CONTENT_MANAGER' | 'SUPPORT_AGENT' | 'FINANCE_MANAGER';
type DashboardRole = { key: DashboardRoleKey; name: string; description?: string; permissions: string[] };
type DashboardPermission = { key: string; name: string; description?: string };
type DashboardUser = {
  id: string;
  username?: string | null;
  name?: string | null;
  phone?: string | null;
  role: string;
  dashboardStatus: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  dashboardRoles: { id: string; key: DashboardRoleKey; name: string; description?: string | null }[];
  dashboardRoleKeys: DashboardRoleKey[];
  dashboardPermissions: string[];
  isSuperAdmin: boolean;
  primaryRoleKey?: DashboardRoleKey | null;
  primaryRoleName?: string | null;
};
type SessionAdminUser = {
  id: string;
  username?: string | null;
  name?: string | null;
  phone?: string | null;
  dashboardStatus?: 'ACTIVE' | 'DISABLED' | null;
  dashboardRoles?: { id: string; key: DashboardRoleKey; name: string; description?: string | null }[];
  dashboardRoleKeys?: DashboardRoleKey[];
  dashboardPermissions?: string[];
  isSuperAdmin?: boolean;
  lastLoginAt?: string | null;
};
type Activity = { id: string; action: string; details?: string; adminId?: string; createdAt: string };
type WalletRechargeRequest = {
  id: string;
  amount: string;
  paymentMethod: 'VODAFONE_CASH' | 'INSTAPAY' | 'BANK_TRANSFER';
  screenshotUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name?: string | null; phone?: string | null };
};
type WalletManualCreditReason =
  | 'COMPENSATION'
  | 'GIFT'
  | 'CASHBACK'
  | 'BALANCE_CORRECTION'
  | 'OTHER';
type WalletTransactionRow = {
  id: string;
  amount: number;
  type: string;
  reasonType?: string | null;
  adminNote?: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  metadata?: any;
};
type WalletRechargeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ── Constants ─────────────────────────────────────────────────────────────────

const MERCHANT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'];
const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const PAGE_SIZE = 50;

const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: 'في الانتظار',
  ACCEPTED: 'مقبول',
  PREPARING: 'قيد التحضير',
  OUT_FOR_DELIVERY: 'جاري التوصيل',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: '#c8860a',
  ACCEPTED: '#1a5c8a',
  PREPARING: '#6b46c1',
  OUT_FOR_DELIVERY: '#2563eb',
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626',
};

const PAYMENT_AR: Record<string, string> = {
  CASH_ON_DELIVERY: 'نقداً عند الاستلام',
  ONLINE: 'أونلاين',
};

const WALLET_RECHARGE_METHOD_AR: Record<string, string> = {
  VODAFONE_CASH: 'Vodafone Cash',
  INSTAPAY: 'InstaPay',
  BANK_TRANSFER: 'Bank Transfer',
};

const WALLET_RECHARGE_STATUS_AR: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'مقبول',
  REJECTED: 'مرفوض',
};
const WALLET_RECHARGE_STATUS_STYLE: Record<WalletRechargeStatus, { background: string; color: string; border: string }> = {
  PENDING: { background: '#fef3c7', color: '#d97706', border: '#f59e0b' },
  APPROVED: { background: '#dcfce7', color: '#16a34a', border: '#16a34a' },
  REJECTED: { background: '#fee2e2', color: '#dc2626', border: '#dc2626' },
};

const WALLET_MANUAL_CREDIT_REASON_AR: Record<WalletManualCreditReason, string> = {
  COMPENSATION: 'تعويض',
  GIFT: 'هدية',
  CASHBACK: 'كاش باك',
  BALANCE_CORRECTION: 'تصحيح رصيد',
  OTHER: 'أخرى',
};

// ── Sidebar nav items ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { group: 'الرئيسية', items: [
    { key: 'overview',    icon: '📊', label: 'نظرة عامة', permissions: ['overview.view'] },
  ]},
  { group: 'العمليات', items: [
    { key: 'orders',      icon: '📦', label: 'الطلبات', permissions: ['orders.view'] },
    { key: 'merchants',   icon: '🏪', label: 'التجار', permissions: ['stores.view'] },
    { key: 'products',    icon: '🛒', label: 'المنتجات', permissions: ['products.view'] },
    { key: 'users',       icon: '👥', label: 'المستخدمون', permissions: ['customers.view'] },
  ]},
  { group: 'التسويق', items: [
    { key: 'home_cms',    icon: '🏠', label: 'محتوى الرئيسية', permissions: ['content.manage'] },
    { key: 'notifications', icon: '🔔', label: 'الإشعارات', permissions: ['notifications.manage'] },
  ]},
  { group: 'المالية', items: [
    { key: 'financial',   icon: '💰', label: 'المالية والعمولات', permissions: ['finance.reports.view'] },
    { key: 'shipping',    icon: '🚚', label: 'رسوم الشحن', permissions: ['settings.manage'] },
    { key: 'referrals',   icon: '🤝', label: 'نظام الإحالة', permissions: ['settings.manage'] },
    { key: 'wallet_manual_credit', icon: '💳', label: 'إضافة رصيد يدوي', permissions: ['wallet.manual_adjust.manage'] },
    { key: 'wallet_recharge_requests', icon: '🏦', label: 'طلبات شحن المحفظة', permissions: ['wallet.view'] },
    { key: 'wallet_transactions', icon: '📒', label: 'سجل معاملات المحفظة', permissions: ['wallet.view'] },
    { key: 'whatsapp_support', icon: '💬', label: 'دعم واتساب', permissions: ['settings.manage'] },
    { key: 'app_version', icon: '📲', label: 'إدارة التحديثات', permissions: ['settings.manage'] },
  ]},
  { group: 'الإدارة', items: [
    { key: 'technical',   icon: '⚙️',  label: 'المراقبة التقنية', permissions: ['monitoring.view'] },
    { key: 'activity',    icon: '📋', label: 'سجل النشاط', permissions: ['audit.view'] },
    { key: 'security',    icon: '🔐', label: 'الصلاحيات والأمان', permissions: ['dashboard_users.view'] },
    { key: 'roadmap',     icon: '🗺️',  label: 'خارطة الطريق', permissions: ['overview.view'] },
  ]},
];

const ROLE_LABELS: Record<DashboardRoleKey, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  ORDER_MANAGER: 'Order Manager',
  CONTENT_MANAGER: 'Content Manager',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_MANAGER: 'Finance Manager',
};

const ADMIN_TOKEN_STORAGE_KEY = 'wenzla_admin_token';
const ADMIN_USER_STORAGE_KEY = 'wenzla_admin_user';

const PERMISSION_LABELS: Record<string, string> = {
  'overview.view': 'عرض لوحة التحكم',
  'orders.view': 'عرض الطلبات',
  'orders.update_status': 'تحديث حالة الطلب',
  'orders.export': 'تصدير الطلبات',
  'orders.print': 'طباعة الطلبات',
  'stores.view': 'عرض المتاجر',
  'stores.manage': 'إدارة المتاجر',
  'products.view': 'عرض المنتجات',
  'products.manage': 'إدارة المنتجات',
  'customers.view': 'عرض العملاء',
  'customers.manage': 'إدارة العملاء',
  'support_notes.manage': 'إضافة ملاحظات الدعم',
  'content.manage': 'إدارة البانرات والأقسام والمحتوى',
  'notifications.manage': 'إدارة الإشعارات',
  'finance.reports.view': 'عرض التقارير المالية',
  'wallet.view': 'عرض معاملات المحفظة',
  'wallet.recharge.manage': 'إدارة طلبات شحن المحفظة',
  'wallet.manual_adjust.manage': 'إضافة/خصم رصيد يدوي',
  'refunds.manage': 'إدارة المرتجعات',
  'settings.manage': 'إدارة إعدادات النظام',
  'dashboard_users.view': 'عرض مستخدمي لوحة التحكم',
  'dashboard_users.manage': 'إدارة مستخدمي لوحة التحكم',
  'roles.assign': 'تعيين الأدوار',
  'audit.view': 'عرض سجل التدقيق',
  'monitoring.view': 'عرض المراقبة التقنية',
  'search.view': 'البحث الإداري',
};

function hasPermission(user: SessionAdminUser | null, permission: string) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return Array.isArray(user.dashboardPermissions) && user.dashboardPermissions.includes(permission);
}

function canAccessPanel(user: SessionAdminUser | null, panelKey: string) {
  const item = NAV_ITEMS.flatMap(group => group.items).find(candidate => candidate.key === panelKey);
  if (!item) return false;
  return item.permissions.some(permission => hasPermission(user, permission));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatEGP(val: string | number) {
  return `${Number(val).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

function exportCSV(orders: FullOrder[]) {
  const headers = ['رقم الطلب', 'العميل', 'الهاتف', 'العنوان', 'المتجر', 'التاجر هاتف', 'الإجمالي', 'طريقة الدفع', 'الحالة', 'عدد المنتجات', 'ملاحظات', 'التاريخ'];
  const rows = orders.map(o => [
    o.id,
    `"${o.customerName}"`,
    o.customerPhone,
    `"${o.deliveryAddress.replace(/"/g, '""')}"`,
    `"${o.merchant.storeName}"`,
    o.merchant.user.phone,
    Number(o.total).toFixed(2),
    PAYMENT_AR[o.paymentMethod] ?? o.paymentMethod,
    ORDER_STATUS_AR[o.status] ?? o.status,
    o.items.length,
    `"${(o.notes ?? '').replace(/"/g, '""')}"`,
    formatDate(o.createdAt),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV<T>(filename: string, headers: string[], rows: T[], rowMapper: (r: T) => (string | number | null | undefined)[]) {
  const lines = [
    headers.join(','),
    ...rows.map(r => rowMapper(r).map(csvEscape).join(',')),
  ];
  const csv = lines.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── HomeCmsPage wrapper (needs ToastProvider context) ────────────────────────

function HomeCmsPageWrapper({ token, apiBase, canManageContent }: { token: string; apiBase: string; canManageContent: boolean }) {
  const addToast = useToast();
  return <HomeCmsPage token={token} apiBase={apiBase} onToast={addToast} canManageContent={canManageContent} />;
}

// ── Shared admin polish components (Phase 1) ──────────────────────────────────

function AdminPageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-page-header">
      <div className="left">
        <h2>
          {title}
          {badge && <span className="badge">{badge}</span>}
        </h2>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

function AdminSearchInput({
  value,
  onChange,
  placeholder = 'بحث...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="admin-search">
      <span className="icon">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="clear" onClick={() => onChange('')} title="مسح" aria-label="clear">
          ✕
        </button>
      )}
    </div>
  );
}

function AdminStatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="admin-status-badge"
      style={{
        background: `${color}1f`,
        color,
        borderColor: `${color}55`,
      }}
    >
      {label}
    </span>
  );
}

function AdminCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  const cls =
    'admin-cb' + (indeterminate ? ' indeterminate' : checked ? ' checked' : '');
  return (
    <span
      className={cls}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange();
        }
      }}
      tabIndex={0}
    >
      {indeterminate ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ) : checked ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="5 12 10 17 19 7" />
        </svg>
      ) : null}
    </span>
  );
}

function AdminBulkActionBar({
  count,
  label,
  onClear,
  children,
}: {
  count: number;
  label?: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="admin-bulk-bar">
      <span className="count-pill">{count}</span>
      <span className="label">{label || 'عنصر محدد'}</span>
      <span className="spacer" />
      {children}
      <button className="admin-bulk-clear" onClick={onClear} title="مسح التحديد" aria-label="clear">
        ✕
      </button>
    </div>
  );
}

function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const iconClass = variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'danger';
  const iconChar = variant === 'danger' ? '🗑️' : variant === 'warning' ? '⚠️' : '❓';
  const btnClass = variant === 'danger' ? 'danger' : 'primary';
  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div className="admin-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className={`icon-circle ${iconClass}`}>{iconChar}</div>
        <h3 style={{ textAlign: 'center' }}>{title}</h3>
        <p className="message">{message}</p>
        <div className="actions">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button className={btnClass} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Referral Panel Component ──────────────────────────────────────────────────

type ReferralSettings = { enabled: boolean; referrerReward: number; refereeReward: number; maxPerUser: number };
type ReferralEntry = {
  id: string; referrerId: string; refereeId: string; orderId?: string;
  status: string; referrerReward?: number; refereeReward?: number;
  createdAt: string; completedAt?: string;
  referrer: { id: string; name?: string; phone?: string };
  referee: { id: string; name?: string; phone?: string };
};
type ReferralData = {
  referrals: ReferralEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { total: number; completed: number; pending: number; totalRewardsPaid: number };
};

function ReferralPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [settings, setSettings] = useState<ReferralSettings>({ enabled: false, referrerReward: 50, refereeReward: 25, maxPerUser: 20 });
  const [form, setForm] = useState<ReferralSettings>({ enabled: false, referrerReward: 50, refereeReward: 25, maxPerUser: 20 });
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/settings/referral`, { headers });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        setForm(s);
      }
    } catch {}
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${apiUrl}/admin/referrals?${params}`, { headers });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadSettings(); loadHistory(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiUrl}/admin/settings/referral`, { method: 'PUT', headers, body: JSON.stringify(form) });
      if (res.ok) {
        const s = await res.json();
        setSettings(s);
        setForm(s);
        setMsg({ type: 'success', text: 'تم حفظ إعدادات الإحالة بنجاح' });
      } else {
        setMsg({ type: 'error', text: 'فشل حفظ الإعدادات' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطأ في الاتصال' });
    }
    setSaving(false);
  };

  const STATUS_AR: Record<string, string> = { PENDING: 'قيد الانتظار', COMPLETED: 'مكتمل', CANCELLED: 'ملغي', EXPIRED: 'منتهي' };
  const STATUS_CLASS: Record<string, string> = { PENDING: 'gold', COMPLETED: 'green', CANCELLED: 'red', EXPIRED: 'gray' };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h2 className="pg-title">نظام الإحالة</h2>
          <p className="pg-subtitle">إدارة برنامج إحالة الأصدقاء — المكافآت والحالة والسجل</p>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="analytics-grid" style={{ marginBottom: 24 }}>
          <div className="an-card blue">
            <div className="an-card-icon">🤝</div>
            <div className="an-card-label">إجمالي الإحالات</div>
            <div className="an-card-value">{data.stats.total}</div>
          </div>
          <div className="an-card green">
            <div className="an-card-icon">✅</div>
            <div className="an-card-label">مكتملة</div>
            <div className="an-card-value">{data.stats.completed}</div>
          </div>
          <div className="an-card gold">
            <div className="an-card-icon">⏳</div>
            <div className="an-card-label">قيد الانتظار</div>
            <div className="an-card-value">{data.stats.pending}</div>
          </div>
          <div className="an-card purple">
            <div className="an-card-icon">💰</div>
            <div className="an-card-label">إجمالي المكافآت المدفوعة</div>
            <div className="an-card-value">{data.stats.totalRewardsPaid.toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>
      )}

      {/* Settings Card */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="chart-panel">
          <h3 className="chart-panel-title">⚙️ إعدادات الإحالة</h3>
          <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Cairo', fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                style={{ width: 18, height: 18 }}
              />
              تفعيل نظام الإحالة
            </label>
            <div>
              <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>مكافأة المُحيل (ج.م)</label>
              <input type="number" min={0} max={10000} value={form.referrerReward} onChange={e => setForm(f => ({ ...f, referrerReward: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)' }} />
            </div>
            <div>
              <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>مكافأة المُحال (ج.م)</label>
              <input type="number" min={0} max={10000} value={form.refereeReward} onChange={e => setForm(f => ({ ...f, refereeReward: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)' }} />
            </div>
            <div>
              <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الحد الأقصى للإحالات لكل مستخدم</label>
              <input type="number" min={1} max={1000} value={form.maxPerUser} onChange={e => setForm(f => ({ ...f, maxPerUser: Number(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="action-btn" onClick={saveSettings} disabled={saving}
                style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none', opacity: saving ? 0.6 : 1 }}>
                {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
              </button>
              <button className="action-btn" onClick={() => setForm(settings)}
                style={{ background: 'transparent', color: 'var(--brown)', border: '1px solid var(--brown)' }}>
                إلغاء
              </button>
            </div>
            {msg && (
              <div style={{ padding: '8px 14px', borderRadius: 10, fontFamily: 'Cairo', fontSize: 13, background: msg.type === 'success' ? '#dcfce7' : '#fef2f2', color: msg.type === 'success' ? '#16a34a' : '#dc2626' }}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
        <div className="chart-panel">
          <h3 className="chart-panel-title">ℹ️ كيف يعمل النظام</h3>
          <div style={{ fontFamily: 'Cairo', fontSize: 13, lineHeight: 2, color: 'var(--muted)', marginTop: 12 }}>
            <p>1. كل مستخدم يحصل على كود إحالة فريد</p>
            <p>2. المستخدم الجديد يدخل الكود عند التسجيل</p>
            <p>3. عند اكتمال أول طلب (حالة: تم التسليم):</p>
            <p style={{ paddingRight: 16 }}>• المُحيل يحصل على <strong>{settings.referrerReward} ج.م</strong></p>
            <p style={{ paddingRight: 16 }}>• المُحال يحصل على <strong>{settings.refereeReward} ج.م</strong></p>
            <p>4. المكافأة تُضاف تلقائياً للمحفظة</p>
            <p>5. الإيقاف الفوري: أوقف النظام من هنا وستتوقف جميع المكافآت</p>
          </div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="chart-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(71,39,21,0.08)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--brown)' }}>سجل الإحالات</h3>
          <input
            type="text"
            placeholder="بحث بالهاتف أو الاسم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); loadHistory(); } }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, minWidth: 180, background: 'var(--paper)' }}
          />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)' }}>
            <option value="">الكل</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="CANCELLED">ملغي</option>
            <option value="EXPIRED">منتهي</option>
          </select>
          <button onClick={() => { setPage(1); loadHistory(); }} className="action-btn" style={{ padding: '6px 14px', fontSize: 12 }}>بحث</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Cairo', color: 'var(--muted)' }}>جاري التحميل...</div>
        ) : !data?.referrals.length ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Cairo', color: 'var(--muted)' }}>لا توجد إحالات بعد</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>المُحيل</th>
                    <th>المُحال</th>
                    <th>الحالة</th>
                    <th>مكافأة المُحيل</th>
                    <th>مكافأة المُحال</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'Cairo', fontSize: 13 }}>
                        <div>{r.referrer.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.referrer.phone}</div>
                      </td>
                      <td style={{ fontFamily: 'Cairo', fontSize: 13 }}>
                        <div>{r.referee.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.referee.phone}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${STATUS_CLASS[r.status] ?? 'gray'}`}>
                          {STATUS_AR[r.status] ?? r.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'Cairo', fontSize: 13 }}>{r.referrerReward != null ? `${r.referrerReward} ج.م` : '—'}</td>
                      <td style={{ fontFamily: 'Cairo', fontSize: 13 }}>{r.refereeReward != null ? `${r.refereeReward} ج.م` : '—'}</td>
                      <td style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid rgba(71,39,21,0.08)' }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="action-btn" style={{ padding: '4px 12px', fontSize: 12 }}>السابق</button>
                <span style={{ fontFamily: 'Cairo', fontSize: 13, lineHeight: '32px' }}>{page} / {data.pagination.totalPages}</span>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="action-btn" style={{ padding: '4px 12px', fontSize: 12 }}>التالي</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClient() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('wenzla_admin_sidebar_collapsed') === '1';
  });
  // Phase 3: Toast queue
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error' | 'info' | 'warning'; text: string }>>([]);
  // Phase 3: Orders table sort
  const [ordersSortKey, setOrdersSortKey] = useState<string>('createdAt');
  const [ordersSortDir, setOrdersSortDir] = useState<'asc' | 'desc'>('desc');
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '';
  });
  const [sessionUser, setSessionUser] = useState<SessionAdminUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(ADMIN_USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<Overview>({ merchants: 0, products: 0, orders: 0, sales: 0, commission: 0 });
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantStatusFilter, setMerchantStatusFilter] = useState('ALL');
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [editMerchantForm, setEditMerchantForm] = useState({ storeName: '', description: '', address: '', businessHours: '', commissionPercentage: '' });
  const [merchantLogoUploading, setMerchantLogoUploading] = useState(false);
  const [merchantBannerUploading, setMerchantBannerUploading] = useState(false);
  const [showCreateMerchant, setShowCreateMerchant] = useState(false);
  const [createMerchantForm, setCreateMerchantForm] = useState({ phone: '', storeName: '', description: '', address: '', password: '' });
  const [createMerchantLoading, setCreateMerchantLoading] = useState(false);
  const [merchantActionLoading, setMerchantActionLoading] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productMerchantFilter, setProductMerchantFilter] = useState('ALL');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    merchantId: '', categoryId: '', name: '', description: '', weight: '',
    price: '', oldPrice: '', stock: '0', status: 'ACTIVE',
    imageUrl: '', displayRating: '', displayReviewCount: '', displaySalesCount: '',
  });
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productActionLoadingId, setProductActionLoadingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState('10');
  const [commissionSaved, setCommissionSaved] = useState('10');
  const [commissionStatus, setCommissionStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [supportWhatsappNumber, setSupportWhatsappNumber] = useState('');
  const [supportWhatsappMessage, setSupportWhatsappMessage] = useState('');
  const [supportWhatsappSaved, setSupportWhatsappSaved] = useState({ n: '', m: '' });
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingSaving, setShippingSaving] = useState(false);
  // Phase: Home Promo Card
  const [promoCard, setPromoCard] = useState({ enabled: false, title: 'عروض اليوم', description: 'خصومات خاصة على منتجات مختارة لفترة محدودة', buttonText: 'تسوق الآن', actionType: 'none', actionTarget: '' });
  const [promoCardSaved, setPromoCardSaved] = useState({ enabled: false, title: 'عروض اليوم', description: 'خصومات خاصة على منتجات مختارة لفترة محدودة', buttonText: 'تسوق الآن', actionType: 'none', actionTarget: '' });
  const [promoCardStatus, setPromoCardStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  // Phase: App Version / Update Management
  const [appVersion, setAppVersion] = useState({ enabled: false, latest_app_version: '1.0.0', minimum_app_version: '1.0.0', update_type: 'disabled', title: 'تحديث جديد متاح', message: 'يوجد إصدار أحدث من تطبيق سوق العسل لتحسين الأداء والتجربة.', play_store_url: 'https://play.google.com/store/apps/details?id=com.wenzla.customer' });
  const [appVersionSaved, setAppVersionSaved] = useState({ enabled: false, latest_app_version: '1.0.0', minimum_app_version: '1.0.0', update_type: 'disabled', title: 'تحديث جديد متاح', message: 'يوجد إصدار أحدث من تطبيق سوق العسل لتحسين الأداء والتجربة.', play_store_url: 'https://play.google.com/store/apps/details?id=com.wenzla.customer' });
  const [appVersionStatus, setAppVersionStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [shippingNewName, setShippingNewName] = useState('');
  const [shippingNewFee, setShippingNewFee] = useState('');
  const [shippingSearch, setShippingSearch] = useState('');
  // Shipping zones: per-row edit + bulk selection
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneDraft, setEditingZoneDraft] = useState<{ fee: string; enabled: boolean; sortOrder: number; name: string } | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const [shippingConfirm, setShippingConfirm] = useState<null | {
    type: 'delete' | 'bulkDelete' | 'bulkEnable' | 'bulkDisable';
    ids: string[];
  }>(null);
  const [minimumOrder, setMinimumOrder] = useState('0');
  const [minimumOrderSaved, setMinimumOrderSaved] = useState('0');
  const [minimumOrderStatus, setMinimumOrderStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [minimumOrderSaving, setMinimumOrderSaving] = useState(false);
  // Orders: bulk selection + bulk status update
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkOrderStatus, setBulkOrderStatus] = useState<string>('');
  const [bulkOrderConfirm, setBulkOrderConfirm] = useState<null | { status: string }>(null);
  const [bulkOrderUpdating, setBulkOrderUpdating] = useState(false);
  // Products: bulk + view toggle
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productConfirm, setProductConfirm] = useState<null | { type: 'delete' | 'bulkDelete' | 'bulkEnable' | 'bulkDisable'; ids: string[] }>(null);
  const [productView, setProductView] = useState<'table' | 'grid'>('table');
  // Merchants: bulk + view toggle
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<Set<string>>(new Set());
  const [merchantConfirm, setMerchantConfirm] = useState<null | { type: 'bulkApprove' | 'bulkReject' | 'bulkActivate' | 'bulkDeactivate'; ids: string[] }>(null);
  const [merchantView, setMerchantView] = useState<'table' | 'grid'>('table');
  const [walletRechargeRequests, setWalletRechargeRequests] = useState<WalletRechargeRequest[]>([]);
  const [walletRechargeActionLoadingId, setWalletRechargeActionLoadingId] = useState<string | null>(null);
  const [selectedRechargeRequest, setSelectedRechargeRequest] = useState<WalletRechargeRequest | null>(null);
  const [manualCreditSubmitting, setManualCreditSubmitting] = useState(false);
  const [manualDebitSubmitting, setManualDebitSubmitting] = useState(false);
  const [manualCreditSearch, setManualCreditSearch] = useState('');
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionRow[]>([]);
  const [walletTransactionSearch, setWalletTransactionSearch] = useState('');
  const [walletTransactionTypeFilter, setWalletTransactionTypeFilter] = useState('ALL');
  const [walletTransactionDateFrom, setWalletTransactionDateFrom] = useState('');
  const [walletTransactionDateTo, setWalletTransactionDateTo] = useState('');
  const [walletTransactionPage, setWalletTransactionPage] = useState(1);
  const [manualCreditForm, setManualCreditForm] = useState({
    userId: '',
    amount: '',
    reasonType: 'COMPENSATION' as WalletManualCreditReason,
    adminNote: '',
  });
  const [activePanel, setActivePanel] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const raw = new URLSearchParams(window.location.search).get('panel');
    return raw || 'overview';
  });
  const [message, setMessage] = useState('');
  const pageSize = 10;
  const filteredWalletTransactions = walletTransactions.filter((tx) => {
    const matchesType = walletTransactionTypeFilter === 'ALL' || tx.type === walletTransactionTypeFilter;
    const hay = `${tx.type} ${tx.adminNote ?? ''} ${tx.reasonType ?? ''}`.toLowerCase();
    const matchesSearch = !walletTransactionSearch || hay.includes(walletTransactionSearch.toLowerCase());
    const createdAtDate = tx.createdAt ? new Date(tx.createdAt) : null;
    const fromOk = !walletTransactionDateFrom || (createdAtDate && createdAtDate >= new Date(`${walletTransactionDateFrom}T00:00:00`));
    const toOk = !walletTransactionDateTo || (createdAtDate && createdAtDate <= new Date(`${walletTransactionDateTo}T23:59:59`));
    return matchesType && matchesSearch && fromOk && toOk;
  });
  const walletTransactionPageCount = Math.max(1, Math.ceil(filteredWalletTransactions.length / pageSize));
  const pagedWalletTransactions = filteredWalletTransactions.slice((walletTransactionPage - 1) * pageSize, walletTransactionPage * pageSize);

  // ── Home CMS state ────────────────────────────────────────────────────────────
  const [cmsTab, setCmsTab] = useState<'banners' | 'promotions' | 'sections'>('banners');
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [homePromotions, setHomePromotions] = useState<HomePromotion[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsMessage, setCmsMessage] = useState('');
  const [bannerForm, setBannerForm] = useState({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true, imageUrl: '', sortOrder: 0 });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [draggingBanner, setDraggingBanner] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({ id: '', title: '', subtitle: '', targetUrl: '', enabled: true, startsAt: '', endsAt: '' });
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // ── Orders state ──────────────────────────────────────────────────────────────
  const [fullOrders, setFullOrders] = useState<FullOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderDay, setOrderDay] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [orderMerchantId, setOrderMerchantId] = useState('');
  const [orderStats, setOrderStats] = useState<OrderStats>({ totalToday: 0, pending: 0, completed: 0, cancelled: 0, totalSalesAmount: 0 });
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusUpdating, setOrderStatusUpdating] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // ── Analytics state ───────────────────────────────────────────────────────────
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [orders30d, setOrders30d] = useState<OrdersDayPoint[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [topGovernorates, setTopGovernorates] = useState<GovernorateStat[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  // Activity center
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  // Global search
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{ orders: any[]; products: any[]; merchants: any[]; customers: any[] }>({ orders: [], products: [], merchants: [], customers: [] });
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);

  // ── Users state ───────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [userStatsError, setUserStatsError] = useState('');

  // ── Notifications state ───────────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState<'customers' | 'merchants'>('customers');
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifHistory, setNotifHistory] = useState<{ id: string; title: string; message?: string; body?: string; createdAt?: string; sentAt?: string; audience?: string; targetType?: string }[]>([]);

  // ── Security state ────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<DashboardUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dashboardRoles, setDashboardRoles] = useState<DashboardRole[]>([]);
  const [dashboardPermissions, setDashboardPermissions] = useState<DashboardPermission[]>([]);
  const [empForm, setEmpForm] = useState({ name: '', phone: '', username: '', password: '', roleKey: 'ADMIN' as DashboardRoleKey });
  const [secLoading, setSecLoading] = useState(false);
  const [secMessage, setSecMessage] = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderCount = useRef(0);

  const authorized = useMemo(() => token.length > 0, [token]);
  const visibleNavGroups = useMemo(() => (
    NAV_ITEMS
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.permissions.some(permission => hasPermission(sessionUser, permission))),
      }))
      .filter(group => group.items.length > 0)
  ), [sessionUser]);
  const activePanelAllowed = useMemo(() => (
    visibleNavGroups.some(group => group.items.some(item => item.key === activePanel))
  ), [visibleNavGroups, activePanel]);
  const canViewOrders = hasPermission(sessionUser, 'orders.view');
  const canViewStores = hasPermission(sessionUser, 'stores.view');
  const canViewProducts = hasPermission(sessionUser, 'products.view');
  const canViewCustomers = hasPermission(sessionUser, 'customers.view');
  const canViewContent = hasPermission(sessionUser, 'content.manage');
  const canViewNotifications = hasPermission(sessionUser, 'notifications.manage');
  const canViewFinance = hasPermission(sessionUser, 'finance.reports.view');
  const canManageSettings = hasPermission(sessionUser, 'settings.manage');
  const canViewAudit = hasPermission(sessionUser, 'audit.view');
  const totalPages = Math.max(1, Math.ceil(orderTotal / PAGE_SIZE));

  // ── Dark mode ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [darkMode]);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    if (hasPermission(sessionUser, 'settings.manage')) {
      loadSupportWhatsapp();
      loadShippingZones();
      loadMinimumOrder();
      loadPromoCard();
      loadAppVersionSettings();
    }
  }, [authorized, sessionUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd/Ctrl+K to open Global Search
  useEffect(() => {
    if (!authorized) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === 'Escape' && globalSearchOpen) setGlobalSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authorized, globalSearchOpen]);

  // Global search debounce
  useEffect(() => {
    if (!globalSearchOpen) return;
    if (!globalSearchQuery.trim() || globalSearchQuery.trim().length < 2) {
      setGlobalSearchResults({ orders: [], products: [], merchants: [], customers: [] });
      return;
    }
    setGlobalSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api<typeof globalSearchResults>(`/admin/search?q=${encodeURIComponent(globalSearchQuery.trim())}`);
        setGlobalSearchResults(res ?? { orders: [], products: [], merchants: [], customers: [] });
      } catch { /* silent */ }
      finally { setGlobalSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [globalSearchQuery, globalSearchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss success messages after 4.5 s
  useEffect(() => {
    if (!message) return;
    if (!/تم |✓|بنجاح/.test(message)) return;
    const t = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (authorized) refreshAll();
  }, [authorized, sessionUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authorized) return;
    if (activePanelAllowed) return;
    const fallback = visibleNavGroups.flatMap(group => group.items)[0]?.key ?? 'overview';
    setActivePanel(fallback);
  }, [authorized, activePanelAllowed, visibleNavGroups, activePanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('panel', activePanel);
    window.history.replaceState({}, '', url.toString());
  }, [activePanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      setAdminToken(token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      setAdminToken('');
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionUser) {
      localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(sessionUser));
    } else {
      localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    }
  }, [sessionUser]);

  // ── Panel data loading ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    if (activePanel === 'orders') {
      fetchOrders();
      fetchOrderStats();
      pollingRef.current = setInterval(() => { fetchOrderStats(); fetchOrders(true); }, 30_000);
    } else {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    }
    if (activePanel === 'home_cms' && hasPermission(sessionUser, 'content.manage')) loadCmsData();
    if (activePanel === 'overview' && hasPermission(sessionUser, 'overview.view')) loadAnalytics();
    if (activePanel === 'users' && hasPermission(sessionUser, 'customers.view')) { loadUsers(); loadUserStats(); }
    if (activePanel === 'notifications' && hasPermission(sessionUser, 'notifications.manage')) loadNotifHistory();
    if (activePanel === 'security' && hasPermission(sessionUser, 'dashboard_users.view')) loadSecurity();
    if (activePanel === 'wallet_recharge_requests' && hasPermission(sessionUser, 'wallet.view')) loadWalletRechargeRequests();
    if (activePanel === 'wallet_manual_credit' && hasPermission(sessionUser, 'wallet.manual_adjust.manage')) loadUsers();
    if (activePanel === 'wallet_transactions' && hasPermission(sessionUser, 'wallet.view')) loadUsers();
    if (activePanel === 'activity' && hasPermission(sessionUser, 'audit.view')) loadActivityLog(1);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [authorized, activePanel, sessionUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authorized && activePanel === 'orders') fetchOrders();
  }, [orderPage, orderStatus, orderDay, orderDateFrom, orderDateTo, orderMerchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authorized || activePanel !== 'orders') return;
    const t = setTimeout(() => { setOrderPage(1); fetchOrders(); }, 380);
    return () => clearTimeout(t);
  }, [orderSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API helper ────────────────────────────────────────────────────────────────
  async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    if (res.status === 204) return null as T;
    return res.json();
  }

  async function logoutAdmin() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
    } finally {
      setToken('');
      setAdminToken('');
      setSessionUser(null);
      setIdentifier('');
      setPassword('');
      setMessage('تم تسجيل الخروج');
    }
  }

  async function login() {
    try {
      const res = await fetch(`${apiUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) { setMessage('فشل تسجيل الدخول'); return; }
      const data = await res.json();
      setToken(data.token);
      setAdminToken(data.token);
      setSessionUser(data.user ?? null);
      setMessage('تم تسجيل الدخول بنجاح');
    } catch { setMessage('خطأ في الاتصال بالخادم'); }
  }

  async function refreshAll() {
    try {
      const tasks: Promise<void>[] = [];
      if (hasPermission(sessionUser, 'overview.view')) {
        tasks.push(
          api<Overview>('/admin/overview').then((ov) => setOverview(ov))
        );
      }
      if (hasPermission(sessionUser, 'stores.view')) {
        tasks.push(
          api<Merchant[]>('/admin/merchants').then((mer) => setMerchants(mer))
        );
      }
      if (hasPermission(sessionUser, 'products.view')) {
        tasks.push(
          api<Product[]>('/admin/products').then((prod) => setProducts(prod))
        );
      }
      if (hasPermission(sessionUser, 'finance.reports.view')) {
        tasks.push(
          api<Commission[]>('/admin/commissions').then((com) => setCommissions(com))
        );
      }
      if (hasPermission(sessionUser, 'settings.manage')) {
        tasks.push(
          api<{ percentage: number }>('/admin/settings/commission').then((set) => {
            setCommissionPercentage(String(set.percentage));
            setCommissionSaved(String(set.percentage));
          })
        );
      }
      if (hasPermission(sessionUser, 'content.manage') || hasPermission(sessionUser, 'orders.view')) {
        tasks.push(
          api<{ id: string; name: string }[]>('/admin/categories').then((cats) => setCategories(cats ?? []))
        );
      }
      await Promise.all(tasks);
    } catch { setMessage('خطأ في تحميل البيانات — تحقق من الاتصال'); }
    finally { setOverviewLoading(false); }
  }

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(orderPage), pageSize: String(PAGE_SIZE) });
      if (orderSearch) params.set('search', orderSearch);
      if (orderStatus) params.set('status', orderStatus);
      if (orderDay) params.set('day', orderDay);
      if (orderDateFrom) params.set('dateFrom', orderDateFrom);
      if (orderDateTo) params.set('dateTo', orderDateTo);
      if (orderMerchantId) params.set('merchantId', orderMerchantId);
      const data = await api<OrdersResponse>(`/admin/orders?${params}`);
      const fetched = data.orders ?? [];
      if (silent && prevOrderCount.current > 0 && fetched.length > 0) {
        const existingIds = new Set(fullOrders.map(o => o.id));
        const fresh = fetched.filter(o => !existingIds.has(o.id)).map(o => o.id);
        if (fresh.length > 0) {
          setNewOrderIds(prev => new Set([...prev, ...fresh]));
          setTimeout(() => setNewOrderIds(new Set()), 6000);
        }
      }
      setFullOrders(fetched);
      setOrderTotal(data.total ?? 0);
      prevOrderCount.current = data.total ?? 0;
    } catch { if (!silent) setMessage('فشل تحميل الطلبات'); }
    finally { if (!silent) setOrdersLoading(false); }
  }, [orderPage, orderSearch, orderStatus, orderDay, orderDateFrom, orderDateTo, orderMerchantId, fullOrders, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOrderStats() {
    try { setOrderStats(await api<OrderStats>('/admin/orders/stats')); } catch { /* silent */ }
  }

  async function updateMerchant(id: string, status: string) {
    await api(`/admin/merchants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refreshAll();
  }

  const pushToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, text }]);
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const toast = {
    success: (msg: string) => { setMessage(msg); pushToast('success', msg); },
    error:   (msg: string) => { setMessage(msg); pushToast('error', msg); },
    info:    (msg: string) => { setMessage(msg); pushToast('info', msg); },
    warning: (msg: string) => { setMessage(msg); pushToast('warning', msg); },
  };

  // Persist sidebar collapse
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wenzla_admin_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  async function editMerchantInfo(id: string) {
    try {
      setMerchantActionLoading(id);
      await api(`/admin/merchants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          storeName: editMerchantForm.storeName || undefined,
          description: editMerchantForm.description || undefined,
          address: editMerchantForm.address || undefined,
          businessHours: editMerchantForm.businessHours || undefined,
        }),
      });
      if (editMerchantForm.commissionPercentage !== '') {
        const pct = editMerchantForm.commissionPercentage === 'default' ? null : Number(editMerchantForm.commissionPercentage);
        await api(`/admin/merchants/${id}/commission`, { method: 'PATCH', body: JSON.stringify({ percentage: pct }) });
      }
      toast.success('تم حفظ بيانات التاجر');
      setEditingMerchant(null);
      await refreshAll();
    } catch (e) { toast.error('فشل الحفظ: ' + String(e)); }
    finally { setMerchantActionLoading(null); }
  }

  async function toggleMerchantVisibility(merchant: Merchant) {
    try {
      setMerchantActionLoading(merchant.id);
      await api(`/admin/merchants/${merchant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isVisible: !merchant.isVisible }),
      });
      toast.success(merchant.isVisible ? 'تم إخفاء المتجر' : 'تم إظهار المتجر');
      await refreshAll();
    } catch (e) { toast.error('فشل التحديث'); }
    finally { setMerchantActionLoading(null); }
  }

  async function updateMerchantStatus(id: string, status: string, blockedReason?: string) {
    try {
      setMerchantActionLoading(id);
      await api(`/admin/merchants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, blockedReason }),
      });
      toast.success('تم تحديث حالة التاجر');
      await refreshAll();
    } catch (e) { toast.error('فشل التحديث'); }
    finally { setMerchantActionLoading(null); }
  }

  async function uploadMerchantLogo(merchantId: string, file: File) {
    setMerchantLogoUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${apiUrl}/uploads/store-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      await api(`/admin/merchants/${merchantId}`, { method: 'PATCH', body: JSON.stringify({ logoUrl: data.imageUrl }) });
      toast.success('تم رفع الشعار');
      await refreshAll();
      setEditingMerchant(prev => prev ? { ...prev, logoUrl: data.imageUrl } : null);
    } catch (e) { toast.error('فشل رفع الشعار: ' + String(e)); }
    finally { setMerchantLogoUploading(false); }
  }

  async function uploadMerchantBanner(merchantId: string, file: File) {
    setMerchantBannerUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${apiUrl}/uploads/store-banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      await api(`/admin/merchants/${merchantId}`, { method: 'PATCH', body: JSON.stringify({ bannerUrl: data.imageUrl }) });
      toast.success('تم رفع البانر');
      await refreshAll();
      setEditingMerchant(prev => prev ? { ...prev, bannerUrl: data.imageUrl } : null);
    } catch (e) { toast.error('فشل رفع البانر: ' + String(e)); }
    finally { setMerchantBannerUploading(false); }
  }

  async function createMerchant() {
    if (!createMerchantForm.phone || !createMerchantForm.storeName) {
      toast.error('رقم الهاتف واسم المتجر مطلوبان');
      return;
    }
    setCreateMerchantLoading(true);
    try {
      await api('/admin/merchants', {
        method: 'POST',
        body: JSON.stringify({
          phone: createMerchantForm.phone,
          storeName: createMerchantForm.storeName,
          description: createMerchantForm.description || undefined,
          address: createMerchantForm.address || undefined,
          password: createMerchantForm.password || undefined,
        }),
      });
      toast.success('تم إنشاء التاجر بنجاح');
      setShowCreateMerchant(false);
      setCreateMerchantForm({ phone: '', storeName: '', description: '', address: '', password: '' });
      await refreshAll();
    } catch (e) { toast.error('فشل الإنشاء: ' + String(e)); }
    finally { setCreateMerchantLoading(false); }
  }

  async function updateProduct(id: string, status: string) {
    const label = status === 'ACTIVE' ? 'تفعيل' : 'إيقاف';
    if (!window.confirm(`تأكيد ${label} هذا المنتج؟`)) return;
    setProductActionLoadingId(id);
    try {
      await api(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refreshAll();
    } catch (e) { toast.error('فشل تغيير الحالة: ' + String(e)); }
    finally { setProductActionLoadingId(null); }
  }

  function openCreateProduct() {
    setProductForm({
      merchantId: merchants[0]?.id ?? '', categoryId: '', name: '', description: '',
      weight: '', price: '', oldPrice: '', stock: '0', status: 'ACTIVE',
      imageUrl: '', displayRating: '', displayReviewCount: '', displaySalesCount: '',
    });
    setEditingProduct(null);
    setShowCreateProduct(true);
  }

  function openEditProduct(p: Product) {
    setProductForm({
      merchantId: p.merchantId, categoryId: p.categoryId ?? '',
      name: p.name, description: p.description ?? '', weight: p.weight ?? '',
      price: p.price, oldPrice: p.oldPrice ?? '', stock: String(p.stock),
      status: p.status, imageUrl: p.imageUrl ?? '',
      displayRating: p.displayRating != null ? String(p.displayRating) : '',
      displayReviewCount: p.displayReviewCount != null ? String(p.displayReviewCount) : '',
      displaySalesCount: p.displaySalesCount != null ? String(p.displaySalesCount) : '',
    });
    setEditingProduct(p);
    setShowCreateProduct(true);
  }

  async function uploadProductImage(file: File) {
    setProductImageUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${apiUrl}/uploads/product-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل رفع الصورة');
      setProductForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
      toast.success('تم رفع صورة المنتج');
    } catch (e) { toast.error('فشل رفع الصورة: ' + String(e)); }
    finally { setProductImageUploading(false); }
  }

  async function saveProduct() {
    if (!productForm.name.trim()) { toast.error('اسم المنتج مطلوب'); return; }
    if (!productForm.merchantId) { toast.error('يجب اختيار المتجر'); return; }
    if (!productForm.price || Number(productForm.price) <= 0) { toast.error('السعر مطلوب'); return; }
    setProductSaving(true);
    try {
      const body: Record<string, unknown> = {
        merchantId: productForm.merchantId,
        categoryId: productForm.categoryId || null,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        weight: productForm.weight.trim() || null,
        price: Number(productForm.price),
        oldPrice: productForm.oldPrice ? Number(productForm.oldPrice) : null,
        imageUrl: productForm.imageUrl || null,
        stock: Number(productForm.stock),
        status: productForm.status,
        displayRating: productForm.displayRating ? Number(productForm.displayRating) : null,
        displayReviewCount: productForm.displayReviewCount ? Number(productForm.displayReviewCount) : null,
        displaySalesCount: productForm.displaySalesCount ? Number(productForm.displaySalesCount) : null,
      };
      if (editingProduct) {
        await api(`/admin/products/${editingProduct.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('تم تحديث المنتج');
      } else {
        await api('/admin/products', { method: 'POST', body: JSON.stringify(body) });
        toast.success('تم إنشاء المنتج');
      }
      setShowCreateProduct(false);
      setEditingProduct(null);
      await refreshAll();
    } catch (e) { toast.error('فشل الحفظ: ' + String(e)); }
    finally { setProductSaving(false); }
  }

  async function deleteProduct(id: string) {
    if (!confirm('هل تريد حذف هذا المنتج نهائياً؟')) return;
    setProductActionLoadingId(id);
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' });
      toast.success('تم حذف المنتج');
      await refreshAll();
    } catch (e) { toast.error('فشل الحذف: ' + String(e)); }
    finally { setProductActionLoadingId(null); }
  }

  async function bulkSetProductStatus(ids: string[], status: 'ACTIVE' | 'BLOCKED') {
    try {
      await Promise.all(ids.map(id => api(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })));
      setProducts(prev => prev.map(p => (ids.includes(p.id) ? { ...p, status } : p)));
      setSelectedProductIds(new Set());
      toast.success(`تم ${status === 'ACTIVE' ? 'تفعيل' : 'تعطيل'} ${ids.length} منتج`);
    } catch {
      toast.error('فشل تحديث المنتجات');
    }
  }

  async function bulkDeleteProducts(ids: string[]) {
    try {
      await Promise.all(ids.map(id => api(`/admin/products/${id}`, { method: 'DELETE' })));
      setProducts(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedProductIds(new Set());
      toast.success(`تم حذف ${ids.length} منتج`);
    } catch {
      toast.error('فشل حذف بعض المنتجات');
    }
  }

  async function bulkSetMerchantStatus(ids: string[], status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED') {
    try {
      await Promise.all(ids.map(id => api(`/admin/merchants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })));
      setMerchants(prev => prev.map(m => (ids.includes(m.id) ? { ...m, status } : m)));
      setSelectedMerchantIds(new Set());
      const labelMap: Record<string, string> = { APPROVED: 'موافقة', REJECTED: 'رفض', BLOCKED: 'تعطيل', PENDING: 'تحويل لانتظار' };
      toast.success(`تم ${labelMap[status]} ${ids.length} متجر`);
    } catch {
      toast.error('فشل تحديث المتاجر');
    }
  }


  async function updateOrderStatus(id: string, status: string) {
    setOrderStatusUpdating(true);
    try {
      await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setFullOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
      fetchOrderStats();
    } catch (err) { setMessage(String(err)); }
    finally { setOrderStatusUpdating(false); }
  }

  async function saveSupportNotes(orderId: string, currentNotes: string | undefined) {
    const supportNotes = window.prompt('أدخل ملاحظة الدعم', currentNotes ?? '')?.trim();
    if (!supportNotes) return;
    try {
      await api(`/admin/orders/${orderId}/support-notes`, {
        method: 'PATCH',
        body: JSON.stringify({ supportNotes }),
      });
      setSelectedOrder(prev => prev ? { ...prev, supportNotes } : prev);
      setFullOrders(prev => prev.map(order => order.id === orderId ? { ...order, supportNotes } : order));
      toast.success('تم حفظ ملاحظة الدعم');
    } catch (e) {
      toast.error('فشل حفظ ملاحظة الدعم: ' + String(e));
    }
  }

  async function refundOrder(orderId: string) {
    if (!window.confirm('تأكيد تسجيل المرتجع لهذا الطلب؟')) return;
    try {
      await api(`/admin/orders/${orderId}/refund`, { method: 'PATCH' });
      setSelectedOrder(prev => prev ? { ...prev, paymentStatus: 'REFUNDED' } : prev);
      setFullOrders(prev => prev.map(order => order.id === orderId ? { ...order, paymentStatus: 'REFUNDED' } : order));
      toast.success('تم تسجيل المرتجع');
    } catch (e) {
      toast.error('فشل تسجيل المرتجع: ' + String(e));
    }
  }

  async function saveCommission() {
    setCommissionStatus('saving');
    try {
      await api('/admin/settings/commission', { method: 'PUT', body: JSON.stringify({ percentage: Number(commissionPercentage) }) });
      setCommissionSaved(commissionPercentage);
      setCommissionStatus('success');
      window.setTimeout(() => setCommissionStatus('idle'), 2500);
      await refreshAll();
    } catch {
      setCommissionStatus('error');
      window.setTimeout(() => setCommissionStatus('idle'), 4000);
    }
  }

  async function loadSupportWhatsapp() {
    try {
      const res = await api<{ number?: string; message?: string }>('/admin/settings/support-whatsapp');
      const n = String(res?.number ?? '');
      const m = String(res?.message ?? '');
      setSupportWhatsappNumber(n);
      setSupportWhatsappMessage(m);
      setSupportWhatsappSaved({ n, m });
    } catch {}
  }

  async function saveSupportWhatsapp() {
    setWhatsappSaving(true);
    setWhatsappStatus('saving');
    try {
      await api('/admin/settings/support-whatsapp', {
        method: 'PUT',
        body: JSON.stringify({
          number: supportWhatsappNumber,
          message: supportWhatsappMessage,
        }),
      });
      setSupportWhatsappSaved({ n: supportWhatsappNumber, m: supportWhatsappMessage });
      setWhatsappStatus('success');
      window.setTimeout(() => setWhatsappStatus('idle'), 2500);
      setMessage('تم حفظ إعدادات واتساب الدعم بنجاح ✓');
    } catch {
      setWhatsappStatus('error');
      window.setTimeout(() => setWhatsappStatus('idle'), 4000);
      setMessage('فشل حفظ الإعدادات — تحقق من الاتصال بالخادم');
    } finally {
      setWhatsappSaving(false);
    }
  }

  // ── Shipping Zones ────────────────────────────────────────────────────────
  async function loadShippingZones() {
    setShippingLoading(true);
    try {
      const res = await api<any[]>('/admin/shipping-zones');
      setShippingZones(Array.isArray(res) ? res : []);
    } catch {
      setMessage('فشل تحميل مناطق الشحن');
    } finally {
      setShippingLoading(false);
    }
  }

  async function saveShippingZones() {
    setShippingSaving(true);
    try {
      const payload = shippingZones.map((z) => ({
        id: z.id,
        fee: Number(z.fee),
        enabled: z.enabled,
        sortOrder: z.sortOrder,
      }));
      await api('/admin/shipping-zones-bulk', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMessage('تم حفظ رسوم الشحن بنجاح ✓');
    } catch {
      setMessage('فشل حفظ رسوم الشحن');
    } finally {
      setShippingSaving(false);
    }
  }

  async function addShippingZone() {
    if (!shippingNewName.trim()) return;
    try {
      const res = await api<any>('/admin/shipping-zones', {
        method: 'POST',
        body: JSON.stringify({
          name: shippingNewName.trim(),
          fee: Number(shippingNewFee) || 0,
          enabled: true,
          sortOrder: shippingZones.length + 1,
        }),
      });
      setShippingZones([...shippingZones, res]);
      setShippingNewName('');
      setShippingNewFee('');
      setMessage('تم إضافة المحافظة بنجاح ✓');
    } catch (e: any) {
      setMessage(e?.message || 'فشل إضافة المحافظة');
    }
  }

  async function deleteShippingZone(id: string) {
    try {
      await api(`/admin/shipping-zones/${id}`, { method: 'DELETE' });
      setShippingZones(shippingZones.filter((z) => z.id !== id));
      setSelectedZoneIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setMessage('تم حذف المحافظة بنجاح');
    } catch {
      setMessage('فشل حذف المحافظة');
    }
  }

  function startEditZone(zone: any) {
    setEditingZoneId(zone.id);
    setEditingZoneDraft({
      name: String(zone.name ?? ''),
      fee: String(zone.fee ?? '0'),
      enabled: Boolean(zone.enabled),
      sortOrder: Number(zone.sortOrder ?? 0),
    });
  }

  function cancelEditZone() {
    setEditingZoneId(null);
    setEditingZoneDraft(null);
  }

  async function saveEditZone(id: string) {
    if (!editingZoneDraft) return;
    try {
      const updated = await api<any>(`/admin/shipping-zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingZoneDraft.name,
          fee: Number(editingZoneDraft.fee) || 0,
          enabled: editingZoneDraft.enabled,
          sortOrder: editingZoneDraft.sortOrder,
        }),
      });
      setShippingZones(prev => prev.map(z => (z.id === id ? { ...z, ...updated } : z)));
      setMessage('تم حفظ المحافظة ✓');
      cancelEditZone();
    } catch {
      setMessage('فشل حفظ التعديلات');
    }
  }

  async function bulkSetZoneEnabled(ids: string[], enabled: boolean) {
    try {
      const payload = ids.map(id => ({ id, enabled }));
      await api('/admin/shipping-zones-bulk', { method: 'PUT', body: JSON.stringify(payload) });
      setShippingZones(prev => prev.map(z => (ids.includes(z.id) ? { ...z, enabled } : z)));
      setSelectedZoneIds(new Set());
      setMessage(`تم ${enabled ? 'تفعيل' : 'تعطيل'} ${ids.length} محافظة`);
    } catch {
      setMessage('فشل تحديث المحافظات');
    }
  }

  async function bulkDeleteZones(ids: string[]) {
    try {
      await Promise.all(ids.map(id => api(`/admin/shipping-zones/${id}`, { method: 'DELETE' })));
      setShippingZones(prev => prev.filter(z => !ids.includes(z.id)));
      setSelectedZoneIds(new Set());
      setMessage(`تم حذف ${ids.length} محافظة`);
    } catch {
      setMessage('فشل حذف بعض المحافظات');
    }
  }

  // Bulk update orders status
  async function bulkUpdateOrderStatus(ids: string[], status: string) {
    setBulkOrderUpdating(true);
    try {
      await Promise.all(ids.map(id => api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })));
      setFullOrders(prev => prev.map(o => (ids.includes(o.id) ? { ...o, status } : o)));
      setSelectedOrderIds(new Set());
      setBulkOrderStatus('');
      setMessage(`تم تحديث ${ids.length} طلب إلى ${ORDER_STATUS_AR[status as keyof typeof ORDER_STATUS_AR] ?? status}`);
      fetchOrderStats();
    } catch {
      setMessage('فشل تحديث بعض الطلبات');
    } finally {
      setBulkOrderUpdating(false);
    }
  }

  // ── Minimum Order ────────────────────────────────────────────────────────
  async function loadMinimumOrder() {
    try {
      const res = await api<{ amount: number }>('/admin/settings/minimum-order');
      const v = String(res?.amount ?? 0);
      setMinimumOrder(v);
      setMinimumOrderSaved(v);
    } catch {}
  }

  // ── Home Promo Card ──────────────────────────────────────────────────────
  async function loadPromoCard() {
    try {
      const res = await api<typeof promoCard>('/admin/settings/home-promo-card');
      if (res) {
        setPromoCard(res);
        setPromoCardSaved(res);
      }
    } catch {}
  }

  async function savePromoCard() {
    setPromoCardStatus('saving');
    try {
      await api('/admin/settings/home-promo-card', {
        method: 'PUT',
        body: JSON.stringify(promoCard),
      });
      setPromoCardSaved(promoCard);
      setPromoCardStatus('success');
      window.setTimeout(() => setPromoCardStatus('idle'), 2500);
      toast.success('تم حفظ كارت العروض ✓');
    } catch {
      setPromoCardStatus('error');
      window.setTimeout(() => setPromoCardStatus('idle'), 4000);
      toast.error('فشل حفظ كارت العروض');
    }
  }

  async function loadAppVersionSettings() {
    try {
      const res = await api<typeof appVersion>('/admin/settings/app-version');
      if (res) {
        setAppVersion(res);
        setAppVersionSaved(res);
      }
    } catch {}
  }

  async function saveAppVersionSettings() {
    setAppVersionStatus('saving');
    try {
      const res = await api<typeof appVersion>('/admin/settings/app-version', {
        method: 'PUT',
        body: JSON.stringify(appVersion),
      });
      if (res) {
        setAppVersion(res);
        setAppVersionSaved(res);
      }
      setAppVersionStatus('success');
      window.setTimeout(() => setAppVersionStatus('idle'), 2500);
      toast.success('تم حفظ إعدادات التحديثات ✓');
    } catch {
      setAppVersionStatus('error');
      window.setTimeout(() => setAppVersionStatus('idle'), 4000);
      toast.error('فشل حفظ إعدادات التحديثات');
    }
  }

  async function saveMinimumOrder() {
    setMinimumOrderSaving(true);
    setMinimumOrderStatus('saving');
    try {
      await api('/admin/settings/minimum-order', {
        method: 'PUT',
        body: JSON.stringify({ amount: Number(minimumOrder) || 0 }),
      });
      setMinimumOrderSaved(minimumOrder);
      setMinimumOrderStatus('success');
      window.setTimeout(() => setMinimumOrderStatus('idle'), 2500);
      setMessage('تم حفظ الحد الأدنى للطلب بنجاح ✓');
    } catch {
      setMinimumOrderStatus('error');
      window.setTimeout(() => setMinimumOrderStatus('idle'), 4000);
      setMessage('فشل حفظ الحد الأدنى للطلب');
    } finally {
      setMinimumOrderSaving(false);
    }
  }

  // Also load commission pristine when overview loads
  useEffect(() => {
    setCommissionSaved(commissionPercentage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadWalletRechargeRequests() {
    try {
      const res = await api<WalletRechargeRequest[]>('/admin/wallet-recharge-requests');
      setWalletRechargeRequests(Array.isArray(res) ? res : []);
    } catch {
      setMessage('فشل تحميل طلبات شحن المحفظة');
    }
  }

  async function handleWalletRechargeDecision(
    request: WalletRechargeRequest,
    decision: 'approve' | 'reject',
  ) {
    if (walletRechargeActionLoadingId) return;
    const actionLabel = decision === 'approve' ? 'الموافقة' : 'الرفض';
    const note = window.prompt(
      decision === 'approve'
        ? 'أدخل ملاحظة الموافقة قبل إضافة الرصيد'
        : 'أدخل سبب الرفض قبل تحديث الطلب',
      request.adminNote ?? '',
    )?.trim();
    if (!note) {
      setMessage('الملاحظة الإدارية مطلوبة');
      return;
    }
    const confirmed = window.confirm(
      decision === 'approve'
        ? `تأكيد الموافقة على طلب الشحن بمبلغ ${formatEGP(request.amount)}؟ سيتم إضافة الرصيد للمحفظة.`
        : `تأكيد رفض طلب الشحن بمبلغ ${formatEGP(request.amount)}؟`,
    );
    if (!confirmed) return;

    try {
      setWalletRechargeActionLoadingId(request.id);
      await api(
        `/admin/wallet-recharge-requests/${request.id}/${decision}`,
        {
          method: 'POST',
          body: JSON.stringify({ admin_note: note }),
        },
      );
      setMessage(`تم ${actionLabel} بنجاح`);
      await loadWalletRechargeRequests();
      await loadUsers();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : `فشل ${actionLabel}`);
    } finally {
      setWalletRechargeActionLoadingId(null);
    }
  }

  async function submitManualWalletCredit() {
    if (manualCreditSubmitting) return;
    if (!manualCreditForm.userId || !manualCreditForm.amount || !manualCreditForm.adminNote.trim()) {
      setMessage('يرجى اختيار العميل وإدخال المبلغ والملاحظة الإدارية');
      return;
    }
    const numericAmount = Number(manualCreditForm.amount);
    if (numericAmount > 5000 && !confirm(`تحذير: المبلغ ${numericAmount} جنيه أكبر من 5000. هل أنت متأكد من إضافة الرصيد؟`)) return;
    if (!confirm(`تأكيد إضافة ${manualCreditForm.amount} جنيه إلى رصيد العميل؟`)) return;
    try {
      setManualCreditSubmitting(true);
      const res = await api<{
        message: string;
        user: { id: string; walletBalance: string; phone?: string; name?: string };
        transaction: { id: string };
      }>('/admin/wallet/manual-credit', {
        method: 'POST',
        body: JSON.stringify({
          user_id: manualCreditForm.userId,
          amount: Number(manualCreditForm.amount),
          reason_type: manualCreditForm.reasonType,
          admin_note: manualCreditForm.adminNote.trim(),
        }),
      });
      setMessage('تمت إضافة الرصيد بنجاح');
      setManualCreditForm({
        userId: '',
        amount: '',
        reasonType: 'COMPENSATION',
        adminNote: '',
      });
      await loadUsers();
      return res;
    } catch (e) {
      setMessage(String(e));
      throw e;
    } finally {
      setManualCreditSubmitting(false);
    }
  }

  async function submitManualWalletDebit() {
    if (manualDebitSubmitting) return;
    if (!manualCreditForm.userId || !manualCreditForm.amount || !manualCreditForm.adminNote.trim()) {
      setMessage('يرجى اختيار العميل وإدخال المبلغ والملاحظة الإدارية');
      return;
    }
    const numericAmount = Number(manualCreditForm.amount);
    if (numericAmount > 5000 && !confirm(`تحذير: مبلغ الخصم ${numericAmount} جنيه أكبر من 5000. هل أنت متأكد؟`)) return;
    if (!confirm(`تأكيد خصم ${manualCreditForm.amount} جنيه من رصيد العميل؟`)) return;
    try {
      setManualDebitSubmitting(true);
      await api('/admin/wallet/manual-debit', {
        method: 'POST',
        body: JSON.stringify({
          user_id: manualCreditForm.userId,
          amount: numericAmount,
          admin_note: manualCreditForm.adminNote.trim(),
        }),
      });
      setMessage('تم خصم الرصيد بنجاح');
      setManualCreditForm({
        userId: '',
        amount: '',
        reasonType: 'COMPENSATION',
        adminNote: '',
      });
      await loadUsers();
      setWalletTransactions([]);
    } catch (e) {
      setMessage(String(e));
      throw e;
    } finally {
      setManualDebitSubmitting(false);
    }
  }

  async function loadWalletTransactions(userId: string) {
    try {
      const res = await api<WalletTransactionRow[]>(`/admin/users/${userId}/wallet-transactions`);
      setWalletTransactions(Array.isArray(res) ? res : []);
      setWalletTransactionPage(1);
    } catch {
      setMessage('فشل تحميل سجل معاملات المحفظة');
    }
  }

  function exportWalletTransactionsCSV(rows: WalletTransactionRow[]) {
    const headers = ['ID', 'النوع', 'المبلغ', 'الرصيد قبل', 'الرصيد بعد', 'الملاحظة', 'التاريخ'];
    const csvRows = rows.map((tx) => [
      tx.id,
      tx.type,
      String(tx.amount),
      String(tx.balanceBefore),
      String(tx.balanceAfter),
      `"${(tx.adminNote ?? '').replace(/"/g, '""')}"`,
      formatDate(tx.createdAt),
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────────
  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const [rev, tp, tv, o30, st, gov] = await Promise.all([
        api<RevenuePoint[]>('/admin/analytics/revenue'),
        api<TopProduct[]>('/admin/analytics/top-products'),
        api<TopVendor[]>('/admin/analytics/top-vendors'),
        api<OrdersDayPoint[]>('/admin/analytics/orders-30d').catch(() => []),
        api<StatusCount[]>('/admin/analytics/orders-by-status').catch(() => []),
        api<GovernorateStat[]>('/admin/analytics/top-governorates').catch(() => []),
      ]);
      setRevenueData(rev ?? []);
      setTopProducts(tp ?? []);
      setTopVendors(tv ?? []);
      setOrders30d(o30 ?? []);
      setStatusCounts(st ?? []);
      setTopGovernorates(gov ?? []);
    } catch {
      setAnalyticsError('فشل تحميل بيانات التحليلات — تحقق من الاتصال بالخادم');
    }
    finally { setAnalyticsLoading(false); }
  }

  async function loadActivityLog(page = 1) {
    setActivityLoading(true);
    try {
      const res = await api<{ activities: any[]; total: number }>(`/admin/activity?page=${page}&pageSize=30`);
      setActivityLog(res?.activities ?? []);
      setActivityTotal(res?.total ?? 0);
      setActivityPage(page);
    } catch { /* silent */ }
    finally { setActivityLoading(false); }
  }

  // ── Users ─────────────────────────────────────────────────────────────────────
  async function loadUsers() {
    setUsersLoading(true);
    try {
      // /admin/users returns a paginated object: { users: [], total, page, pageSize }
      const data = await api<{ users?: AdminUser[]; total?: number } | AdminUser[]>('/admin/users');
      const list = Array.isArray(data) ? data : (data as { users?: AdminUser[] }).users ?? [];
      setUsers(list);
    } catch { /* silent */ }
    finally { setUsersLoading(false); }
  }

  async function loadUserStats() {
    setUserStatsLoading(true);
    setUserStatsError('');
    try {
      const stats = await api<UserStats>('/admin/users/stats');
      setUserStats(stats);
    } catch {
      setUserStatsError('فشل تحميل إحصائيات العملاء — تحقق من الاتصال بالخادم');
    } finally {
      setUserStatsLoading(false);
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────────
  async function loadNotifHistory() {
    try {
      const data = await api<typeof notifHistory>('/admin/notifications/history');
      setNotifHistory(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }

  // Guard against double-submit: ref is synchronous, unlike state which
  // batches — this ensures even rapid successive calls fire only once.
  const notifSendingRef = useRef(false);
  async function sendNotification() {
    if (notifSendingRef.current) return; // prevent double-click race
    if (!notifTitle.trim() || !notifBody.trim()) { setNotifMessage('العنوان والمحتوى مطلوبان'); return; }
    notifSendingRef.current = true;
    setNotifLoading(true);
    try {
      const endpoint = notifTarget === 'customers' ? '/admin/notifications/customers' : '/admin/notifications/merchants';
      await api(endpoint, { method: 'POST', body: JSON.stringify({ title: notifTitle, message: notifBody }) });
      setNotifMessage('تم إرسال الإشعار بنجاح ✓');
      setNotifTitle(''); setNotifBody('');
      loadNotifHistory();
    } catch (e) {
      const raw = String(e);
      const msg = /401|403/.test(raw)
        ? 'غير مصرح — تحقق من صلاحيات المشرف'
        : /network|fetch|Failed to fetch/i.test(raw)
            ? 'تعذر الاتصال بالخادم، تحقق من الإنترنت'
            : 'فشل إرسال الإشعار — ' + raw.split('\n')[0];
      setNotifMessage(msg);
    }
    finally {
      setNotifLoading(false);
      notifSendingRef.current = false;
    }
  }

  // ── User ban/unban ────────────────────────────────────────────────────────────
  async function banUser(id: string, banned: boolean) {
    try {
      const updated = await api<AdminUser>(`/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ banned }) });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: updated.isBanned } : u));
    } catch (e) { setMessage(String(e)); }
  }

  // ── Security ──────────────────────────────────────────────────────────────────
  async function loadSecurity() {
    setSecLoading(true);
    try {
      const [emps, acts, rolesData] = await Promise.allSettled([
        api<DashboardUser[]>('/admin/dashboard-users'),
        api<Activity[]>('/admin/activities'),
        api<{ roles: DashboardRole[]; permissions: DashboardPermission[] }>('/admin/roles'),
      ]);
      setEmployees(emps.status === 'fulfilled' && Array.isArray(emps.value) ? emps.value : []);
      setActivities(acts.status === 'fulfilled' && Array.isArray(acts.value) ? acts.value : []);
      if (rolesData.status === 'fulfilled') {
        setDashboardRoles(Array.isArray(rolesData.value.roles) ? rolesData.value.roles : []);
        setDashboardPermissions(Array.isArray(rolesData.value.permissions) ? rolesData.value.permissions : []);
      }
    } catch { /* silent */ }
    finally { setSecLoading(false); }
  }

  async function addEmployee() {
    if (!empForm.name || !empForm.username || !empForm.password) { setSecMessage('الاسم واسم المستخدم وكلمة المرور مطلوبة'); return; }
    try {
      await api('/admin/dashboard-users', { method: 'POST', body: JSON.stringify(empForm) });
      setSecMessage('تم إضافة مستخدم لوحة التحكم بنجاح');
      setEmpForm({ name: '', phone: '', username: '', password: '', roleKey: 'ADMIN' });
      loadSecurity();
    } catch (e) { setSecMessage(String(e)); }
  }

  async function updateDashboardUserRole(userId: string, roleKey: DashboardRoleKey) {
    try {
      await api(`/admin/dashboard-users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ roleKey }),
      });
      setSecMessage('تم تحديث الدور بنجاح');
      await loadSecurity();
    } catch (e) {
      setSecMessage(String(e));
    }
  }

  async function toggleDashboardUserStatus(user: DashboardUser) {
    const nextStatus = user.dashboardStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!window.confirm(`تأكيد ${nextStatus === 'ACTIVE' ? 'تفعيل' : 'تعطيل'} المستخدم؟`)) return;
    try {
      await api(`/admin/dashboard-users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setSecMessage('تم تحديث حالة المستخدم');
      await loadSecurity();
    } catch (e) {
      setSecMessage(String(e));
    }
  }

  async function resetDashboardUserPassword(user: DashboardUser) {
    const password = window.prompt(`أدخل كلمة مرور جديدة للمستخدم ${user.username || user.name || user.id}`);
    if (!password || password.trim().length < 6) {
      setSecMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      await api(`/admin/dashboard-users/${user.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: password.trim() }),
      });
      setSecMessage('تم إعادة تعيين كلمة المرور');
    } catch (e) {
      setSecMessage(String(e));
    }
  }

  async function deleteDashboardUser(user: DashboardUser) {
    if (!window.confirm(`حذف المستخدم ${user.username || user.name || user.id} نهائياً؟`)) return;
    try {
      await api(`/admin/dashboard-users/${user.id}`, { method: 'DELETE' });
      setSecMessage('تم حذف المستخدم');
      await loadSecurity();
    } catch (e) {
      setSecMessage(String(e));
    }
  }

  // ── CMS ───────────────────────────────────────────────────────────────────────
  async function loadCmsData() {
    setCmsLoading(true);
    try {
      const [b, p, s] = await Promise.all([
        api<HomeBanner[]>('/home-cms/banners'),
        api<HomePromotion[]>('/home-cms/promotions'),
        api<HomeSection[]>('/home-cms/sections'),
      ]);
      setHomeBanners(b);
      setHomePromotions(p);
      setHomeSections(s);
    } catch { setCmsMessage('خطأ في تحميل بيانات الرئيسية'); }
    finally { setCmsLoading(false); }
  }

  async function saveBanner() {
    if (!bannerForm.title.trim()) { setCmsMessage('العنوان مطلوب'); return; }
    try {
      const body = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || null,
        buttonText: bannerForm.buttonText.trim() || null,
        imageUrl: bannerForm.imageUrl || null,
        color1: bannerForm.color1,
        color2: bannerForm.color2,
        enabled: bannerForm.enabled,
        sortOrder: bannerForm.sortOrder,
      };
      if (editingBannerId) {
        await api(`/home-cms/banners/${editingBannerId}`, { method: 'PATCH', body: JSON.stringify(body) });
        setCmsMessage('تم تحديث البانر بنجاح');
      } else {
        await api('/home-cms/banners', { method: 'POST', body: JSON.stringify(body) });
        setCmsMessage('تم إضافة البانر بنجاح');
      }
      setBannerForm({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true, imageUrl: '', sortOrder: 0 });
      setEditingBannerId(null);
      setBannerImagePreview('');
      loadCmsData();
    } catch (e) { setCmsMessage(String(e)); }
  }

  async function deleteBanner(id: string) {
    if (!confirm('هل تريد حذف هذا البانر نهائياً؟ لا يمكن التراجع.')) return;
    try {
      await api(`/home-cms/banners/${id}`, { method: 'DELETE' });
      setCmsMessage('تم حذف البانر');
      loadCmsData();
    } catch (e) { setCmsMessage('فشل الحذف: ' + String(e)); }
  }

  async function toggleBanner(b: HomeBanner) {
    try {
      await api(`/home-cms/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !b.enabled }) });
      setCmsMessage(b.enabled ? 'تم إيقاف البانر' : 'تم تفعيل البانر');
      loadCmsData();
    } catch (e) { setCmsMessage(String(e)); }
  }

  async function uploadBannerImage(id: string, file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setCmsMessage('مسموح فقط بـ JPG / PNG / WebP'); return; }
    if (file.size > 8 * 1024 * 1024) { setCmsMessage('الملف كبير جداً — الحد الأقصى 8 ميجا'); return; }
    setBannerImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${apiUrl}/home-cms/banners/${id}/image`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل الرفع');
      setBannerForm(prev => ({ ...prev, imageUrl: data.imageUrl }));
      setBannerImagePreview(data.imageUrl);
      setCmsMessage('تم رفع الصورة بنجاح');
      loadCmsData();
    } catch (e) { setCmsMessage('فشل رفع الصورة: ' + String(e)); }
    finally { setBannerImageUploading(false); }
  }

  async function reorderBanners(newOrder: HomeBanner[]) {
    try {
      const ids = newOrder.map(b => b.id);
      await api('/home-cms/banners/reorder', { method: 'PUT', body: JSON.stringify({ ids }) });
      setHomeBanners(newOrder);
      setCmsMessage('تم تحديث الترتيب');
    } catch (e) { setCmsMessage(String(e)); }
  }

  function moveBannerUp(index: number) {
    if (index <= 0) return;
    const arr = [...homeBanners];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    reorderBanners(arr);
  }

  function moveBannerDown(index: number) {
    if (index >= homeBanners.length - 1) return;
    const arr = [...homeBanners];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    reorderBanners(arr);
  }

  async function savePromotion() {
    if (!promoForm.title.trim()) { setCmsMessage('العنوان مطلوب'); return; }
    try {
      if (editingPromoId) {
        await api(`/home-cms/promotions/${editingPromoId}`, { method: 'PATCH', body: JSON.stringify(promoForm) });
        setCmsMessage('تم تحديث العرض بنجاح');
      } else {
        await api('/home-cms/promotions', { method: 'POST', body: JSON.stringify(promoForm) });
        setCmsMessage('تم إضافة العرض بنجاح');
      }
      setPromoForm({ id: '', title: '', subtitle: '', targetUrl: '', enabled: true, startsAt: '', endsAt: '' });
      setEditingPromoId(null);
      loadCmsData();
    } catch (e) { setCmsMessage(String(e)); }
  }

  async function deletePromotion(id: string) {
    if (!confirm('هل تريد حذف هذا العرض؟')) return;
    await api(`/home-cms/promotions/${id}`, { method: 'DELETE' });
    loadCmsData();
  }

  async function togglePromotion(p: HomePromotion) {
    await api(`/home-cms/promotions/${p.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !p.enabled }) });
    loadCmsData();
  }

  async function toggleSection(s: HomeSection) {
    await api(`/home-cms/sections/${s.key}`, { method: 'PUT', body: JSON.stringify({ enabled: !s.enabled, title: s.title, subtitle: s.subtitle, sortOrder: s.sortOrder }) });
    loadCmsData();
  }

  async function uploadPromoImage(id: string, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiUrl}/home-cms/promotions/${id}/image`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (res.ok) { setCmsMessage('تم رفع الصورة بنجاح'); loadCmsData(); }
    else setCmsMessage('فشل رفع الصورة');
  }

  // ── Small utilities ───────────────────────────────────────────────────────────
  function copyPhone(p: string) { navigator.clipboard?.writeText(p).catch(() => {}); }

  function openWhatsApp(p: string) {
    const n = p.startsWith('+') ? p.slice(1) : p.startsWith('01') ? `2${p}` : p.startsWith('1') && p.length === 10 ? `20${p}` : p;
    window.open(`https://wa.me/${n}`, '_blank');
  }

  function clearFilters() {
    setOrderSearch(''); setOrderStatus(''); setOrderDay('');
    setOrderDateFrom(''); setOrderDateTo(''); setOrderMerchantId('');
    setOrderPage(1);
  }

  const hasFilters = !!(orderSearch || orderStatus || orderDay || orderDateFrom || orderDateTo || orderMerchantId);

  // ── Revenue chart (pure SVG/CSS) ──────────────────────────────────────────────
  function RevenueChart() {
    if (analyticsLoading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>جاري تحميل البيانات…</div>;
    if (analyticsError) return <div style={{ textAlign: 'center', padding: 32, color: '#dc2626', fontFamily: 'Cairo', fontSize: 13 }}>⚠️ {analyticsError}</div>;
    if (!revenueData.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات بعد</div>;
    const maxRev = Math.max(...revenueData.map(d => d.revenue), 1);
    const last14 = revenueData.slice(-14);
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120, padding: '0 4px' }}>
        {last14.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${d.date}: ${formatEGP(d.revenue)}`}>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: `${Math.max(4, (d.revenue / maxRev) * 100)}px`,
              background: 'linear-gradient(180deg, var(--gold) 0%, var(--orange) 100%)',
              opacity: 0.85, transition: 'opacity 0.15s',
            }} />
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'Cairo', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textAlign: 'center' }}>
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!mounted) return <div style={{ padding: 40, textAlign: 'center' }}>جاري تحميل لوحة التحكم…</div>;

  // ── Login screen ──────────────────────────────────────────────────────────────
  if (!authorized) {
    return (
      <main className="shell" dir="rtl">
        <section className="hero">
          <div>
            <div className="eyebrow">لوحة تحكم سوق العسل</div>
            <h1>إدارة الطلبات والتجار والمنتجات.</h1>
          </div>
          <div className="hero-card">
            <strong>تسجيل دخول المشرف</strong>
            <div className="form-grid">
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="اسم المستخدم أو الهاتف" dir="ltr" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" type="password" />
              <button onClick={login}>دخول</button>
            </div>
            <p className="muted">{message || 'أدخل بيانات المشرف للدخول.'}</p>
          </div>
        </section>
      </main>
    );
  }

  // ── Dashboard shell ───────────────────────────────────────────────────────────
          const activeLabel = visibleNavGroups.flatMap(g => g.items).find(i => i.key === activePanel);

  return (
    <div className="dash-shell" dir="rtl">

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sb-logo">
          <p className="sb-logo-title">🍯 {sidebarCollapsed ? '' : 'سوق العسل'}</p>
          {!sidebarCollapsed && <p className="sb-logo-sub">لوحة تحكم المشرف</p>}
          <button
            className="sb-collapse-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'فتح' : 'طي'}
            style={{ position: 'absolute', top: 12, left: 12 }}
          >
            {sidebarCollapsed ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sb-nav">
          {visibleNavGroups.map(group => (
            <div key={group.group}>
              {!sidebarCollapsed && <div className="sb-group-label sb-section-label">{group.group}</div>}
              {group.items.map(item => (
                <button
                  key={item.key}
                  className={`sb-item${activePanel === item.key ? ' active' : ''}`}
                  onClick={() => { setActivePanel(item.key); setSidebarOpen(false); }}
                  data-label={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="sb-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.key === 'orders' && orderStats.pending > 0 && (
                    <span className="sb-badge">{orderStats.pending}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          {sidebarCollapsed ? '🍯' : 'سوق العسل · نظام الإدارة'}
        </div>
      </aside>

      {/* Mobile overlay — tap outside to close sidebar */}
      {sidebarOpen && (
        <div
          className="sb-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main area ── */}
      <div className="dash-main">

        {/* Top bar */}
        <div className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="topbar-btn"
              onClick={() => setSidebarOpen(o => !o)}
              id="sb-toggle"
            >
              ☰
            </button>
            <span className="dash-topbar-title">
              {activeLabel?.icon} {activeLabel?.label ?? 'لوحة التحكم'}
            </span>
          </div>
          <div className="topbar-actions">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginInlineStart: 8 }}>
              <span style={{ fontFamily: 'Cairo', fontWeight: 800, color: 'var(--brown)', fontSize: 13 }}>
                {sessionUser?.name || sessionUser?.username || 'مشرف'}
              </span>
              <span style={{ fontFamily: 'Cairo', color: 'var(--muted)', fontSize: 11 }}>
                {sessionUser?.dashboardRoles?.[0]?.name || 'لوحة التحكم'}
              </span>
            </div>
            <button className="topbar-btn" onClick={() => { setGlobalSearchOpen(true); setGlobalSearchQuery(''); }} title="Ctrl/Cmd + K">
              🔍 بحث شامل
            </button>
            <button className="topbar-btn" onClick={() => setDarkMode(d => !d)}>
              {darkMode ? '☀️ فاتح' : '🌙 داكن'}
            </button>
            <button className="topbar-btn" onClick={refreshAll}>🔄 تحديث</button>
            <button className="topbar-btn" onClick={logoutAdmin}>🚪 خروج</button>
          </div>
        </div>

        {/* Content */}
        <div className="dash-content">

          {message && (() => {
            const isSuccess = /تم |✓|بنجاح/.test(message);
            const isError   = /فشل|خطأ/.test(message);
            const bg     = isSuccess ? '#f0fdf4' : isError ? '#fef2f2' : '#fefce8';
            const border = isSuccess ? '#86efac' : isError ? '#fca5a5' : '#fbbf24';
            const color  = isSuccess ? '#166534' : isError ? '#991b1b' : '#92400e';
            return (
              <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 16px', marginBottom: 16, color, fontFamily: 'Cairo', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>{message}</span>
                <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            );
          })()}

          {/* ════════════════════════════════════════════════════════
              OVERVIEW PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'overview' && (
            <div>
              {/* ── Executive hero ───────────────────────────────────────── */}
              <div className="exec-hero">
                <div className="exec-hero-text">
                  <div className="exec-hero-greeting">{(() => {
                    const h = new Date().getHours();
                    if (h < 12) return 'صباح الخير 🌅';
                    if (h < 17) return 'مساء النور ☀️';
                    return 'مساء الخير 🌙';
                  })()}</div>
                  <h1 className="exec-hero-title">لوحة تحكم سوق العسل</h1>
                  <p className="exec-hero-sub">إليك نظرة سريعة على أداء المنصة اليوم</p>
                </div>
                <div className="exec-hero-actions">
                  <button className="exec-btn-primary" onClick={() => canAccessPanel(sessionUser, 'orders') && setActivePanel('orders')}>
                    📦 إدارة الطلبات
                  </button>
                  <button className="exec-btn-ghost" onClick={() => { refreshAll(); loadAnalytics(); }}>
                    🔄 تحديث
                  </button>
                </div>
              </div>

              {/* ── Summary cards row ────────────────────────────────────── */}
              <div className="exec-summary-grid">
                <div className="exec-summary-card revenue">
                  <div className="exec-card-label">💵 إيرادات اليوم</div>
                  <div className="exec-card-value">{formatEGP(overview.revenueToday ?? 0)}</div>
                  {canViewOrders && <div className="exec-card-foot">من <strong>{(overview.ordersToday ?? 0).toLocaleString('ar-EG')}</strong> طلب اليوم</div>}
                </div>
                {canViewOrders && (
                  <div className="exec-summary-card orders">
                    <div className="exec-card-label">📦 إجمالي الطلبات</div>
                    <div className="exec-card-value">{overview.orders.toLocaleString('ar-EG')}</div>
                    <div className="exec-card-foot">إجمالي المبيعات: <strong>{formatEGP(overview.sales)}</strong></div>
                  </div>
                )}
                {canViewStores && (
                  <div className="exec-summary-card merchants">
                    <div className="exec-card-label">🏪 التجار النشطون</div>
                    <div className="exec-card-value">{overview.merchants.toLocaleString('ar-EG')}</div>
                    {canViewProducts && <div className="exec-card-foot">{overview.products.toLocaleString('ar-EG')} منتج معتمد</div>}
                  </div>
                )}
                {canViewCustomers && (
                  <div className="exec-summary-card customers">
                    <div className="exec-card-label">👥 العملاء</div>
                    <div className="exec-card-value">{(overview.activeCustomers ?? 0).toLocaleString('ar-EG')}</div>
                    {canViewOrders && <div className="exec-card-foot">متوسط الطلب: <strong>{formatEGP(overview.averageOrderValue ?? 0)}</strong></div>}
                  </div>
                )}
              </div>

              {/* ── Quick actions ─────────────────────────────────────────── */}
              <div className="exec-quick-actions">
                <div className="exec-section-head">
                  <h3>⚡ إجراءات سريعة</h3>
                </div>
                <div className="exec-quick-grid">
                  {canAccessPanel(sessionUser, 'orders') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('orders')}>
                      <span className="qa-icon">📦</span>
                      <div>
                        <strong>الطلبات</strong>
                        <span>{orderStats.pending} في الانتظار</span>
                      </div>
                    </button>
                  )}
                  {canAccessPanel(sessionUser, 'merchants') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('merchants')}>
                      <span className="qa-icon">🏪</span>
                      <div>
                        <strong>التجار</strong>
                        <span>إدارة المتاجر</span>
                      </div>
                    </button>
                  )}
                  {canAccessPanel(sessionUser, 'products') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('products')}>
                      <span className="qa-icon">🛒</span>
                      <div>
                        <strong>المنتجات</strong>
                        <span>{overview.products} منتج</span>
                      </div>
                    </button>
                  )}
                  {canAccessPanel(sessionUser, 'shipping') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('shipping')}>
                      <span className="qa-icon">🚚</span>
                      <div>
                        <strong>رسوم الشحن</strong>
                        <span>إدارة المحافظات</span>
                      </div>
                    </button>
                  )}
                  {canAccessPanel(sessionUser, 'financial') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('financial')}>
                      <span className="qa-icon">💰</span>
                      <div>
                        <strong>المالية والعمولات</strong>
                        <span>العمولات والإعدادات</span>
                      </div>
                    </button>
                  )}
                  {canAccessPanel(sessionUser, 'notifications') && (
                    <button className="exec-quick-btn" onClick={() => setActivePanel('notifications')}>
                      <span className="qa-icon">🔔</span>
                      <div>
                        <strong>الإشعارات</strong>
                        <span>إرسال إشعار جديد</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Top performers + recent activity ─────────────────────── */}
              <div className="exec-bottom-grid">
                {canViewStores && (
                  <div className="exec-list-card">
                    <div className="exec-section-head">
                      <h3>🏆 أعلى المتاجر</h3>
                      <button className="exec-link" onClick={() => canAccessPanel(sessionUser, 'merchants') && setActivePanel('merchants')}>عرض الكل ←</button>
                    </div>
                    {topVendors.length === 0 ? (
                      <div className="exec-empty">لا توجد بيانات بعد</div>
                    ) : (
                      <ol className="exec-rank-list">
                        {topVendors.slice(0, 5).map((v, i) => (
                          <li key={i}>
                            <span className="rank-num">{i + 1}</span>
                            <div className="rank-info">
                              <strong>{v.storeName ?? 'متجر'}</strong>
                              {canViewOrders && <span>{v.totalOrders} طلب</span>}
                            </div>
                            <span className="rank-amount">{formatEGP(v.totalRevenue)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {canViewProducts && (
                  <div className="exec-list-card">
                    <div className="exec-section-head">
                      <h3>⭐ أعلى المنتجات</h3>
                      <button className="exec-link" onClick={() => canAccessPanel(sessionUser, 'products') && setActivePanel('products')}>عرض الكل ←</button>
                    </div>
                    {topProducts.length === 0 ? (
                      <div className="exec-empty">لا توجد بيانات بعد</div>
                    ) : (
                      <ol className="exec-rank-list">
                        {topProducts.slice(0, 5).map((p, i) => (
                          <li key={i}>
                            <span className="rank-num gold">{i + 1}</span>
                            <div className="rank-info">
                              <strong>{p.name ?? 'منتج'}</strong>
                              <span>{p.totalSold} وحدة</span>
                            </div>
                            <span className="rank-amount">{formatEGP(p.totalRevenue)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {canViewAudit && (
                  <div className="exec-list-card">
                    <div className="exec-section-head">
                      <h3>📋 آخر النشاط</h3>
                      <button className="exec-link" onClick={() => canAccessPanel(sessionUser, 'activity') && setActivePanel('activity')}>عرض الكل ←</button>
                    </div>
                    {activityLog.length === 0 ? (
                      <button className="exec-empty exec-empty-clickable" onClick={() => loadActivityLog(1)}>
                        اضغط للتحميل
                      </button>
                    ) : (
                      <ul className="exec-activity-list">
                        {activityLog.slice(0, 6).map((a: any) => (
                          <li key={a.id}>
                            <span className="act-dot" style={{ background: a.action === 'DELETE' ? '#dc2626' : a.action === 'CREATE' ? '#16a34a' : '#3b82f6' }} />
                            <div className="act-info">
                              <strong>{a.adminUser?.name ?? a.actorUsername}</strong>
                              <span>{a.action} · {a.entityType}</span>
                            </div>
                            <span className="act-time">{(() => {
                              try {
                                const d = new Date(a.createdAt);
                                const diff = Date.now() - d.getTime();
                                const m = Math.floor(diff / 60000);
                                if (m < 1) return 'الآن';
                                if (m < 60) return `${m}د`;
                                const h = Math.floor(m / 60);
                                if (h < 24) return `${h}س`;
                                return `${Math.floor(h / 24)}ي`;
                              } catch { return ''; }
                            })()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* KPI cards — 8 premium cards */}
              <div className="analytics-grid">
                {overviewLoading ? (
                  [0,1,2,3,4,5,6,7].map(i => (
                    <div key={i} className="an-card" style={{ gap: 8 }}>
                      <div className="shimmer-pulse" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(71,39,21,0.10)' }} />
                      <div className="shimmer-pulse" style={{ height: 11, width: '55%', borderRadius: 6, background: 'rgba(71,39,21,0.08)' }} />
                      <div className="shimmer-pulse" style={{ height: 26, width: '70%', borderRadius: 8, background: 'rgba(71,39,21,0.12)' }} />
                      <div className="shimmer-pulse" style={{ height: 10, width: '45%', borderRadius: 5, background: 'rgba(71,39,21,0.07)' }} />
                    </div>
                  ))
                ) : (
                  <>
                {canViewOrders && (
                  <div className="an-card blue">
                    <div className="an-card-icon">📦</div>
                    <div className="an-card-label">إجمالي الطلبات</div>
                    <div className="an-card-value">{overview.orders.toLocaleString('ar-EG')}</div>
                  </div>
                )}
                {canViewOrders && (
                  <div className="an-card green">
                    <div className="an-card-icon">🆕</div>
                    <div className="an-card-label">طلبات اليوم</div>
                    <div className="an-card-value">{(overview.ordersToday ?? orderStats.totalToday ?? 0).toLocaleString('ar-EG')}</div>
                  </div>
                )}
                <div className="an-card gold">
                  <div className="an-card-icon">💵</div>
                  <div className="an-card-label">إيرادات اليوم</div>
                  <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.revenueToday ?? 0)}</div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">📈</div>
                  <div className="an-card-label">إيرادات هذا الشهر</div>
                  <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.revenueMonth ?? 0)}</div>
                </div>
                {canViewCustomers && (
                  <div className="an-card blue">
                    <div className="an-card-icon">👥</div>
                    <div className="an-card-label">العملاء النشطون</div>
                    <div className="an-card-value">{(overview.activeCustomers ?? 0).toLocaleString('ar-EG')}</div>
                  </div>
                )}
                {canViewStores && (
                  <div className="an-card green">
                    <div className="an-card-icon">🏪</div>
                    <div className="an-card-label">التجار</div>
                    <div className="an-card-value">{overview.merchants.toLocaleString('ar-EG')}</div>
                  </div>
                )}
                {canViewProducts && (
                  <div className="an-card gold">
                    <div className="an-card-icon">🛒</div>
                    <div className="an-card-label">المنتجات</div>
                    <div className="an-card-value">{overview.products.toLocaleString('ar-EG')}</div>
                  </div>
                )}
                {canViewOrders && (
                  <div className="an-card orange">
                    <div className="an-card-icon">💰</div>
                    <div className="an-card-label">متوسط قيمة الطلب</div>
                    <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.averageOrderValue ?? 0)}</div>
                  </div>
                )}
                  </>
                )}
              </div>

              {canViewOrders && (
              <div className="two-col">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">📊 الطلبات آخر 30 يوم</h3>
                  {(() => {
                    const data = orders30d;
                    if (!data.length) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>;
                    const maxV = Math.max(1, ...data.map(d => d.orderCount));
                    return (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140, marginTop: 10, padding: '0 4px' }}>
                        {data.map((d, i) => (
                          <div key={d.date} title={`${d.date}: ${d.orderCount} طلب`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: '100%', height: `${(d.orderCount / maxV) * 100}%`, background: 'linear-gradient(180deg, var(--gold), var(--orange))', borderRadius: '4px 4px 0 0', minHeight: d.orderCount > 0 ? 2 : 0 }} />
                            {(i % 5 === 0) && <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace' }}>{d.date.slice(5)}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-panel">
                  <h3 className="chart-panel-title">💵 الإيرادات آخر 30 يوم</h3>
                  {(() => {
                    const data = orders30d;
                    if (!data.length) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>;
                    const maxV = Math.max(1, ...data.map(d => d.revenue));
                    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.revenue / maxV) * 90}`).join(' ');
                    return (
                      <div style={{ position: 'relative', height: 140, marginTop: 10 }}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                          <polyline points={points} fill="none" stroke="var(--orange)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                          <polygon points={`${points} 100,100 0,100`} fill="rgba(212,140,28,0.15)" />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'Cairo' }}>{formatEGP(maxV)}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}

              {canViewOrders && (
              <div className="two-col">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">📊 توزيع حالات الطلبات</h3>
                  {(() => {
                    const colorMap: Record<string, string> = {
                      PENDING: '#c8860a', ACCEPTED: '#3b82f6', PREPARING: '#8b5cf6',
                      OUT_FOR_DELIVERY: '#06b6d4', DELIVERED: '#16a34a', CANCELLED: '#dc2626',
                    };
                    const labelMap: Record<string, string> = {
                      PENDING: 'في الانتظار', ACCEPTED: 'مقبول', PREPARING: 'قيد التحضير',
                      OUT_FOR_DELIVERY: 'جاري التوصيل', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي',
                    };
                    const total = statusCounts.reduce((s, c) => s + c.count, 0);
                    if (total === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {statusCounts.map(s => {
                          const pct = (s.count / total) * 100;
                          return (
                            <div key={s.status}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Cairo', fontSize: 12, marginBottom: 4 }}>
                                <span>{labelMap[s.status] ?? s.status}</span>
                                <strong style={{ color: colorMap[s.status] ?? 'var(--brown)' }}>{s.count} ({pct.toFixed(1)}%)</strong>
                              </div>
                              <div style={{ height: 6, background: 'rgba(71,39,21,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: colorMap[s.status] ?? 'var(--brown)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <div className="chart-panel">
                  <h3 className="chart-panel-title">🗺 أعلى المحافظات</h3>
                  {topGovernorates.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {topGovernorates.slice(0, 8).map((g, i) => {
                        const max = topGovernorates[0].totalRevenue;
                        const pct = max > 0 ? (g.totalRevenue / max) * 100 : 0;
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Cairo', fontSize: 12, marginBottom: 3 }}>
                              <span>{g.governorate}</span>
                              <strong style={{ color: 'var(--orange)' }}>{formatEGP(g.totalRevenue)} · {g.orderCount} طلب</strong>
                            </div>
                            <div style={{ height: 5, background: 'rgba(71,39,21,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Existing 14-day chart + today status */}
              <div className="two-col">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">📈 إيرادات آخر 14 يوم</h3>
                  <RevenueChart />
                </div>
                <div className="chart-panel">
                  <h3 className="chart-panel-title">📊 حالة الطلبات اليوم</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {[
                      { label: 'في الانتظار', val: orderStats.pending, color: '#c8860a' },
                      { label: 'مكتملة', val: orderStats.completed, color: '#16a34a' },
                      { label: 'ملغاة', val: orderStats.cancelled, color: '#dc2626' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontFamily: 'Cairo', fontSize: 13 }}>{s.label}</span>
                        <strong style={{ fontFamily: 'Cairo', color: s.color }}>{s.val}</strong>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, padding: '12px 0', borderTop: '1px solid rgba(71,39,21,0.10)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>إجمالي مبيعات اليوم</span>
                      <strong style={{ fontFamily: 'Cairo', color: 'var(--brown)' }}>{formatEGP(orderStats.totalSalesAmount)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top performers */}
              <div className="two-col">
                <div className="list-panel">
                  <div className="lp-head">
                    <h3>🏆 أفضل المنتجات مبيعًا</h3>
                  </div>
                  <div className="lp-body">
                    {topProducts.slice(0, 6).map((p, i) => (
                      <div className="lp-row" key={i}>
                        <div className="lp-rank">{i + 1}</div>
                        <div className="lp-info">
                          <strong>{p.name}</strong>
                          <div className="lp-sub">{p.storeName}</div>
                        </div>
                        <span className="lp-amount">{p.totalSold} وحدة</span>
                      </div>
                    ))}
                    {topProducts.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>}
                  </div>
                </div>

                <div className="list-panel">
                  <div className="lp-head">
                    <h3>🌟 أفضل التجار أداءً</h3>
                  </div>
                  <div className="lp-body">
                    {topVendors.slice(0, 6).map((v, i) => (
                      <div className="lp-row" key={i}>
                        <div className="lp-rank">{i + 1}</div>
                        <div className="lp-info">
                          <strong>{v.storeName}</strong>
                          <div className="lp-sub">{v.totalOrders} طلب</div>
                        </div>
                        <span className="lp-amount">{formatEGP(v.totalRevenue)}</span>
                      </div>
                    ))}
                    {topVendors.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بيانات</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              ORDERS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'orders' && (() => {
            const visibleIds = fullOrders.map(o => o.id);
            const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedOrderIds.has(id));
            const someSelected = visibleIds.some(id => selectedOrderIds.has(id)) && !allSelected;
            const toggleAll = () => {
              setSelectedOrderIds(prev => {
                const next = new Set(prev);
                if (allSelected) visibleIds.forEach(id => next.delete(id));
                else visibleIds.forEach(id => next.add(id));
                return next;
              });
            };
            const toggleOne = (id: string) => {
              setSelectedOrderIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };
            return (
              <section className="panel" style={{ overflow: 'visible', borderRadius: 30 }}>
                <div className="panel-header">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 22 }}>إدارة الطلبات</h2>
                    <span className="total-badge">{orderTotal.toLocaleString('ar-EG')} طلب</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="action-btn" onClick={() => exportCSV(fullOrders)}>📊 تصدير CSV</button>
                    <button className="action-btn refresh" onClick={() => { fetchOrders(); fetchOrderStats(); }}>🔄 تحديث</button>
                  </div>
                </div>

                <div className="order-stats-bar">
                  <div className="order-stat-chip"><span className="chip-num">{orderStats.totalToday}</span><span className="chip-label">طلبات اليوم</span></div>
                  <div className="order-stat-chip pending-chip"><span className="chip-num">{orderStats.pending}</span><span className="chip-label">في الانتظار</span></div>
                  <div className="order-stat-chip delivered-chip"><span className="chip-num">{orderStats.completed}</span><span className="chip-label">مكتملة</span></div>
                  <div className="order-stat-chip cancelled-chip"><span className="chip-num">{orderStats.cancelled}</span><span className="chip-label">ملغاة</span></div>
                  <div className="order-stat-chip sales-chip"><span className="chip-num">{formatEGP(orderStats.totalSalesAmount)}</span><span className="chip-label">إجمالي المبيعات</span></div>
                </div>

                <div className="filter-bar">
                  <div className="search-wrap">
                    <span className="search-icon">🔍</span>
                    <input type="text" className="search-input" placeholder="بحث: اسم العميل، الهاتف، رقم الطلب، اسم المتجر..."
                      value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }} />
                  </div>
                  <select className="filter-select" value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrderPage(1); }}>
                    <option value="">جميع الحالات</option>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s]}</option>)}
                  </select>
                  <select className="filter-select" value={orderDay} onChange={e => { setOrderDay(e.target.value); setOrderDateFrom(''); setOrderDateTo(''); setOrderPage(1); }}>
                    <option value="">كل الأوقات</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                  </select>
                  {!orderDay && (
                    <>
                      <input type="date" className="filter-select" value={orderDateFrom}
                        onChange={e => { setOrderDateFrom(e.target.value); setOrderPage(1); }} title="من تاريخ" />
                      <input type="date" className="filter-select" value={orderDateTo}
                        onChange={e => { setOrderDateTo(e.target.value); setOrderPage(1); }} title="إلى تاريخ" />
                    </>
                  )}
                  <select className="filter-select" value={orderMerchantId} onChange={e => { setOrderMerchantId(e.target.value); setOrderPage(1); }}>
                    <option value="">كل المتاجر</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.storeName}</option>)}
                  </select>
                  {hasFilters && <button className="clear-btn" onClick={clearFilters}>✕ مسح الفلاتر</button>}
                </div>

                <div className="orders-table-wrap">
                  {ordersLoading ? (
                    <div className="table-state"><div className="spinner" /><p>جاري تحميل الطلبات…</p></div>
                  ) : fullOrders.length === 0 ? (
                    <div className="table-state">
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                      <p style={{ color: 'var(--muted)' }}>لا توجد طلبات مطابقة للبحث</p>
                      {hasFilters && <button onClick={clearFilters} className="action-btn">مسح الفلاتر</button>}
                    </div>
                  ) : (
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th className="checkbox-col">
                            <AdminCheckbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={toggleAll}
                              ariaLabel="تحديد الكل"
                            />
                          </th>
                          <th>رقم الطلب</th><th>العميل</th><th>الهاتف</th><th>العنوان</th>
                          <th>المتجر</th>
                          <th
                            className={`sortable${ordersSortKey === 'total' ? ' sorted' : ''}`}
                            onClick={() => {
                              if (ordersSortKey === 'total') setOrdersSortDir(d => d === 'asc' ? 'desc' : 'asc');
                              else { setOrdersSortKey('total'); setOrdersSortDir('desc'); }
                            }}
                          >
                            <span className="sort-arrow">{ordersSortKey === 'total' ? (ordersSortDir === 'desc' ? '▼' : '▲') : '⇅'}</span>
                            الإجمالي
                          </th>
                          <th>الدفع</th><th>#</th>
                          <th
                            className={`sortable${ordersSortKey === 'status' ? ' sorted' : ''}`}
                            onClick={() => {
                              if (ordersSortKey === 'status') setOrdersSortDir(d => d === 'asc' ? 'desc' : 'asc');
                              else { setOrdersSortKey('status'); setOrdersSortDir('asc'); }
                            }}
                          >
                            <span className="sort-arrow">{ordersSortKey === 'status' ? (ordersSortDir === 'desc' ? '▼' : '▲') : '⇅'}</span>
                            الحالة
                          </th>
                          <th
                            className={`sortable${ordersSortKey === 'createdAt' ? ' sorted' : ''}`}
                            onClick={() => {
                              if (ordersSortKey === 'createdAt') setOrdersSortDir(d => d === 'asc' ? 'desc' : 'asc');
                              else { setOrdersSortKey('createdAt'); setOrdersSortDir('desc'); }
                            }}
                          >
                            <span className="sort-arrow">{ordersSortKey === 'createdAt' ? (ordersSortDir === 'desc' ? '▼' : '▲') : '⇅'}</span>
                            التاريخ
                          </th>
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const sorted = [...fullOrders].sort((a, b) => {
                            const dir = ordersSortDir === 'asc' ? 1 : -1;
                            if (ordersSortKey === 'total') return (Number(a.total) - Number(b.total)) * dir;
                            if (ordersSortKey === 'status') return String(a.status).localeCompare(String(b.status)) * dir;
                            if (ordersSortKey === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
                            return 0;
                          });
                          return sorted.map(order => {
                          const isSelected = selectedOrderIds.has(order.id);
                          return (
                            <tr key={order.id}
                              className={`${newOrderIds.has(order.id) ? 'new-order' : ''}${isSelected ? ' row-selected' : ''}`}
                              onClick={() => setSelectedOrder(order)}>
                              <td className="checkbox-col" onClick={e => e.stopPropagation()}>
                                <AdminCheckbox
                                  checked={isSelected}
                                  onChange={() => toggleOne(order.id)}
                                  ariaLabel={`تحديد طلب ${order.id.slice(-6)}`}
                                />
                              </td>
                              <td><span className="order-id-badge">#{order.id.slice(-6).toUpperCase()}</span></td>
                              <td>
                                <strong>{order.customerName}</strong>
                                {order.customer?.name && order.customer.name !== order.customerName && <div className="sub-text">{order.customer.name}</div>}
                              </td>
                              <td dir="ltr" className="phone-cell">{order.customerPhone}</td>
                              <td className="address-cell" title={order.deliveryAddress}>{order.deliveryAddress}</td>
                              <td>
                                <strong>{order.merchant.storeName}</strong>
                                <div className="sub-text" dir="ltr">{order.merchant.user.phone}</div>
                              </td>
                              <td className="amount-cell">{formatEGP(order.total)}</td>
                              <td className="sub-text">{PAYMENT_AR[order.paymentMethod] ?? order.paymentMethod}</td>
                              <td style={{ textAlign: 'center' }}>{order.items.length}</td>
                              <td>
                                <AdminStatusBadge
                                  label={ORDER_STATUS_AR[order.status] ?? order.status}
                                  color={ORDER_STATUS_COLOR[order.status]}
                                />
                              </td>
                              <td className="date-cell">{formatDate(order.createdAt)}</td>
                              <td onClick={e => e.stopPropagation()}>
                                <div className="action-row">
                                  <button className="icon-btn" title="نسخ الهاتف" onClick={() => copyPhone(order.customerPhone)}>📋</button>
                                  <button className="icon-btn" title="واتساب" onClick={() => openWhatsApp(order.customerPhone)}>💬</button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <span className="pagination-info">{orderTotal.toLocaleString('ar-EG')} طلب — صفحة {orderPage} من {totalPages}</span>
                    <div className="pagination-btns">
                      <button disabled={orderPage <= 1} onClick={() => setOrderPage(1)}>«</button>
                      <button disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)}>‹</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pg = Math.max(1, Math.min(orderPage - 2, totalPages - 4)) + i;
                        return pg <= totalPages ? (
                          <button key={pg} onClick={() => setOrderPage(pg)}
                            style={orderPage === pg ? { background: 'var(--brown)', color: 'var(--cream)', border: '1px solid var(--brown)' } : {}}>
                            {pg}
                          </button>
                        ) : null;
                      })}
                      <button disabled={orderPage >= totalPages} onClick={() => setOrderPage(p => p + 1)}>›</button>
                      <button disabled={orderPage >= totalPages} onClick={() => setOrderPage(totalPages)}>»</button>
                    </div>
                  </div>
                )}

                {/* Bulk action bar — appears when ≥1 row selected */}
                <AdminBulkActionBar
                  count={selectedOrderIds.size}
                  label="طلب محدد"
                  onClear={() => { setSelectedOrderIds(new Set()); setBulkOrderStatus(''); }}
                >
                  <select
                    value={bulkOrderStatus}
                    onChange={(e) => setBulkOrderStatus(e.target.value)}
                    className="admin-bulk-action"
                    style={{ padding: '6px 10px' }}
                  >
                    <option value="">اختر الحالة الجديدة...</option>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s]}</option>)}
                  </select>
                  <button
                    className="admin-bulk-action success"
                    disabled={!bulkOrderStatus || bulkOrderUpdating}
                    onClick={() => {
                      if (bulkOrderStatus === 'CANCELLED' || bulkOrderStatus === 'DELIVERED') {
                        setBulkOrderConfirm({ status: bulkOrderStatus });
                      } else {
                        bulkUpdateOrderStatus(Array.from(selectedOrderIds), bulkOrderStatus);
                      }
                    }}
                  >
                    {bulkOrderUpdating ? '⏳ جاري التحديث...' : '✓ تطبيق'}
                  </button>
                </AdminBulkActionBar>

                {/* Confirm dialog for destructive bulk transitions */}
                <AdminConfirmDialog
                  open={!!bulkOrderConfirm}
                  variant={bulkOrderConfirm?.status === 'CANCELLED' ? 'danger' : 'warning'}
                  title={`تحديث ${selectedOrderIds.size} طلب`}
                  message={`سيتم تغيير حالة ${selectedOrderIds.size} طلب إلى "${bulkOrderConfirm ? (ORDER_STATUS_AR[bulkOrderConfirm.status as keyof typeof ORDER_STATUS_AR] ?? bulkOrderConfirm.status) : ''}". هل أنت متأكد؟`}
                  confirmLabel="نعم، تطبيق"
                  onConfirm={() => {
                    if (!bulkOrderConfirm) return;
                    bulkUpdateOrderStatus(Array.from(selectedOrderIds), bulkOrderConfirm.status);
                    setBulkOrderConfirm(null);
                  }}
                  onCancel={() => setBulkOrderConfirm(null)}
                />
              </section>
            );
          })()}

          {/* ════════════════════════════════════════════════════════
              MERCHANTS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'merchants' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إدارة التجار</h2>
                  <p className="pg-subtitle">إنشاء التجار وإدارة حالاتهم وصورهم ومعلوماتهم</p>
                </div>
                <div className="pg-actions">
                  <button className="topbar-btn" onClick={() => {
                    const target = selectedMerchantIds.size > 0
                      ? merchants.filter(m => selectedMerchantIds.has(m.id))
                      : merchants.filter(m => {
                          const matchStatus = merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter;
                          const q = merchantSearch.toLowerCase();
                          return matchStatus && (!q || m.storeName.toLowerCase().includes(q) || m.user.phone.includes(q));
                        });
                    if (target.length === 0) { toast.info('لا توجد متاجر للتصدير'); return; }
                    downloadCSV('merchants', ['ID', 'اسم المتجر', 'الهاتف', 'الحالة', 'العنوان', 'العمولة', 'تاريخ الانضمام'], target, (m: Merchant) => [
                      m.id, m.storeName, m.user?.phone ?? '', m.status, m.address ?? '', m.commissionPercentage ?? '', formatDate((m as any).createdAt ?? ''),
                    ]);
                    toast.success(`تصدير ${target.length} ${selectedMerchantIds.size > 0 ? 'متجر محدد' : 'متجر'}`);
                  }}>📊 تصدير CSV</button>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCreateMerchant(true)}
                    style={{ fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    + إضافة تاجر جديد
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
                {(['ALL','PENDING','APPROVED','BLOCKED'] as const).map(s => {
                  const count = s === 'ALL' ? merchants.length : merchants.filter(m => m.status === s).length;
                  const color = s === 'APPROVED' ? 'green' : s === 'PENDING' ? 'gold' : s === 'BLOCKED' ? 'red' : 'blue';
                  const label = s === 'ALL' ? 'الكل' : s === 'APPROVED' ? 'موافق عليهم' : s === 'PENDING' ? 'في الانتظار' : 'محظورون';
                  return (
                    <div key={s} className={`an-card ${color}`} style={{ cursor: 'pointer', outline: merchantStatusFilter === s ? '2px solid var(--brown)' : 'none' }}
                      onClick={() => setMerchantStatusFilter(s)}>
                      <div className="an-card-label">{label}</div>
                      <div className="an-card-value">{count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Search + view toggle */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="بحث باسم المتجر أو رقم الهاتف..."
                  value={merchantSearch}
                  onChange={e => setMerchantSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(71,39,21,0.05)', borderRadius: 10 }}>
                  <button
                    onClick={() => setMerchantView('table')}
                    style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, background: merchantView === 'table' ? 'var(--brown)' : 'transparent', color: merchantView === 'table' ? 'var(--cream)' : 'var(--muted)' }}
                  >
                    📋 جدول
                  </button>
                  <button
                    onClick={() => setMerchantView('grid')}
                    style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, background: merchantView === 'grid' ? 'var(--brown)' : 'transparent', color: merchantView === 'grid' ? 'var(--cream)' : 'var(--muted)' }}
                  >
                    🔳 شبكة
                  </button>
                </div>
              </div>

              {(() => {
                const filteredMerchants = merchants.filter(m => {
                  const matchStatus = merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter;
                  const q = merchantSearch.toLowerCase();
                  const matchSearch = !q || m.storeName.toLowerCase().includes(q) || m.user.phone.includes(q);
                  return matchStatus && matchSearch;
                });

                if (merchantView === 'table') {
                  const filteredIds = filteredMerchants.map(m => m.id);
                  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedMerchantIds.has(id));
                  const someSelected = filteredIds.some(id => selectedMerchantIds.has(id)) && !allSelected;
                  const toggleAll = () => {
                    setSelectedMerchantIds(prev => {
                      const next = new Set(prev);
                      if (allSelected) filteredIds.forEach(id => next.delete(id));
                      else filteredIds.forEach(id => next.add(id));
                      return next;
                    });
                  };
                  const toggleOne = (id: string) => {
                    setSelectedMerchantIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  };
                  const statusMeta: Record<string, { label: string; color: string }> = {
                    APPROVED: { label: '✓ موافق', color: '#16a34a' },
                    PENDING: { label: '⏳ انتظار', color: '#d97706' },
                    REJECTED: { label: '✕ مرفوض', color: '#dc2626' },
                    BLOCKED: { label: '🔒 محظور', color: '#7c2d12' },
                  };

                  return (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th className="checkbox-col">
                                <AdminCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} ariaLabel="تحديد الكل" />
                              </th>
                              <th>الشعار</th>
                              <th>اسم المتجر</th>
                              <th>الهاتف</th>
                              <th>المنتجات</th>
                              <th>الطلبات</th>
                              <th>الحالة</th>
                              <th>تاريخ الانضمام</th>
                              <th>إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMerchants.map(merchant => {
                              const isSelected = selectedMerchantIds.has(merchant.id);
                              const meta = statusMeta[merchant.status] ?? { label: merchant.status, color: 'var(--muted)' };
                              const productCount = (merchant as any)?._count?.products ?? '—';
                              const orderCount = (merchant as any)?._count?.orders ?? '—';
                              return (
                                <tr key={merchant.id} className={isSelected ? 'row-selected' : ''}>
                                  <td className="checkbox-col">
                                    <AdminCheckbox checked={isSelected} onChange={() => toggleOne(merchant.id)} ariaLabel={`تحديد ${merchant.storeName}`} />
                                  </td>
                                  <td>
                                    {merchant.logoUrl ? (
                                      <img src={merchant.logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(71,39,21,0.10)' }} />
                                    ) : (
                                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                                        {merchant.storeName.charAt(0)}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ fontWeight: 700 }} title={merchant.storeName}>
                                    {merchant.storeName}
                                    {merchant.address && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginTop: 2 }}>{merchant.address}</div>}
                                  </td>
                                  <td dir="ltr" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{merchant.user.phone}</td>
                                  <td style={{ textAlign: 'center' }}>{productCount}</td>
                                  <td style={{ textAlign: 'center' }}>{orderCount}</td>
                                  <td>
                                    <AdminStatusBadge label={meta.label} color={meta.color} />
                                  </td>
                                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{formatDate((merchant as any).createdAt ?? '')}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      <button className="admin-row-btn" onClick={() => {
                                        setEditingMerchant(merchant);
                                        setEditMerchantForm({
                                          storeName: merchant.storeName,
                                          description: merchant.description ?? '',
                                          address: merchant.address ?? '',
                                          businessHours: merchant.businessHours ?? '',
                                          commissionPercentage: merchant.commissionPercentage != null ? String(merchant.commissionPercentage) : '',
                                        });
                                      }}>✏️ تعديل</button>
                                      {merchant.status === 'PENDING' && (
                                        <>
                                          <button className="admin-row-btn success" onClick={() => updateMerchantStatus(merchant.id, 'APPROVED')}>✓ قبول</button>
                                          <button className="admin-row-btn danger" onClick={() => updateMerchantStatus(merchant.id, 'REJECTED')}>✕ رفض</button>
                                        </>
                                      )}
                                      {merchant.status === 'APPROVED' && (
                                        <button className="admin-row-btn danger" onClick={() => updateMerchantStatus(merchant.id, 'BLOCKED')}>🔒 تعطيل</button>
                                      )}
                                      {merchant.status === 'BLOCKED' && (
                                        <button className="admin-row-btn success" onClick={() => updateMerchantStatus(merchant.id, 'APPROVED')}>🔓 تفعيل</button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredMerchants.length === 0 && (
                              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                {merchants.length === 0 ? 'لا يوجد تجار بعد' : 'لا توجد نتائج مطابقة'}
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <AdminBulkActionBar
                        count={selectedMerchantIds.size}
                        label="متجر محدد"
                        onClear={() => setSelectedMerchantIds(new Set())}
                      >
                        <button className="admin-bulk-action success" onClick={() => setMerchantConfirm({ type: 'bulkApprove', ids: Array.from(selectedMerchantIds) })}>
                          ✓ موافقة
                        </button>
                        <button className="admin-bulk-action danger" onClick={() => setMerchantConfirm({ type: 'bulkReject', ids: Array.from(selectedMerchantIds) })}>
                          ✕ رفض
                        </button>
                        <button className="admin-bulk-action success" onClick={() => setMerchantConfirm({ type: 'bulkActivate', ids: Array.from(selectedMerchantIds) })}>
                          🔓 تفعيل
                        </button>
                        <button className="admin-bulk-action warning" onClick={() => setMerchantConfirm({ type: 'bulkDeactivate', ids: Array.from(selectedMerchantIds) })}>
                          🔒 تعطيل
                        </button>
                      </AdminBulkActionBar>

                      <AdminConfirmDialog
                        open={!!merchantConfirm}
                        variant={merchantConfirm?.type === 'bulkReject' || merchantConfirm?.type === 'bulkDeactivate' ? 'danger' : 'warning'}
                        title={
                          merchantConfirm?.type === 'bulkApprove' ? `الموافقة على ${merchantConfirm.ids.length} متجر` :
                          merchantConfirm?.type === 'bulkReject' ? `رفض ${merchantConfirm.ids.length} متجر` :
                          merchantConfirm?.type === 'bulkActivate' ? `تفعيل ${merchantConfirm.ids.length} متجر` :
                          merchantConfirm?.type === 'bulkDeactivate' ? `تعطيل ${merchantConfirm.ids.length} متجر` : ''
                        }
                        message={`سيتم تطبيق العملية على ${merchantConfirm?.ids.length ?? 0} متجر. هل أنت متأكد؟`}
                        confirmLabel="نعم، تطبيق"
                        onConfirm={() => {
                          if (!merchantConfirm) return;
                          const map: Record<typeof merchantConfirm.type, 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'> = {
                            bulkApprove: 'APPROVED',
                            bulkReject: 'REJECTED',
                            bulkActivate: 'APPROVED',
                            bulkDeactivate: 'BLOCKED',
                          };
                          bulkSetMerchantStatus(merchantConfirm.ids, map[merchantConfirm.type]);
                          setMerchantConfirm(null);
                        }}
                        onCancel={() => setMerchantConfirm(null)}
                      />
                    </>
                  );
                }

                /* Grid view (existing card-row layout) */
                return (
                  <div className="list-panel">
                    <div className="lp-head">
                      <h3>قائمة التجار ({filteredMerchants.length})</h3>
                    </div>
                    <div className="lp-body">
                      {filteredMerchants.map(merchant => (
                    <div className="lp-row" key={merchant.id} style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Logo avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {merchant.logoUrl ? (
                          <img src={merchant.logoUrl} alt="logo" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(71,39,21,0.15)' }} />
                        ) : (
                          <div className="lp-rank" style={{ width: 48, height: 48, background: merchant.status === 'APPROVED' ? '#16a34a' : merchant.status === 'PENDING' ? '#c8860a' : '#dc2626', fontSize: 18 }}>
                            {merchant.storeName.charAt(0)}
                          </div>
                        )}
                        {merchant.isVisible === false && (
                          <span style={{ position: 'absolute', bottom: -2, right: -2, background: '#6b7280', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>
                            🚫
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="lp-info" style={{ flex: 1, minWidth: 140 }}>
                        <strong style={{ fontFamily: 'Cairo', fontSize: 14 }}>{merchant.storeName}</strong>
                        <div className="lp-sub" dir="ltr" style={{ fontSize: 11 }}>
                          {merchant.user.phone}
                          {merchant.address ? ` · ${merchant.address}` : ''}
                        </div>
                        {merchant.description && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Cairo', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                            {merchant.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'Cairo', background: merchant.status === 'APPROVED' ? '#dcfce7' : merchant.status === 'PENDING' ? '#fef3c7' : '#fee2e2', color: merchant.status === 'APPROVED' ? '#166534' : merchant.status === 'PENDING' ? '#92400e' : '#991b1b' }}>
                            {merchant.status === 'APPROVED' ? 'موافق عليه' : merchant.status === 'PENDING' ? 'في الانتظار' : merchant.status === 'REJECTED' ? 'مرفوض' : 'محظور'}
                          </span>
                          {merchant.commissionPercentage != null && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'Cairo', background: '#ede9fe', color: '#5b21b6' }}>
                              عمولة: {merchant.commissionPercentage}%
                            </span>
                          )}
                          {merchant.isVisible === false && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'Cairo', background: '#f3f4f6', color: '#6b7280' }}>
                              مخفي
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingMerchant(merchant);
                            setEditMerchantForm({
                              storeName: merchant.storeName,
                              description: merchant.description ?? '',
                              address: merchant.address ?? '',
                              businessHours: merchant.businessHours ?? '',
                              commissionPercentage: merchant.commissionPercentage != null ? String(merchant.commissionPercentage) : '',
                            });
                          }}
                          disabled={merchantActionLoading === merchant.id}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: '1px solid rgba(71,39,21,0.2)', background: 'var(--paper)', color: 'var(--brown)', cursor: 'pointer' }}
                        >
                          تعديل
                        </button>

                        {merchant.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateMerchantStatus(merchant.id, 'APPROVED')}
                              disabled={merchantActionLoading === merchant.id}
                              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                            >
                              موافقة
                            </button>
                            <button
                              onClick={() => updateMerchantStatus(merchant.id, 'REJECTED')}
                              disabled={merchantActionLoading === merchant.id}
                              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}
                            >
                              رفض
                            </button>
                          </>
                        )}
                        {merchant.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              const reason = window.prompt('سبب الإيقاف (اختياري):') ?? '';
                              updateMerchantStatus(merchant.id, 'BLOCKED', reason || undefined);
                            }}
                            disabled={merchantActionLoading === merchant.id}
                            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}
                          >
                            إيقاف
                          </button>
                        )}
                        {merchant.status === 'BLOCKED' && (
                          <button
                            onClick={() => updateMerchantStatus(merchant.id, 'APPROVED')}
                            disabled={merchantActionLoading === merchant.id}
                            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                          >
                            تفعيل
                          </button>
                        )}

                        <button
                          onClick={() => toggleMerchantVisibility(merchant)}
                          disabled={merchantActionLoading === merchant.id}
                          title={merchant.isVisible === false ? 'إظهار في التطبيق' : 'إخفاء من التطبيق'}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: 'Cairo', border: '1px solid rgba(71,39,21,0.2)', background: merchant.isVisible === false ? '#f3f4f6' : '#e0f2fe', color: merchant.isVisible === false ? '#6b7280' : '#0369a1', cursor: 'pointer' }}
                        >
                          {merchant.isVisible === false ? '👁 إظهار' : '🚫 إخفاء'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredMerchants.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>
                      لا يوجد تجار
                    </div>
                  )}
                </div>
              </div>
                );
              })()}

              {/* ── Edit Merchant Modal ────────────────────────────────── */}
              {editingMerchant && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div style={{ background: 'var(--paper)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ fontFamily: 'Cairo', fontSize: 18, color: 'var(--brown)', margin: 0 }}>
                        تعديل: {editingMerchant.storeName}
                      </h3>
                      <button onClick={() => setEditingMerchant(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
                    </div>

                    {/* Logo & Banner upload */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                      <div>
                        <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>شعار المتجر</div>
                        <div style={{ border: '2px dashed rgba(71,39,21,0.2)', borderRadius: 10, padding: 12, textAlign: 'center', position: 'relative' }}>
                          {editingMerchant.logoUrl ? (
                            <img src={editingMerchant.logoUrl} alt="logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                          ) : (
                            <div style={{ width: 80, height: 80, background: 'rgba(71,39,21,0.1)', borderRadius: 8, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏪</div>
                          )}
                          <label style={{ display: 'block', fontSize: 12, fontFamily: 'Cairo', color: 'var(--brown)', cursor: 'pointer', padding: '4px 10px', background: 'rgba(71,39,21,0.08)', borderRadius: 6 }}>
                            {merchantLogoUploading ? 'جاري الرفع...' : 'رفع شعار'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={merchantLogoUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadMerchantLogo(editingMerchant.id, f); }} />
                          </label>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>صورة الغلاف</div>
                        <div style={{ border: '2px dashed rgba(71,39,21,0.2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                          {editingMerchant.bannerUrl ? (
                            <img src={editingMerchant.bannerUrl} alt="banner" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                          ) : (
                            <div style={{ width: '100%', height: 80, background: 'rgba(71,39,21,0.1)', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🖼</div>
                          )}
                          <label style={{ display: 'block', fontSize: 12, fontFamily: 'Cairo', color: 'var(--brown)', cursor: 'pointer', padding: '4px 10px', background: 'rgba(71,39,21,0.08)', borderRadius: 6 }}>
                            {merchantBannerUploading ? 'جاري الرفع...' : 'رفع غلاف'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={merchantBannerUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadMerchantBanner(editingMerchant.id, f); }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Fields */}
                    {[
                      { key: 'storeName', label: 'اسم المتجر', placeholder: 'مثال: عسل سدر ملكي' },
                      { key: 'description', label: 'وصف المتجر', placeholder: 'وصف مختصر عن المتجر' },
                      { key: 'address', label: 'العنوان', placeholder: 'المدينة، المنطقة' },
                      { key: 'businessHours', label: 'ساعات العمل', placeholder: 'مثال: 9 صباحاً - 10 مساءً' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
                        <input
                          value={editMerchantForm[key as keyof typeof editMerchantForm]}
                          onChange={e => setEditMerchantForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}

                    {/* Commission */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>نسبة العمولة (% - اتركه فارغاً للافتراضي)</label>
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={editMerchantForm.commissionPercentage}
                        onChange={e => setEditMerchantForm(prev => ({ ...prev, commissionPercentage: e.target.value }))}
                        placeholder="الافتراضي للمنصة"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingMerchant(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', background: 'var(--paper)', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', color: 'var(--brown)' }}>
                        إلغاء
                      </button>
                      <button
                        onClick={() => editMerchantInfo(editingMerchant.id)}
                        disabled={merchantActionLoading === editingMerchant.id}
                        style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'var(--brown)', color: '#fff', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer' }}
                      >
                        {merchantActionLoading === editingMerchant.id ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Create Merchant Modal ──────────────────────────────── */}
              {showCreateMerchant && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div style={{ background: 'var(--paper)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ fontFamily: 'Cairo', fontSize: 18, color: 'var(--brown)', margin: 0 }}>إضافة تاجر جديد</h3>
                      <button onClick={() => setShowCreateMerchant(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
                    </div>
                    {[
                      { key: 'phone', label: 'رقم الهاتف *', placeholder: '+201xxxxxxxxx', type: 'tel' },
                      { key: 'storeName', label: 'اسم المتجر *', placeholder: 'مثال: عسل سدر ملكي', type: 'text' },
                      { key: 'description', label: 'وصف المتجر', placeholder: 'اختياري', type: 'text' },
                      { key: 'address', label: 'العنوان', placeholder: 'اختياري', type: 'text' },
                      { key: 'password', label: 'كلمة مرور مؤقتة', placeholder: 'اختياري — سيتم توليدها تلقائياً', type: 'password' },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key} style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
                        <input
                          type={type}
                          value={createMerchantForm[key as keyof typeof createMerchantForm]}
                          onChange={e => setCreateMerchantForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                      <button onClick={() => setShowCreateMerchant(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', background: 'var(--paper)', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', color: 'var(--brown)' }}>
                        إلغاء
                      </button>
                      <button
                        onClick={createMerchant}
                        disabled={createMerchantLoading}
                        style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'var(--brown)', color: '#fff', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer' }}
                      >
                        {createMerchantLoading ? 'جاري الإنشاء...' : 'إنشاء التاجر'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              PRODUCTS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'products' && (
            <div>
              {/* Header */}
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إدارة المنتجات</h2>
                  <p className="pg-subtitle">إنشاء وتعديل وإدارة منتجات السوق</p>
                </div>
                <div className="pg-actions">
                  <button className="topbar-btn" onClick={refreshAll}>🔄 تحديث</button>
                  <button className="topbar-btn" onClick={() => {
                    const target = selectedProductIds.size > 0
                      ? products.filter(p => selectedProductIds.has(p.id))
                      : products.filter(p => {
                          const q = productSearch.toLowerCase();
                          const nameMatch = !q || p.name.toLowerCase().includes(q);
                          const mMatch = productMerchantFilter === 'ALL' || p.merchantId === productMerchantFilter;
                          return nameMatch && mMatch;
                        });
                    if (target.length === 0) { toast.info('لا توجد منتجات للتصدير'); return; }
                    downloadCSV('products', ['ID', 'الاسم', 'المتجر', 'الفئة', 'السعر', 'السعر القديم', 'المخزون', 'الحالة'], target, (p: Product) => [
                      p.id, p.name, p.merchant?.storeName ?? '', p.category?.name ?? '', Number(p.price).toFixed(2), p.oldPrice != null ? Number(p.oldPrice).toFixed(2) : '', p.stock, p.status,
                    ]);
                    toast.success(`تصدير ${target.length} ${selectedProductIds.size > 0 ? 'منتج محدد' : 'منتج'}`);
                  }}>📊 تصدير CSV</button>
                  <button
                    onClick={openCreateProduct}
                    style={{ padding: '9px 18px', borderRadius: 12, background: 'linear-gradient(135deg,var(--orange),var(--gold))', color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(212,140,28,0.35)' }}
                  >+ إضافة منتج</button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                <div className="an-card blue"><div className="an-card-icon">📦</div><div className="an-card-label">إجمالي المنتجات</div><div className="an-card-value">{products.length}</div></div>
                <div className="an-card green"><div className="an-card-icon">✅</div><div className="an-card-label">نشطة</div><div className="an-card-value">{products.filter(p => p.status === 'ACTIVE').length}</div></div>
                <div className="an-card orange"><div className="an-card-icon">⚠️</div><div className="an-card-label">نفد المخزون</div><div className="an-card-value">{products.filter(p => p.stock === 0).length}</div></div>
                <div className="an-card" style={{ background: 'linear-gradient(135deg,#fecaca,#fee2e2)', border: '1px solid #dc2626' }}><div className="an-card-icon">🚫</div><div className="an-card-label">محظورة</div><div className="an-card-value">{products.filter(p => p.status === 'BLOCKED').length}</div></div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text" placeholder="🔍 بحث بالاسم..."
                  value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', background: 'var(--paper)', color: 'var(--brown)', minWidth: 220 }}
                />
                <select
                  value={productMerchantFilter} onChange={e => setProductMerchantFilter(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }}
                >
                  <option value="ALL">كل المتاجر</option>
                  {merchants.map(m => <option key={m.id} value={m.id}>{m.storeName}</option>)}
                </select>
                <div style={{ marginRight: 'auto', display: 'flex', gap: 4, padding: 4, background: 'rgba(71,39,21,0.05)', borderRadius: 10 }}>
                  <button
                    onClick={() => setProductView('table')}
                    style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, background: productView === 'table' ? 'var(--brown)' : 'transparent', color: productView === 'table' ? 'var(--cream)' : 'var(--muted)' }}
                  >
                    📋 جدول
                  </button>
                  <button
                    onClick={() => setProductView('grid')}
                    style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, background: productView === 'grid' ? 'var(--brown)' : 'transparent', color: productView === 'grid' ? 'var(--cream)' : 'var(--muted)' }}
                  >
                    🔳 شبكة
                  </button>
                </div>
              </div>

              {(() => {
                const q = productSearch.toLowerCase();
                const filteredProducts = products.filter(p => {
                  const nameMatch = !q || p.name.toLowerCase().includes(q);
                  const mMatch = productMerchantFilter === 'ALL' || p.merchantId === productMerchantFilter;
                  return nameMatch && mMatch;
                });
                const filteredIds = filteredProducts.map(p => p.id);
                const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedProductIds.has(id));
                const someSelected = filteredIds.some(id => selectedProductIds.has(id)) && !allSelected;
                const toggleAll = () => {
                  setSelectedProductIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) filteredIds.forEach(id => next.delete(id));
                    else filteredIds.forEach(id => next.add(id));
                    return next;
                  });
                };
                const toggleOne = (id: string) => {
                  setSelectedProductIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                };

                if (productView === 'table') {
                  return (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th className="checkbox-col">
                              <AdminCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} ariaLabel="تحديد الكل" />
                            </th>
                            <th>الصورة</th>
                            <th>اسم المنتج</th>
                            <th>المتجر</th>
                            <th>الفئة</th>
                            <th>السعر</th>
                            <th>المخزون</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map(product => {
                            const isSelected = selectedProductIds.has(product.id);
                            return (
                              <tr key={product.id} className={isSelected ? 'row-selected' : ''}>
                                <td className="checkbox-col">
                                  <AdminCheckbox checked={isSelected} onChange={() => toggleOne(product.id)} ariaLabel={`تحديد ${product.name}`} />
                                </td>
                                <td>
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl.startsWith('/') ? `${apiUrl}${product.imageUrl}` : product.imageUrl}
                                      alt={product.name}
                                      style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(71,39,21,0.10)' }} />
                                  ) : (
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛒</div>
                                  )}
                                </td>
                                <td style={{ fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.name}>{product.name}</td>
                                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{product.merchant.storeName}</td>
                                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{product.category?.name || '—'}</td>
                                <td style={{ fontWeight: 800, color: 'var(--orange)' }}>{formatEGP(product.price)}</td>
                                <td style={{ textAlign: 'center', color: product.stock === 0 ? '#dc2626' : 'var(--brown)', fontWeight: 700 }}>
                                  {product.stock === 0 ? 'نفد' : product.stock}
                                </td>
                                <td>
                                  <AdminStatusBadge
                                    label={product.status === 'ACTIVE' ? '✓ نشط' : '✕ محظور'}
                                    color={product.status === 'ACTIVE' ? '#16a34a' : '#dc2626'}
                                  />
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button className="admin-row-btn" onClick={() => openEditProduct(product)}>✏️ تعديل</button>
                                    <button
                                      className={`admin-row-btn ${product.status === 'ACTIVE' ? 'danger' : 'success'}`}
                                      onClick={() => updateProduct(product.id, product.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE')}
                                      disabled={productActionLoadingId === product.id}
                                    >
                                      {product.status === 'ACTIVE' ? '✕ تعطيل' : '✓ تفعيل'}
                                    </button>
                                    <button className="admin-row-btn danger" onClick={() => setProductConfirm({ type: 'delete', ids: [product.id] })}>🗑️</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredProducts.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                              {products.length === 0 ? 'لا توجد منتجات بعد' : 'لا توجد منتجات مطابقة'}
                            </td></tr>
                          )}
                        </tbody>
                      </table>

                      {/* Bulk action bar */}
                      <AdminBulkActionBar
                        count={selectedProductIds.size}
                        label="منتج محدد"
                        onClear={() => setSelectedProductIds(new Set())}
                      >
                        <button className="admin-bulk-action success" onClick={() => bulkSetProductStatus(Array.from(selectedProductIds), 'ACTIVE')}>
                          ✓ تفعيل
                        </button>
                        <button className="admin-bulk-action warning" onClick={() => bulkSetProductStatus(Array.from(selectedProductIds), 'BLOCKED')}>
                          ✕ تعطيل
                        </button>
                        <button className="admin-bulk-action danger" onClick={() => setProductConfirm({ type: 'bulkDelete', ids: Array.from(selectedProductIds) })}>
                          🗑️ حذف
                        </button>
                      </AdminBulkActionBar>

                      {/* Confirm dialog (shared for delete + bulkDelete) */}
                      <AdminConfirmDialog
                        open={!!productConfirm}
                        variant="danger"
                        title={productConfirm?.type === 'delete' ? 'حذف المنتج' : `حذف ${productConfirm?.ids.length ?? 0} منتج`}
                        message={productConfirm?.type === 'delete'
                          ? 'هل أنت متأكد من حذف هذا المنتج نهائيًا؟ لا يمكن التراجع.'
                          : `سيتم حذف ${productConfirm?.ids.length ?? 0} منتج بشكل نهائي. لا يمكن التراجع.`}
                        confirmLabel="نعم، حذف"
                        onConfirm={() => {
                          if (!productConfirm) return;
                          if (productConfirm.type === 'delete') {
                            api(`/admin/products/${productConfirm.ids[0]}`, { method: 'DELETE' })
                              .then(() => { setProducts(prev => prev.filter(p => p.id !== productConfirm.ids[0])); toast.success('تم حذف المنتج'); })
                              .catch(() => toast.error('فشل الحذف'));
                          } else {
                            bulkDeleteProducts(productConfirm.ids);
                          }
                          setProductConfirm(null);
                        }}
                        onCancel={() => setProductConfirm(null)}
                      />
                    </div>
                  );
                }

                /* Grid view (existing) */
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {filteredProducts.map(product => (
                    <div key={product.id} style={{ background: 'var(--paper)', borderRadius: 16, boxShadow: '0 2px 12px rgba(71,39,21,0.08)', border: '1px solid rgba(71,39,21,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* Image */}
                      <div style={{ height: 160, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl.startsWith('/') ? `${apiUrl}${product.imageUrl}` : product.imageUrl}
                            alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🛒</div>
                        )}
                        {/* Status badge */}
                        <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Cairo', fontWeight: 700,
                          background: product.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: product.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                          border: `1px solid ${product.status === 'ACTIVE' ? '#16a34a' : '#dc2626'}` }}>
                          {product.status === 'ACTIVE' ? 'نشط' : 'محظور'}
                        </span>
                        {product.stock === 0 && (
                          <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontFamily: 'Cairo', fontWeight: 700, background: '#fef3c7', color: '#d97706', border: '1px solid #d97706' }}>نفد</span>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, color: 'var(--brown)', direction: 'rtl' }}>{product.name}</div>
                        <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', direction: 'rtl' }}>{product.merchant.storeName} {product.category ? `· ${product.category.name}` : ''}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, direction: 'rtl' }}>
                          <span style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 16, color: 'var(--orange)' }}>{formatEGP(product.price)}</span>
                          {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                            <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>{formatEGP(product.oldPrice)}</span>
                          )}
                          <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', marginRight: 'auto' }}>مخزون: {product.stock}</span>
                        </div>
                        {(product.displayRating != null || product.displayReviewCount != null || product.displaySalesCount != null) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 2, direction: 'rtl' }}>
                            {product.displayRating != null && <span style={{ fontFamily: 'Cairo', fontSize: 11, color: '#d97706' }}>⭐ {product.displayRating}</span>}
                            {product.displayReviewCount != null && <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)' }}>💬 {product.displayReviewCount}</span>}
                            {product.displaySalesCount != null && <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)' }}>🛍 {product.displaySalesCount}</span>}
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(71,39,21,0.06)', display: 'flex', gap: 8, direction: 'rtl' }}>
                        <button onClick={() => openEditProduct(product)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 10, background: 'rgba(212,140,28,0.12)', color: 'var(--orange)', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12, border: '1px solid rgba(212,140,28,0.25)', cursor: 'pointer' }}>
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => updateProduct(product.id, product.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE')}
                          disabled={productActionLoadingId === product.id}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 10,
                            background: product.status === 'ACTIVE' ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                            color: product.status === 'ACTIVE' ? '#dc2626' : '#16a34a', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12,
                            border: `1px solid ${product.status === 'ACTIVE' ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
                            cursor: productActionLoadingId === product.id ? 'wait' : 'pointer',
                            opacity: productActionLoadingId === product.id ? 0.55 : 1 }}>
                          {productActionLoadingId === product.id ? '⏳' : (product.status === 'ACTIVE' ? '🚫 إيقاف' : '✅ تفعيل')}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          disabled={productActionLoadingId === product.id}
                          style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.07)', color: '#dc2626', fontFamily: 'Cairo', fontSize: 12, border: '1px solid rgba(220,38,38,0.15)',
                            cursor: productActionLoadingId === product.id ? 'wait' : 'pointer',
                            opacity: productActionLoadingId === product.id ? 0.55 : 1 }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                {filteredProducts.length === 0 && (
                  <div style={{ gridColumn: '1/-1', padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo', fontSize: 15 }}>
                    📦 لا توجد منتجات
                  </div>
                )}
              </div>
                );
              })()}

              {/* ── Create / Edit Product Modal ───────────────────── */}
              {showCreateProduct && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ background: 'var(--paper)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', direction: 'rtl' }}>
                    {/* Modal header */}
                    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(71,39,21,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 }}>
                      <h3 style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 17, color: 'var(--brown)', margin: 0 }}>
                        {editingProduct ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}
                      </h3>
                      <button onClick={() => { setShowCreateProduct(false); setEditingProduct(null); }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(71,39,21,0.08)', cursor: 'pointer', fontSize: 16, color: 'var(--brown)' }}>✕</button>
                    </div>

                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {/* Image upload */}
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 8 }}>صورة المنتج</label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 110, height: 110, borderRadius: 12, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(212,140,28,0.3)' }}>
                            {productForm.imageUrl ? (
                              <img src={productForm.imageUrl.startsWith('/') ? `${apiUrl}${productForm.imageUrl}` : productForm.imageUrl}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : <span style={{ fontSize: 36 }}>🛒</span>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 10, background: 'rgba(212,140,28,0.1)', color: 'var(--orange)', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, border: '1px solid rgba(212,140,28,0.25)', cursor: productImageUploading ? 'wait' : 'pointer' }}>
                              {productImageUploading ? '⏳ جاري الرفع...' : '📷 رفع صورة'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={productImageUploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadProductImage(f); }} />
                            </label>
                            {productForm.imageUrl && (
                              <button onClick={() => setProductForm(prev => ({ ...prev, imageUrl: '' }))}
                                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.07)', color: '#dc2626', fontFamily: 'Cairo', fontSize: 12, border: '1px solid rgba(220,38,38,0.15)', cursor: 'pointer' }}>
                                🗑 حذف الصورة
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row: Merchant + Category */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>المتجر *</label>
                          <select value={productForm.merchantId} onChange={e => setProductForm(prev => ({ ...prev, merchantId: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }}>
                            <option value="">اختر متجراً</option>
                            {merchants.map(m => <option key={m.id} value={m.id}>{m.storeName}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>التصنيف</label>
                          <select value={productForm.categoryId} onChange={e => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }}>
                            <option value="">بدون تصنيف</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>اسم المنتج *</label>
                        <input type="text" value={productForm.name} onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="مثال: عسل سدر يمني فاخر"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>الوصف</label>
                        <textarea value={productForm.description} onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="وصف تفصيلي للمنتج..." rows={3}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', background: 'var(--paper)', color: 'var(--brown)', resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>

                      {/* Row: Price + Old Price */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>السعر (ج.م) *</label>
                          <input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>السعر القديم (اختياري)</label>
                          <input type="number" min="0" step="0.01" value={productForm.oldPrice} onChange={e => setProductForm(prev => ({ ...prev, oldPrice: e.target.value }))}
                            placeholder="0.00 (للتخفيضات)"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      {/* Row: Stock + Weight + Status */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>المخزون</label>
                          <input type="number" min="0" value={productForm.stock} onChange={e => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>الوزن / الحجم</label>
                          <input type="text" value={productForm.weight} onChange={e => setProductForm(prev => ({ ...prev, weight: e.target.value }))}
                            placeholder="مثال: 500 جرام"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', display: 'block', marginBottom: 6 }}>الحالة</label>
                          <select value={productForm.status} onChange={e => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }}>
                            <option value="ACTIVE">نشط ✅</option>
                            <option value="BLOCKED">موقوف 🚫</option>
                          </select>
                        </div>
                      </div>

                      {/* Admin launch stats */}
                      <div style={{ background: 'rgba(212,140,28,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(212,140,28,0.15)' }}>
                        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--brown)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📊 إحصائيات العرض (للإطلاق)
                          <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>— أرقام تُعرض للعميل فقط، بدون تقييمات حقيقية</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                          <div>
                            <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>⭐ التقييم (0–5)</label>
                            <input type="number" min="0" max="5" step="0.1" value={productForm.displayRating}
                              onChange={e => setProductForm(prev => ({ ...prev, displayRating: e.target.value }))}
                              placeholder="مثال: 4.8"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.12)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>💬 عدد التقييمات</label>
                            <input type="number" min="0" value={productForm.displayReviewCount}
                              onChange={e => setProductForm(prev => ({ ...prev, displayReviewCount: e.target.value }))}
                              placeholder="مثال: 234"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.12)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>🛍 المبيعات</label>
                            <input type="number" min="0" value={productForm.displaySalesCount}
                              onChange={e => setProductForm(prev => ({ ...prev, displaySalesCount: e.target.value }))}
                              placeholder="مثال: 1200"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.12)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button onClick={() => { setShowCreateProduct(false); setEditingProduct(null); }}
                          style={{ padding: '10px 22px', borderRadius: 12, background: 'rgba(71,39,21,0.07)', color: 'var(--brown)', fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, border: '1px solid rgba(71,39,21,0.12)', cursor: 'pointer' }}>
                          إلغاء
                        </button>
                        <button onClick={saveProduct} disabled={productSaving}
                          style={{ padding: '10px 28px', borderRadius: 12, background: productSaving ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--gold))', color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, border: 'none', cursor: productSaving ? 'wait' : 'pointer', boxShadow: productSaving ? 'none' : '0 2px 8px rgba(212,140,28,0.35)' }}>
                          {productSaving ? '⏳ جاري الحفظ...' : editingProduct ? '💾 حفظ التعديلات' : '✅ إنشاء المنتج'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              USERS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'users' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إدارة المستخدمين</h2>
                  <p className="pg-subtitle">قائمة العملاء المسجّلين في المنصة</p>
                </div>
                <div className="pg-actions">
                  <input
                    type="text" placeholder="🔍 بحث بالاسم أو الهاتف..." value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, direction: 'rtl', background: 'var(--paper)', color: 'var(--brown)', minWidth: 240 }}
                  />
                  <button className="topbar-btn" onClick={() => {
                    const q = userSearch.toLowerCase();
                    const target = users.filter(u => !q || (u.name ?? '').toLowerCase().includes(q) || (u.phone ?? '').includes(q));
                    if (target.length === 0) { toast.info('لا يوجد عملاء للتصدير'); return; }
                    downloadCSV('customers', ['ID', 'الاسم', 'الهاتف', 'الرصيد', 'تاريخ التسجيل'], target, (u: AdminUser) => [
                      u.id, u.name ?? '', u.phone ?? '', u.walletBalance ?? '0', formatDate((u as any).createdAt ?? ''),
                    ]);
                    toast.success(`تصدير ${target.length} عميل`);
                  }}>📊 تصدير CSV</button>
                </div>
              </div>

              {/* Quick stats */}
              {userStatsError && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontFamily: 'Cairo', fontSize: 13 }}>
                  ⚠️ {userStatsError}
                </div>
              )}
              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 16 }}>
                <div className="an-card blue">
                  <div className="an-card-icon">👥</div>
                  <div className="an-card-label">إجمالي العملاء</div>
                  <div className="an-card-value">
                    {userStatsLoading ? '…' : (userStats?.totalCustomers ?? 0).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="an-card green">
                  <div className="an-card-icon">✅</div>
                  <div className="an-card-label">نشطون</div>
                  <div className="an-card-value">
                    {userStatsLoading ? '…' : (userStats?.activeCustomers ?? 0).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">🚫</div>
                  <div className="an-card-label">غير نشطين</div>
                  <div className="an-card-value">
                    {userStatsLoading ? '…' : (userStats?.inactiveCustomers ?? 0).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="an-card purple">
                  <div className="an-card-icon">🌟</div>
                  <div className="an-card-label">عملاء اليوم</div>
                  <div className="an-card-value">
                    {userStatsLoading ? '…' : (userStats?.newCustomersToday ?? 0).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="an-card teal">
                  <div className="an-card-icon">📅</div>
                  <div className="an-card-label">عملاء هذا الأسبوع</div>
                  <div className="an-card-value">
                    {userStatsLoading ? '…' : (userStats?.newCustomersThisWeek ?? 0).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>

              <div className="list-panel">
                <div className="lp-head">
                  <h3>العملاء</h3>
                  <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>
                    {usersLoading ? 'جاري التحميل…' : `${(Array.isArray(users) ? users : []).length} عميل`}
                  </span>
                </div>
                <div className="lp-body">
                  {(Array.isArray(users) ? users : [])
                    .filter(u => !userSearch || u.phone?.includes(userSearch) || (u.name ?? '').includes(userSearch))
                    .slice(0, 100)
                    .map((u) => (
                      <div className="emp-row" key={u.id} style={{ opacity: u.isBanned ? 0.6 : 1 }}>
                        <div className="emp-avatar" style={{ background: u.isBanned ? '#dc2626' : undefined }}>{(u.name ?? u.phone ?? '?').charAt(0)}</div>
                        <div className="lp-info">
                          <strong>{u.name || 'بدون اسم'}</strong>
                          <div className="lp-sub" dir="ltr">{u.phone}</div>
                          {u._count && <div className="lp-sub">{u._count.orders} طلب</div>}
                        </div>
                        {u.isBanned && <span className="sec-badge" style={{ background: '#fecaca', color: '#dc2626', border: '1px solid #dc2626' }}>محظور</span>}
                        <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>{formatDate(u.createdAt)}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="icon-btn" onClick={() => copyPhone(u.phone ?? '')}>📋</button>
                          <button className="icon-btn" onClick={() => openWhatsApp(u.phone ?? '')}>💬</button>
                          <button
                            className="icon-btn"
                            title={u.isBanned ? 'إلغاء الحظر' : 'حظر المستخدم'}
                            onClick={() => { if (confirm(u.isBanned ? `إلغاء حظر ${u.name || u.phone}؟` : `حظر ${u.name || u.phone}؟`)) banUser(u.id, !u.isBanned); }}
                            style={{ color: u.isBanned ? '#16a34a' : '#dc2626' }}
                          >{u.isBanned ? '✓' : '🚫'}</button>
                        </div>
                      </div>
                    ))}
                  {!usersLoading && (Array.isArray(users) ? users : []).length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد مستخدمون</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              HOME CMS PANEL (modular)
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'home_cms' && (
            <section className="panel" style={{ overflow: 'visible', borderRadius: 30 }}>
              <ToastProvider>
                <HomeCmsPageWrapper token={token!} apiBase={apiUrl} canManageContent={hasPermission(sessionUser, 'content.manage')} />
              </ToastProvider>
              {false && <>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {([
                  { key: 'banners', label: '🖼 البانرات' },
                  { key: 'promotions', label: '🎁 العروض' },
                  { key: 'sections', label: '⚙️ الأقسام' },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setCmsTab(key)}
                    style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 600, fontSize: 13,
                      background: cmsTab === key ? 'var(--brown)' : 'var(--cream)', color: cmsTab === key ? 'var(--cream)' : 'var(--brown)' }}>
                    {label}
                  </button>
                ))}
              </div>

              {cmsLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>جاري التحميل…</div>}

              {/* Banners */}
              {!cmsLoading && cmsTab === 'banners' && (
                <div>
                  {/* ── Form Card ──────────────────────────────── */}
                  <div style={{ background: 'var(--cream)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontFamily: 'Cairo', margin: '0 0 16px', fontSize: 16, color: 'var(--brown)' }}>
                      {editingBannerId ? '✏️ تعديل البانر' : '➕ إضافة بانر جديد'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, direction: 'rtl' }}>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>العنوان *</label>
                        <input value={bannerForm.title} onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="مثال: عسل سدر جبلي فاخر" style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>العنوان الفرعي</label>
                        <input value={bannerForm.subtitle} onChange={e => setBannerForm(f => ({ ...f, subtitle: e.target.value }))}
                          placeholder="مثال: من مناحل عضوية معتمدة" style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>نص الزر</label>
                        <input value={bannerForm.buttonText} onChange={e => setBannerForm(f => ({ ...f, buttonText: e.target.value }))}
                          placeholder="مثال: تسوق الآن" style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>اللون الأول</label>
                          <input type="color" value={bannerForm.color1} onChange={e => setBannerForm(f => ({ ...f, color1: e.target.value }))}
                            style={{ width: 48, height: 36, marginTop: 4, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>اللون الثاني</label>
                          <input type="color" value={bannerForm.color2} onChange={e => setBannerForm(f => ({ ...f, color2: e.target.value }))}
                            style={{ width: 48, height: 36, marginTop: 4, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer' }}>
                          <input type="checkbox" checked={bannerForm.enabled} onChange={e => setBannerForm(f => ({ ...f, enabled: e.target.checked }))} />
                          مفعّل
                        </label>
                      </div>
                    </div>
                    {/* Image preview + upload */}
                    {(bannerImagePreview || bannerForm.imageUrl) && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <img src={bannerImagePreview || bannerForm.imageUrl} alt="" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                        <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>معاينة الصورة</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="action-btn" onClick={saveBanner}>{editingBannerId ? '💾 حفظ التعديلات' : '➕ إضافة'}</button>
                      {editingBannerId && (
                        <button className="action-btn" onClick={() => { setEditingBannerId(null); setBannerForm({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true, imageUrl: '', sortOrder: 0 }); setBannerImagePreview(''); }}>
                          ✕ إلغاء
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Banner Cards ───────────────────────────── */}
                  {homeBanners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بانرات حتى الآن — أضف أول بانر أعلاه</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                      {homeBanners.map((b, idx) => (
                        <div key={b.id} style={{ background: 'var(--cream)', borderRadius: 16, overflow: 'hidden', border: `2px solid ${b.enabled ? 'var(--orange)' : 'var(--border)'}`, opacity: b.enabled ? 1 : 0.55, transition: 'opacity 0.2s' }}>
                          {/* Preview image */}
                          <div style={{ height: 140, background: b.imageUrl ? undefined : `linear-gradient(135deg, ${b.color1}, ${b.color2})`, position: 'relative' }}>
                            {b.imageUrl ? (
                              <img src={b.imageUrl} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 18, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                {b.title}
                              </div>
                            )}
                            {/* Status badge */}
                            <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Cairo', fontWeight: 700,
                              background: b.enabled ? '#dcfce7' : '#fee2e2',
                              color: b.enabled ? '#16a34a' : '#dc2626',
                              border: `1px solid ${b.enabled ? '#16a34a' : '#dc2626'}` }}>
                              {b.enabled ? 'نشط' : 'معطل'}
                            </span>
                            {/* Order badge */}
                            <span style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                              {idx + 1}
                            </span>
                          </div>
                          {/* Info */}
                          <div style={{ padding: '12px 14px', direction: 'rtl' }}>
                            <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, color: 'var(--brown)' }}>{b.title}</div>
                            {b.subtitle && <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{b.subtitle}</div>}
                            {b.buttonText && <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--orange)', marginTop: 4 }}>🖱 {b.buttonText}</div>}
                          </div>
                          {/* Actions */}
                          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, direction: 'rtl', flexWrap: 'wrap' }}>
                            <button className="icon-btn" title="رفع صورة"
                              onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.jpg,.jpeg,.png,.webp'; inp.onchange = ev => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) uploadBannerImage(b.id, f); }; inp.click(); }}>
                              📷
                            </button>
                            <button className="icon-btn" title="تعديل"
                              onClick={() => { setEditingBannerId(b.id); setBannerForm({ id: b.id, title: b.title, subtitle: b.subtitle ?? '', buttonText: b.buttonText ?? '', color1: b.color1, color2: b.color2, enabled: b.enabled, imageUrl: b.imageUrl ?? '', sortOrder: b.sortOrder }); setBannerImagePreview(b.imageUrl ?? ''); }}>
                              ✏️
                            </button>
                            <button className="icon-btn" title="معاينة"
                              onClick={() => window.open(b.imageUrl || '#', '_blank')}>
                              👁
                            </button>
                            <button className="icon-btn" title="أعلى"
                              disabled={idx === 0}
                              onClick={() => moveBannerUp(idx)}
                              style={{ opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
                              ⬆️
                            </button>
                            <button className="icon-btn" title="أسفل"
                              disabled={idx === homeBanners.length - 1}
                              onClick={() => moveBannerDown(idx)}
                              style={{ opacity: idx === homeBanners.length - 1 ? 0.3 : 1, cursor: idx === homeBanners.length - 1 ? 'not-allowed' : 'pointer' }}>
                              ⬇️
                            </button>
                            <button className="icon-btn" title={b.enabled ? 'إيقاف' : 'تفعيل'}
                              onClick={() => toggleBanner(b)}>
                              {b.enabled ? '🚫' : '✅'}
                            </button>
                            <button className="icon-btn" title="حذف"
                              onClick={() => deleteBanner(b.id)}
                              style={{ color: '#dc2626', marginRight: 'auto' }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Promotions */}
              {!cmsLoading && cmsTab === 'promotions' && (
                <div>
                  <div style={{ background: 'var(--cream)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontFamily: 'Cairo', margin: '0 0 16px', fontSize: 16, color: 'var(--brown)' }}>
                      {editingPromoId ? '✏️ تعديل العرض' : '➕ إضافة عرض جديد'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, direction: 'rtl' }}>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>العنوان *</label>
                        <input value={promoForm.title} onChange={e => setPromoForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="مثال: عروض رمضان" style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>العنوان الفرعي</label>
                        <input value={promoForm.subtitle} onChange={e => setPromoForm(f => ({ ...f, subtitle: e.target.value }))}
                          placeholder="مثال: خصم ٣٠٪ على كل المنتجات" style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>رابط الوجهة</label>
                        <input value={promoForm.targetUrl} onChange={e => setPromoForm(f => ({ ...f, targetUrl: e.target.value }))}
                          placeholder="مثال: store://merchant_id" style={{ width: '100%', marginTop: 4 }} dir="ltr" />
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>بداية العرض</label>
                          <input type="date" value={promoForm.startsAt} onChange={e => setPromoForm(f => ({ ...f, startsAt: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>نهاية العرض</label>
                          <input type="date" value={promoForm.endsAt} onChange={e => setPromoForm(f => ({ ...f, endsAt: e.target.value }))} style={{ width: '100%', marginTop: 4 }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', paddingBottom: 4 }}>
                          <input type="checkbox" checked={promoForm.enabled} onChange={e => setPromoForm(f => ({ ...f, enabled: e.target.checked }))} />
                          مفعّل
                        </label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="action-btn" onClick={savePromotion}>{editingPromoId ? '💾 حفظ التعديلات' : '➕ إضافة'}</button>
                      {editingPromoId && (
                        <button className="action-btn" onClick={() => { setEditingPromoId(null); setPromoForm({ id: '', title: '', subtitle: '', targetUrl: '', enabled: true, startsAt: '', endsAt: '' }); }}>
                          ✕ إلغاء
                        </button>
                      )}
                    </div>
                  </div>

                  {homePromotions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد عروض حتى الآن — أضف أول عرض أعلاه</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {homePromotions.map(p => (
                        <div key={p.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--cream)', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', opacity: p.enabled ? 1 : 0.5 }}>
                          {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 10 }} />}
                          <div style={{ flex: 1, direction: 'rtl' }}>
                            <strong style={{ fontFamily: 'Cairo' }}>{p.title}</strong>
                            {p.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{p.subtitle}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="icon-btn" title="رفع صورة"
                              onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = ev => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) uploadPromoImage(p.id, f); }; inp.click(); }}>📷</button>
                            <button className="icon-btn" onClick={() => { setEditingPromoId(p.id); setPromoForm({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', targetUrl: p.targetUrl ?? '', enabled: p.enabled, startsAt: p.startsAt?.slice(0, 10) ?? '', endsAt: p.endsAt?.slice(0, 10) ?? '' }); }}>✏️</button>
                            <button className="icon-btn" onClick={() => togglePromotion(p)}>{p.enabled ? '👁' : '🚫'}</button>
                            <button className="icon-btn" onClick={() => deletePromotion(p.id)} style={{ color: '#dc2626' }}>🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sections */}
              {!cmsLoading && cmsTab === 'sections' && (
                <div>
                  <p style={{ fontFamily: 'Cairo', color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                    تحكم في ظهور وإخفاء أقسام الصفحة الرئيسية.
                  </p>
                  {homeSections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد أقسام محفوظة حتى الآن.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {homeSections.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream)', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', direction: 'rtl' }}>
                          <div>
                            <strong style={{ fontFamily: 'Cairo' }}>{s.title ?? s.key}</strong>
                            {s.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{s.subtitle}</div>}
                            <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'Cairo', direction: 'ltr' }}>key: {s.key}</div>
                          </div>
                          <button className="action-btn" onClick={() => toggleSection(s)} style={{ background: s.enabled ? '#16a34a' : '#9ca3af', color: 'white', border: 'none' }}>
                            {s.enabled ? '✓ مفعّل' : '✗ مخفي'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontFamily: 'Cairo', color: 'var(--muted)', fontSize: 12, marginTop: 20, lineHeight: 1.8 }}>
                    <strong>المفاتيح المتاحة:</strong> banners · featured_stores · promotions · categories · all_stores
                  </p>
                </div>
              )}
              </>}
            </section>
          )}

          {/* ════════════════════════════════════════════════════════
              NOTIFICATIONS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'notifications' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">مركز الإشعارات</h2>
                  <p className="pg-subtitle">إرسال إشعارات جماعية للعملاء أو التجار</p>
                </div>
              </div>

              <div className="notif-form">
                <h3>📢 إرسال إشعار جديد</h3>
                {notifMessage && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontFamily: 'Cairo', display: 'flex', justifyContent: 'space-between' }}>
                    {notifMessage}
                    <button onClick={() => setNotifMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                )}
                <div className="form-row cols-2">
                  <div>
                    <label className="form-label">المستهدف</label>
                    <select value={notifTarget} onChange={e => setNotifTarget(e.target.value as 'customers' | 'merchants')}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)' }}>
                      <option value="customers">العملاء</option>
                      <option value="merchants">التجار</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">عنوان الإشعار</label>
                    <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="مثال: عرض خاص اليوم"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)' }} />
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <label className="form-label">محتوى الإشعار</label>
                    <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} rows={3} placeholder="مثال: احصل على خصم ٢٠٪ على جميع منتجات العسل اليوم فقط"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)', resize: 'vertical' }} />
                  </div>
                </div>
                <button className="action-btn" onClick={sendNotification} disabled={notifLoading}
                  style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none', padding: '11px 28px', borderRadius: 14, fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: notifLoading ? 'not-allowed' : 'pointer', opacity: notifLoading ? 0.7 : 1 }}>
                  {notifLoading ? '⏳ جاري الإرسال…' : '🚀 إرسال الإشعار'}
                </button>
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>سجل الإشعارات المُرسلة</h3></div>
                <div className="lp-body">
                  {!Array.isArray(notifHistory) || notifHistory.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد سجل إشعارات بعد</div>
                  ) : notifHistory.map(n => (
                    <div className="lp-row" key={n.id}>
                      <div className="lp-info">
                        <strong>{n.title ?? ''}</strong>
                        <div className="lp-sub">{n.message ?? n.body ?? ''}</div>
                      </div>
                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <span className="sec-badge active">{(n.audience ?? n.targetType) === 'customers' ? 'عملاء' : 'تجار'}</span>
                        <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', marginTop: 3 }} dir="ltr">{formatDate(n.createdAt ?? n.sentAt ?? '')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              FINANCIAL PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'financial' && (
            <div>
              <AdminPageHeader
                title="الإعدادات المالية"
                subtitle="نسبة العمولة، الحد الأدنى للطلب، إعدادات واتساب الدعم"
              />

              <div className="analytics-grid">
                <div className="an-card gold">
                  <div className="an-card-icon">💰</div>
                  <div className="an-card-label">إجمالي المبيعات المسلّمة</div>
                  <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.sales)}</div>
                </div>
                <div className="an-card green">
                  <div className="an-card-icon">🏦</div>
                  <div className="an-card-label">العمولة الإجمالية المستحقة</div>
                  <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.commission)}</div>
                </div>
                <div className="an-card blue">
                  <div className="an-card-icon">📦</div>
                  <div className="an-card-label">إجمالي الطلبات</div>
                  <div className="an-card-value">{overview.orders}</div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">%</div>
                  <div className="an-card-label">نسبة العمولة الحالية</div>
                  <div className="an-card-value">{commissionSaved}%</div>
                </div>
              </div>

              <div className="two-col">
                {/* Commission card */}
                <div className={`admin-settings-card ${commissionPercentage !== commissionSaved ? 'dirty' : ''}`}>
                  <div className="admin-settings-card-header">
                    <span className="icon">⚙️</span>
                    <h3>نسبة العمولة</h3>
                    {commissionPercentage !== commissionSaved && (
                      <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>غير محفوظ</span>
                    )}
                  </div>
                  <div className="admin-settings-card-body">
                    <p className="helper">النسبة المئوية المستقطعة من كل طلب مسلّم. تُطبَّق على جميع التجار افتراضيًا.</p>
                    <label>النسبة المئوية %</label>
                    <input type="number" value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} min="0" max="100" />
                  </div>
                  <div className="admin-settings-card-footer">
                    {commissionStatus === 'saving' && <span className="save-indicator saving">⏳ جاري الحفظ…</span>}
                    {commissionStatus === 'success' && <span className="save-indicator success">✓ تم الحفظ</span>}
                    {commissionStatus === 'error' && <span className="save-indicator error">✕ فشل الحفظ</span>}
                    <button className="admin-row-btn" disabled={commissionPercentage === commissionSaved} onClick={() => setCommissionPercentage(commissionSaved)}>
                      إلغاء
                    </button>
                    <button className="admin-row-btn primary" disabled={commissionPercentage === commissionSaved || commissionStatus === 'saving'} onClick={saveCommission}>
                      💾 حفظ
                    </button>
                  </div>
                </div>

                {/* Minimum Order card */}
                <div className={`admin-settings-card ${minimumOrder !== minimumOrderSaved ? 'dirty' : ''}`}>
                  <div className="admin-settings-card-header">
                    <span className="icon">📦</span>
                    <h3>الحد الأدنى للطلب</h3>
                    {minimumOrder !== minimumOrderSaved && (
                      <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>غير محفوظ</span>
                    )}
                  </div>
                  <div className="admin-settings-card-body">
                    <p className="helper">لن يتمكن العميل من إتمام الطلب إذا كان المجموع أقل من هذا المبلغ. (0 = بدون حد أدنى)</p>
                    <label>المبلغ (ج.م)</label>
                    <input type="number" value={minimumOrder} onChange={e => setMinimumOrder(e.target.value)} min="0" />
                  </div>
                  <div className="admin-settings-card-footer">
                    {minimumOrderStatus === 'saving' && <span className="save-indicator saving">⏳ جاري الحفظ…</span>}
                    {minimumOrderStatus === 'success' && <span className="save-indicator success">✓ تم الحفظ</span>}
                    {minimumOrderStatus === 'error' && <span className="save-indicator error">✕ فشل الحفظ</span>}
                    <button className="admin-row-btn" disabled={minimumOrder === minimumOrderSaved} onClick={() => setMinimumOrder(minimumOrderSaved)}>
                      إلغاء
                    </button>
                    <button className="admin-row-btn primary" disabled={minimumOrder === minimumOrderSaved || minimumOrderSaving} onClick={saveMinimumOrder}>
                      💾 حفظ
                    </button>
                  </div>
                </div>

                {/* WhatsApp Support card */}
                {(() => {
                  const dirty = supportWhatsappNumber !== supportWhatsappSaved.n || supportWhatsappMessage !== supportWhatsappSaved.m;
                  return (
                    <div className={`admin-settings-card ${dirty ? 'dirty' : ''}`}>
                      <div className="admin-settings-card-header">
                        <span className="icon">💬</span>
                        <h3>دعم واتساب</h3>
                        {dirty && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>غير محفوظ</span>}
                      </div>
                      <div className="admin-settings-card-body">
                        <p className="helper">رقم الدعم والرسالة الافتراضية التي يفتحها زر الواتساب في تطبيق العميل.</p>
                        <label>WhatsApp Support Number</label>
                        <input type="text" value={supportWhatsappNumber} onChange={e => setSupportWhatsappNumber(e.target.value)} placeholder="201145928534" />
                        <div style={{ height: 10 }} />
                        <label>WhatsApp Default Message</label>
                        <textarea value={supportWhatsappMessage} onChange={e => setSupportWhatsappMessage(e.target.value)} rows={3} placeholder="السلام عليكم، محتاج مساعدة في تطبيق سوق العسل" />
                      </div>
                      <div className="admin-settings-card-footer">
                        {whatsappStatus === 'saving' && <span className="save-indicator saving">⏳ جاري الحفظ…</span>}
                        {whatsappStatus === 'success' && <span className="save-indicator success">✓ تم الحفظ</span>}
                        {whatsappStatus === 'error' && <span className="save-indicator error">✕ فشل الحفظ</span>}
                        <button className="admin-row-btn" disabled={!dirty} onClick={() => { setSupportWhatsappNumber(supportWhatsappSaved.n); setSupportWhatsappMessage(supportWhatsappSaved.m); }}>
                          إلغاء
                        </button>
                        <button className="admin-row-btn primary" disabled={!dirty || whatsappSaving} onClick={saveSupportWhatsapp}>
                          💾 حفظ
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Home Promo Card management */}
                {(() => {
                  const dirty = JSON.stringify(promoCard) !== JSON.stringify(promoCardSaved);
                  return (
                    <div className={`admin-settings-card ${dirty ? 'dirty' : ''}`}>
                      <div className="admin-settings-card-header">
                        <span className="icon">🎁</span>
                        <h3>كارت عروض الرئيسية</h3>
                        {dirty && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>غير محفوظ</span>}
                      </div>
                      <div className="admin-settings-card-body">
                        <p className="helper">يظهر هذا الكارت أعلى الصفحة الرئيسية في تطبيق العميل (تحت البانر). أوقف التفعيل لإخفائه.</p>

                        {/* Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <button
                            type="button"
                            onClick={() => setPromoCard(c => ({ ...c, enabled: !c.enabled }))}
                            style={{
                              width: 48, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer',
                              background: promoCard.enabled ? 'var(--gold)' : 'rgba(71,39,21,0.18)',
                              position: 'relative', transition: 'background .2s', flexShrink: 0,
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 3, left: promoCard.enabled ? 25 : 3,
                              width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left .2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                          </button>
                          <span style={{ fontSize: 12, color: 'var(--brown)', fontWeight: 700 }}>
                            {promoCard.enabled ? '✓ مفعّل ويظهر للعملاء' : '✕ معطّل (مخفي)'}
                          </span>
                        </div>

                        <label>العنوان</label>
                        <input type="text" value={promoCard.title} onChange={e => setPromoCard(c => ({ ...c, title: e.target.value }))} maxLength={100} placeholder="عروض اليوم" />
                        <div style={{ height: 10 }} />

                        <label>الوصف</label>
                        <textarea value={promoCard.description} onChange={e => setPromoCard(c => ({ ...c, description: e.target.value }))} rows={2} maxLength={280} placeholder="خصومات خاصة على منتجات مختارة لفترة محدودة" />
                        <div style={{ height: 10 }} />

                        <label>نص الزر</label>
                        <input type="text" value={promoCard.buttonText} onChange={e => setPromoCard(c => ({ ...c, buttonText: e.target.value }))} maxLength={30} placeholder="تسوق الآن" />
                        <div style={{ height: 10 }} />

                        <label>إجراء الزر</label>
                        <select value={promoCard.actionType} onChange={e => setPromoCard(c => ({ ...c, actionType: e.target.value, actionTarget: '' }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', fontFamily: 'Cairo', fontSize: 13 }}>
                          <option value="none">بدون إجراء</option>
                          <option value="product">فتح منتج</option>
                          <option value="store">فتح متجر</option>
                          <option value="category">فتح تصنيف</option>
                          <option value="cart">فتح السلة</option>
                          <option value="referral">صفحة الإحالة</option>
                          <option value="external_url">رابط خارجي</option>
                        </select>
                        {promoCard.actionType === 'product' && (<>
                          <div style={{ height: 8 }} />
                          <label>معرّف المنتج (Product ID)</label>
                          <select value={promoCard.actionTarget} onChange={e => setPromoCard(c => ({ ...c, actionTarget: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', fontFamily: 'Cairo', fontSize: 13 }}>
                            <option value="">— اختر منتج —</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.merchant?.storeName || '—'})</option>)}
                          </select>
                        </>)}
                        {promoCard.actionType === 'store' && (<>
                          <div style={{ height: 8 }} />
                          <label>معرّف المتجر (Store ID)</label>
                          <select value={promoCard.actionTarget} onChange={e => setPromoCard(c => ({ ...c, actionTarget: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', fontFamily: 'Cairo', fontSize: 13 }}>
                            <option value="">— اختر متجر —</option>
                            {merchants.map((m: any) => <option key={m.id} value={m.id}>{m.storeName}</option>)}
                          </select>
                        </>)}
                        {promoCard.actionType === 'category' && (<>
                          <div style={{ height: 8 }} />
                          <label>اسم التصنيف</label>
                          <input type="text" value={promoCard.actionTarget} onChange={e => setPromoCard(c => ({ ...c, actionTarget: e.target.value }))} maxLength={100} placeholder="عسل طبيعي" />
                        </>)}
                        {promoCard.actionType === 'external_url' && (<>
                          <div style={{ height: 8 }} />
                          <label>الرابط (URL)</label>
                          <input type="url" value={promoCard.actionTarget} onChange={e => setPromoCard(c => ({ ...c, actionTarget: e.target.value }))} maxLength={500} placeholder="https://example.com" dir="ltr" />
                        </>)}

                        {/* Preview */}
                        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(90deg, #472715 0%, #7B3B00 100%)', color: 'white', fontFamily: 'Cairo' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontWeight: 700 }}>👁 معاينة:</div>
                          <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.20)', fontSize: 11, fontWeight: 800, marginBottom: 8 }}>{promoCard.title || 'العنوان'}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{promoCard.description || 'الوصف'}</div>
                          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>{promoCard.buttonText || 'الزر'}</div>
                        </div>
                      </div>
                      <div className="admin-settings-card-footer">
                        {promoCardStatus === 'saving' && <span className="save-indicator saving">⏳ جاري الحفظ…</span>}
                        {promoCardStatus === 'success' && <span className="save-indicator success">✓ تم الحفظ</span>}
                        {promoCardStatus === 'error' && <span className="save-indicator error">✕ فشل الحفظ</span>}
                        <button className="admin-row-btn" disabled={!dirty} onClick={() => setPromoCard(promoCardSaved)}>إلغاء</button>
                        <button className="admin-row-btn primary" disabled={!dirty || promoCardStatus === 'saving'} onClick={savePromoCard}>💾 حفظ</button>
                      </div>
                    </div>
                  );
                })()}

                <div className="chart-panel">
                  <h3 className="chart-panel-title">📊 ملخص الإيرادات</h3>
                  <RevenueChart />
                </div>
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>عمولات التجار</h3></div>
                <div className="lp-body">
                  {commissions.map((item, i) => (
                    <div className="lp-row" key={i}>
                      <div className="lp-rank">{i + 1}</div>
                      <div className="lp-info">
                        <strong>{item.merchant.storeName}</strong>
                        <div className="lp-sub">{item.deliveredOrders} طلبات مسلّمة · {formatEGP(item.totalSales)} مبيعات</div>
                      </div>
                      <span className="lp-amount">{formatEGP(item.commissionOwed)}</span>
                    </div>
                  ))}
                  {commissions.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد عمولات بعد</div>}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'shipping' && (() => {
            const filteredZones = shippingZones.filter(z =>
              shippingSearch.trim() === '' ||
              (z.name as string).toLowerCase().includes(shippingSearch.trim().toLowerCase())
            );
            const filteredIds = filteredZones.map(z => z.id as string);
            const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedZoneIds.has(id));
            const someSelected = filteredIds.some(id => selectedZoneIds.has(id)) && !allSelected;
            const toggleAll = () => {
              setSelectedZoneIds(prev => {
                const next = new Set(prev);
                if (allSelected) filteredIds.forEach(id => next.delete(id));
                else filteredIds.forEach(id => next.add(id));
                return next;
              });
            };
            const toggleOne = (id: string) => {
              setSelectedZoneIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };
            return (
              <div>
                <AdminPageHeader
                  title="رسوم الشحن"
                  subtitle="إدارة رسوم الشحن لكل محافظة — يتم تطبيقها تلقائيًا عند الطلب"
                  badge={`${shippingZones.length} محافظة`}
                />

                {/* Add new governorate */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="اسم المحافظة الجديدة"
                    value={shippingNewName}
                    onChange={(e) => setShippingNewName(e.target.value)}
                    style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71, 39, 21, 0.15)', fontFamily: 'Cairo', background: 'var(--paper)', color: 'var(--brown)' }}
                  />
                  <input
                    type="number"
                    placeholder="الرسوم (ج.م)"
                    value={shippingNewFee}
                    onChange={(e) => setShippingNewFee(e.target.value)}
                    style={{ width: 140, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(71, 39, 21, 0.15)', fontFamily: 'Cairo', background: 'var(--paper)', color: 'var(--brown)' }}
                    min="0"
                  />
                  <button className="admin-row-btn primary" onClick={addShippingZone} disabled={!shippingNewName.trim()} style={{ padding: '9px 14px', fontSize: 13 }}>
                    + إضافة محافظة
                  </button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AdminSearchInput
                    value={shippingSearch}
                    onChange={setShippingSearch}
                    placeholder="ابحث عن محافظة..."
                  />
                </div>

                {shippingLoading ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>جاري التحميل...</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th className="checkbox-col">
                            <AdminCheckbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={toggleAll}
                              ariaLabel="تحديد الكل"
                            />
                          </th>
                          <th>المحافظة</th>
                          <th>رسوم الشحن (ج.م)</th>
                          <th>الحالة</th>
                          <th>الترتيب</th>
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredZones.map((zone) => {
                          const isEditing = editingZoneId === zone.id;
                          const isSelected = selectedZoneIds.has(zone.id);
                          const draft = isEditing ? editingZoneDraft! : null;
                          return (
                            <tr key={zone.id} className={isSelected ? 'row-selected' : ''}>
                              <td className="checkbox-col">
                                <AdminCheckbox
                                  checked={isSelected}
                                  onChange={() => toggleOne(zone.id)}
                                  ariaLabel={`تحديد ${zone.name}`}
                                />
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {isEditing ? (
                                  <input
                                    className="admin-row-input"
                                    style={{ maxWidth: 160 }}
                                    value={draft!.name}
                                    onChange={(e) => setEditingZoneDraft({ ...draft!, name: e.target.value })}
                                  />
                                ) : zone.name}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    className="admin-row-input"
                                    value={draft!.fee}
                                    onChange={(e) => setEditingZoneDraft({ ...draft!, fee: e.target.value })}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 700 }}>{Number(zone.fee).toLocaleString('ar-EG')}</span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <button
                                    className={`admin-row-btn ${draft!.enabled ? 'success' : 'danger'}`}
                                    onClick={() => setEditingZoneDraft({ ...draft!, enabled: !draft!.enabled })}
                                  >
                                    {draft!.enabled ? '✓ مفعّل' : '✕ معطّل'}
                                  </button>
                                ) : (
                                  <AdminStatusBadge
                                    label={zone.enabled ? '✓ مفعّل' : '✕ معطّل'}
                                    color={zone.enabled ? '#16a34a' : '#dc2626'}
                                  />
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    className="admin-row-input"
                                    style={{ maxWidth: 70 }}
                                    value={draft!.sortOrder}
                                    onChange={(e) => setEditingZoneDraft({ ...draft!, sortOrder: Number(e.target.value) || 0 })}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--muted)' }}>{zone.sortOrder}</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {isEditing ? (
                                    <>
                                      <button className="admin-row-btn primary" onClick={() => saveEditZone(zone.id)}>
                                        💾 حفظ
                                      </button>
                                      <button className="admin-row-btn" onClick={cancelEditZone}>
                                        ✕ إلغاء
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="admin-row-btn" onClick={() => startEditZone(zone)}>
                                        ✏️ تعديل
                                      </button>
                                      <button className="admin-row-btn danger" onClick={() => setShippingConfirm({ type: 'delete', ids: [zone.id] })}>
                                        🗑️ حذف
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {shippingZones.length === 0 && (
                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                            لا توجد مناطق شحن — أضف محافظة جديدة
                          </td></tr>
                        )}
                        {shippingZones.length > 0 && filteredZones.length === 0 && (
                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                            لا توجد محافظات مطابقة لـ &ldquo;{shippingSearch}&rdquo;
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bulk action bar */}
                <AdminBulkActionBar
                  count={selectedZoneIds.size}
                  label="محافظة محددة"
                  onClear={() => setSelectedZoneIds(new Set())}
                >
                  <button className="admin-bulk-action success" onClick={() => bulkSetZoneEnabled(Array.from(selectedZoneIds), true)}>
                    ✓ تفعيل
                  </button>
                  <button className="admin-bulk-action warning" onClick={() => bulkSetZoneEnabled(Array.from(selectedZoneIds), false)}>
                    ✕ تعطيل
                  </button>
                  <button className="admin-bulk-action danger" onClick={() => setShippingConfirm({ type: 'bulkDelete', ids: Array.from(selectedZoneIds) })}>
                    🗑️ حذف
                  </button>
                </AdminBulkActionBar>

                {/* Confirm dialog */}
                <AdminConfirmDialog
                  open={!!shippingConfirm}
                  variant="danger"
                  title={shippingConfirm?.type === 'delete' ? 'حذف المحافظة' : `حذف ${shippingConfirm?.ids.length ?? 0} محافظة`}
                  message={shippingConfirm?.type === 'delete'
                    ? 'هل أنت متأكد من حذف هذه المحافظة؟ لا يمكن التراجع.'
                    : `سيتم حذف ${shippingConfirm?.ids.length ?? 0} محافظة بشكل نهائي. لا يمكن التراجع.`}
                  confirmLabel="نعم، حذف"
                  onConfirm={() => {
                    if (!shippingConfirm) return;
                    if (shippingConfirm.type === 'delete') deleteShippingZone(shippingConfirm.ids[0]);
                    else bulkDeleteZones(shippingConfirm.ids);
                    setShippingConfirm(null);
                  }}
                  onCancel={() => setShippingConfirm(null)}
                />
              </div>
            );
          })()}

          {activePanel === 'referrals' && <ReferralPanel apiUrl={apiUrl} token={token} />}

          {activePanel === 'whatsapp_support' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">دعم واتساب</h2>
                  <p className="pg-subtitle">إدارة رقم ورسالة دعم واتساب الظاهرين داخل التطبيق</p>
                </div>
              </div>

              <div className="two-col">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">💬 إعدادات واتساب الدعم</h3>
                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                        support_whatsapp_number
                      </label>
                      <input
                        type="text"
                        value={supportWhatsappNumber}
                        onChange={e => setSupportWhatsappNumber(e.target.value)}
                        placeholder="201145928534"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                        support_whatsapp_message
                      </label>
                      <textarea
                        value={supportWhatsappMessage}
                        onChange={e => setSupportWhatsappMessage(e.target.value)}
                        rows={4}
                        placeholder="السلام عليكم، محتاج مساعدة في تطبيق سوق العسل"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <button
                          className="action-btn"
                          onClick={saveSupportWhatsapp}
                          disabled={whatsappSaving}
                          style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none', opacity: whatsappSaving ? 0.65 : 1, cursor: whatsappSaving ? 'wait' : 'pointer' }}>
                          {whatsappSaving ? '⏳ جاري الحفظ…' : '💾 حفظ إعدادات واتساب الدعم'}
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              APP VERSION / UPDATE MANAGEMENT
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'app_version' && (() => {
            const dirty = JSON.stringify(appVersion) !== JSON.stringify(appVersionSaved);
            return (
              <div>
                <div className="pg-header">
                  <div>
                    <h2 className="pg-title">إدارة تحديثات التطبيق</h2>
                    <p className="pg-subtitle">التحكم في رسائل التحديث الإجباري والاختياري لتطبيق العميل</p>
                  </div>
                </div>

                <div className="two-col">
                  <div className={`admin-settings-card ${dirty ? 'dirty' : ''}`}>
                    <div className="admin-settings-card-header">
                      <span className="icon">📲</span>
                      <h3>إعدادات التحديث</h3>
                      {dirty && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>غير محفوظ</span>}
                    </div>
                    <div className="admin-settings-card-body">
                      <p className="helper">عند تفعيل هذه الإعدادات، سيرى المستخدمون رسالة تحديث عند فتح التطبيق إذا كان إصدارهم أقدم من الإصدار المحدد.</p>

                      {/* Toggle enabled */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <button
                          type="button"
                          onClick={() => setAppVersion(v => ({ ...v, enabled: !v.enabled }))}
                          style={{
                            width: 48, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer',
                            background: appVersion.enabled ? 'var(--gold)' : 'rgba(71,39,21,0.18)',
                            position: 'relative', transition: 'background .2s', flexShrink: 0,
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3, left: appVersion.enabled ? 25 : 3,
                            width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left .2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--brown)', fontWeight: 700 }}>
                          {appVersion.enabled ? '✓ مفعّل — سيتم فحص التحديثات' : '✕ معطّل — لن يظهر أي إشعار تحديث'}
                        </span>
                      </div>

                      {/* Update Type */}
                      <label>نوع التحديث</label>
                      <select
                        value={appVersion.update_type}
                        onChange={e => setAppVersion(v => ({ ...v, update_type: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(71,39,21,0.2)', fontFamily: 'Cairo', fontSize: 13, marginBottom: 10 }}
                      >
                        <option value="disabled">معطّل (بدون تحديث)</option>
                        <option value="optional">اختياري (يمكن التخطي)</option>
                        <option value="force">إجباري (لا يمكن التخطي)</option>
                      </select>

                      {/* Latest version */}
                      <label>أحدث إصدار متاح (latest_app_version)</label>
                      <input type="text" value={appVersion.latest_app_version} onChange={e => setAppVersion(v => ({ ...v, latest_app_version: e.target.value }))} maxLength={20} placeholder="1.0.20" />
                      <div style={{ height: 10 }} />

                      {/* Minimum version */}
                      <label>الحد الأدنى المطلوب (minimum_app_version)</label>
                      <input type="text" value={appVersion.minimum_app_version} onChange={e => setAppVersion(v => ({ ...v, minimum_app_version: e.target.value }))} maxLength={20} placeholder="1.0.18" />
                      <div style={{ height: 10 }} />

                      {/* Title */}
                      <label>عنوان رسالة التحديث</label>
                      <input type="text" value={appVersion.title} onChange={e => setAppVersion(v => ({ ...v, title: e.target.value }))} maxLength={100} placeholder="تحديث جديد متاح" />
                      <div style={{ height: 10 }} />

                      {/* Message */}
                      <label>نص رسالة التحديث</label>
                      <textarea value={appVersion.message} onChange={e => setAppVersion(v => ({ ...v, message: e.target.value }))} rows={3} maxLength={500} placeholder="يوجد إصدار أحدث من تطبيق سوق العسل..." />
                      <div style={{ height: 10 }} />

                      {/* Play Store URL */}
                      <label>رابط Google Play Store</label>
                      <input type="text" value={appVersion.play_store_url} onChange={e => setAppVersion(v => ({ ...v, play_store_url: e.target.value }))} maxLength={500} placeholder="https://play.google.com/store/apps/details?id=com.wenzla.customer" />
                    </div>
                    <div className="admin-settings-card-footer">
                      {appVersionStatus === 'saving' && <span className="save-indicator saving">⏳ جاري الحفظ…</span>}
                      {appVersionStatus === 'success' && <span className="save-indicator success">✓ تم الحفظ</span>}
                      {appVersionStatus === 'error' && <span className="save-indicator error">✕ فشل الحفظ</span>}
                      <button className="admin-row-btn" disabled={!dirty} onClick={() => setAppVersion(appVersionSaved)}>
                        إلغاء
                      </button>
                      <button className="admin-row-btn primary" disabled={!dirty || appVersionStatus === 'saving'} onClick={saveAppVersionSettings}>
                        💾 حفظ
                      </button>
                    </div>
                  </div>

                  {/* Preview card */}
                  <div className="chart-panel">
                    <h3 className="chart-panel-title">📱 معاينة الإعدادات الحالية</h3>
                    <div style={{ marginTop: 12, display: 'grid', gap: 8, fontSize: 13, fontFamily: 'Cairo' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(71,39,21,0.08)' }}>
                        <span style={{ color: 'var(--muted)' }}>الحالة</span>
                        <span style={{ fontWeight: 700, color: appVersionSaved.enabled ? '#22c55e' : '#ef4444' }}>
                          {appVersionSaved.enabled ? '✓ مفعّل' : '✕ معطّل'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(71,39,21,0.08)' }}>
                        <span style={{ color: 'var(--muted)' }}>نوع التحديث</span>
                        <span style={{ fontWeight: 700, color: appVersionSaved.update_type === 'force' ? '#ef4444' : appVersionSaved.update_type === 'optional' ? '#f59e0b' : 'var(--muted)' }}>
                          {appVersionSaved.update_type === 'force' ? '⛔ إجباري' : appVersionSaved.update_type === 'optional' ? '🔔 اختياري' : '⏸ معطّل'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(71,39,21,0.08)' }}>
                        <span style={{ color: 'var(--muted)' }}>أحدث إصدار</span>
                        <span style={{ fontWeight: 700 }}>{appVersionSaved.latest_app_version}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(71,39,21,0.08)' }}>
                        <span style={{ color: 'var(--muted)' }}>الحد الأدنى</span>
                        <span style={{ fontWeight: 700 }}>{appVersionSaved.minimum_app_version}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ color: 'var(--muted)' }}>عنوان الرسالة</span>
                        <span style={{ fontWeight: 700 }}>{appVersionSaved.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {activePanel === 'wallet_recharge_requests' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">طلبات شحن المحفظة</h2>
                  <p className="pg-subtitle">مراجعة طلبات الشحن اليدوي الواردة من العملاء</p>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="an-card gold">
                  <div className="an-card-icon">🏦</div>
                  <div className="an-card-label">إجمالي الطلبات</div>
                  <div className="an-card-value">{walletRechargeRequests.length}</div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">⏳</div>
                  <div className="an-card-label">طلبات قيد المراجعة</div>
                  <div className="an-card-value">
                    {walletRechargeRequests.filter(r => r.status === 'PENDING').length}
                  </div>
                </div>
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>قائمة الطلبات</h3></div>
                <div className="lp-body" style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 680 }}>
                  {walletRechargeRequests.map((request) => {
                    const screenshotUrl = request.screenshotUrl?.startsWith('http')
                      ? request.screenshotUrl
                      : `${apiUrl}${request.screenshotUrl}`;
                    const isPending = request.status === 'PENDING';
                    const isLoading = walletRechargeActionLoadingId === request.id;
                    return (
                      <div
                        key={request.id}
                        className="lp-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '88px minmax(160px,1.2fr) minmax(120px,0.9fr) minmax(140px,1fr) minmax(170px,auto)',
                          gap: 14,
                          alignItems: 'center',
                        }}
                      >
                        <button
                          className="topbar-btn"
                          onClick={() => setSelectedRechargeRequest(request)}
                          style={{
                            padding: 0,
                            width: 88,
                            height: 66,
                            overflow: 'hidden',
                            borderRadius: 12,
                            border: '1px solid rgba(71,39,21,0.1)',
                            background: '#fff',
                          }}
                        >
                          <img
                            src={screenshotUrl}
                            alt="wallet recharge screenshot"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </button>

                        <div className="lp-info">
                          <strong>{request.user?.name || 'عميل'}</strong>
                          <div className="lp-sub" dir="ltr">{request.user?.phone || '—'}</div>
                          <div className="lp-sub">{formatDate(request.createdAt)}</div>
                        </div>

                        <div className="lp-info">
                          <strong>{formatEGP(request.amount)}</strong>
                          <div className="lp-sub">{WALLET_RECHARGE_METHOD_AR[request.paymentMethod] ?? request.paymentMethod}</div>
                        </div>

                        <div className="lp-info">
                          <strong>{WALLET_RECHARGE_STATUS_AR[request.status] ?? request.status}</strong>
                          <div className="lp-sub">{request.adminNote || 'لا توجد ملاحظة إدارية بعد'}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <span
                            className="sec-badge"
                            style={{
                              background: WALLET_RECHARGE_STATUS_STYLE[request.status as WalletRechargeStatus]?.background,
                              color: WALLET_RECHARGE_STATUS_STYLE[request.status as WalletRechargeStatus]?.color,
                              border: `1px solid ${WALLET_RECHARGE_STATUS_STYLE[request.status as WalletRechargeStatus]?.border}`,
                            }}
                          >
                            {WALLET_RECHARGE_STATUS_AR[request.status] ?? request.status}
                          </span>
                          {isPending && (
                            <>
                              <button
                                className="action-btn"
                                onClick={() => { void handleWalletRechargeDecision(request, 'approve'); }}
                                disabled={isLoading}
                                style={{
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  minWidth: 72,
                                  opacity: isLoading ? 0.7 : 1,
                                }}
                              >
                                {isLoading ? 'جارٍ...' : 'قبول'}
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => { void handleWalletRechargeDecision(request, 'reject'); }}
                                disabled={isLoading}
                                style={{
                                  background: '#dc2626',
                                  color: '#fff',
                                  border: 'none',
                                  minWidth: 72,
                                  opacity: isLoading ? 0.7 : 1,
                                }}
                              >
                                {isLoading ? 'جارٍ...' : 'رفض'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  {walletRechargeRequests.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>
                      لا توجد طلبات شحن محفظة حتى الآن
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'wallet_manual_credit' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إضافة رصيد يدوي</h2>
                  <p className="pg-subtitle">إضافة رصيد للمحفظة يدويًا لأغراض التعويض أو الهدية أو التصحيح</p>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="an-card gold">
                  <div className="an-card-icon">💳</div>
                  <div className="an-card-label">العميل المحدد</div>
                  <div className="an-card-value">
                    {manualCreditForm.userId
                      ? ((Array.isArray(users) ? users : []).find(u => u.id === manualCreditForm.userId)?.name || 'عميل')
                      : '—'}
                  </div>
                </div>
                <div className="an-card blue">
                  <div className="an-card-icon">💰</div>
                  <div className="an-card-label">الرصيد الحالي</div>
                  <div className="an-card-value">
                    {manualCreditForm.userId
                      ? formatEGP(((Array.isArray(users) ? users : []).find(u => u.id === manualCreditForm.userId)?.walletBalance as any) ?? 0)
                      : formatEGP(0)}
                  </div>
                </div>
              </div>

              <div className="panel" style={{ padding: 20, borderRadius: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
                  <div>
                    <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>بحث العميل بالاسم أو الهاتف</label>
                    <input
                      value={manualCreditSearch}
                      onChange={(e) => setManualCreditSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم الهاتف"
                      style={{ width: '100%', marginTop: 6 }}
                    />
                    <div className="list-panel" style={{ marginTop: 12 }}>
                      <div className="lp-body" style={{ maxHeight: 340, overflow: 'auto' }}>
                        {(Array.isArray(users) ? users : [])
                          .filter(u => !manualCreditSearch || (u.phone ?? '').includes(manualCreditSearch) || (u.name ?? '').includes(manualCreditSearch))
                          .slice(0, 20)
                          .map((u) => {
                            const selected = manualCreditForm.userId === u.id;
                            return (
                              <button
                                key={u.id}
                                onClick={() => setManualCreditForm((f) => ({ ...f, userId: u.id }))}
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  background: selected ? 'rgba(192,139,34,0.12)' : 'transparent',
                                  border: 'none',
                                  borderBottom: '1px solid rgba(71,39,21,0.08)',
                                  padding: '14px 12px',
                                  cursor: 'pointer',
                                  borderRadius: 14,
                                }}
                              >
                                <div style={{ fontFamily: 'Cairo', fontWeight: 800, color: 'var(--brown)' }}>{u.name || 'بدون اسم'}</div>
                                <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }} dir="ltr">{u.phone || '—'}</div>
                                <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>
                                  الرصيد الحالي: {formatEGP((u as any).walletBalance ?? 0)}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>المبلغ</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualCreditForm.amount}
                        onChange={(e) => setManualCreditForm((f) => ({ ...f, amount: e.target.value }))}
                        placeholder="50"
                        style={{ width: '100%', marginTop: 6 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>نوع السبب</label>
                      <select
                        value={manualCreditForm.reasonType}
                        onChange={(e) => setManualCreditForm((f) => ({ ...f, reasonType: e.target.value as WalletManualCreditReason }))}
                        style={{ width: '100%', marginTop: 6 }}
                      >
                        {(Object.entries(WALLET_MANUAL_CREDIT_REASON_AR) as [WalletManualCreditReason, string][]).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>ملاحظة إدارية</label>
                      <textarea
                        rows={5}
                        value={manualCreditForm.adminNote}
                        onChange={(e) => setManualCreditForm((f) => ({ ...f, adminNote: e.target.value }))}
                        placeholder="اذكر سبب الإضافة اليدوية بوضوح"
                        style={{ width: '100%', marginTop: 6, resize: 'vertical' }}
                      />
                    </div>

                    <button
                      className="action-btn"
                      onClick={() => { void submitManualWalletCredit(); }}
                      disabled={manualCreditSubmitting || manualDebitSubmitting}
                      style={{
                        background: 'var(--brown)',
                        color: 'var(--cream)',
                        border: 'none',
                        opacity: manualCreditSubmitting ? 0.7 : 1,
                      }}
                    >
                      {manualCreditSubmitting ? 'جارٍ إضافة الرصيد...' : 'إضافة الرصيد'}
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => { void submitManualWalletDebit(); }}
                      disabled={manualCreditSubmitting || manualDebitSubmitting}
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        opacity: manualDebitSubmitting ? 0.7 : 1,
                      }}
                    >
                      {manualDebitSubmitting ? 'جارٍ خصم الرصيد...' : 'خصم الرصيد'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'wallet_transactions' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">سجل معاملات المحفظة</h2>
                  <p className="pg-subtitle">استعراض جميع الحركات المالية الخاصة بمحافظ العملاء</p>
                </div>
              </div>

              <div className="panel" style={{ padding: 20, borderRadius: 24 }}>
                <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
                  <div className="an-card gold">
                    <div className="an-card-icon">💰</div>
                    <div className="an-card-label">الرصيد الحالي</div>
                    <div className="an-card-value">
                      {manualCreditForm.userId
                        ? formatEGP(((Array.isArray(users) ? users : []).find(u => u.id === manualCreditForm.userId)?.walletBalance as any) ?? 0)
                        : formatEGP(0)}
                    </div>
                  </div>
                  <div className="an-card green">
                    <div className="an-card-icon">➕</div>
                    <div className="an-card-label">إجمالي الإضافات</div>
                    <div className="an-card-value">{formatEGP(walletTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0))}</div>
                  </div>
                  <div className="an-card red">
                    <div className="an-card-icon">➖</div>
                    <div className="an-card-label">إجمالي الخصومات</div>
                    <div className="an-card-value">{formatEGP(Math.abs(walletTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0)))}</div>
                  </div>
                  <div className="an-card blue">
                    <div className="an-card-icon">📒</div>
                    <div className="an-card-label">عدد المعاملات</div>
                    <div className="an-card-value">{walletTransactions.length}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18 }}>
                  <div>
                    <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>اختر عميلًا لعرض سجل المحفظة</label>
                    <div className="list-panel" style={{ marginTop: 12 }}>
                      <div className="lp-body" style={{ maxHeight: 420, overflow: 'auto' }}>
                        {(Array.isArray(users) ? users : []).slice(0, 40).map((u) => {
                          const selected = manualCreditForm.userId === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                setManualCreditForm((f) => ({ ...f, userId: u.id }));
                                void loadWalletTransactions(u.id);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'right',
                                background: selected ? 'rgba(192,139,34,0.12)' : 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(71,39,21,0.08)',
                                padding: '14px 12px',
                                cursor: 'pointer',
                                borderRadius: 14,
                              }}
                            >
                              <div style={{ fontFamily: 'Cairo', fontWeight: 800, color: 'var(--brown)' }}>{u.name || 'بدون اسم'}</div>
                              <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }} dir="ltr">{u.phone || '—'}</div>
                              <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>
                                الرصيد الحالي: {formatEGP((u as any).walletBalance ?? 0)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="list-panel">
                      <div className="lp-head">
                        <h3>المعاملات</h3>
                        <button className="action-btn" onClick={() => exportWalletTransactionsCSV(filteredWalletTransactions)}>📊 تصدير CSV</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: 14 }}>
                        <input
                          value={walletTransactionSearch}
                          onChange={(e) => { setWalletTransactionSearch(e.target.value); setWalletTransactionPage(1); }}
                          placeholder="بحث في الملاحظات أو النوع"
                        />
                        <select
                          value={walletTransactionTypeFilter}
                          onChange={(e) => { setWalletTransactionTypeFilter(e.target.value); setWalletTransactionPage(1); }}
                        >
                          <option value="ALL">كل الأنواع</option>
                          <option value="MANUAL_CREDIT">MANUAL_CREDIT</option>
                          <option value="RECHARGE_APPROVED">RECHARGE_APPROVED</option>
                          <option value="WALLET_DEBIT">WALLET_DEBIT</option>
                          <option value="REFUND">REFUND</option>
                          <option value="CASHBACK">CASHBACK</option>
                          <option value="PURCHASE_PAYMENT">PURCHASE_PAYMENT</option>
                        </select>
                        <input type="date" value={walletTransactionDateFrom} onChange={(e) => { setWalletTransactionDateFrom(e.target.value); setWalletTransactionPage(1); }} />
                        <input type="date" value={walletTransactionDateTo} onChange={(e) => { setWalletTransactionDateTo(e.target.value); setWalletTransactionPage(1); }} />
                      </div>
                      <div className="lp-body" style={{ maxHeight: 420, overflow: 'auto' }}>
                        {pagedWalletTransactions.map((tx) => (
                          <div key={tx.id} className="lp-row" style={{ display: 'grid', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <strong>{tx.type}</strong>
                              <strong style={{ color: tx.amount >= 0 ? '#16a34a' : '#dc2626' }}>
                                {tx.amount >= 0 ? '+' : '-'}{formatEGP(Math.abs(tx.amount))}
                              </strong>
                            </div>
                            <div className="lp-sub">
                              الرصيد قبل: {formatEGP(tx.balanceBefore)} • بعد: {formatEGP(tx.balanceAfter)}
                            </div>
                            <div className="lp-sub">{tx.adminNote || 'بدون ملاحظة'}</div>
                            <div className="lp-sub">{formatDate(tx.createdAt)}</div>
                          </div>
                        ))}
                        {filteredWalletTransactions.length === 0 && (
                          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>
                            اختر عميلًا لعرض سجل المعاملات
                          </div>
                        )}
                      </div>
                      {filteredWalletTransactions.length > pageSize && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                          <button className="action-btn" disabled={walletTransactionPage <= 1} onClick={() => setWalletTransactionPage(p => Math.max(1, p - 1))}>السابق</button>
                          <span style={{ fontFamily: 'Cairo', color: 'var(--muted)' }}>صفحة {walletTransactionPage} من {walletTransactionPageCount}</span>
                          <button className="action-btn" disabled={walletTransactionPage >= walletTransactionPageCount} onClick={() => setWalletTransactionPage(p => Math.min(walletTransactionPageCount, p + 1))}>التالي</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TECHNICAL MONITORING PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'technical' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">المراقبة التقنية</h2>
                  <p className="pg-subtitle">حالة الخوادم والخدمات وصحة الـ API</p>
                </div>
                <div className="pg-actions">
                  <a href="https://railway.com/dashboard" target="_blank" rel="noopener noreferrer" className="topbar-btn" style={{ textDecoration: 'none' }}>
                    🚂 Railway Dashboard
                  </a>
                </div>
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>حالة الخدمات</h3></div>
                <div className="lp-body">
                  {[
                    { label: 'Backend API (Railway)', val: 'يعمل', dot: 'green', extra: apiUrl },
                    { label: 'قاعدة البيانات (PostgreSQL)', val: 'متصلة', dot: 'green', extra: 'Prisma ORM' },
                    { label: 'Firebase FCM (إشعارات)', val: 'نشط', dot: 'green', extra: 'Push Notifications' },
                    { label: 'Cloudinary (رفع الصور)', val: 'نشط', dot: 'green', extra: 'Image CDN' },
                    { label: 'Admin Dashboard (Vercel/Railway)', val: 'نشط', dot: 'green', extra: 'Next.js' },
                    { label: 'Socket.IO (Realtime)', val: 'نشط', dot: 'green', extra: 'WebSockets' },
                  ].map(s => (
                    <div className="tech-status-row" key={s.label}>
                      <div className={`tech-dot ${s.dot}`} />
                      <span className="tech-label">{s.label}</span>
                      <span className="tech-val" dir="ltr">{s.extra}</span>
                      <span className="sec-badge active">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="two-col">
                <div className="list-panel">
                  <div className="lp-head"><h3>📱 التطبيقات</h3></div>
                  <div className="lp-body">
                    {[
                      { label: 'تطبيق العملاء (Android)', status: 'v1.0.9+11', badge: 'active' as const },
                      { label: 'تطبيق التجار (Android)', status: 'v1.0.9+11', badge: 'active' as const },
                      { label: 'Google Play Internal Testing', status: 'نشط', badge: 'building' as const },
                    ].map(a => (
                      <div className="lp-row" key={a.label}>
                        <div className="lp-info"><strong>{a.label}</strong></div>
                        <span className={`sec-badge ${a.badge}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="list-panel">
                  <div className="lp-head"><h3>🔧 روابط مفيدة</h3></div>
                  <div className="lp-body">
                    {[
                      { label: 'Railway Backend Logs', url: 'https://railway.com/dashboard' },
                      { label: 'Firebase Console', url: 'https://console.firebase.google.com' },
                      { label: 'Cloudinary Dashboard', url: 'https://cloudinary.com/console' },
                      { label: 'Google Play Console', url: 'https://play.google.com/console' },
                    ].map(l => (
                      <div className="lp-row" key={l.label}>
                        <div className="lp-info"><strong>{l.label}</strong></div>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="topbar-btn" style={{ textDecoration: 'none', fontSize: 11 }}>فتح ↗</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              SECURITY & EMPLOYEES PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'security' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">الصلاحيات والأمان</h2>
                  <p className="pg-subtitle">إدارة مستخدمي لوحة التحكم والأدوار وسجل النشاط</p>
                </div>
              </div>

              {secMessage && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontFamily: 'Cairo', display: 'flex', justifyContent: 'space-between' }}>
                  {secMessage}
                  <button onClick={() => setSecMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              <div className="two-col">
                {/* Add dashboard user form */}
                <div className="chart-panel">
                  <h3 className="chart-panel-title">➕ إضافة مستخدم لوحة تحكم</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {[
                      { label: 'الاسم', key: 'name' as const, placeholder: 'اسم الموظف', type: 'text' },
                      { label: 'اسم المستخدم', key: 'username' as const, placeholder: 'admin_user', type: 'text' },
                      { label: 'الهاتف', key: 'phone' as const, placeholder: '+20XXXXXXXXXX', type: 'tel' },
                      { label: 'كلمة المرور', key: 'password' as const, placeholder: '••••••••', type: 'password' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                        <input type={f.type} value={empForm[f.key]} placeholder={f.placeholder}
                          onChange={e => setEmpForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الدور</label>
                      <select
                        value={empForm.roleKey}
                        onChange={e => setEmpForm(prev => ({ ...prev, roleKey: e.target.value as DashboardRoleKey }))}
                        style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)' }}
                      >
                        {dashboardRoles.map(role => (
                          <option key={role.key} value={role.key}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <button className="action-btn" onClick={addEmployee} style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none', marginTop: 6 }}>
                      💾 إضافة المستخدم
                    </button>
                  </div>
                </div>

                {/* Dashboard users list */}
                <div className="list-panel" style={{ margin: 0 }}>
                  <div className="lp-head"><h3>👥 مستخدمو لوحة التحكم</h3></div>
                  <div className="lp-body">
                    {secLoading ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>جاري التحميل…</div>
                    ) : !Array.isArray(employees) || employees.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد مستخدمون</div>
                    ) : employees.map(emp => (
                      <div className="emp-row" key={emp.id}>
                        <div className="emp-avatar">{(emp.name ?? '?').charAt(0)}</div>
                        <div className="lp-info">
                          <strong>{emp.name || emp.username || '—'}</strong>
                          <div className="lp-sub" dir="ltr">{emp.username || '—'} {emp.phone ? `• ${emp.phone}` : ''}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            <span className="sec-badge building" style={{ fontSize: 10 }}>
                              {emp.primaryRoleName || ROLE_LABELS[emp.primaryRoleKey as DashboardRoleKey] || '—'}
                            </span>
                            <span className="sec-badge building" style={{ fontSize: 10, background: emp.dashboardStatus === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: emp.dashboardStatus === 'ACTIVE' ? '#166534' : '#991b1b' }}>
                              {emp.dashboardStatus === 'ACTIVE' ? 'نشط' : 'معطل'}
                            </span>
                          </div>
                          {Array.isArray(emp.dashboardPermissions) && emp.dashboardPermissions.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {emp.dashboardPermissions.slice(0, 6).map((p, pi) => {
                                const label = PERMISSION_LABELS[p] || p;
                                return <span key={pi} className="sec-badge building" style={{ fontSize: 9 }}>{label}</span>;
                              })}
                              {emp.dashboardPermissions.length > 6 && (
                                <span className="sec-badge building" style={{ fontSize: 9 }}>+{emp.dashboardPermissions.length - 6}</span>
                              )}
                            </div>
                          )}
                          {emp.lastLoginAt && (
                            <div className="lp-sub" style={{ marginTop: 4 }}>آخر دخول: {formatDate(emp.lastLoginAt)}</div>
                          )}
                          {hasPermission(sessionUser, 'dashboard_users.manage') && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                              <select
                                value={emp.primaryRoleKey || 'ADMIN'}
                                onChange={e => updateDashboardUserRole(emp.id, e.target.value as DashboardRoleKey)}
                                style={{ padding: '6px 10px', borderRadius: 8, fontFamily: 'Cairo', border: '1px solid rgba(71,39,21,0.15)' }}
                              >
                                {dashboardRoles.map(role => (
                                  <option key={role.key} value={role.key}>{role.name}</option>
                                ))}
                              </select>
                              <button className="admin-row-btn" onClick={() => toggleDashboardUserStatus(emp)}>
                                {emp.dashboardStatus === 'ACTIVE' ? '🔒 تعطيل' : '🔓 تفعيل'}
                              </button>
                              <button className="admin-row-btn" onClick={() => resetDashboardUserPassword(emp)}>🔑 إعادة كلمة المرور</button>
                              {!emp.isSuperAdmin && (
                                <button className="admin-row-btn danger" onClick={() => deleteDashboardUser(emp)}>🗑️ حذف</button>
                              )}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)' }}>{formatDate(emp.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="chart-panel" style={{ marginTop: 18 }}>
                <h3 className="chart-panel-title">🧩 الأدوار الافتراضية</h3>
                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  {dashboardRoles.map(role => (
                    <div key={role.key} style={{ border: '1px solid rgba(71,39,21,0.12)', borderRadius: 14, padding: 14, background: 'var(--paper)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'Cairo', fontWeight: 800, color: 'var(--brown)' }}>{role.name}</div>
                          <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{role.description}</div>
                        </div>
                        <span className="sec-badge building">{role.permissions.length} صلاحية</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {role.permissions.map(permission => (
                          <span key={permission} className="sec-badge building" style={{ fontSize: 10 }}>
                            {PERMISSION_LABELS[permission] || permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity log */}
              <div className="list-panel" style={{ marginTop: 18 }}>
                <div className="lp-head"><h3>📋 سجل النشاط الإداري</h3></div>
                <div className="lp-body">
                  {!Array.isArray(activities) || activities.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد سجل بعد</div>
                  ) : activities.slice(0, 30).map(a => (
                    <div className="lp-row" key={a.id}>
                      <div className="lp-info">
                        <strong>{a.action}</strong>
                        {a.details && <div className="lp-sub">{typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}</div>}
                      </div>
                      <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }} dir="ltr">{formatDate(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              ACTIVITY CENTER PANEL (Phase 2)
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'activity' && (
            <div>
              <AdminPageHeader
                title="سجل النشاط"
                subtitle="جميع الإجراءات التي تمت من قبل المشرفين"
                badge={`${activityTotal.toLocaleString('ar-EG')} سجل`}
                actions={
                  <button className="topbar-btn" onClick={() => loadActivityLog(activityPage)}>🔄 تحديث</button>
                }
              />

              {activityLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>جاري التحميل...</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>المشرف</th>
                        <th>الإجراء</th>
                        <th>النوع</th>
                        <th>الكيان</th>
                        <th>الوصف</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLog.map((a: any) => {
                        const typeColor: Record<string, string> = {
                          ORDER: '#3b82f6', MERCHANT: '#d4a437', PRODUCT: '#ce7c29',
                          USER: '#7c3aed', SETTING: '#7c2d12', SHIPPING_ZONE: '#06b6d4',
                          NOTIFICATION: '#16a34a', BANNER: '#ec4899', CATEGORY: '#0891b2',
                        };
                        const actionColor: Record<string, string> = {
                          CREATE: '#16a34a', UPDATE: '#3b82f6', DELETE: '#dc2626',
                          APPROVE: '#16a34a', REJECT: '#dc2626', BLOCK: '#7c2d12',
                        };
                        const c = typeColor[a.entityType] ?? 'var(--muted)';
                        const ac = actionColor[a.action] ?? 'var(--brown)';
                        return (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 700 }}>
                              {a.adminUser?.name ?? a.actorUsername}
                              {a.adminUser?.username && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>@{a.adminUser.username}</div>}
                            </td>
                            <td><AdminStatusBadge label={a.action} color={ac} /></td>
                            <td><AdminStatusBadge label={a.entityType} color={c} /></td>
                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{a.entityId ? a.entityId.slice(-8) : '—'}</td>
                            <td style={{ fontSize: 12 }}>{a.description ?? '—'}</td>
                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{formatDate(a.createdAt)}</td>
                          </tr>
                        );
                      })}
                      {activityLog.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>لا يوجد نشاط مسجل بعد</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {activityTotal > 30 && (
                <div className="pagination" style={{ marginTop: 16 }}>
                  <span className="pagination-info">{activityTotal.toLocaleString('ar-EG')} سجل — صفحة {activityPage} من {Math.ceil(activityTotal / 30)}</span>
                  <div className="pagination-btns">
                    <button disabled={activityPage <= 1} onClick={() => loadActivityLog(activityPage - 1)}>‹</button>
                    <button disabled={activityPage * 30 >= activityTotal} onClick={() => loadActivityLog(activityPage + 1)}>›</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              ROADMAP PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'roadmap' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">خارطة طريق المنصة</h2>
                  <p className="pg-subtitle">الميزات المخططة لتطوير سوق العسل</p>
                </div>
              </div>

              <div className="analytics-grid">
                {[
                  { icon: '✅', label: 'مكتملة', count: 12, cls: 'green' },
                  { icon: '🚧', label: 'قيد التطوير', count: 3, cls: 'gold' },
                  { icon: '📋', label: 'مخطط لها', count: 8, cls: 'blue' },
                  { icon: '💡', label: 'أفكار مستقبلية', count: 5, cls: 'orange' },
                ].map(s => (
                  <div key={s.label} className={`an-card ${s.cls}`}>
                    <div className="an-card-icon">{s.icon}</div>
                    <div className="an-card-label">{s.label}</div>
                    <div className="an-card-value">{s.count}</div>
                  </div>
                ))}
              </div>

              <div className="roadmap-grid">
                {[
                  { icon: '🏪', title: 'نظام متعدد المتاجر', desc: 'إدارة متاجر متعددة لكل تاجر مع لوحات تحكم مستقلة.', badge: 'active' as const },
                  { icon: '🔔', title: 'إشعارات فورية', desc: 'إشعارات Push لتتبع الطلبات وحالة التاجر.', badge: 'active' as const },
                  { icon: '🏠', title: 'CMS الصفحة الرئيسية', desc: 'إدارة بانرات وعروض وأقسام الرئيسية من لوحة التحكم.', badge: 'active' as const },
                  { icon: '🎫', title: 'نظام الكوبونات والخصومات', desc: 'إنشاء وإدارة أكواد الخصم والعروض الترويجية.', badge: 'building' as const },
                  { icon: '🚚', title: 'تكامل خدمات التوصيل', desc: 'ربط مع شركات التوصيل المحلية في مصر.', badge: 'planned' as const },
                  { icon: '📊', title: 'تقارير وتحليلات متقدمة', desc: 'لوحة تحليلات شاملة مع رسوم بيانية تفاعلية.', badge: 'building' as const },
                  { icon: '🤖', title: 'ذكاء اصطناعي للتوصيات', desc: 'توصيات منتجات ذكية مبنية على سلوك المستخدم.', badge: 'planned' as const },
                  { icon: '💳', title: 'بوابة دفع إلكتروني', desc: 'دعم فوري باي وبطاقات الائتمان والمحافظ الرقمية.', badge: 'planned' as const },
                  { icon: '🌍', title: 'توسع دولي', desc: 'دعم اللغة الإنجليزية والعملات المتعددة.', badge: 'planned' as const },
                ].map(item => (
                  <div key={item.title} className="roadmap-card">
                    <div className="rc-icon">{item.icon}</div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                    <span className={`sec-badge ${item.badge}`}>
                      {item.badge === 'active' ? 'مكتمل' : item.badge === 'building' ? 'قيد التطوير' : 'مخطط'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* dash-content */}
      </div>{/* dash-main */}

      {/* ════════════════════════════════════════════════════════
          ORDER DETAILS MODAL
         ════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">تفاصيل الطلب</div>
                <div className="modal-order-id">#{selectedOrder.id.slice(-8).toUpperCase()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="status-pill" style={{ background: `${ORDER_STATUS_COLOR[selectedOrder.status]}22`, color: ORDER_STATUS_COLOR[selectedOrder.status], border: `1px solid ${ORDER_STATUS_COLOR[selectedOrder.status]}44` }}>
                  {ORDER_STATUS_AR[selectedOrder.status] ?? selectedOrder.status}
                </span>
                <select
                  value={selectedOrder.status}
                  disabled={orderStatusUpdating || !hasPermission(sessionUser, 'orders.update_status')}
                  onChange={e => {
                    const newStatus = e.target.value;
                    if (!window.confirm(`تأكيد تغيير الحالة إلى "${ORDER_STATUS_AR[newStatus] ?? newStatus}"؟`)) return;
                    updateOrderStatus(selectedOrder.id, newStatus);
                  }}
                  style={{ fontSize: 12, padding: '6px 10px', minWidth: 130, borderRadius: 10, opacity: orderStatusUpdating ? 0.6 : 1, cursor: orderStatusUpdating ? 'wait' : 'pointer' }}>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s] ?? s}</option>)}
                </select>
                {hasPermission(sessionUser, 'support_notes.manage') && (
                  <button className="topbar-btn" onClick={() => saveSupportNotes(selectedOrder.id, selectedOrder.supportNotes)}>
                    📝 ملاحظة دعم
                  </button>
                )}
                {hasPermission(sessionUser, 'refunds.manage') && selectedOrder.paymentStatus !== 'REFUNDED' && (
                  <button className="topbar-btn" onClick={() => refundOrder(selectedOrder.id)}>
                    💸 مرتجع
                  </button>
                )}
                <button className="close-btn" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-section-title">👤 بيانات العميل</div>
                <div className="modal-grid">
                  <div className="modal-field"><label>الاسم</label><p>{selectedOrder.customerName}</p></div>
                  <div className="modal-field">
                    <label>رقم الهاتف</label>
                    <p dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedOrder.customerPhone}
                      <button className="icon-btn" onClick={() => copyPhone(selectedOrder.customerPhone)}>📋</button>
                      <button className="icon-btn" onClick={() => openWhatsApp(selectedOrder.customerPhone)}>💬</button>
                    </p>
                  </div>
                  <div className="modal-field full-width"><label>عنوان التوصيل</label><p>{selectedOrder.deliveryAddress}</p></div>
                  {selectedOrder.notes && <div className="modal-field full-width"><label>ملاحظات التوصيل</label><p>{selectedOrder.notes}</p></div>}
                </div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title">🏪 بيانات الطلب</div>
                <div className="modal-grid">
                  <div className="modal-field"><label>المتجر</label><p>{selectedOrder.merchant.storeName}</p></div>
                  <div className="modal-field"><label>هاتف التاجر</label><p dir="ltr">{selectedOrder.merchant.user.phone}</p></div>
                  <div className="modal-field"><label>طريقة الدفع</label><p>{PAYMENT_AR[selectedOrder.paymentMethod] ?? selectedOrder.paymentMethod}</p></div>
                  <div className="modal-field"><label>حالة الدفع</label><p>{selectedOrder.paymentStatus}</p></div>
                  <div className="modal-field"><label>تاريخ الطلب</label><p dir="ltr">{formatDate(selectedOrder.createdAt)}</p></div>
                  <div className="modal-field"><label>آخر تحديث</label><p dir="ltr">{formatDate(selectedOrder.updatedAt)}</p></div>
                  {selectedOrder.supportNotes && <div className="modal-field full-width"><label>ملاحظات الدعم</label><p>{selectedOrder.supportNotes}</p></div>}
                </div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title">📦 المنتجات ({selectedOrder.items.length})</div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th style={{ textAlign: 'center' }}>الكمية</th>
                      <th>سعر الوحدة</th>
                      <th>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product.name}</strong>
                          {item.variantName && <div className="sub-text">{item.variantName}</div>}
                          {item.product.weight && <div className="sub-text">{item.product.weight}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td dir="ltr">{formatEGP(item.unitPrice)}</td>
                        <td dir="ltr"><strong>{formatEGP(item.total)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-section">
                <div className="totals-box">
                  <div className="totals-row"><span>المجموع الفرعي</span><span dir="ltr">{formatEGP(selectedOrder.subtotal)}</span></div>
                  <div className="totals-row grand"><span>الإجمالي الكلي</span><span dir="ltr">{formatEGP(selectedOrder.total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedRechargeRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRechargeRequest(null)}>
          <div className="modal-card" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">طلب شحن المحفظة</div>
                <div className="modal-order-id">#{selectedRechargeRequest.id.slice(-8).toUpperCase()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  className="status-pill"
                  style={{
                    background: WALLET_RECHARGE_STATUS_STYLE[selectedRechargeRequest.status as WalletRechargeStatus]?.background,
                    color: WALLET_RECHARGE_STATUS_STYLE[selectedRechargeRequest.status as WalletRechargeStatus]?.color,
                    border: `1px solid ${WALLET_RECHARGE_STATUS_STYLE[selectedRechargeRequest.status as WalletRechargeStatus]?.border}`,
                  }}
                >
                  {WALLET_RECHARGE_STATUS_AR[selectedRechargeRequest.status] ?? selectedRechargeRequest.status}
                </span>
                <button className="close-btn" onClick={() => setSelectedRechargeRequest(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-section-title">👤 بيانات العميل</div>
                <div className="modal-grid">
                  <div className="modal-field"><label>الاسم</label><p>{selectedRechargeRequest.user?.name || 'عميل'}</p></div>
                  <div className="modal-field"><label>الهاتف</label><p dir="ltr">{selectedRechargeRequest.user?.phone || '—'}</p></div>
                  <div className="modal-field"><label>المبلغ</label><p>{formatEGP(selectedRechargeRequest.amount)}</p></div>
                  <div className="modal-field"><label>طريقة التحويل</label><p>{WALLET_RECHARGE_METHOD_AR[selectedRechargeRequest.paymentMethod] ?? selectedRechargeRequest.paymentMethod}</p></div>
                  <div className="modal-field full-width"><label>الملاحظة الإدارية</label><p>{selectedRechargeRequest.adminNote || 'لا توجد ملاحظة حتى الآن'}</p></div>
                  <div className="modal-field"><label>تاريخ الإنشاء</label><p dir="ltr">{formatDate(selectedRechargeRequest.createdAt)}</p></div>
                  <div className="modal-field"><label>آخر تحديث</label><p dir="ltr">{formatDate(selectedRechargeRequest.updatedAt)}</p></div>
                </div>
              </div>
              <div className="modal-section">
                <div className="modal-section-title">🧾 صورة التحويل</div>
                <img
                  src={selectedRechargeRequest.screenshotUrl?.startsWith('http') ? selectedRechargeRequest.screenshotUrl : selectedRechargeRequest.screenshotUrl ? `${apiUrl}${selectedRechargeRequest.screenshotUrl}` : ''}
                  alt="wallet recharge proof"
                  style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 18, background: '#fff8ec' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          GLOBAL SEARCH OVERLAY (Phase 2 - Cmd/Ctrl+K)
         ════════════════════════════════════════════════════════ */}
      {globalSearchOpen && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px 16px', overflowY: 'auto' }}
          onClick={() => setGlobalSearchOpen(false)}
        >
          <div
            className="modal-card"
            style={{ width: '100%', maxWidth: 640, background: 'var(--paper)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.30)', fontFamily: 'Cairo' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(71,39,21,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔍</span>
              <input
                autoFocus
                type="text"
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
                placeholder="ابحث عن طلب، منتج، تاجر، أو عميل..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'Cairo', background: 'transparent', color: 'var(--brown)', padding: '4px 0' }}
              />
              <span style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(71,39,21,0.08)', borderRadius: 6, color: 'var(--muted)' }}>ESC</span>
            </div>

            {globalSearchQuery.trim().length < 2 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                اكتب حرفين على الأقل للبحث
              </div>
            ) : globalSearchLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>جاري البحث...</div>
            ) : (() => {
              const totalResults = globalSearchResults.orders.length + globalSearchResults.products.length + globalSearchResults.merchants.length + globalSearchResults.customers.length;
              if (totalResults === 0) {
                return <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>لا توجد نتائج</div>;
              }
              return (
                <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 8 }}>
                  {globalSearchResults.orders.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted)', fontWeight: 800, letterSpacing: 0.5 }}>📦 الطلبات ({globalSearchResults.orders.length})</div>
                      {globalSearchResults.orders.map((o: any) => (
                        <div key={o.id}
                          onClick={() => { setGlobalSearchOpen(false); setActivePanel('orders'); setOrderSearch(o.customerName); }}
                          style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236, 184, 54, 0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <strong>#{o.id.slice(-6).toUpperCase()}</strong> · {o.customerName}
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }} dir="ltr">{o.customerPhone}</div>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{formatEGP(o.total)}</div>
                            <AdminStatusBadge label={ORDER_STATUS_AR[o.status as keyof typeof ORDER_STATUS_AR] ?? o.status} color={ORDER_STATUS_COLOR[o.status as keyof typeof ORDER_STATUS_COLOR] ?? '#888'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {globalSearchResults.products.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted)', fontWeight: 800, letterSpacing: 0.5 }}>🛒 المنتجات ({globalSearchResults.products.length})</div>
                      {globalSearchResults.products.map((p: any) => (
                        <div key={p.id}
                          onClick={() => { setGlobalSearchOpen(false); setActivePanel('products'); setProductSearch(p.name); }}
                          style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236, 184, 54, 0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {p.imageUrl ? (
                            <img src={p.imageUrl.startsWith('/') ? `${apiUrl}${p.imageUrl}` : p.imageUrl} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} alt="" />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(71,39,21,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛒</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.merchant?.storeName ?? ''}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{formatEGP(p.price)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {globalSearchResults.merchants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted)', fontWeight: 800, letterSpacing: 0.5 }}>🏪 التجار ({globalSearchResults.merchants.length})</div>
                      {globalSearchResults.merchants.map((m: any) => (
                        <div key={m.id}
                          onClick={() => { setGlobalSearchOpen(false); setActivePanel('merchants'); setMerchantSearch(m.storeName); }}
                          style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236, 184, 54, 0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {m.logoUrl ? (
                            <img src={m.logoUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brown)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{m.storeName?.charAt(0)}</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <strong>{m.storeName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }} dir="ltr">{m.user?.phone ?? ''}</div>
                          </div>
                          <AdminStatusBadge label={m.status} color={m.status === 'APPROVED' ? '#16a34a' : m.status === 'PENDING' ? '#d97706' : '#dc2626'} />
                        </div>
                      ))}
                    </div>
                  )}
                  {globalSearchResults.customers.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--muted)', fontWeight: 800, letterSpacing: 0.5 }}>👤 العملاء ({globalSearchResults.customers.length})</div>
                      {globalSearchResults.customers.map((u: any) => (
                        <div key={u.id}
                          onClick={() => { setGlobalSearchOpen(false); setActivePanel('users'); setUserSearch(u.name ?? u.phone ?? ''); }}
                          style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236, 184, 54, 0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(71,39,21,0.10)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                          <div style={{ flex: 1 }}>
                            <strong>{u.name ?? '—'}</strong>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }} dir="ltr">{u.phone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TOAST STACK (Phase 3)
         ════════════════════════════════════════════════════════ */}
      <div className="toast-stack">
        {toasts.map(t => {
          const iconMap: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
          return (
            <div key={t.id} className={`toast-item ${t.type}`}>
              <span className="toast-icon" style={{ color: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : t.type === 'warning' ? '#d97706' : '#3b82f6' }}>
                {iconMap[t.type]}
              </span>
              <span className="toast-text">{t.text}</span>
              <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
