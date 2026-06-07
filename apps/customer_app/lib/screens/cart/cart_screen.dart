import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';
import 'widgets/cart_empty_state.dart';
import 'widgets/cart_store_header.dart';
import 'widgets/cart_item_card.dart';
import 'widgets/cart_coupon_section.dart';
import 'widgets/cart_totals_card.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  double _couponDiscount = 0;
  String _supportWhatsappNumber = '';
  String _supportWhatsappMessage =
      'السلام عليكم، محتاج مساعدة في تطبيق سوق العسل';
  double _minimumOrder = 0;

  static const _deliveryFee = 0.0; // free delivery for now

  @override
  void initState() {
    super.initState();
    _loadSupportWhatsapp();
    _loadMinimumOrder();
  }

  Future<void> _loadSupportWhatsapp() async {
    try {
      final api = ApiService(token: context.read<AppState>().token);
      final res = await api.get('/customer/settings/support-whatsapp');
      if (!mounted || res is! Map) return;
      setState(() {
        _supportWhatsappNumber = (res['number'] as String? ?? '').trim();
        _supportWhatsappMessage = (res['message'] as String? ??
                'السلام عليكم، محتاج مساعدة في تطبيق سوق العسل')
            .trim();
      });
    } catch (_) {}
  }

  Future<void> _loadMinimumOrder() async {
    try {
      final api = ApiService(token: context.read<AppState>().token);
      final res = await api.get('/customer/settings/minimum-order');
      if (!mounted || res is! Map) return;
      setState(() {
        _minimumOrder = (res['amount'] is num)
            ? (res['amount'] as num).toDouble()
            : double.tryParse('${res['amount']}') ?? 0;
      });
    } catch (_) {}
  }

  Future<void> _openSupportWhatsapp() async {
    final number = _supportWhatsappNumber.trim();
    if (number.isEmpty) return;
    final normalized = number.startsWith('+') ? number.substring(1) : number;
    final message = Uri.encodeComponent(_supportWhatsappMessage.trim());
    final uri = Uri.parse('https://wa.me/$normalized?text=$message');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackground,
      appBar: _buildAppBar(context),
      body: Consumer<AppState>(
        builder: (context, st, _) {
          if (st.cart.isEmpty) return const _CartEmptyBody();
          final cartItems = st.cart
              .map((item) => item is Map<String, dynamic>
                  ? item
                  : Map<String, dynamic>.from(item as Map))
              .toList(growable: false);
          return _CartContent(
            key: ValueKey(
              cartItems
                  .map((item) => '${item['id']}:${item['qty']}')
                  .join('|'),
            ),
            cart: cartItems,
            state: st,
            deliveryFee: _deliveryFee,
            couponDiscount: _couponDiscount,
            onDiscountChanged: (d) => setState(() => _couponDiscount = d),
            supportWhatsappNumber: _supportWhatsappNumber,
            onSupportTap: _openSupportWhatsapp,
            minimumOrder: _minimumOrder,
          );
        },
      ),
    );
  }

  AppBar _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: kSurface,
      elevation: 0,
      title: Consumer<AppState>(
        builder: (ctx, st, _) => Text(
          st.cart.isEmpty ? 'السلة' : 'السلة (${st.cartCount})',
          style: const TextStyle(
            color: kTextDark,
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),
      ),
      centerTitle: false,
      actions: [
        Consumer<AppState>(
          builder: (ctx, st, _) {
            if (st.cart.isEmpty) return const SizedBox.shrink();
            return TapScaleWidget(
              onTap: () => _confirmClearCart(ctx, st),
              child: Container(
                margin: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFECEC),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(children: [
                  Icon(Icons.delete_outline_rounded,
                      size: 16, color: Color(0xFFE53935)),
                  SizedBox(width: 4),
                  Text('مسح', style: TextStyle(color: Color(0xFFE53935),
                      fontSize: 12, fontWeight: FontWeight.w700)),
                ]),
              ),
            );
          },
        ),
      ],
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: kBorder),
      ),
    );
  }

  void _confirmClearCart(BuildContext context, AppState st) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('مسح السلة',
            style: TextStyle(color: kTextDark, fontWeight: FontWeight.w900)),
        content: const Text('هل تريد مسح جميع المنتجات من السلة؟',
            style: TextStyle(color: kTextBrown)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(color: kTextMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE53935),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              st.clearCart();
              Navigator.pop(ctx);
            },
            child: const Text('مسح الكل',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

class _CartEmptyBody extends StatelessWidget {
  const _CartEmptyBody();

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.72;
    return ListView(
      physics: const BouncingScrollPhysics(),
      children: [
        SizedBox(
          height: height,
          child: const CartEmptyState(),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart content — scrollable body + sticky checkout bar
// ─────────────────────────────────────────────────────────────────────────────
class _CartContent extends StatelessWidget {
  final List<Map<String, dynamic>> cart;
  final AppState state;
  final double deliveryFee;
  final double couponDiscount;
  final ValueChanged<double> onDiscountChanged;
  final String supportWhatsappNumber;
  final Future<void> Function() onSupportTap;
  final double minimumOrder;

  const _CartContent({
    super.key,
    required this.cart,
    required this.state,
    required this.deliveryFee,
    required this.couponDiscount,
    required this.onDiscountChanged,
    required this.supportWhatsappNumber,
    required this.onSupportTap,
    required this.minimumOrder,
  });

  String get _storeName =>
      (cart.isNotEmpty ? cart.first['storeName'] as String? : null) ??
      'المتجر';
  String? get _storeLogoUrl =>
      cart.isNotEmpty ? cart.first['storeLogoUrl'] as String? : null;
  String? get _merchantId =>
      cart.isNotEmpty ? cart.first['merchantId'] as String? : null;

  Map<String, dynamic> get _cartStoreSeed => {
        'id': _merchantId,
        'storeName': _storeName,
        if ((_storeLogoUrl ?? '').isNotEmpty) 'logoUrl': _storeLogoUrl,
      };

  Future<void> _openCartStore(BuildContext context) async {
    final merchantId = _merchantId;
    if (merchantId == null || merchantId.isEmpty) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تعذر فتح المتجر حالياً',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final opened = await state.openStoreWithData(_cartStoreSeed);

    if (!context.mounted) return;
    if (!opened || (!state.loadingStore && state.selectedStore == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تعذر تحميل بيانات المتجر',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = state.cartTotal + deliveryFee - couponDiscount;
    final keyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;

    return Stack(
      children: [
        Column(
          children: [
            Expanded(
              child: ListView(
                padding: EdgeInsets.only(bottom: minimumOrder > 0 ? 190 : 100),
                children: [
                  // Phase 1: Store header
                  CartStoreHeader(
                    storeName: _storeName,
                    storeLogoUrl: _storeLogoUrl,
                    onViewStore: _merchantId != null
                        ? () => _openCartStore(context)
                        : null,
                  ),
                  const SizedBox(height: 8),
              // Phase 3: Cart items
              ...cart.map((item) => CartItemCard(
                    key: ValueKey(item['id']),
                    item: item,
                    onRemove: () => state.removeFromCart(item['id'] as String),
                    onQtyChanged: (q) {
                      if (q <= 0) {
                        state.removeFromCart(item['id'] as String);
                      } else {
                        state.updateCartQty(item['id'] as String, q);
                      }
                    },
                  )),
              // Phase 4: Coupon
              CartCouponSection(
                onDiscountApplied: onDiscountChanged,
              ),
              if (supportWhatsappNumber.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
                  child: HoneyCard(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: const Color(0xFF25D366).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.support_agent_rounded,
                            color: Color(0xFF25D366),
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'الدعم عبر واتساب',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: kTextDark,
                                ),
                                textDirection: TextDirection.rtl,
                              ),
                              SizedBox(height: 4),
                              Text(
                                'تواصل معنا لحل أي مشكلة بسرعة',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 12,
                                  color: kTextMuted,
                                ),
                                textDirection: TextDirection.rtl,
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: onSupportTap,
                          child: const Text(
                            'تواصل الآن',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              color: kHoney,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              // Phase 5: Totals
              CartTotalsCard(
                subtotal:    state.cartTotal,
                deliveryFee: deliveryFee,
                discount:    couponDiscount,
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
        // Phase 6: Sticky checkout bar
        _StickyCheckoutBar(
          total: total.clamp(0, double.infinity),
          subtotal: state.cartTotal,
          minimumOrder: minimumOrder,
          state: state,
        ),
      ],
    ),
    // ── Floating WhatsApp support button ─────────────────────────────────
    if (supportWhatsappNumber.isNotEmpty && !keyboardOpen)
      Positioned(
        left: 16,
        bottom: minimumOrder > 0 ? 200 : 110, // above sticky checkout bar (taller when banner shown)
        child: _WhatsAppFab(
          number: supportWhatsappNumber,
        ),
      ),
    ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky checkout bar
// ─────────────────────────────────────────────────────────────────────────────
class _StickyCheckoutBar extends StatelessWidget {
  final double total;
  final double subtotal;
  final double minimumOrder;
  final AppState state;

  const _StickyCheckoutBar({
    required this.total,
    required this.subtotal,
    required this.minimumOrder,
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    final showMinBanner = minimumOrder > 0;
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: kRoyal.withOpacity(0.15),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showMinBanner) ...[
                _MinOrderBanner(
                  minimum: minimumOrder,
                  current: subtotal,
                ),
                const SizedBox(height: 10),
              ],
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Row(
                  children: [
                    // Total
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('الإجمالي',
                            style: TextStyle(
                                color: kTextMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                        Text(
                          '${total.toStringAsFixed(0)} ج.م',
                          style: const TextStyle(
                            color: kTextDark,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 20),
                    // Checkout button
                    Expanded(
                      child: _CheckoutBtn(state: state),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimum-order banner with progress bar (sits on top of sticky bar)
// ─────────────────────────────────────────────────────────────────────────────
class _MinOrderBanner extends StatelessWidget {
  final double minimum;
  final double current;
  const _MinOrderBanner({required this.minimum, required this.current});

  @override
  Widget build(BuildContext context) {
    final reached = current >= minimum;
    final progress = minimum <= 0 ? 1.0 : (current / minimum).clamp(0.0, 1.0);
    final remaining = (minimum - current).clamp(0.0, double.infinity);

    final accent = reached ? const Color(0xFF22A05B) : const Color(0xFFD4A437);
    final bg = reached ? const Color(0xFFE8F7EE) : const Color(0xFFFFF8E5);
    final border = reached ? const Color(0xFFB7E4C7) : const Color(0xFFFFD93D);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            textDirection: TextDirection.rtl,
            children: [
              Text(
                reached ? '✅' : '🛒',
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'الحد الأدنى للطلب: ${minimum.toStringAsFixed(0)} جنيه',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: kTextDark,
                  ),
                  textDirection: TextDirection.rtl,
                ),
              ),
              Text(
                '${current.toStringAsFixed(0)} / ${minimum.toStringAsFixed(0)}',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  color: accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: Colors.white,
              valueColor: AlwaysStoppedAnimation<Color>(accent),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            reached
                ? 'تم الوصول للحد الأدنى للطلب'
                : 'أضف ${remaining.toStringAsFixed(0)} جنيه لإتمام الطلب',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: accent,
            ),
            textDirection: TextDirection.rtl,
          ),
        ],
      ),
    );
  }
}

class _CheckoutBtn extends StatelessWidget {
  final AppState state;
  const _CheckoutBtn({required this.state});

  @override
  Widget build(BuildContext context) {
    final loading = state.checkingOut;
    return TapScaleWidget(
      onTap: loading
          ? null
          : () {
              if (!state.isLoggedIn) {
                _showLoginPrompt(context);
                return;
              }
              _showCheckoutSheet(context, state);
            },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 52,
        decoration: BoxDecoration(
          gradient: loading
              ? null
              : const LinearGradient(
                  colors: [kHoneyLight, kHoney, kDarkHoney],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
          color: loading ? kBorder : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: loading
              ? null
              : [
                  BoxShadow(
                    color: kHoney.withOpacity(0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.5, color: Colors.white),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'إتمام الطلب',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_back_rounded,
                        color: Colors.white, size: 18),
                  ],
                ),
        ),
      ),
    );
  }

  void _showLoginPrompt(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('تسجيل الدخول مطلوب',
            style: TextStyle(color: kTextDark, fontWeight: FontWeight.w900)),
        content: const Text('قم بتسجيل الدخول لإتمام طلبك',
            style: TextStyle(color: kTextBrown)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('لاحقاً',
                style: TextStyle(color: kTextMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: kHoney,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              state.showScreen(AppScreen.login, bottomIndex: 3);
            },
            child: const Text('تسجيل الدخول',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

void _showCheckoutSheet(BuildContext context, AppState state) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _CheckoutSheet(state: state),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout bottom sheet — preserves ALL existing checkout logic
// ─────────────────────────────────────────────────────────────────────────────
class _CheckoutSheet extends StatefulWidget {
  final AppState state;
  const _CheckoutSheet({required this.state});
  @override State<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<_CheckoutSheet> {
  final _nameCtrl  = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addrCtrl  = TextEditingController();
  final _noteCtrl  = TextEditingController();
  String? _selectedZoneId;
  double _shippingFee = 0;
  bool _shippingDisabled = false;
  bool _submitting = false;
  bool _useWallet  = false;
  List<Map<String, dynamic>> _zones = [];
  bool _zonesLoading = true;
  double _minimumOrder = 0;

  @override
  void initState() {
    super.initState();
    _loadShippingZones();
    _loadMinimumOrder();
  }

  Future<void> _loadMinimumOrder() async {
    try {
      final api = ApiService(token: widget.state.token);
      final res = await api.get('/customer/settings/minimum-order');
      if (!mounted || res is! Map) return;
      setState(() {
        _minimumOrder = (res['amount'] is num)
            ? (res['amount'] as num).toDouble()
            : double.tryParse('${res['amount']}') ?? 0;
      });
    } catch (_) {}
  }

  Future<void> _loadShippingZones() async {
    try {
      final api = ApiService(token: widget.state.token);
      final res = await api.get('/customer/shipping-zones');
      if (!mounted || res is! List) return;
      setState(() {
        _zones = res.cast<Map<String, dynamic>>();
        _zonesLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _zonesLoading = false);
    }
  }

  void _onZoneChanged(String? zoneId) {
    if (zoneId == null) {
      setState(() {
        _selectedZoneId = null;
        _shippingFee = 0;
        _shippingDisabled = false;
      });
      return;
    }
    final zone = _zones.firstWhere((z) => z['id'] == zoneId, orElse: () => {});
    setState(() {
      _selectedZoneId = zoneId;
      _shippingFee = (zone['fee'] is num) ? (zone['fee'] as num).toDouble() : double.tryParse('${zone['fee']}') ?? 0;
      _shippingDisabled = false;
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addrCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: DraggableScrollableSheet(
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.97,
        builder: (ctx, scrollCtrl) => Container(
          decoration: const BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: kBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    const Text('بيانات التوصيل',
                        style: TextStyle(
                          color: kTextDark,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        )),
                    const Spacer(),
                    TapScaleWidget(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: kSurfaceWarm,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.close_rounded,
                            size: 18, color: kTextBrown),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: kBorder),
              // Form
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  children: [
                    _buildField(_nameCtrl,  'الاسم الكامل',       Icons.person_outline_rounded),
                    const SizedBox(height: 12),
                    _buildField(_phoneCtrl, 'رقم الهاتف',          Icons.phone_outlined,
                        type: TextInputType.phone),
                    const SizedBox(height: 12),
                    // Governorate dropdown (dynamic from API)
                    _zonesLoading
                        ? const Center(child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                          ))
                        : DropdownButtonFormField<String>(
                      value: _selectedZoneId,
                      isExpanded: true,
                      decoration: _inputDecoration('اختر المحافظة', Icons.location_on_outlined),
                      items: _zones.map((z) => DropdownMenuItem(
                        value: z['id'] as String,
                        child: Text(z['name'] as String, textDirection: TextDirection.rtl,
                            style: const TextStyle(fontSize: 14)),
                      )).toList(),
                      onChanged: _onZoneChanged,
                    ),
                    if (_selectedZoneId != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: kSurfaceWarm,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: kBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, color: kHoney, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              _shippingFee > 0 ? 'الشحن: ${_shippingFee.toStringAsFixed(0)} ج.م' : 'الشحن: مجاني',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: kTextDark),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    _buildField(_addrCtrl, 'العنوان التفصيلي',    Icons.home_outlined,
                        maxLines: 2),
                    const SizedBox(height: 12),
                    _buildField(_noteCtrl, 'ملاحظات إضافية (اختياري)',
                        Icons.note_outlined,
                        maxLines: 2),
                    const SizedBox(height: 20),
                    // Wallet payment section
                    _WalletPaySection(
                      state: widget.state,
                      useWallet: _useWallet,
                      onToggle: (val) => setState(() => _useWallet = val),
                    ),
                    // Minimum order warning
                    if (_minimumOrder > 0 && widget.state.cartTotal < _minimumOrder) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF3CD),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFFD93D)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: Color(0xFFD4A437), size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'الحد الأدنى للطلب هو ${_minimumOrder.toStringAsFixed(0)} جنيه\n'
                                'أضف ${(_minimumOrder - widget.state.cartTotal).toStringAsFixed(0)} جنيه لإتمام الطلب',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  color: Color(0xFF856404),
                                  fontFamily: 'Cairo',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 28),
                    // Confirm button
                    _ConfirmButton(
                      loading: _submitting || widget.state.checkingOut,
                      disabled: _minimumOrder > 0 && widget.state.cartTotal < _minimumOrder,
                      onTap: _submit,
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController ctrl,
    String hint,
    IconData icon, {
    TextInputType type = TextInputType.text,
    int maxLines = 1,
  }) {
    return TextField(
      controller: ctrl,
      textDirection: TextDirection.rtl,
      keyboardType: type,
      maxLines: maxLines,
      decoration: _inputDecoration(hint, icon),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: kTextMuted, fontSize: 14),
      prefixIcon: Icon(icon, color: kHoney, size: 20),
      filled: true,
      fillColor: kSurfaceWarm,
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kBorder)),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kBorder)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kHoney, width: 1.5)),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Future<void> _submit() async {
    if (_submitting || widget.state.checkingOut) return;
    // Minimum order check
    if (_minimumOrder > 0 && widget.state.cartTotal < _minimumOrder) {
      _snack('الحد الأدنى للطلب هو ${_minimumOrder.toStringAsFixed(0)} جنيه', isError: true);
      return;
    }
    debugPrint('[CHECKOUT] Checkout button pressed');
    debugPrint('[CHECKOUT] JWT token exists? ${((widget.state.token ?? '').isNotEmpty) ? 'yes' : 'no'}');
    final name  = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final addr  = _addrCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty || addr.isEmpty || _selectedZoneId == null) {
      if (_selectedZoneId == null) {
        _snack('يرجى اختيار المحافظة لحساب الشحن', isError: true);
      } else {
        _snack('يرجى ملء جميع حقول التوصيل', isError: true);
      }
      return;
    }
    setState(() => _submitting = true);
    final walletBal = widget.state.walletBalance;
    final cartTot   = widget.state.cartTotal + _shippingFee;
    final walletAmt = _useWallet ? walletBal.clamp(0.0, cartTot) : 0.0;
    try {
      final ok = await widget.state.checkout(
        name:        name,
        phone:       phone,
        address:     addr,
        shippingZoneId: _selectedZoneId!,
        notes:       _noteCtrl.text.trim(),
        useWallet:   _useWallet && walletAmt > 0,
        walletAmount: walletAmt,
      );
      debugPrint('[CHECKOUT] checkout() returned $ok');
      if (!mounted) return;
      if (ok) {
        Navigator.pop(context); // close sheet
        _snack('تم تأكيد طلبك بنجاح ✓ 🎉', isError: false);
        widget.state.showScreen(AppScreen.orders, bottomIndex: 1);
        return;
      }
      final sessionExpired = widget.state.consumeCheckoutSessionExpired();
      if (sessionExpired) {
        _snack('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', isError: true);
        await widget.state.forceLogoutToLogin();
        if (mounted && Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
        return;
      }
      _snack('حدث خطأ، يرجى المحاولة مرة أخرى', isError: true);
    } catch (e, st) {
      debugPrint('[CHECKOUT] checkout exception: $e');
      debugPrintStack(stackTrace: st);
      if (mounted) {
        _snack('حدث خطأ، يرجى المحاولة مرة أخرى', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  void _snack(String msg, {required bool isError}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg,
          style: const TextStyle(fontWeight: FontWeight.w700)),
      backgroundColor: isError ? kError : kSuccess,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
      duration: const Duration(seconds: 3),
    ));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet pay section inside checkout sheet
// ─────────────────────────────────────────────────────────────────────────────
class _WalletPaySection extends StatelessWidget {
  final AppState state;
  final bool useWallet;
  final ValueChanged<bool> onToggle;

  const _WalletPaySection({
    required this.state,
    required this.useWallet,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final balance = state.walletBalance;
    final cartTot = state.cartTotal;
    if (balance <= 0) return const SizedBox.shrink();

    final walletCover   = balance.clamp(0.0, cartTot);
    final remainingCash = (cartTot - walletCover).clamp(0.0, double.infinity);

    return Container(
      decoration: BoxDecoration(
        color: kSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: useWallet ? kHoney : kBorder,
          width: useWallet ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Toggle row
          Row(
            textDirection: TextDirection.rtl,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: kHoney.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.account_balance_wallet_rounded,
                    color: kHoney, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'الدفع من المحفظة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: kTextDark,
                      ),
                      textDirection: TextDirection.rtl,
                    ),
                    Text(
                      'رصيدك: ${balance.toStringAsFixed(2)} ج.م',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: kTextMuted,
                      ),
                      textDirection: TextDirection.rtl,
                    ),
                  ],
                ),
              ),
              Switch(
                value: useWallet,
                onChanged: onToggle,
                activeColor: kHoney,
              ),
            ],
          ),
          if (useWallet) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: kBorder),
            const SizedBox(height: 10),
            _payRow('خصم من المحفظة',
                '- ${walletCover.toStringAsFixed(2)} ج.م',
                const Color(0xFF2E7D32)),
            if (remainingCash > 0) ...[
              const SizedBox(height: 6),
              _payRow('المتبقي كاش عند الاستلام',
                  '${remainingCash.toStringAsFixed(2)} ج.م',
                  kTextBrown),
            ] else ...[
              const SizedBox(height: 6),
              _payRow('إجمالي مدفوع من المحفظة',
                  '${walletCover.toStringAsFixed(2)} ج.م',
                  kHoney),
            ],
          ],
        ],
      ),
    );
  }

  Widget _payRow(String label, String value, Color valueColor) {
    return Row(
      textDirection: TextDirection.rtl,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(
                fontFamily: 'Cairo', fontSize: 12, color: kTextMuted),
            textDirection: TextDirection.rtl),
        Text(value,
            style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: valueColor),
            textDirection: TextDirection.rtl),
      ],
    );
  }
}

class _ConfirmButton extends StatelessWidget {
  final bool loading;
  final bool disabled;
  final VoidCallback? onTap;

  const _ConfirmButton({required this.loading, this.disabled = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final inactive = loading || disabled;
    return TapScaleWidget(
      onTap: inactive ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 56,
        decoration: BoxDecoration(
          gradient: inactive
              ? null
              : const LinearGradient(
                  colors: [kHoneyLight, kHoney, kDarkHoney],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
          color: inactive ? kBorder : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: inactive
              ? null
              : [
                  BoxShadow(
                    color: kHoney.withOpacity(0.5),
                    blurRadius: 16,
                    offset: const Offset(0, 5),
                  ),
                ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                      strokeWidth: 2.5, color: Colors.white),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline_rounded,
                        color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'تأكيد الطلب 🍯',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating WhatsApp support button for checkout
// ─────────────────────────────────────────────────────────────────────────────
class _WhatsAppFab extends StatelessWidget {
  final String number;
  const _WhatsAppFab({required this.number});

  static const _checkoutMessage =
      'مرحبًا، أحتاج مساعدة في إتمام الطلب داخل تطبيق سوق العسل';

  Future<void> _openWhatsApp(BuildContext context) async {
    final normalized = number.startsWith('+') ? number.substring(1) : number;
    final encoded = Uri.encodeComponent(_checkoutMessage);
    final uri = Uri.parse('https://wa.me/$normalized?text=$encoded');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'واتساب غير مثبت على هذا الجهاز',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Color(0xFFE53935),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Branded WhatsApp FAB
        GestureDetector(
          onTap: () => _openWhatsApp(context),
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFF25D366),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF25D366).withOpacity(0.4),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: const Center(
              child: FaIcon(
                FontAwesomeIcons.whatsapp,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        // Tooltip label
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.black87,
            borderRadius: BorderRadius.circular(6),
          ),
          child: const Text(
            'تواصل عبر واتساب',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
