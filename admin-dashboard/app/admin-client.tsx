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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
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
      const [ov, mer, prod, com, set, cats] = await Promise.all([
        api<Overview>('/admin/overview'),
        api<Merchant[]>('/admin/merchants'),
        api<Product[]>('/admin/products'),
        api<Commission[]>('/admin/commissions'),
        api<{ percentage: number }>('/admin/settings/commission'),
        api<{ id: string; name: string }[]>('/admin/categories'),
      ]);
      setOverview(ov);
      setMerchants(mer);
      setProducts(prod);
      setCommissions(com);
      setCommissionPercentage(String(set.percentage));
      setCategories(cats ?? []);
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

  const toast = {
    success: (msg: string) => setMessage(msg),
    error: (msg: string) => setMessage(msg),
  };

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
    await api(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refreshAll();
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
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' });
      toast.success('تم حذف المنتج');
      await refreshAll();
    } catch (e) { toast.error('فشل الحذف: ' + String(e)); }
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
                  <p className="pg-subtitle">إنشاء التجار وإدارة حالاتهم وصورهم ومعلوماتهم</p>
                </div>
                <div className="pg-actions">
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

              {/* Search */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="بحث باسم المتجر أو رقم الهاتف..."
                  value={merchantSearch}
                  onChange={e => setMerchantSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(71,39,21,0.15)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--paper)', color: 'var(--brown)', boxSizing: 'border-box' }}
                />
              </div>

              {/* List */}
              <div className="list-panel">
                <div className="lp-head">
                  <h3>قائمة التجار ({merchants.filter(m => {
                    const matchStatus = merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter;
                    const q = merchantSearch.toLowerCase();
                    const matchSearch = !q || m.storeName.toLowerCase().includes(q) || m.user.phone.includes(q);
                    return matchStatus && matchSearch;
                  }).length})</h3>
                </div>
                <div className="lp-body">
                  {merchants
                    .filter(m => {
                      const matchStatus = merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter;
                      const q = merchantSearch.toLowerCase();
                      const matchSearch = !q || m.storeName.toLowerCase().includes(q) || m.user.phone.includes(q);
                      return matchStatus && matchSearch;
                    })
                    .map(merchant => (
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
                  {merchants.filter(m => {
                    const matchStatus = merchantStatusFilter === 'ALL' || m.status === merchantStatusFilter;
                    const q = merchantSearch.toLowerCase();
                    return (merchantStatusFilter === 'ALL' || matchStatus) && (!q || m.storeName.toLowerCase().includes(q) || m.user.phone.includes(q));
                  }).length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo' }}>
                      لا يوجد تجار
                    </div>
                  )}
                </div>
              </div>

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
              </div>

              {/* Products grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {products
                  .filter(p => {
                    const q = productSearch.toLowerCase();
                    const nameMatch = !q || p.name.toLowerCase().includes(q);
                    const mMatch = productMerchantFilter === 'ALL' || p.merchantId === productMerchantFilter;
                    return nameMatch && mMatch;
                  })
                  .map(product => (
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
                        <button onClick={() => updateProduct(product.id, product.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE')}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 10, background: product.status === 'ACTIVE' ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                            color: product.status === 'ACTIVE' ? '#dc2626' : '#16a34a', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12,
                            border: `1px solid ${product.status === 'ACTIVE' ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`, cursor: 'pointer' }}>
                          {product.status === 'ACTIVE' ? '🚫 إيقاف' : '✅ تفعيل'}
                        </button>
                        <button onClick={() => deleteProduct(product.id)}
                          style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.07)', color: '#dc2626', fontFamily: 'Cairo', fontSize: 12, border: '1px solid rgba(220,38,38,0.15)', cursor: 'pointer' }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                {products.filter(p => {
                  const q = productSearch.toLowerCase();
                  const nameMatch = !q || p.name.toLowerCase().includes(q);
                  const mMatch = productMerchantFilter === 'ALL' || p.merchantId === productMerchantFilter;
                  return nameMatch && mMatch;
                }).length === 0 && (
                  <div style={{ gridColumn: '1/-1', padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Cairo', fontSize: 15 }}>
                    📦 لا توجد منتجات
                  </div>
                )}
              </div>

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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
