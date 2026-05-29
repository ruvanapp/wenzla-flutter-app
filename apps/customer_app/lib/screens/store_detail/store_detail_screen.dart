import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

void _showCartAddedSnackbar(BuildContext context) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: const Text(
        'تمت إضافة المنتج إلى السلة',
        textDirection: TextDirection.rtl,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w700,
        ),
      ),
      action: SnackBarAction(
        label: 'عرض السلة',
        textColor: Colors.white,
        onPressed: () {
          context.read<AppState>().showScreen(AppScreen.cart, bottomIndex: 2);
        },
      ),
      backgroundColor: const Color(0xFF2E7D32),
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
    ),
  );
}

class StoreDetailScreen extends StatefulWidget {
  const StoreDetailScreen({super.key});
  @override State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen>
    with SingleTickerProviderStateMixin {

  late TabController _tabs;
  final _reviewCtrl = TextEditingController();
  int _starRating   = 5;
  int _selectedTab  = 0; // drives which slivers are rendered

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    // Mirror TabController changes to _selectedTab so slivers update.
    _tabs.addListener(_onTabChange);
  }

  void _onTabChange() {
    if (!_tabs.indexIsChanging && _selectedTab != _tabs.index) {
      setState(() => _selectedTab = _tabs.index);
    }
  }

  @override
  void dispose() {
    _tabs.removeListener(_onTabChange);
    _tabs.dispose();
    _reviewCtrl.dispose();
    super.dispose();
  }

  // ── build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final st    = context.watch<AppState>();
    final store = st.selectedStore;
    debugPrint(
      '[StoreDetailScreen] loading=${st.loadingStore} '
      'storeKeys=${store?.keys.toList()} '
      'products=${st.storeProducts.length} '
      'reviews=${st.storeReviews.length}',
    );
    final hasStoreData = store != null &&
        ((store['storeName'] as String?)?.trim().isNotEmpty == true ||
            (store['id'] as String?)?.trim().isNotEmpty == true);

    return Scaffold(
      backgroundColor: kBackground,
      floatingActionButton: st.cartCount > 0
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 8, right: 4),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    FloatingActionButton(
                      heroTag: 'store_cart_fab',
                      backgroundColor: kHoney,
                      foregroundColor: Colors.white,
                      onPressed: () =>
                          context.read<AppState>().showScreen(AppScreen.cart, bottomIndex: 2),
                      child: const Icon(Icons.shopping_cart_checkout_rounded),
                    ),
                    Positioned(
                      top: -4,
                      left: -4,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                        child: Container(
                          height: 22,
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE53935),
                            borderRadius: BorderRadius.circular(11),
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                          child: Text(
                            '${st.cartCount}',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
      body: st.loadingStore
          ? const _StoreLoadingState()
          : !hasStoreData
              ? EmptyState(
                  icon: '🏪',
                  title: 'تعذر تحميل بيانات المتجر',
                  subtitle: 'حاول الرجوع وإعادة فتح المتجر مرة أخرى',
                  onAction: () => context.read<AppState>().closeStore(),
                )
              : _buildBody(context, st, store),
    );
  }

