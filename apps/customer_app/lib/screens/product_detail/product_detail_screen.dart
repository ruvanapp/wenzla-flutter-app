import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key});
  @override State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    final st      = context.watch<AppState>();
    final product = st.selectedProduct;

    if (product == null) {
      return Scaffold(
        body: EmptyState(icon: '📦', title: 'لم يتم العثور على المنتج',
          onAction: () => context.read<AppState>().closeProduct()),
      );
    }

    final name    = (product['name']        as String?) ?? '';
    final desc    = (product['description'] as String?) ?? '';
    final price   = double.tryParse(product['price']?.toString() ?? '0') ?? 0;
    final imgUrl  = (product['imageUrl']    as String?);
    final weight  = (product['weight']      as String?) ?? (product['size'] as String?) ?? '';
    final stock   = (product['stock']       as int?) ?? (product['quantity'] as int?) ?? 999;

    return Scaffold(
      backgroundColor: kBackground,
      body: CustomScrollView(
        slivers: [
          // ── Image header ──────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight:   300,
            pinned:           true,
            backgroundColor:  kSurface,
            surfaceTintColor: Colors.transparent,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: CircleAvatar(
                backgroundColor: Colors.white,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded,
                      size: 16, color: kTextDark),
                  onPressed: () => context.read<AppState>().closeProduct(),
                ),
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.all(8),
                child: CircleAvatar(
                  backgroundColor: Colors.white,
                  child: Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.shopping_bag_outlined,
                            size: 20, color: kTextDark),
                        onPressed: () => context.read<AppState>().showScreen(AppScreen.cart, bottomIndex: 2),
                      ),
                      if (st.cartCount > 0) Positioned(
                        right: 6, top: 6,
                        child: Container(
                          width: 14, height: 14,
                          decoration: const BoxDecoration(color: kError, shape: BoxShape.circle),
                          child: Center(child: Text('${st.cartCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 8,
                              fontWeight: FontWeight.w700))),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 4),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: imgUrl != null && imgUrl.startsWith('http')
                  ? Image.network(imgUrl, fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Container(
                        color: kSurfaceWarm,
                        child: const Center(child: Text('🍯', style: TextStyle(fontSize: 80)))))
                  : Container(
                      color: kSurfaceWarm,
                      child: const Center(child: Text('🍯', style: TextStyle(fontSize: 80)))),
            ),
          ),

          // ── Product info ──────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color:        kBackground,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name + badges
                        Text(name, textDirection: TextDirection.rtl,
                          style: const TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w800, fontSize: 22, color: kTextDark)),
                        const SizedBox(height: 8),

                        // Trust badges
                        const Row(
                          textDirection: TextDirection.rtl,
                          children: [
                            TrustBadge(icon: Icons.verified_rounded,      label: 'معتمد',     color: kHoney),
                            SizedBox(width: 16),
                            TrustBadge(icon: Icons.eco_rounded,            label: 'طبيعي 100%', color: Color(0xFF2E7D32)),
                            SizedBox(width: 16),
                            TrustBadge(icon: Icons.local_shipping_rounded, label: 'توصيل سريع', color: Color(0xFF0277BD)),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Price row
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [kSurfaceWarm, kBorder],
                              begin: Alignment.centerRight, end: Alignment.centerLeft),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            textDirection: TextDirection.rtl,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('السعر', style: TextStyle(
                                      fontFamily: 'Cairo', fontSize: 11, color: kTextMuted)),
                                    Text('${price.toStringAsFixed(0)} ج.م',
                                      style: const TextStyle(fontFamily: 'Cairo',
                                        fontWeight: FontWeight.w800, fontSize: 28, color: kHoney)),
                                  ],
                                ),
                              ),
                              if (weight.isNotEmpty)
                                HoneyChip(weight, background: kSurface, textColor: kTextBrown, fontSize: 12),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Stock indicator
                        if (stock < 10 && stock > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3E0),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: kWarning.withOpacity(0.3)),
                            ),
                            child: Row(
                              textDirection: TextDirection.rtl,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.warning_amber_rounded, color: kWarning, size: 16),
                                const SizedBox(width: 6),
                                Text('المتبقي فقط $stock قطعة',
                                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                                    fontSize: 12, color: kWarning)),
                              ],
                            ),
                          ),
                        if (stock == 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFEBEE),
                              borderRadius: BorderRadius.circular(8)),
                            child: const Text('نفد من المخزون', style: TextStyle(
                              fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                              fontSize: 12, color: kError)),
                          ),
                        const SizedBox(height: 16),

                        // Description
                        if (desc.isNotEmpty) ...[
                          const Text('وصف المنتج', style: TextStyle(
                            fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 16, color: kTextDark)),
                          const SizedBox(height: 8),
                          Text(desc, textDirection: TextDirection.rtl,
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                              color: kTextBrown, height: 1.7)),
                          const SizedBox(height: 20),
                        ],

                        // Quantity selector
                        Row(
                          textDirection: TextDirection.rtl,
                          children: [
                            const Text('الكمية', style: TextStyle(
                              fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                              fontSize: 15, color: kTextDark)),
                            const Spacer(),
                            QtySelector(qty: _qty, onChange: (q) {
                              if (q > 0 && q <= stock) setState(() => _qty = q);
                            }),
                          ],
                        ),
                        const SizedBox(height: 100), // space for sticky bottom
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      // ── Sticky bottom add-to-cart ─────────────────────────────────────────
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        decoration: BoxDecoration(
          color: kSurface,
          boxShadow: [BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              // Total preview
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('الإجمالي', style: TextStyle(
                    fontFamily: 'Cairo', fontSize: 11, color: kTextMuted)),
                  Text('${(price * _qty).toStringAsFixed(0)} ج.م',
                    style: const TextStyle(fontFamily: 'Cairo',
                      fontWeight: FontWeight.w800, fontSize: 20, color: kHoney)),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: HoneyButton(
                  label: stock == 0 ? 'نفد من المخزون' : 'أضف إلى السلة',
                  onPressed: stock == 0 ? null : () async {
                    final appState = context.read<AppState>();
                    // Inject merchantId from current store (fallback to existing field)
                    final storeId = appState.selectedStore?['id'] as String?;
                    final item = <String, dynamic>{
                      ...Map<String, dynamic>.from(product),
                      if (storeId != null) 'merchantId': storeId,
                    };
                    final added = appState.addToCart(item, qty: _qty);
                    if (added) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: const Text('تمت الإضافة إلى السلة ✓',
                          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
                        backgroundColor: kSuccess,
                        duration: const Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ));
                    } else {
                      final confirm = await showDialog<bool>(
                        context: context,
                        barrierDismissible: true,
                        builder: (ctx) => Directionality(
                          textDirection: TextDirection.rtl,
                          child: AlertDialog(
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                            titlePadding:   const EdgeInsets.fromLTRB(20, 20, 20, 8),
                            contentPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                            title: const Text(
                              'السلة تحتوي على منتجات من متجر آخر',
                              style: TextStyle(
                                fontFamily:  'Cairo',
                                fontWeight:  FontWeight.w700,
                                fontSize:    15,
                                color:       Color(0xFF5D3A1A),
                              ),
                            ),
                            content: const Text(
                              'لا يمكن الطلب من أكثر من متجر في نفس الطلب. هل تريد إفراغ السلة وإضافة منتجات المتجر الجديد؟',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize:   13,
                                color:      Color(0xFF6D4C41),
                                height:     1.5,
                              ),
                            ),
                            actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(ctx).pop(false),
                                child: const Text('إلغاء',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color:      Color(0xFF9E9E9E),
                                    fontWeight: FontWeight.w600,
                                  )),
                              ),
                              ElevatedButton(
                                onPressed: () => Navigator.of(ctx).pop(true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: kHoney,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 8),
                                ),
                                child: const Text('إفراغ السلة والمتابعة',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w700,
                                    fontSize:   13,
                                  )),
                              ),
                            ],
                          ),
                        ),
                      );
                      if (confirm == true && context.mounted) {
                        appState.clearCart();
                        appState.addToCart(item, qty: _qty);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('تمت الإضافة إلى السلة ✓',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
                          backgroundColor: kSuccess,
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ));
                      }
                    }
                  },
                ),
              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
