import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final ScrollController _scrollCtrl = ScrollController();
  String _supportWhatsappNumber = '';
  String _supportWhatsappMessage =
      'السلام عليكم، محتاج مساعدة في تطبيق سوق العسل';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final st = context.read<AppState>();
      await st.loadOrders();
      await _loadSupportWhatsapp();
      // If opened via notification tap, try to scroll to the pending order
      final pendingId = st.pendingOpenOrderId;
      if (pendingId != null && mounted) {
        st.clearPendingOpenOrderId();
        _scrollToPendingOrder(st, pendingId);
      }
    });
  }

  void _scrollToPendingOrder(AppState st, String orderId) {
    final idx = st.orders.indexWhere((o) => o['id'] == orderId);
    if (idx < 0 || !_scrollCtrl.hasClients) return;
    const itemHeight = 180.0;
    final offset = (idx * itemHeight).clamp(0.0, _scrollCtrl.position.maxScrollExtent);
    _scrollCtrl.animateTo(
      offset,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
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
    final st = context.watch<AppState>();

    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        backgroundColor: kBackground,
        titleSpacing:    16,
        title: const Text('طلباتي', style: TextStyle(
          fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 20, color: kTextDark)),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: kHoney),
            onPressed: () => context.read<AppState>().loadOrders(),
          ),
        ],
      ),
      body: !st.isLoggedIn
          ? EmptyState(
              icon:        '🔐',
              title:       'سجّل دخولك أولاً',
              subtitle:    'قم بتسجيل الدخول لعرض طلباتك',
              actionLabel: 'تسجيل الدخول',
              onAction:    () => st.showScreen(AppScreen.login, bottomIndex: 3),
            )
          : st.loadingOrders
              ? _buildOrderSkeletons()
              : RefreshIndicator(
                  color: kHoney,
                  onRefresh: () => context.read<AppState>().loadOrders(),
                  child: st.orders.isEmpty
                      ? const EmptyState(icon: '📦', title: 'لا توجد طلبات بعد',
                          subtitle: 'سيظهر تاريخ طلباتك هنا')
                      : ListView.builder(
                          controller: _scrollCtrl,
                          padding:   const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          itemCount: st.orders.length + (_supportWhatsappNumber.isEmpty ? 0 : 1),
                          itemBuilder: (_, i) => FadeInWidget(
                            delay: Duration(milliseconds: (i * 60).clamp(0, 300)),
                            child: i < st.orders.length
                                ? _buildOrderCard(context, st, st.orders[i])
                                : Container(
                                    margin: const EdgeInsets.only(top: 6, bottom: 12),
                                    decoration: BoxDecoration(
                                      color: kSurface,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: kCardShadow,
                                    ),
                                    child: ListTile(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                      leading: Container(
                                        width: 42,
                                        height: 42,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF25D366).withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.support_agent_rounded, color: Color(0xFF25D366)),
                                      ),
                                      title: const Text(
                                        'الدعم عبر واتساب',
                                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kTextDark),
                                        textDirection: TextDirection.rtl,
                                      ),
                                      subtitle: const Text(
                                        'تواصل معنا لحل أي مشكلة بسرعة',
                                        style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: kTextMuted),
                                        textDirection: TextDirection.rtl,
                                      ),
                                      trailing: TextButton(
                                        onPressed: _openSupportWhatsapp,
                                        child: const Text(
                                          'تواصل الآن',
                                          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: kHoney),
                                        ),
                                      ),
                                      onTap: _openSupportWhatsapp,
                                    ),
                                  ),
                          ),
                        ),
                ),
    );
  }

  Widget _buildOrderSkeletons() {
    return ListView.builder(
      padding:   const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: 4,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: kSurface, borderRadius: BorderRadius.circular(16),
          boxShadow: kCardShadow),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                textDirection: TextDirection.rtl,
                children: [
                  ShimmerBox(width: 44, height: 44,
                      borderRadius: BorderRadius.circular(12)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ShimmerBox(width: 120, height: 13,
                            borderRadius: BorderRadius.circular(6)),
                        const SizedBox(height: 6),
                        ShimmerBox(width: 80, height: 10,
                            borderRadius: BorderRadius.circular(5)),
                      ],
                    ),
                  ),
                  ShimmerBox(width: 70, height: 22,
                      borderRadius: BorderRadius.circular(20)),
                ],
              ),
              const SizedBox(height: 12),
              ShimmerBox(height: 3, borderRadius: BorderRadius.circular(2)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, AppState st, Map<String, dynamic> order) {
    final id       = (order['id']        as String?) ?? '';
    final shortId  = id.length > 6 ? id.substring(id.length - 6).toUpperCase() : id.toUpperCase();
    final status   = (order['status']    as String?) ?? 'PENDING';
    final date     = (order['createdAt'] as String?) ?? '';
    final total    = double.tryParse(order['total']?.toString() ?? '0') ?? 0;
    final items    = order['items'] is List ? order['items'] as List : [];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: kSurface, borderRadius: BorderRadius.circular(16),
        boxShadow: kCardShadow),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              textDirection: TextDirection.rtl,
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: kSurfaceWarm, borderRadius: BorderRadius.circular(12)),
                  child: const Center(child: Text('🍯', style: TextStyle(fontSize: 22))),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('طلب #$shortId', style: const TextStyle(
                        fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                        fontSize: 15, color: kTextDark)),
                      Text(date.length > 10 ? date.substring(0, 10) : date,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: kTextMuted)),
                    ],
                  ),
                ),
                OrderStatusChip(status),
              ],
            ),
          ),

          // Progress bar
          _buildProgressBar(status),

          const Divider(height: 1),

          // Items preview
          if (items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Column(
                children: items.take(2).map((item) {
                  final iMap   = item is Map ? item : <String, dynamic>{};
                  final iName  = (iMap['product']?['name'] as String?) ??
                                 (iMap['name'] as String?) ?? '';
                  final iQty   = (iMap['quantity'] as int?) ?? 1;
                  final iPrice = double.tryParse(iMap['price']?.toString() ?? '0') ?? 0;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        const Icon(Icons.circle, size: 6, color: kHoney),
                        const SizedBox(width: 8),
                        Expanded(child: Text('$iName × $iQty',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: kTextBrown))),
                        Text('${(iPrice * iQty).toStringAsFixed(0)} ج.م',
                          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                            fontSize: 12, color: kTextDark)),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),

          // Footer
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 12),
            child: Row(
              textDirection: TextDirection.rtl,
              children: [
                Text('الإجمالي: ${total.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700, fontSize: 14, color: kHoney)),
                const Spacer(),
                if (status == 'PENDING')
                  TextButton(
                    onPressed: () => _confirmCancel(context, st, id),
                    style: TextButton.styleFrom(foregroundColor: kError),
                    child: const Text('إلغاء الطلب', style: TextStyle(
                      fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar(String status) {
    const steps = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const labels = ['قيد الانتظار', 'تم القبول', 'جاري التحضير', 'في الطريق', 'تم التسليم'];
    if (status == 'CANCELLED') {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEBEE), borderRadius: BorderRadius.circular(8)),
        child: const Row(
          textDirection: TextDirection.rtl,
          children: [
            Icon(Icons.cancel_outlined, color: kError, size: 16),
            SizedBox(width: 6),
            Text('تم إلغاء الطلب', style: TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 12, color: kError)),
          ],
        ),
      );
    }

    final activeIdx = steps.indexOf(status).clamp(0, steps.length - 1);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Column(
        children: [
          Row(
            children: List.generate(steps.length * 2 - 1, (i) {
              if (i.isOdd) {
                final segIdx = i ~/ 2;
                return Expanded(child: Container(
                  height: 3,
                  color: segIdx < activeIdx ? kHoney : kBorder.withOpacity(0.5),
                ));
              }
              final stepIdx = i ~/ 2;
              final done    = stepIdx <= activeIdx;
              return Container(
                width: 14, height: 14,
                decoration: BoxDecoration(
                  color:  done ? kHoney : kBorder.withOpacity(0.3),
                  shape: BoxShape.circle,
                  border: done ? null : Border.all(color: kBorder, width: 1.5),
                ),
                child: done
                    ? const Icon(Icons.check_rounded, size: 9, color: Colors.white)
                    : null,
              );
            }),
          ),
          const SizedBox(height: 4),
          Text(labels[activeIdx], style: const TextStyle(
            fontFamily: 'Cairo', fontWeight: FontWeight.w600,
            fontSize: 11, color: kHoney)),
        ],
      ),
    );
  }

  Future<void> _confirmCancel(BuildContext context, AppState st, String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('إلغاء الطلب؟', textDirection: TextDirection.rtl,
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
        content: const Text('هل تريد إلغاء هذا الطلب؟',
          textDirection: TextDirection.rtl,
          style: TextStyle(fontFamily: 'Cairo')),
        actionsAlignment: MainAxisAlignment.start,
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('لا', style: TextStyle(fontFamily: 'Cairo', color: kTextMuted))),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: kError),
            child: const Text('نعم، إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
        ],
      ),
    ) ?? false;
    if (ok && context.mounted) {
      await st.cancelOrder(id);
    }
  }
}
