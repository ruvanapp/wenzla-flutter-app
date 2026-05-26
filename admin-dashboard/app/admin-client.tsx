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
};

type Merchant = {
  id: string;
  storeName: string;
  description?: string;
  address?: string;
  status: string;
  user: { phone: string };
};

type Product = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: string;
  merchant: { storeName: string };
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
type Employee = { id: string; name: string; phone: string; permissions: string[]; createdAt: string };
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
    { key: 'overview',    icon: '📊', label: 'نظرة عامة' },
  ]},
  { group: 'العمليات', items: [
    { key: 'orders',      icon: '📦', label: 'الطلبات' },
    { key: 'merchants',   icon: '🏪', label: 'التجار' },
    { key: 'products',    icon: '🛒', label: 'المنتجات' },
    { key: 'users',       icon: '👥', label: 'المستخدمون' },
  ]},
  { group: 'التسويق', items: [
    { key: 'home_cms',    icon: '🏠', label: 'محتوى الرئيسية' },
    { key: 'notifications', icon: '🔔', label: 'الإشعارات' },
  ]},
  { group: 'المالية', items: [
    { key: 'financial',   icon: '💰', label: 'المالية والعمولات' },
    { key: 'wallet_manual_credit', icon: '💳', label: 'إضافة رصيد يدوي' },
    { key: 'wallet_recharge_requests', icon: '🏦', label: 'طلبات شحن المحفظة' },
    { key: 'wallet_transactions', icon: '📒', label: 'سجل معاملات المحفظة' },
    { key: 'whatsapp_support', icon: '💬', label: 'دعم واتساب' },
  ]},
  { group: 'الإدارة', items: [
    { key: 'technical',   icon: '⚙️',  label: 'المراقبة التقنية' },
    { key: 'security',    icon: '🔐', label: 'الصلاحيات والأمان' },
    { key: 'roadmap',     icon: '🗺️',  label: 'خارطة الطريق' },
  ]},
];

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

// ── HomeCmsPage wrapper (needs ToastProvider context) ────────────────────────

