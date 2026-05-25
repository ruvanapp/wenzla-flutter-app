import 'package:flutter/material.dart';
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

  static const _deliveryFee = 0.0; // free delivery for now

  @override
  void initState() {
    super.initState();
    _loadSupportWhatsapp();
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

  const _CartContent({
    super.key,
    required this.cart,
    required this.state,
    required this.deliveryFee,
    required this.couponDiscount,
    required this.onDiscountChanged,
    required this.supportWhatsappNumber,
    required this.onSupportTap,
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

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.only(bottom: 100),
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
          state: state,
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
  final AppState state;

  const _StickyCheckoutBar({required this.total, required this.state});

  @override
  Widget build(BuildContext context) {
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
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
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
  String? _governorate;
  bool _submitting = false;

  static const _govs = [
    'القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية',
    'القليوبية','كفر الشيخ','الغربية','المنوفية','البحيرة',
    'الإسماعيلية','بور سعيد','السويس','دمياط','الفيوم',
    'بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر',
    'أسوان','البحر الأحمر','الوادي الجديد','مطروح',
    'شمال سيناء','جنوب سيناء',
  ];

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
                    // Governorate dropdown
                    DropdownButtonFormField<String>(
                      value: _governorate,
                      isExpanded: true,
                      decoration: _inputDecoration('اختر المحافظة', Icons.location_on_outlined),
                      items: _govs.map((g) => DropdownMenuItem(
                        value: g,
                        child: Text(g, textDirection: TextDirection.rtl,
                            style: const TextStyle(fontSize: 14)),
                      )).toList(),
                      onChanged: (v) => setState(() => _governorate = v),
                    ),
                    const SizedBox(height: 12),
                    _buildField(_addrCtrl, 'العنوان التفصيلي',    Icons.home_outlined,
                        maxLines: 2),
                    const SizedBox(height: 12),
                    _buildField(_noteCtrl, 'ملاحظات إضافية (اختياري)',
                        Icons.note_outlined,
                        maxLines: 2),
                    const SizedBox(height: 28),
                    // Confirm button
                    _ConfirmButton(
                      loading: _submitting || widget.state.checkingOut,
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
    final name  = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final addr  = _addrCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty || addr.isEmpty || _governorate == null) {
      _snack('يرجى ملء جميع حقول التوصيل', isError: true);
      return;
    }
    setState(() => _submitting = true);
    final ok = await widget.state.checkout(
      name:        name,
      phone:       phone,
      address:     addr,
      governorate: _governorate!,
      notes:       _noteCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      Navigator.pop(context); // close sheet
      _snack('تم تأكيد طلبك بنجاح ✓ 🎉', isError: false);
      widget.state.showScreen(AppScreen.orders, bottomIndex: 1);
    } else {
      _snack('حدث خطأ، يرجى المحاولة مرة أخرى', isError: true);
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

class _ConfirmButton extends StatelessWidget {
  final bool loading;
  final VoidCallback? onTap;

  const _ConfirmButton({required this.loading, this.onTap});

  @override
  Widget build(BuildContext context) {
    return TapScaleWidget(
      onTap: loading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 56,
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
