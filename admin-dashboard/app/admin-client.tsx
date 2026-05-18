'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAdminToken } from '../lib/api';

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

function pillClass(status: string) {
  const s = status.toLowerCase().replace('out_for_delivery', 'out');
  return `pill ${s}`;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClient() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<Overview>({ merchants: 0, products: 0, orders: 0, sales: 0, commission: 0 });
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState('10');

  // ── Home CMS state ───────────────────────────────────────────────────────────
  const [cmsTab, setCmsTab] = useState<'banners' | 'promotions' | 'sections'>('banners');
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [homePromotions, setHomePromotions] = useState<HomePromotion[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsMessage, setCmsMessage] = useState('');

  // Banner form
  const [bannerForm, setBannerForm] = useState({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Promotion form
  const [promoForm, setPromoForm] = useState({ id: '', title: '', subtitle: '', targetUrl: '', enabled: true, startsAt: '', endsAt: '' });
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState('orders');
  const [message, setMessage] = useState('');

  // ── Orders state ────────────────────────────────────────────────────────────
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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderCount = useRef(0);

  const authorized = useMemo(() => token.length > 0, [token]);
  const totalPages = Math.max(1, Math.ceil(orderTotal / PAGE_SIZE));

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setPhone('+10000000000');
    setPassword('admin123456');
  }, []);

  useEffect(() => {
    if (authorized) refreshAll();
  }, [authorized]);

  // ── Orders polling ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authorized && activePanel === 'orders') {
      fetchOrders();
      fetchOrderStats();
      pollingRef.current = setInterval(() => {
        fetchOrderStats();
        fetchOrders(true);
      }, 30_000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [authorized, activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Home CMS data when panel becomes active
  useEffect(() => {
    if (authorized && activePanel === 'home_cms') loadCmsData();
  }, [authorized, activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on filter/page changes
  useEffect(() => {
    if (authorized && activePanel === 'orders') fetchOrders();
  }, [orderPage, orderStatus, orderDay, orderDateFrom, orderDateTo, orderMerchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (!authorized || activePanel !== 'orders') return;
    const t = setTimeout(() => { setOrderPage(1); fetchOrders(); }, 380);
    return () => clearTimeout(t);
  }, [orderSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API ───────────────────────────────────────────────────────────────────────
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
        body: JSON.stringify({ phone, password }),
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
      setOverview(prev => ({ ...prev, orders: prev.orders }));
    } catch (err) { setMessage(String(err)); }
  }

  async function saveCommission() {
    await api('/admin/settings/commission', { method: 'PUT', body: JSON.stringify({ percentage: Number(commissionPercentage) }) });
    await refreshAll();
  }

  // ── CMS API ──────────────────────────────────────────────────────────────────
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
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) { setCmsMessage('تم رفع الصورة بنجاح'); loadCmsData(); }
    else setCmsMessage('فشل رفع الصورة');
  }

  async function uploadPromoImage(id: string, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${apiUrl}/home-cms/promotions/${id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) { setCmsMessage('تم رفع الصورة بنجاح'); loadCmsData(); }
    else setCmsMessage('فشل رفع الصورة');
  }

  // ── Small utilities ──────────────────────────────────────────────────────────
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

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!mounted) return <div style={{ padding: 40, textAlign: 'center' }}>جاري تحميل لوحة التحكم…</div>;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="shell" dir="rtl">

      {/* ── Hero / Login ── */}
      <section className="hero">
        <div>
          <div className="eyebrow">لوحة تحكم سوق العسل</div>
          <h1>إدارة الطلبات والتجار والمنتجات.</h1>
        </div>
        <div className="hero-card">
          <strong>تسجيل دخول المشرف</strong>
          <div className="form-grid">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" dir="ltr" />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" type="password" />
            <button onClick={login}>دخول</button>
          </div>
          <p className="muted">{message || 'أدخل بيانات المشرف للدخول.'}</p>
        </div>
      </section>

      {/* ── Overview Stats ── */}
      <section className="stats">
        <div className="stat"><strong>{overview.merchants}</strong><span>التجار</span></div>
        <div className="stat"><strong>{overview.products}</strong><span>المنتجات</span></div>
        <div className="stat"><strong>{overview.orders}</strong><span>إجمالي الطلبات</span></div>
        <div className="stat"><strong>{formatEGP(overview.sales)}</strong><span>المبيعات المسلّمة</span></div>
        <div className="stat"><strong>{formatEGP(overview.commission)}</strong><span>العمولة المستحقة</span></div>
      </section>

      {/* ── Tabs ── */}
      <nav className="tabs">
        {[
          { key: 'orders', label: '📦 الطلبات' },
          { key: 'merchants', label: '🏪 التجار' },
          { key: 'products', label: '🛒 المنتجات' },
          { key: 'commissions', label: '💰 العمولات' },
          { key: 'home_cms', label: '🏠 الرئيسية' },
        ].map(({ key, label }) => (
          <button key={key} className={activePanel === key ? 'active' : ''} onClick={() => setActivePanel(key)}>
            {label}
          </button>
        ))}
      </nav>

      {/* ════════════════════════════════════════════════════════════════
          ORDERS PANEL
         ════════════════════════════════════════════════════════════════ */}
      {activePanel === 'orders' && (
        <section className="panel" style={{ overflow: 'visible', borderRadius: 30 }}>

          {/* Header */}
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>إدارة الطلبات</h2>
              <span className="total-badge">{orderTotal.toLocaleString('ar-EG')} طلب</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="action-btn" onClick={() => exportCSV(fullOrders)}>
                📊 تصدير CSV
              </button>
              <button className="action-btn refresh" onClick={() => { fetchOrders(); fetchOrderStats(); }}>
                🔄 تحديث
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="order-stats-bar">
            <div className="order-stat-chip">
              <span className="chip-num">{orderStats.totalToday}</span>
              <span className="chip-label">طلبات اليوم</span>
            </div>
            <div className="order-stat-chip pending-chip">
              <span className="chip-num">{orderStats.pending}</span>
              <span className="chip-label">في الانتظار</span>
            </div>
            <div className="order-stat-chip delivered-chip">
              <span className="chip-num">{orderStats.completed}</span>
              <span className="chip-label">مكتملة</span>
            </div>
            <div className="order-stat-chip cancelled-chip">
              <span className="chip-num">{orderStats.cancelled}</span>
              <span className="chip-label">ملغاة</span>
            </div>
            <div className="order-stat-chip sales-chip">
              <span className="chip-num">{formatEGP(orderStats.totalSalesAmount)}</span>
              <span className="chip-label">إجمالي المبيعات</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="بحث: اسم العميل، الهاتف، رقم الطلب، اسم المتجر..."
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }}
              />
            </div>

            <select className="filter-select" value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrderPage(1); }}>
              <option value="">جميع الحالات</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s]}</option>)}
            </select>

            <select className="filter-select" value={orderDay} onChange={e => { setOrderDay(e.target.value); setOrderDateFrom(''); setOrderDateTo(''); setOrderPage(1); }}>
              <option value="">كل الأوقات</option>
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
            </select>

            {!orderDay && (
              <>
                <input type="date" className="filter-select" value={orderDateFrom}
                  onChange={e => { setOrderDateFrom(e.target.value); setOrderPage(1); }}
                  title="من تاريخ" />
                <input type="date" className="filter-select" value={orderDateTo}
                  onChange={e => { setOrderDateTo(e.target.value); setOrderPage(1); }}
                  title="إلى تاريخ" />
              </>
            )}

            <select className="filter-select" value={orderMerchantId} onChange={e => { setOrderMerchantId(e.target.value); setOrderPage(1); }}>
              <option value="">كل المتاجر</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.storeName}</option>)}
            </select>

            {hasFilters && (
              <button className="clear-btn" onClick={clearFilters}>✕ مسح الفلاتر</button>
            )}
          </div>

          {/* Table */}
          <div className="orders-table-wrap">
            {ordersLoading ? (
              <div className="table-state">
                <div className="spinner" />
                <p>جاري تحميل الطلبات…</p>
              </div>
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
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>الهاتف</th>
                    <th>العنوان</th>
                    <th>المتجر</th>
                    <th>الإجمالي</th>
                    <th>الدفع</th>
                    <th>#</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {fullOrders.map(order => (
                    <tr
                      key={order.id}
                      className={newOrderIds.has(order.id) ? 'new-order' : ''}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td>
                        <span className="order-id-badge">#{order.id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        {order.customer?.name && order.customer.name !== order.customerName && (
                          <div className="sub-text">{order.customer.name}</div>
                        )}
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
                        <span
                          className="status-pill"
                          style={{
                            background: `${ORDER_STATUS_COLOR[order.status]}22`,
                            color: ORDER_STATUS_COLOR[order.status],
                            border: `1px solid ${ORDER_STATUS_COLOR[order.status]}44`,
                          }}
                        >
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                {orderTotal.toLocaleString('ar-EG')} طلب — صفحة {orderPage} من {totalPages}
              </span>
              <div className="pagination-btns">
                <button disabled={orderPage <= 1} onClick={() => setOrderPage(1)}>«</button>
                <button disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(orderPage - 2, totalPages - 4)) + i;
                  return pg <= totalPages ? (
                    <button
                      key={pg}
                      onClick={() => setOrderPage(pg)}
                      style={orderPage === pg ? { background: 'var(--brown)', color: 'var(--cream)', border: '1px solid var(--brown)' } : {}}
                    >
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

      {/* ════════════════════════════════════════════════════════════════
          MERCHANTS PANEL
         ════════════════════════════════════════════════════════════════ */}
      {activePanel === 'merchants' && (
        <section className="panel">
          <h2>الموافقة على التجار أو رفضهم</h2>
          <div className="list">
            {merchants.map(merchant => (
              <div className="row rich" key={merchant.id}>
                <div>
                  <strong>{merchant.storeName}</strong>
                  <div className="muted">{merchant.user.phone} · {merchant.address || 'لا يوجد عنوان'}</div>
                </div>
                <select value={merchant.status} onChange={e => updateMerchant(merchant.id, e.target.value)}>
                  {MERCHANT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ))}
            {merchants.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>لا يوجد تجار</div>}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PRODUCTS PANEL
         ════════════════════════════════════════════════════════════════ */}
      {activePanel === 'products' && (
        <section className="panel">
          <h2>إدارة المنتجات</h2>
          <div className="list">
            {products.map(product => (
              <div className="row rich" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <div className="muted">{product.merchant.storeName} · {formatEGP(product.price)} · مخزون: {product.stock}</div>
                </div>
                <select value={product.status} onChange={e => updateProduct(product.id, e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            ))}
            {products.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد منتجات</div>}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          COMMISSIONS PANEL
         ════════════════════════════════════════════════════════════════ */}
      {activePanel === 'commissions' && (
        <section className="grid">
          <div className="panel">
            <h2>نسبة العمولة</h2>
            <div className="commission-box">
              <input value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} />
              <button onClick={saveCommission}>حفظ النسبة</button>
            </div>
          </div>
          <div className="panel">
            <h2>عمولات التجار</h2>
            <div className="list">
              {commissions.map(item => (
                <div className="row" key={item.merchant.storeName}>
                  <div>
                    <strong>{item.merchant.storeName}</strong>
                    <div className="muted">{item.deliveredOrders} طلبات مسلّمة · {formatEGP(item.totalSales)} مبيعات</div>
                  </div>
                  <span className="pill approved">{formatEGP(item.commissionOwed)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          HOME CMS PANEL
         ════════════════════════════════════════════════════════════════ */}
      {activePanel === 'home_cms' && (
        <section className="panel" style={{ overflow: 'visible', borderRadius: 30 }}>

          <div className="panel-header">
            <h2 style={{ margin: 0, fontSize: 22 }}>إدارة محتوى الصفحة الرئيسية</h2>
            <button className="action-btn refresh" onClick={loadCmsData}>🔄 تحديث</button>
          </div>

          {cmsMessage && (
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontFamily: 'Cairo' }}>
              {cmsMessage}
              <button onClick={() => setCmsMessage('')} style={{ float: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {([
              { key: 'banners', label: '🖼 البانرات' },
              { key: 'promotions', label: '🎁 العروض' },
              { key: 'sections', label: '⚙️ الأقسام' },
            ] as const).map(({ key, label }) => (
              <button key={key}
                onClick={() => setCmsTab(key)}
                style={{
                  padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 600, fontSize: 13,
                  background: cmsTab === key ? 'var(--brown)' : 'var(--cream)',
                  color: cmsTab === key ? 'var(--cream)' : 'var(--brown)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {cmsLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>جاري التحميل…</div>}

          {/* ── Banners sub-panel ── */}
          {!cmsLoading && cmsTab === 'banners' && (
            <div>
              {/* Banner Form */}
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
                  <button className="action-btn" onClick={saveBanner}>
                    {editingBannerId ? '💾 حفظ التعديلات' : '➕ إضافة'}
                  </button>
                  {editingBannerId && (
                    <button className="action-btn" onClick={() => { setEditingBannerId(null); setBannerForm({ id: '', title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true }); }}>
                      ✕ إلغاء
                    </button>
                  )}
                </div>
              </div>

              {/* Banners list */}
              {homeBanners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>
                  لا توجد بانرات حتى الآن — أضف أول بانر أعلاه
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {homeBanners.map(b => (
                    <div key={b.id} style={{
                      display: 'flex', gap: 16, alignItems: 'center', background: 'var(--cream)',
                      borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)',
                      opacity: b.enabled ? 1 : 0.5,
                    }}>
                      {/* Color preview */}
                      <div style={{
                        width: 56, height: 40, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, ${b.color1}, ${b.color2})`,
                      }} />
                      {/* Image */}
                      {b.imageUrl && (
                        <img src={b.imageUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 10 }} />
                      )}
                      {/* Info */}
                      <div style={{ flex: 1, direction: 'rtl' }}>
                        <strong style={{ fontFamily: 'Cairo' }}>{b.title}</strong>
                        {b.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{b.subtitle}</div>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="icon-btn" title="رفع صورة"
                          onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) uploadBannerImage(b.id, f); }; inp.click(); }}>
                          📷
                        </button>
                        <button className="icon-btn" title="تعديل" onClick={() => { setEditingBannerId(b.id); setBannerForm({ id: b.id, title: b.title, subtitle: b.subtitle ?? '', buttonText: b.buttonText ?? '', color1: b.color1, color2: b.color2, enabled: b.enabled }); }}>
                          ✏️
                        </button>
                        <button className="icon-btn" title={b.enabled ? 'إخفاء' : 'إظهار'} onClick={() => toggleBanner(b)}>
                          {b.enabled ? '👁' : '🚫'}
                        </button>
                        <button className="icon-btn" title="حذف" onClick={() => deleteBanner(b.id)} style={{ color: '#dc2626' }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Promotions sub-panel ── */}
          {!cmsLoading && cmsTab === 'promotions' && (
            <div>
              {/* Promo Form */}
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
                      <input type="date" value={promoForm.startsAt} onChange={e => setPromoForm(f => ({ ...f, startsAt: e.target.value }))}
                        style={{ width: '100%', marginTop: 4 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)' }}>نهاية العرض</label>
                      <input type="date" value={promoForm.endsAt} onChange={e => setPromoForm(f => ({ ...f, endsAt: e.target.value }))}
                        style={{ width: '100%', marginTop: 4 }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', paddingBottom: 4 }}>
                      <input type="checkbox" checked={promoForm.enabled} onChange={e => setPromoForm(f => ({ ...f, enabled: e.target.checked }))} />
                      مفعّل
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="action-btn" onClick={savePromotion}>
                    {editingPromoId ? '💾 حفظ التعديلات' : '➕ إضافة'}
                  </button>
                  {editingPromoId && (
                    <button className="action-btn" onClick={() => { setEditingPromoId(null); setPromoForm({ id: '', title: '', subtitle: '', targetUrl: '', enabled: true, startsAt: '', endsAt: '' }); }}>
                      ✕ إلغاء
                    </button>
                  )}
                </div>
              </div>

              {/* Promotions list */}
              {homePromotions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>
                  لا توجد عروض حتى الآن — أضف أول عرض أعلاه
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {homePromotions.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', gap: 16, alignItems: 'center', background: 'var(--cream)',
                      borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)',
                      opacity: p.enabled ? 1 : 0.5,
                    }}>
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 10 }} />
                      )}
                      <div style={{ flex: 1, direction: 'rtl' }}>
                        <strong style={{ fontFamily: 'Cairo' }}>{p.title}</strong>
                        {p.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{p.subtitle}</div>}
                        {(p.startsAt || p.endsAt) && (
                          <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'Cairo' }} dir="ltr">
                            {p.startsAt && `من ${p.startsAt}`} {p.endsAt && `حتى ${p.endsAt}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="icon-btn" title="رفع صورة"
                          onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) uploadPromoImage(p.id, f); }; inp.click(); }}>
                          📷
                        </button>
                        <button className="icon-btn" title="تعديل" onClick={() => { setEditingPromoId(p.id); setPromoForm({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', targetUrl: p.targetUrl ?? '', enabled: p.enabled, startsAt: p.startsAt?.slice(0,10) ?? '', endsAt: p.endsAt?.slice(0,10) ?? '' }); }}>
                          ✏️
                        </button>
                        <button className="icon-btn" title={p.enabled ? 'إخفاء' : 'إظهار'} onClick={() => togglePromotion(p)}>
                          {p.enabled ? '👁' : '🚫'}
                        </button>
                        <button className="icon-btn" title="حذف" onClick={() => deletePromotion(p.id)} style={{ color: '#dc2626' }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Sections sub-panel ── */}
          {!cmsLoading && cmsTab === 'sections' && (
            <div>
              <p style={{ fontFamily: 'Cairo', color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                تحكم في ظهور وإخفاء أقسام الصفحة الرئيسية. الأقسام تُنشأ تلقائيًا عند حفظ الإعدادات لأول مرة.
              </p>
              {homeSections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'Cairo' }}>
                  لا توجد أقسام محفوظة حتى الآن. ستُنشأ عند أول تفعيل.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {homeSections.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--cream)', borderRadius: 14, padding: '12px 16px',
                      border: '1px solid var(--border)', direction: 'rtl',
                    }}>
                      <div>
                        <strong style={{ fontFamily: 'Cairo' }}>{s.title ?? s.key}</strong>
                        {s.subtitle && <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'Cairo' }}>{s.subtitle}</div>}
                        <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'Cairo', direction: 'ltr' }}>key: {s.key}</div>
                      </div>
                      <button className="action-btn" onClick={() => toggleSection(s)}
                        style={{ background: s.enabled ? '#16a34a' : '#9ca3af', color: 'white', border: 'none' }}>
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

        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ORDER DETAILS MODAL
         ════════════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" dir="rtl" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">تفاصيل الطلب</div>
                <div className="modal-order-id">#{selectedOrder.id.slice(-8).toUpperCase()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  className="status-pill"
                  style={{
                    background: `${ORDER_STATUS_COLOR[selectedOrder.status]}22`,
                    color: ORDER_STATUS_COLOR[selectedOrder.status],
                    border: `1px solid ${ORDER_STATUS_COLOR[selectedOrder.status]}44`,
                  }}
                >
                  {ORDER_STATUS_AR[selectedOrder.status] ?? selectedOrder.status}
                </span>
                <select
                  value={selectedOrder.status}
                  onChange={e => updateOrderStatus(selectedOrder.id, e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px', minWidth: 130, borderRadius: 10 }}
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_AR[s] ?? s}</option>)}
                </select>
                <button className="close-btn" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
            </div>

            <div className="modal-body">

              {/* Customer Section */}
              <div className="modal-section">
                <div className="modal-section-title">👤 بيانات العميل</div>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>الاسم</label>
                    <p>{selectedOrder.customerName}</p>
                  </div>
                  <div className="modal-field">
                    <label>رقم الهاتف</label>
                    <p dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedOrder.customerPhone}
                      <button className="icon-btn" onClick={() => copyPhone(selectedOrder.customerPhone)}>📋</button>
                      <button className="icon-btn" onClick={() => openWhatsApp(selectedOrder.customerPhone)}>💬</button>
                    </p>
                  </div>
                  <div className="modal-field full-width">
                    <label>عنوان التوصيل</label>
                    <p>{selectedOrder.deliveryAddress}</p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="modal-field full-width">
                      <label>ملاحظات التوصيل</label>
                      <p>{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="modal-section">
                <div className="modal-section-title">🏪 بيانات الطلب</div>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>المتجر</label>
                    <p>{selectedOrder.merchant.storeName}</p>
                  </div>
                  <div className="modal-field">
                    <label>هاتف التاجر</label>
                    <p dir="ltr">{selectedOrder.merchant.user.phone}</p>
                  </div>
                  <div className="modal-field">
                    <label>طريقة الدفع</label>
                    <p>{PAYMENT_AR[selectedOrder.paymentMethod] ?? selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="modal-field">
                    <label>حالة الدفع</label>
                    <p>{selectedOrder.paymentStatus}</p>
                  </div>
                  <div className="modal-field">
                    <label>تاريخ الطلب</label>
                    <p dir="ltr">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="modal-field">
                    <label>آخر تحديث</label>
                    <p dir="ltr">{formatDate(selectedOrder.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Products */}
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

              {/* Totals */}
              <div className="modal-section">
                <div className="totals-box">
                  <div className="totals-row">
                    <span>المجموع الفرعي</span>
                    <span dir="ltr">{formatEGP(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="totals-row grand">
                    <span>الإجمالي الكلي</span>
                    <span dir="ltr">{formatEGP(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}