function HomeCmsPageWrapper({ token, apiBase }: { token: string; apiBase: string }) {
  const addToast = useToast();
  return <HomeCmsPage token={token} apiBase={apiBase} onToast={addToast} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClient() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<Overview>({ merchants: 0, products: 0, orders: 0, sales: 0, commission: 0 });
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState('10');
  const [supportWhatsappNumber, setSupportWhatsappNumber] = useState('');
  const [supportWhatsappMessage, setSupportWhatsappMessage] = useState('');
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
  const [activePanel, setActivePanel] = useState('overview');
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
  const [bannerForm, setBannerForm] = useState({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
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
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // ── Analytics state ───────────────────────────────────────────────────────────
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Users state ───────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // ── Notifications state ───────────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState<'customers' | 'merchants'>('customers');
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifHistory, setNotifHistory] = useState<{ id: string; title: string; message?: string; body?: string; createdAt?: string; sentAt?: string; audience?: string; targetType?: string }[]>([]);

  // ── Security state ────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [empForm, setEmpForm] = useState({ name: '', phone: '', password: '', permissions: [] as string[] });
  const [secLoading, setSecLoading] = useState(false);
  const [secMessage, setSecMessage] = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderCount = useRef(0);

  const authorized = useMemo(() => token.length > 0, [token]);
  const totalPages = Math.max(1, Math.ceil(orderTotal / PAGE_SIZE));

  // ── Dark mode ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [darkMode]);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setIdentifier('admin');
    setPassword('.Moha13579#');
  }, []);

  useEffect(() => {
    loadSupportWhatsapp();
  }, []);

  useEffect(() => {
    if (authorized) refreshAll();
  }, [authorized]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (activePanel === 'home_cms') loadCmsData();
    if (activePanel === 'overview') loadAnalytics();
    if (activePanel === 'users') loadUsers();
    if (activePanel === 'notifications') loadNotifHistory();
    if (activePanel === 'security') loadSecurity();
    if (activePanel === 'wallet_recharge_requests') loadWalletRechargeRequests();
    if (activePanel === 'wallet_manual_credit') loadUsers();
    if (activePanel === 'wallet_transactions') loadUsers();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [authorized, activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setMessage('تم تسجيل الدخول بنجاح');
    } catch { setMessage('خطأ في الاتصال بالخادم'); }
  }

  async function refreshAll() {
    try {
      const [ov, mer, prod, com, set] = await Promise.all([
        api<Overview>('/admin/overview'),
        api<Merchant[]>('/admin/merchants'),
        api<Product[]>('/admin/products'),
        api<Commission[]>('/admin/commissions'),
        api<{ percentage: number }>('/admin/settings/commission'),
      ]);
      setOverview(ov);
      setMerchants(mer);
      setProducts(prod);
      setCommissions(com);
      setCommissionPercentage(String(set.percentage));
    } catch { setMessage('خطأ في تحميل البيانات — تحقق من الاتصال'); }
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
  }, [orderPage, orderSearch, orderStatus, orderDay, orderDateFrom, orderDateTo, orderMerchantId, fullOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOrderStats() {
    try { setOrderStats(await api<OrderStats>('/admin/orders/stats')); } catch { /* silent */ }
  }

  async function updateMerchant(id: string, status: string) {
    await api(`/admin/merchants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refreshAll();
  }

  async function updateProduct(id: string, status: string) {
    await api(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refreshAll();
  }

  async function updateOrderStatus(id: string, status: string) {
    try {
      await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setFullOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
      fetchOrderStats();
    } catch (err) { setMessage(String(err)); }
  }

  async function saveCommission() {
    await api('/admin/settings/commission', { method: 'PUT', body: JSON.stringify({ percentage: Number(commissionPercentage) }) });
    await refreshAll();
  }

  async function loadSupportWhatsapp() {
    try {
      const res = await api<{ number?: string; message?: string }>('/admin/settings/support-whatsapp');
      setSupportWhatsappNumber(String(res?.number ?? ''));
      setSupportWhatsappMessage(String(res?.message ?? ''));
    } catch {}
  }

  async function saveSupportWhatsapp() {
    await api('/admin/settings/support-whatsapp', {
      method: 'PUT',
      body: JSON.stringify({
        number: supportWhatsappNumber,
        message: supportWhatsappMessage,
      }),
    });
  }

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
    try {
      const [rev, tp, tv] = await Promise.all([
        api<RevenuePoint[]>('/admin/analytics/revenue'),
        api<TopProduct[]>('/admin/analytics/top-products'),
        api<TopVendor[]>('/admin/analytics/top-vendors'),
      ]);
      setRevenueData(rev ?? []);
      setTopProducts(tp ?? []);
      setTopVendors(tv ?? []);
    } catch { /* silent */ }
    finally { setAnalyticsLoading(false); }
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

  // ── Notifications ─────────────────────────────────────────────────────────────
  async function loadNotifHistory() {
    try {
      const data = await api<typeof notifHistory>('/admin/notifications/history');
      setNotifHistory(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }

  async function sendNotification() {
    if (!notifTitle.trim() || !notifBody.trim()) { setNotifMessage('العنوان والمحتوى مطلوبان'); return; }
    setNotifLoading(true);
    try {
      const endpoint = notifTarget === 'customers' ? '/admin/notifications/customers' : '/admin/notifications/merchants';
      await api(endpoint, { method: 'POST', body: JSON.stringify({ title: notifTitle, message: notifBody }) });
      setNotifMessage('تم إرسال الإشعار بنجاح');
      setNotifTitle(''); setNotifBody('');
      loadNotifHistory();
    } catch (e) { setNotifMessage(String(e)); }
    finally { setNotifLoading(false); }
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
      const [emps, acts] = await Promise.allSettled([
        api<Employee[]>('/admin/employees'),
        api<Activity[]>('/admin/activities'),
      ]);
      setEmployees(emps.status === 'fulfilled' && Array.isArray(emps.value) ? emps.value : []);
      setActivities(acts.status === 'fulfilled' && Array.isArray(acts.value) ? acts.value : []);
    } catch { /* silent */ }
    finally { setSecLoading(false); }
  }

  async function addEmployee() {
    if (!empForm.name || !empForm.phone || !empForm.password) { setSecMessage('جميع الحقول مطلوبة'); return; }
    try {
      await api('/admin/employees', { method: 'POST', body: JSON.stringify(empForm) });
      setSecMessage('تم إضافة الموظف بنجاح');
      setEmpForm({ name: '', phone: '', password: '', permissions: [] });
      loadSecurity();
    } catch (e) { setSecMessage(String(e)); }
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
      if (editingBannerId) {
        await api(`/home-cms/banners/${editingBannerId}`, { method: 'PATCH', body: JSON.stringify(bannerForm) });
        setCmsMessage('تم تحديث البانر بنجاح');
      } else {
        await api('/home-cms/banners', { method: 'POST', body: JSON.stringify(bannerForm) });
        setCmsMessage('تم إضافة البانر بنجاح');
      }
      setBannerForm({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true });
      setEditingBannerId(null);
      loadCmsData();
    } catch (e) { setCmsMessage(String(e)); }
  }

  async function deleteBanner(id: string) {
    if (!confirm('هل تريد حذف هذا البانر؟')) return;
    await api(`/home-cms/banners/${id}`, { method: 'DELETE' });
    loadCmsData();
  }

  async function toggleBanner(b: HomeBanner) {
    await api(`/home-cms/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !b.enabled }) });
    loadCmsData();
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

  async function uploadBannerImage(id: string, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiUrl}/home-cms/banners/${id}/image`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (res.ok) { setCmsMessage('تم رفع الصورة بنجاح'); loadCmsData(); }
    else setCmsMessage('فشل رفع الصورة');
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
  const activeLabel = NAV_ITEMS.flatMap(g => g.items).find(i => i.key === activePanel);

  return (
    <div className="dash-shell" dir="rtl">

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sb-logo">
          <p className="sb-logo-title">🍯 سوق العسل</p>
          <p className="sb-logo-sub">لوحة تحكم المشرف</p>
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(group => (
            <div key={group.group}>
              <div className="sb-group-label">{group.group}</div>
              {group.items.map(item => (
                <button
                  key={item.key}
                  className={`sb-item${activePanel === item.key ? ' active' : ''}`}
                  onClick={() => { setActivePanel(item.key); setSidebarOpen(false); }}
                >
                  <span className="sb-icon">{item.icon}</span>
                  {item.label}
                  {item.key === 'orders' && orderStats.pending > 0 && (
                    <span className="sb-badge">{orderStats.pending}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          سوق العسل · نظام الإدارة
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="dash-main">

        {/* Top bar */}
        <div className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="topbar-btn"
              onClick={() => setSidebarOpen(o => !o)}
              style={{ display: 'none' }}
              id="sb-toggle"
            >
              ☰
            </button>
            <span className="dash-topbar-title">
              {activeLabel?.icon} {activeLabel?.label ?? 'لوحة التحكم'}
            </span>
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={() => setDarkMode(d => !d)}>
              {darkMode ? '☀️ فاتح' : '🌙 داكن'}
            </button>
            <button className="topbar-btn" onClick={refreshAll}>🔄 تحديث</button>
          </div>
        </div>

        {/* Content */}
        <div className="dash-content">

          {message && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 12, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontFamily: 'Cairo', display: 'flex', justifyContent: 'space-between' }}>
              {message}
              <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              OVERVIEW PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'overview' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">نظرة عامة على السوق</h2>
                  <p className="pg-subtitle">ملخص شامل لأداء المنصة</p>
                </div>
                <div className="pg-actions">
                  <button className="topbar-btn" onClick={() => { refreshAll(); loadAnalytics(); }}>🔄 تحديث</button>
                </div>
              </div>

              {/* KPI cards */}
              <div className="analytics-grid">
                <div className="an-card gold">
                  <div className="an-card-icon">🏪</div>
                  <div className="an-card-label">التجار</div>
                  <div className="an-card-value">{overview.merchants.toLocaleString('ar-EG')}</div>
                  <div className="an-card-delta neutral">إجمالي المسجّلين</div>
                </div>
                <div className="an-card blue">
                  <div className="an-card-icon">🛒</div>
                  <div className="an-card-label">المنتجات</div>
                  <div className="an-card-value">{overview.products.toLocaleString('ar-EG')}</div>
                  <div className="an-card-delta neutral">منتج نشط</div>
                </div>
                <div className="an-card green">
                  <div className="an-card-icon">📦</div>
                  <div className="an-card-label">إجمالي الطلبات</div>
                  <div className="an-card-value">{overview.orders.toLocaleString('ar-EG')}</div>
                  <div className="an-card-delta up">اليوم: {orderStats.totalToday}</div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">💰</div>
                  <div className="an-card-label">المبيعات المسلّمة</div>
                  <div className="an-card-value" style={{ fontSize: 18 }}>{formatEGP(overview.sales)}</div>
                  <div className="an-card-delta up">عمولة: {formatEGP(overview.commission)}</div>
                </div>
              </div>

              {/* Revenue chart */}
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
          {activePanel === 'orders' && (
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
                        <th>رقم الطلب</th><th>العميل</th><th>الهاتف</th><th>العنوان</th>
                        <th>المتجر</th><th>الإجمالي</th><th>الدفع</th><th>#</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullOrders.map(order => (
                        <tr key={order.id} className={newOrderIds.has(order.id) ? 'new-order' : ''} onClick={() => setSelectedOrder(order)}>
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
                            <span className="status-pill" style={{ background: `${ORDER_STATUS_COLOR[order.status]}22`, color: ORDER_STATUS_COLOR[order.status], border: `1px solid ${ORDER_STATUS_COLOR[order.status]}44` }}>
                              {ORDER_STATUS_AR[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(order.createdAt)}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div className="action-row">
                              <button className="icon-btn" title="نسخ الهاتف" onClick={() => copyPhone(order.customerPhone)}>📋</button>
                              <button className="icon-btn" title="واتساب" onClick={() => openWhatsApp(order.customerPhone)}>💬</button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
            </section>
          )}

          {/* ════════════════════════════════════════════════════════
              MERCHANTS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'merchants' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إدارة التجار</h2>
                  <p className="pg-subtitle">الموافقة على التجار أو رفضهم أو حظرهم</p>
                </div>
                <div className="pg-actions">
                  <span style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>{merchants.length} تاجر</span>
                </div>
              </div>

              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {(['PENDING', 'APPROVED', 'BLOCKED'] as const).map(s => {
                  const count = merchants.filter(m => m.status === s).length;
                  const color = s === 'APPROVED' ? 'green' : s === 'PENDING' ? 'gold' : 'orange';
                  const label = s === 'APPROVED' ? 'موافق عليهم' : s === 'PENDING' ? 'في الانتظار' : 'محظورون';
                  return (
                    <div key={s} className={`an-card ${color}`}>
                      <div className="an-card-label">{label}</div>
                      <div className="an-card-value">{count}</div>
                    </div>
                  );
                })}
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>قائمة التجار</h3></div>
                <div className="lp-body">
                  {merchants.map(merchant => (
                    <div className="lp-row" key={merchant.id} style={{ gap: 16 }}>
                      <div className="lp-rank" style={{ background: merchant.status === 'APPROVED' ? '#16a34a' : merchant.status === 'PENDING' ? '#c8860a' : '#dc2626' }}>
                        {merchant.storeName.charAt(0)}
                      </div>
                      <div className="lp-info" style={{ flex: 1 }}>
                        <strong>{merchant.storeName}</strong>
                        <div className="lp-sub" dir="ltr">{merchant.user.phone} · {merchant.address || 'لا يوجد عنوان'}</div>
                      </div>
                      <select
                        value={merchant.status}
                        onChange={e => updateMerchant(merchant.id, e.target.value)}
                        style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, fontFamily: 'Cairo', border: '1px solid rgba(71,39,21,0.15)', background: 'var(--paper)', color: 'var(--brown)' }}
                      >
                        {MERCHANT_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                  {merchants.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد تجار</div>}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              PRODUCTS PANEL
             ════════════════════════════════════════════════════════ */}
          {activePanel === 'products' && (
            <div>
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">إدارة المنتجات</h2>
                  <p className="pg-subtitle">مراجعة وإدارة جميع منتجات السوق</p>
                </div>
                <span style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>{products.length} منتج</span>
              </div>

              {/* Quick stats */}
              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
                <div className="an-card blue"><div className="an-card-icon">📦</div><div className="an-card-label">إجمالي المنتجات</div><div className="an-card-value">{products.length}</div></div>
                <div className="an-card green"><div className="an-card-icon">✅</div><div className="an-card-label">نشطة</div><div className="an-card-value">{products.filter(p => p.status === 'ACTIVE').length}</div></div>
                <div className="an-card orange"><div className="an-card-icon">⚠️</div><div className="an-card-label">نفد المخزون</div><div className="an-card-value">{products.filter(p => p.stock === 0).length}</div></div>
                <div className="an-card" style={{ background: 'linear-gradient(135deg,#fecaca,#fee2e2)', border: '1px solid #dc2626' }}><div className="an-card-icon">🚫</div><div className="an-card-label">محظورة</div><div className="an-card-value">{products.filter(p => p.status === 'BLOCKED').length}</div></div>
              </div>

              <div className="list-panel">
                <div className="lp-head"><h3>قائمة المنتجات</h3></div>
                <div className="lp-body">
                  {products.map(product => (
                    <div className="lp-row" key={product.id}>
                      <div className="lp-info" style={{ flex: 1 }}>
                        <strong>{product.name}</strong>
                        <div className="lp-sub">{product.merchant.storeName} · {formatEGP(product.price)} · مخزون: {product.stock}</div>
                      </div>
                      {product.stock === 0 && <span className="sec-badge" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #d97706' }}>نفد المخزون</span>}
                      <select
                        value={product.status}
                        onChange={e => updateProduct(product.id, e.target.value)}
                        style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, fontFamily: 'Cairo', border: '1px solid rgba(71,39,21,0.15)', background: 'var(--paper)', color: product.status === 'BLOCKED' ? '#dc2626' : 'var(--brown)' }}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="BLOCKED">BLOCKED</option>
                      </select>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد منتجات</div>}
                </div>
              </div>
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
                </div>
              </div>

              {/* Quick stats */}
              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
                <div className="an-card blue">
                  <div className="an-card-icon">👥</div>
                  <div className="an-card-label">إجمالي العملاء</div>
                  <div className="an-card-value">{(Array.isArray(users) ? users : []).length}</div>
                </div>
                <div className="an-card green">
                  <div className="an-card-icon">✅</div>
                  <div className="an-card-label">نشطون</div>
                  <div className="an-card-value">{(Array.isArray(users) ? users : []).filter(u => !u.isBanned).length}</div>
                </div>
                <div className="an-card orange">
                  <div className="an-card-icon">🚫</div>
                  <div className="an-card-label">محظورون</div>
                  <div className="an-card-value">{(Array.isArray(users) ? users : []).filter(u => u.isBanned).length}</div>
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
                <HomeCmsPageWrapper token={token!} apiBase={apiUrl} />
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
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="action-btn" onClick={saveBanner}>{editingBannerId ? '💾 حفظ التعديلات' : '➕ إضافة'}</button>
                      {editingBannerId && (
                        <button className="action-btn" onClick={() => { setEditingBannerId(null); setBannerForm({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true }); }}>
                          ✕ إلغاء
                        </button>
                      )}
                    </div>
                  </div>

                  {homeBanners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>لا توجد بانرات حتى الآن — أضف أول بانر أعلاه</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {homeBanners.map(b => (
                        <div key={b.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--cream)', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', opacity: b.enabled ? 1 : 0.5 }}>
                          <div style={{ width: 56, height: 40, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }} />
                          {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 10 }} />}
                          <div style={{ flex: 1, direction: 'rtl' }}>
                            <strong style={{ fontFamily: 'Cairo' }}>{b.title}</strong>
                            {b.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{b.subtitle}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="icon-btn" title="رفع صورة"
                              onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = ev => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) uploadBannerImage(b.id, f); }; inp.click(); }}>📷</button>
                            <button className="icon-btn" title="تعديل"
                              onClick={() => { setEditingBannerId(b.id); setBannerForm({ id: b.id, title: b.title, subtitle: b.subtitle ?? '', buttonText: b.buttonText ?? '', color1: b.color1, color2: b.color2, enabled: b.enabled }); }}>✏️</button>
                            <button className="icon-btn" onClick={() => toggleBanner(b)}>{b.enabled ? '👁' : '🚫'}</button>
                            <button className="icon-btn" onClick={() => deleteBanner(b.id)} style={{ color: '#dc2626' }}>🗑</button>
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
              <div className="pg-header">
                <div>
                  <h2 className="pg-title">لوحة المالية والعمولات</h2>
                  <p className="pg-subtitle">تتبع العمولات والإيرادات وإعدادات الرسوم</p>
                </div>
              </div>

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
                  <div className="an-card-value">{commissionPercentage}%</div>
                </div>
              </div>

              <div className="two-col">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">⚙️ إعداد نسبة العمولة</h3>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>النسبة المئوية %</label>
                      <input type="number" value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} min="0" max="100"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 16, background: 'var(--paper)', color: 'var(--brown)' }} />
                    </div>
                    <button className="action-btn" onClick={saveCommission} style={{ flexShrink: 0, background: 'var(--brown)', color: 'var(--cream)', border: 'none' }}>
                      💾 حفظ النسبة
                    </button>
                  </div>
                </div>

                <div className="chart-panel">
                  <h3 className="chart-panel-title">💬 إعدادات واتساب الدعم</h3>
                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                        WhatsApp Support Number
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
                        WhatsApp Default Message
                      </label>
                      <textarea
                        value={supportWhatsappMessage}
                        onChange={e => setSupportWhatsappMessage(e.target.value)}
                        rows={3}
                        placeholder="السلام عليكم، محتاج مساعدة في تطبيق سوق العسل"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 14, background: 'var(--paper)', color: 'var(--brown)', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <button className="action-btn" onClick={saveSupportWhatsapp} style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none' }}>
                        💾 حفظ إعدادات واتساب الدعم
                      </button>
                    </div>
                  </div>
                </div>

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
                      <button className="action-btn" onClick={saveSupportWhatsapp} style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none' }}>
                        💾 حفظ إعدادات واتساب الدعم
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <div className="lp-body">
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
                  <p className="pg-subtitle">إدارة الموظفين وصلاحياتهم وسجل النشاط</p>
                </div>
              </div>

              {secMessage && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontFamily: 'Cairo', display: 'flex', justifyContent: 'space-between' }}>
                  {secMessage}
                  <button onClick={() => setSecMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              <div className="two-col">
                {/* Add employee form */}
                <div className="chart-panel">
                  <h3 className="chart-panel-title">➕ إضافة موظف جديد</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {[
                      { label: 'الاسم', key: 'name' as const, placeholder: 'اسم الموظف', type: 'text' },
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
                    <button className="action-btn" onClick={addEmployee} style={{ background: 'var(--brown)', color: 'var(--cream)', border: 'none', marginTop: 6 }}>
                      💾 إضافة الموظف
                    </button>
                  </div>
                </div>

                {/* Employees list */}
                <div className="list-panel" style={{ margin: 0 }}>
                  <div className="lp-head"><h3>👥 الموظفون</h3></div>
                  <div className="lp-body">
                    {secLoading ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>جاري التحميل…</div>
                    ) : !Array.isArray(employees) || employees.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>لا يوجد موظفون</div>
                    ) : employees.map(emp => (
                      <div className="emp-row" key={emp.id}>
                        <div className="emp-avatar">{(emp.name ?? '?').charAt(0)}</div>
                        <div className="lp-info">
                          <strong>{emp.name}</strong>
                          <div className="lp-sub" dir="ltr">{emp.phone}</div>
                          {Array.isArray(emp.permissions) && emp.permissions.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {emp.permissions.map((p, pi) => {
                                const label = typeof p === 'string' ? p : JSON.stringify(p);
                                return <span key={pi} className="sec-badge building" style={{ fontSize: 9 }}>{label}</span>;
                              })}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)' }}>{formatDate(emp.createdAt)}</span>
                      </div>
                    ))}
                  </div>
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
                <select value={selectedOrder.status} onChange={e => updateOrderStatus(selectedOrder.id, e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px', minWidth: 130, borderRadius: 10 }}>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s] ?? s}</option>)}
                </select>
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
    </div>
  );
}
