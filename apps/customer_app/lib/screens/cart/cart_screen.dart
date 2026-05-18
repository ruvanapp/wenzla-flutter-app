import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  // Checkout form
  final _nameCtrl  = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addrCtrl  = TextEditingController();
  final _noteCtrl  = TextEditingController();
  String? _governorate;
  // Double-tap guard: prevents concurrent submissions
  bool _submitting = false;

  static const _govs = [
    'القاهرة','الجيزة','الإسكندرية','الدقهلية','البحر الأحمر','البحيرة',
    'الفيوم','الغربية','الإسماعيلية','المنوفية','المنيا','القليوبية',
    'الوادي الجديد','السويس','اسوان','اسيوط','بني سويف','بورسعيد',
    'دمياط','الشرقية','جنوب سيناء','كفر الشيخ','مطروح','الأقصر',
    'قنا','شمال سيناء','سوهاج',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose();
    _addrCtrl.dispose(); _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();

    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        backgroundColor: kBackground,
        titleSpacing:    16,
        title: Row(
          textDirection: TextDirection.rtl,
          children: [
            const Text('سلة التسوق', style: TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w800,
              fontSize: 20, color: kTextDark)),
            const SizedBox(width: 8),
            if (st.cartCount > 0)
              HoneyChip('${st.cartCount}', background: kHoney, textColor: Colors.white),
          ],
        ),
        automaticallyImplyLeading: false,
        actions: [
          if (st.cart.isNotEmpty)
            TextButton.icon(
              icon:  const Icon(Icons.delete_outline_rounded, size: 16, color: kError),
              label: const Text('مسح الكل', style: TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 12, color: kError)),
              onPressed: () => showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: const Text('مسح السلة؟', textDirection: TextDirection.rtl,
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                  content: const Text('هل تريد حذف جميع المنتجات من السلة؟',
                    textDirection: TextDirection.rtl,
                    style: TextStyle(fontFamily: 'Cairo')),
                  actionsAlignment: MainAxisAlignment.start,
                  actions: [
                    TextButton(
                      onPressed: Navigator.of(context).pop,
                      child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: kTextMuted))),
                    FilledButton(
                      onPressed: () {
                        for (final i in List.from(st.cart)) {
                          st.removeFromCart(i['id'] as String);
                        }
                        Navigator.of(context).pop();
                      },
                      style: FilledButton.styleFrom(backgroundColor: kError),
                      child: const Text('مسح الكل', style: TextStyle(fontFamily: 'Cairo'))),
                  ],
                ),
              ),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: st.cart.isEmpty
          ? EmptyState(
              icon:         '🛒',
              title:        'سلتك فارغة',
              subtitle:     'تصفح المتاجر وأضف منتجاتك المفضلة',
              actionLabel:  'تصفح المتاجر',
              onAction:     () => st.showScreen(AppScreen.home, bottomIndex: 0),
            )
          : _buildCartContent(context, st),
    );
  }

  Widget _buildCartContent(BuildContext context, AppState st) {
    // Group items by merchantId
    final groups = <String, List<dynamic>>{};
    for (final item in st.cart) {
      final mid = (item['merchantId'] as String?) ?? 'unknown';
      groups.putIfAbsent(mid, () => []).add(item);
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      children: [
        // Cart groups
        ...groups.entries.map((e) => _buildCartGroup(context, st, e.value)),
        const SizedBox(height: 12),

        // Order summary card
        _buildOrderSummary(st),
        const SizedBox(height: 12),

        // Delivery form (only shown if logged in)
        if (st.isLoggedIn) _buildDeliveryForm(context, st)
        else _buildGuestGate(context),

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildCartGroup(BuildContext context, AppState st, List<dynamic> items) {
    final storeName = (items.first['storeName'] as String?) ?? 'المتجر';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: kSurface, borderRadius: BorderRadius.circular(16),
        boxShadow: kCardShadow),
      child: Column(
        children: [
          // Group header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              textDirection: TextDirection.rtl,
              children: [
                StoreLogoWidget(storeName: storeName, size: 32),
                const SizedBox(width: 8),
                Text(storeName, style: const TextStyle(
                  fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                  fontSize: 14, color: kTextDark)),
              ],
            ),
          ),
          const Divider(height: 1),
          ...items.map((item) => _buildCartItem(context, st, item)),
        ],
      ),
    );
  }

  Widget _buildCartItem(BuildContext context, AppState st, Map<String, dynamic> item) {
    final name    = (item['name']  as String?) ?? '';
    final price   = double.tryParse(item['price']?.toString() ?? '0') ?? 0;
    final qty     = (item['qty']   as int?) ?? 1;
    final imgUrl  = (item['imageUrl'] as String?);
    final id      = item['id'] as String;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          // Image
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: NetImage(url: imgUrl, width: 64, height: 64, fit: BoxFit.cover),
          ),
          const SizedBox(width: 10),
          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                    fontSize: 13, color: kTextDark)),
                const SizedBox(height: 4),
                Text('${(price * qty).toStringAsFixed(0)} ج.م',
                  style: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800, fontSize: 14, color: kHoney)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Qty controls
          Column(
            children: [
              QtySelector(
                qty: qty,
                onChange: (q) => st.updateCartQty(id, q),
                iconSize: 16),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => st.removeFromCart(id),
                child: const Icon(Icons.delete_outline_rounded, color: kError, size: 16)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderSummary(AppState st) {
    const deliveryFee = 25.0;
    final subtotal    = st.cartTotal;
    final total       = subtotal + deliveryFee;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kSurface, borderRadius: BorderRadius.circular(16),
        boxShadow: kCardShadow),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ملخص الطلب', style: TextStyle(
            fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 16, color: kTextDark)),
          const SizedBox(height: 12),
          _summaryRow('المنتجات', '${subtotal.toStringAsFixed(0)} ج.م'),
          _summaryRow('رسوم التوصيل', '${deliveryFee.toStringAsFixed(0)} ج.م'),
          const Divider(height: 20),
          Row(
            textDirection: TextDirection.rtl,
            children: [
              const Text('الإجمالي', style: TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16, color: kTextDark)),
              const Spacer(),
              Text('${total.toStringAsFixed(0)} ج.م',
                style: const TextStyle(fontFamily: 'Cairo',
                  fontWeight: FontWeight.w800, fontSize: 20, color: kHoney)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      textDirection: TextDirection.rtl,
      children: [
        Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: kTextBrown)),
        const Spacer(),
        Text(value, style: const TextStyle(fontFamily: 'Cairo',
          fontWeight: FontWeight.w600, fontSize: 13, color: kTextDark)),
      ],
    ),
  );

  Widget _buildGuestGate(BuildContext context) => HoneyCard(
    child: Column(
      children: [
        const Text('🔐', style: TextStyle(fontSize: 40)),
        const SizedBox(height: 8),
        const Text('قم بتسجيل الدخول لإتمام الطلب',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
            fontSize: 15, color: kTextDark), textAlign: TextAlign.center),
        const SizedBox(height: 4),
        const Text('نحتاج إلى معلوماتك لتوصيل طلبك',
          style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: kTextMuted),
          textAlign: TextAlign.center),
        const SizedBox(height: 16),
        HoneyButton(
          label: 'تسجيل الدخول',
          onPressed: () => context.read<AppState>().showScreen(AppScreen.login, bottomIndex: 3),
        ),
      ],
    ),
  );

  Widget _buildDeliveryForm(BuildContext context, AppState st) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kSurface, borderRadius: BorderRadius.circular(16),
        boxShadow: kCardShadow),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('بيانات التوصيل', style: TextStyle(
            fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 16, color: kTextDark)),
          const SizedBox(height: 16),
          _field(_nameCtrl,  'الاسم الكامل',  Icons.person_outline_rounded),
          const SizedBox(height: 10),
          _field(_phoneCtrl, 'رقم الهاتف',    Icons.phone_outlined,
              inputType: TextInputType.phone),
          const SizedBox(height: 10),
          // Governorate dropdown
          DropdownButtonFormField<String>(
            value:     _governorate,
            isExpanded: true,
            decoration: InputDecoration(
              hintText: 'اختر المحافظة',
              prefixIcon: const Icon(Icons.location_on_outlined, color: kHoney),
              filled: true, fillColor: kSurface,
              border:        OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kHoney, width: 1.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            items: _govs.map((g) => DropdownMenuItem(
              value: g,
              child: Text(g, textDirection: TextDirection.rtl,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 14)),
            )).toList(),
            onChanged: (v) => setState(() => _governorate = v),
          ),
          const SizedBox(height: 10),
          _field(_addrCtrl, 'العنوان التفصيلي', Icons.home_outlined, maxLines: 2),
          const SizedBox(height: 10),
          _field(_noteCtrl, 'ملاحظات إضافية (اختياري)', Icons.note_outlined, maxLines: 2),
          const SizedBox(height: 20),
          HoneyButton(
            label:   (st.checkingOut || _submitting) ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب 🍯',
            loading: st.checkingOut || _submitting,
            onPressed: () => _placeOrder(context, st),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String hint, IconData icon,
      {TextInputType inputType = TextInputType.text, int maxLines = 1}) {
    return TextField(
      controller:   ctrl,
      textDirection: TextDirection.rtl,
      keyboardType: inputType,
      maxLines:     maxLines,
      decoration:   InputDecoration(
        hintText:   hint,
        prefixIcon: Icon(icon, color: kHoney, size: 20),
      ),
    );
  }

  Future<void> _placeOrder(BuildContext context, AppState st) async {
    // Double-tap guard
    if (_submitting || st.checkingOut) return;
    final name   = _nameCtrl.text.trim();
    final phone  = _phoneCtrl.text.trim();
    final addr   = _addrCtrl.text.trim();
    if (name.isEmpty || phone.isEmpty || addr.isEmpty || _governorate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('يرجى ملء جميع حقول التوصيل',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
        backgroundColor: kError,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    setState(() => _submitting = true);
    final ok = await st.checkout(
      name: name, phone: phone, address: addr,
      governorate: _governorate!, notes: _noteCtrl.text.trim(),
    );
    if (!context.mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      _nameCtrl.clear(); _phoneCtrl.clear();
      _addrCtrl.clear(); _noteCtrl.clear();
      setState(() => _governorate = null);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('تم تأكيد طلبك بنجاح ✓',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
        backgroundColor: kSuccess,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 3),
      ));
      st.showScreen(AppScreen.orders, bottomIndex: 1);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('حدث خطأ، يرجى المحاولة مرة أخرى',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
        backgroundColor: kError,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}