  // ── main scroll view ───────────────────────────────────────────────────────
  Widget _buildBody(
      BuildContext context, AppState st, Map<String, dynamic> store) {
    final name     = (store['storeName']   as String?) ?? '';
    final desc     = (store['description'] as String?) ?? '';
    final phone    = (store['phone']       as String?) ?? '';
    final address  = (store['address']     as String?) ?? '';
    final rating   = double.tryParse(store['averageRating']?.toString() ?? '0') ?? 0;
    final revCount = (store['reviewCount'] as int?)    ?? 0;
    final coverUrl = (store['bannerUrl'] ?? store['coverImage']) as String?;
    final logoUrl  = (store['logoUrl']     as String?);
    final products = st.storeProducts;
    final reviews  = st.storeReviews;

    if (name.trim().isEmpty && products.isEmpty && reviews.isEmpty) {
      return const _StoreRenderFallbackState();
    }

    return CustomScrollView(
      // ClampingScrollPhysics prevents overscroll which can cause
      // SliverPersistentHeader layoutExtent > paintExtent assertion failures.
      physics: const ClampingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      slivers: [

        // ── 1. Hero SliverAppBar ─────────────────────────────────────────────
        SliverAppBar(
          expandedHeight:   220,
          pinned:           true,
          backgroundColor:  kRoyal,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.20),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded,
                  color: Colors.white, size: 16),
            ),
            onPressed: () => context.read<AppState>().closeStore(),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                // Cover image or gradient fallback
                coverUrl != null
                    ? Image.network(coverUrl, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _heroBg())
                    : _heroBg(),
                // Darkening overlay
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end:   Alignment.bottomCenter,
                      colors: [Colors.transparent, Color(0xBB000000)],
                    ),
                  ),
                ),
                // Store name + rating overlay
                Positioned(
                  bottom: 16, left: 16, right: 16,
                  child: Row(
                    textDirection: TextDirection.rtl,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Logo badge
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: kCardShadow,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: logoUrl != null
                              ? Image.network(logoUrl, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) =>
                                      StoreLogoWidget(storeName: name, size: 72))
                              : StoreLogoWidget(storeName: name, size: 72),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(name,
                                style: const TextStyle(
                                  fontFamily:  'Cairo',
                                  fontWeight:  FontWeight.w800,
                                  fontSize:    20,
                                  color:       Colors.white,
                                )),
                            Row(children: [
                              StarRating(rating),
                              const SizedBox(width: 6),
                              Text('$revCount تقييم',
                                  style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize:   12,
                                    color:      Colors.white70,
                                  )),
                            ]),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // ── 2. Stats + description + contact ────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Column(
              children: [
                // Stat cards
                Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    _statCard('${products.length}', 'منتج',    Icons.inventory_2_rounded),
                    const SizedBox(width: 8),
                    _statCard(rating.toStringAsFixed(1), 'تقييم', Icons.star_rounded),
                    const SizedBox(width: 8),
                    _statCard('$revCount', 'مراجعة',            Icons.reviews_rounded),
                  ],
                ),
                // Description
                if (desc.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width:   double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color:        kSurface,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow:    kCardShadow,
                    ),
                    child: Text(desc,
                        textDirection: TextDirection.rtl,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize:   13,
                          color:      kTextBrown,
                          height:     1.6,
                        )),
                  ),
                ],
                // WhatsApp
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final norm = phone.replaceAll(RegExp(r'[^\d+]'), '');
                        final url  = Uri.parse(
                            'https://wa.me/${norm.startsWith('+') ? norm.substring(1) : norm}');
                        if (await canLaunchUrl(url)) {
                          launchUrl(url, mode: LaunchMode.externalApplication);
                        }
                      },
                      icon:  const Icon(Icons.chat_rounded, size: 20),
                      label: const Text('تواصل عبر واتساب',
                          style: TextStyle(
                            fontFamily:  'Cairo',
                            fontWeight:  FontWeight.w700,
                            fontSize:    14,
                          )),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF25D366),
                        side: const BorderSide(color: Color(0xFF25D366), width: 1.5),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        padding:
                            const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
                // Address
                if (address.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width:   double.infinity,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color:        kSurfaceWarm,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        const Icon(Icons.location_on_rounded,
                            color: kHoney, size: 16),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(address,
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize:   12,
                                color:      kTextBrown,
                              )),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),

        // ── 3. Tab bar — pinned ──────────────────────────────────────────────
        SliverPersistentHeader(
          pinned:   true,
          delegate: _TabsDelegate(
            tabs: _tabs,
            // Tapping a tab triggers TabController → listener → setState
            onTabTap: (i) => _tabs.animateTo(i),
          ),
        ),

        // ── 4. Tab content as flat slivers — NO nested scroll ────────────────
        if (_selectedTab == 0)
          ..._productSlivers(context, products)
        else if (_selectedTab == 1)
          ..._infoSlivers(store)
        else
          ..._reviewSlivers(context, st, store, reviews),

        // Bottom breathing room
        const SliverToBoxAdapter(child: SizedBox(height: 40)),
      ],
    );
  }

  // ── Tab 0: Products ────────────────────────────────────────────────────────
  List<Widget> _productSlivers(
      BuildContext context, List<dynamic> products) {
    if (products.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(icon: '📦', title: 'لا توجد منتجات حالياً'),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.all(12),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount:   2,
            crossAxisSpacing: 10,
            mainAxisSpacing:  10,
            childAspectRatio: 0.72,
          ),
          delegate: SliverChildBuilderDelegate(
            (ctx, i) => _buildProductCard(ctx, products[i] as Map<String, dynamic>),
            childCount: products.length,
          ),
        ),
      ),
    ];
  }

  // ── Tab 1: Info ────────────────────────────────────────────────────────────
  List<Widget> _infoSlivers(Map<String, dynamic> store) {
    final fields = <_InfoItem>[
      if ((store['phone']         as String?)?.isNotEmpty == true)
        _InfoItem(Icons.phone_rounded,          'الهاتف',          store['phone']         as String),
      if ((store['address']       as String?)?.isNotEmpty == true)
        _InfoItem(Icons.location_on_rounded,    'العنوان',         store['address']       as String),
      if ((store['city']          as String?)?.isNotEmpty == true)
        _InfoItem(Icons.location_city_rounded,  'المدينة',         store['city']          as String),
      if ((store['businessHours'] as String?)?.isNotEmpty == true)
        _InfoItem(Icons.schedule_rounded,       'مواعيد العمل',    store['businessHours'] as String),
    ];

    if (fields.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(icon: 'ℹ️', title: 'لا توجد معلومات إضافية'),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.all(16),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (_, idx) {
              // Interleave items and dividers
              if (idx.isOdd) return const Divider(height: 1);
              final f = fields[idx ~/ 2];
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    Container(
                      width:  40, height: 40,
                      decoration: BoxDecoration(
                        color:        kSurfaceWarm,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(f.icon, color: kHoney, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(f.label,
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize:   11,
                                color:      kTextMuted,
                              )),
                          Text(f.value,
                              style: const TextStyle(
                                fontFamily:  'Cairo',
                                fontWeight:  FontWeight.w600,
                                fontSize:    14,
                                color:       kTextDark,
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
            childCount: fields.length * 2 - 1,
          ),
        ),
      ),
    ];
  }

  // ── Tab 2: Reviews ─────────────────────────────────────────────────────────
  List<Widget> _reviewSlivers(BuildContext context, AppState st,
      Map<String, dynamic> store, List<dynamic> reviews) {
    // Build the full list of items (review form + review tiles)
    final items = <Widget>[
      if (st.isLoggedIn) ...[
        HoneyCard(
          onTap: null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('أضف تقييمك',
                  style: TextStyle(
                    fontFamily:  'Cairo',
                    fontWeight:  FontWeight.w700,
                    fontSize:    15,
                    color:       kTextDark,
                  )),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setState(() => _starRating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      i < _starRating
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: kHoney, size: 32,
                    ),
                  ),
                )),
              ),
              const SizedBox(height: 10),
              TextField(
                controller:    _reviewCtrl,
                textDirection: TextDirection.rtl,
                maxLines:      3,
                decoration:
                    const InputDecoration(hintText: 'اكتب تعليقك هنا...'),
              ),
              const SizedBox(height: 12),
              HoneyButton(
                label: 'إرسال التقييم',
                onPressed: () async {
                  final text = _reviewCtrl.text.trim();
                  if (text.isEmpty) return;
                  await st.submitReview(
                      store['id'] as String, _starRating, text);
                  _reviewCtrl.clear();
                  setState(() => _starRating = 5);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ],
      if (reviews.isEmpty)
        const EmptyState(icon: '⭐', title: 'لا توجد تقييمات بعد')
      else
        ...reviews.map((r) => _buildReviewTile(r as Map<String, dynamic>)),
    ];

    return [
      if (reviews.isEmpty && !st.isLoggedIn)
        const SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(icon: '⭐', title: 'لا توجد تقييمات بعد'),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate(items),
          ),
        ),
    ];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  Widget _heroBg() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [kRoyal, kDarkHoney],
        begin:  Alignment.topLeft,
        end:    Alignment.bottomRight,
      ),
    ),
    child: const Center(
        child: Text('🍯', style: TextStyle(fontSize: 64))),
  );

  Widget _statCard(String value, String label, IconData icon) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color:        kSurface,
        borderRadius: BorderRadius.circular(12),
        boxShadow:    kCardShadow,
      ),
      child: Column(children: [
        Icon(icon, color: kHoney, size: 20),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
              fontFamily:  'Cairo',
              fontWeight:  FontWeight.w800,
              fontSize:    16,
              color:       kTextDark,
            )),
        Text(label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize:   11,
              color:      kTextMuted,
            )),
      ]),
    ),
  );

  Widget _buildProductCard(
      BuildContext context, Map<String, dynamic> p) {
    final name   = (p['name']     as String?) ?? '';
    final price  = double.tryParse(p['price']?.toString() ?? '0') ?? 0;
    final oldPrice = double.tryParse(p['oldPrice']?.toString() ?? '');
    final imgUrl = (p['imageUrl'] as String?);
    final displayRating = (p['displayRating'] as num?)?.toDouble();
    final st = context.watch<AppState>();
    final cartIndex = st.cart.indexWhere((item) => (item as Map)['id'] == p['id']);
    final cartQty = cartIndex >= 0
        ? (((st.cart[cartIndex] as Map)['qty'] as num?)?.toInt() ?? 1)
        : 0;

    Map<String, dynamic> buildCartItem() {
      final storeId  = st.selectedStore?['id'] as String?;
      final sName    = (st.selectedStore?['storeName'] as String?) ?? '';
      final sLogoUrl = (st.selectedStore?['logoUrl']   as String?);
      return <String, dynamic>{
        ...Map<String, dynamic>.from(p),
        if (storeId   != null) 'merchantId':   storeId,
        if (sName.isNotEmpty)  'storeName':    sName,
        if (sLogoUrl  != null) 'storeLogoUrl': sLogoUrl,
      };
    }

    Future<void> handleAdd() async {
      final item = buildCartItem();
      final added = st.addToCart(item);
      if (added) {
        _showCartAddedSnackbar(context);
      } else {
        final confirm = await showDialog<bool>(
          context: context,
          barrierDismissible: true,
          builder: (ctx) => Directionality(
            textDirection: TextDirection.rtl,
            child: AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
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
        if (confirm == true) {
          st.clearCart();
          st.addToCart(item);
          if (context.mounted) {
            _showCartAddedSnackbar(context);
          }
        }
      }
    }

    return GestureDetector(
      onTap: () =>
          context.read<AppState>().openProduct(Map<String, dynamic>.from(p)),
      child: Container(
        decoration: BoxDecoration(
          color:        kSurface,
          borderRadius: BorderRadius.circular(16),
          boxShadow:    kCardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Fixed-height image area — prevents unconstrained expansion
            SizedBox(
              height: 130,
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
                child: NetImage(url: imgUrl, fit: BoxFit.cover),
              ),
            ),
            // Text section fills remaining card space
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment:  CrossAxisAlignment.start,
                  mainAxisAlignment:   MainAxisAlignment.spaceBetween,
                  children: [
                    Text(name,
                        maxLines:  2,
                        overflow:  TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily:  'Cairo',
                          fontWeight:  FontWeight.w600,
                          fontSize:    12,
                          color:       kTextDark,
                        )),
                    if (displayRating != null)
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: kHoney, size: 12),
                          const SizedBox(width: 2),
                          Text(displayRating.toStringAsFixed(1),
                            style: const TextStyle(fontFamily: 'Cairo',
                              fontWeight: FontWeight.w600, fontSize: 10, color: kTextMuted)),
                        ],
                      ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (oldPrice != null && oldPrice > price)
                          Text('${oldPrice.toStringAsFixed(0)} ج.م',
                            style: const TextStyle(
                              fontFamily: 'Cairo', fontSize: 10, color: kTextMuted,
                              decoration: TextDecoration.lineThrough,
                              decorationColor: kTextMuted)),
                    Row(children: [
                      Expanded(
                        child: Text('${price.toStringAsFixed(0)} ج.م',
                            style: const TextStyle(
                              fontFamily:  'Cairo',
                              fontWeight:  FontWeight.w800,
                              fontSize:    14,
                              color:       kHoney,
                            )),
                      ),
                      if (cartQty <= 0)
                        _StoreQtyTap(
                          onTap: handleAdd,
                          child: Container(
                            width:  32, height: 32,
                            decoration: const BoxDecoration(
                                color: kHoney, shape: BoxShape.circle),
                            child: const Icon(Icons.add_rounded,
                                color: Colors.white, size: 18),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                          decoration: BoxDecoration(
                            color: kSurfaceWarm,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: kBorder, width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _StoreQtyTap(
                                onTap: () async {
                                  st.updateCartQty(p['id'].toString(), cartQty - 1);
                                },
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.remove_rounded,
                                      color: kTextBrown, size: 16),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  '$cartQty',
                                  style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                    color: kTextDark,
                                  ),
                                ),
                              ),
                              _StoreQtyTap(
                                onTap: handleAdd,
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    color: kHoney,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.add_rounded,
                                      color: Colors.white, size: 16),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ]),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewTile(Map<String, dynamic> r) {
    final rating  = (r['rating']  as int?)    ?? 5;
    final comment = (r['comment'] as String?) ?? '';
    final user    = r['customer'] is Map
        ? r['customer'] as Map
        : <String, dynamic>{};
    final name = (user['name'] as String?) ?? 'مجهول';
    final date = (r['createdAt'] as String?) ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        kSurface,
        borderRadius: BorderRadius.circular(12),
        boxShadow:    kCardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            textDirection: TextDirection.rtl,
            children: [
              CircleAvatar(
                radius:          18,
                backgroundColor: kSurfaceWarm,
                child: Text(
                  name.isNotEmpty ? name[0] : '?',
                  style: const TextStyle(
                    fontFamily:  'Cairo',
                    fontWeight:  FontWeight.w700,
                    color:       kHoney,
                    fontSize:    14,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(
                          fontFamily:  'Cairo',
                          fontWeight:  FontWeight.w700,
                          fontSize:    13,
                          color:       kTextDark,
                        )),
                    Text(
                      date.length > 10 ? date.substring(0, 10) : date,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize:   11,
                        color:      kTextMuted,
                      ),
                    ),
                  ],
                ),
              ),
              StarRating(rating.toDouble(), size: 14),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(comment,
                textDirection: TextDirection.rtl,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize:   13,
                  color:      kTextBrown,
                  height:     1.5,
                )),
          ],
        ],
      ),
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pinned tab bar delegate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _TabsDelegate extends SliverPersistentHeaderDelegate {
  final TabController       tabs;
  final ValueChanged<int>?  onTabTap;

  const _TabsDelegate({required this.tabs, this.onTabTap});

  @override double get minExtent => 52;
  @override double get maxExtent => 52;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: kBackground,
      child: TabBar(
        controller: tabs,
        onTap:      onTabTap,
        labelStyle: const TextStyle(
          fontFamily:  'Cairo',
          fontWeight:  FontWeight.w700,
          fontSize:    13,
        ),
        unselectedLabelStyle: const TextStyle(
          fontFamily:  'Cairo',
          fontWeight:  FontWeight.w500,
          fontSize:    13,
        ),
        labelColor:           kHoney,
        unselectedLabelColor: kTextMuted,
        indicatorColor:       kHoney,
        indicatorWeight:      2.5,
        tabs: const [
          Tab(text: 'المنتجات'),
          Tab(text: 'المعلومات'),
          Tab(text: 'التقييمات'),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(_TabsDelegate old) => old.tabs != tabs;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Data holder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _InfoItem {
  final IconData icon;
  final String   label;
  final String   value;
  const _InfoItem(this.icon, this.label, this.value);
}

class _StoreQtyTap extends StatefulWidget {
  final Widget child;
  final Future<void> Function() onTap;

  const _StoreQtyTap({
    required this.child,
    required this.onTap,
  });

  @override
  State<_StoreQtyTap> createState() => _StoreQtyTapState();
}

class _StoreQtyTapState extends State<_StoreQtyTap> {
  bool _busy = false;

  Future<void> _handleTap() async {
    if (_busy || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.onTap();
    } finally {
      await Future<void>.delayed(const Duration(milliseconds: 120));
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TapScaleWidget(
      onTap: _busy ? null : _handleTap,
      child: Opacity(
        opacity: _busy ? 0.7 : 1,
        child: widget.child,
      ),
    );
  }
}

class _StoreLoadingState extends StatelessWidget {
  const _StoreLoadingState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          CircularProgressIndicator(color: kHoney),
          SizedBox(height: 14),
          Text(
            'جاري تحميل المتجر...',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: kTextBrown,
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreRenderFallbackState extends StatelessWidget {
  const _StoreRenderFallbackState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              '🏪',
              style: TextStyle(fontSize: 52),
            ),
            const SizedBox(height: 12),
            const Text(
              'تم فتح صفحة المتجر لكن المحتوى غير جاهز بعد',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: kTextDark,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'يمكنك الرجوع ثم المحاولة مرة أخرى بأمان',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                color: kTextMuted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            HoneyButton(
              label: 'الرجوع',
              onPressed: () => context.read<AppState>().closeStore(),
            ),
          ],
        ),
      ),
    );
  }
}
