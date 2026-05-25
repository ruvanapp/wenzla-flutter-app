import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';
import '../../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PageController          _bannerCtrl  = PageController();
  final ValueNotifier<int>      _bannerPage  = ValueNotifier(0);
  Timer?                        _bannerTimer;
  AppState?                     _appState;

  // Wide-format Pexels honey images (1200×400)
  static const _banners = [
    _BannerData(
      'عسل سدر جبلي فاخر',
      'من مناحل عضوية معتمدة',
      kRoyal, kHoney, '🍯',
      imageUrl: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    ),
    _BannerData(
      'عروض الموسم',
      'خصم حتى ٣٠٪ على منتجات العسل',
      kDarkHoney, kAmber, '🐝',
      imageUrl: 'https://images.pexels.com/photos/1207972/pexels-photo-1207972.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    ),
    _BannerData(
      'غذاء الملكات الطبيعي',
      'تقوية المناعة والطاقة',
      Color(0xFF2D5A1B), Color(0xFF81C784), '👑',
      imageUrl: 'https://images.pexels.com/photos/4505629/pexels-photo-4505629.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _appState = context.read<AppState>();
      if (_appState!.stores.isEmpty)     _appState!.loadStores();
      if (_appState!.categories.isEmpty) _appState!.loadCategories();
      _appState!.loadHomeCms();
      _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        if (!mounted || !_bannerCtrl.hasClients) return;
        final cmsBanners = _appState?.homeBanners ?? [];
        final count = cmsBanners.isNotEmpty ? cmsBanners.length : _banners.length;
        final next = (_bannerPage.value + 1) % count;
        _bannerCtrl.animateToPage(next,
            duration: const Duration(milliseconds: 600), curve: Curves.easeInOut);
      });
    });
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _bannerCtrl.dispose();
    _bannerPage.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackground,
      body: SafeArea(
        child: RefreshIndicator(
          color: kHoney,
          onRefresh: () async {
            final st = context.read<AppState>();
            await Future.wait([st.loadStores(), st.loadCategories()]);
          },
          child: CustomScrollView(
            slivers: [
              _buildAppBar(context),
              SliverToBoxAdapter(child: _buildHeroBanner()),
              SliverToBoxAdapter(child: _buildCategoriesRow()),
              SliverToBoxAdapter(child: _buildFeaturedStores()),
              SliverToBoxAdapter(child: _buildPromoBanner()),
              SliverToBoxAdapter(child: _buildAllStoresGrid()),
              const SliverToBoxAdapter(child: SizedBox(height: 118)),
            ],
          ),
        ),
      ),
    );
  }

  // ── AppBar ──────────────────────────────────────────────────────────────────
  Widget _buildAppBar(BuildContext context) {
    final st = context.watch<AppState>();
    return SliverAppBar(
      backgroundColor:    kBackground,
      surfaceTintColor:   Colors.transparent,
      floating:           true,
      snap:               true,
      elevation:          0,
      titleSpacing:       16,
      title: Row(
        textDirection: TextDirection.rtl,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [kAmber, kDarkHoney]),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(child: Text('🍯', style: TextStyle(fontSize: 18))),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('سوق العسل', style: TextStyle(
                  fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                  fontSize: 18, color: kTextDark)),
                Text('أجود أنواع العسل الطبيعي', style: TextStyle(
                  fontFamily: 'Cairo', fontSize: 10, color: kTextMuted)),
              ],
            ),
          ),
        ],
      ),
      actions: [
        Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.shopping_bag_outlined, color: kTextDark),
              onPressed: () => context.read<AppState>().showScreen(AppScreen.cart, bottomIndex: 2),
            ),
            if (st.cartCount > 0)
              Positioned(
                right: 6, top: 6,
                child: Container(
                  width: 18, height: 18,
                  decoration: const BoxDecoration(color: kError, shape: BoxShape.circle),
                  child: Center(child: Text('${st.cartCount}',
                    style: const TextStyle(color: Colors.white, fontSize: 10,
                      fontWeight: FontWeight.w700, fontFamily: 'Cairo'))),
                ),
              ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.search_rounded, color: kTextDark),
          onPressed: () => _openSearchOverlay(context),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  // ── Hero Banner ─────────────────────────────────────────────────────────────
  /// Resolve a relative imageUrl from the CMS backend to a full URL.
  static String _resolveImgUrl(String url) =>
      url.startsWith('http') ? url : '$kApiUrl$url';

  Widget _buildHeroBanner() {
    return Consumer<AppState>(builder: (_, st, __) {
      final cmsBanners = st.homeBanners;
      final count = cmsBanners.isNotEmpty ? cmsBanners.length : _banners.length;
      return Padding(
        padding: const EdgeInsets.fromLTRB(0, 6, 0, 10),
        child: SizedBox(
          height: 224,
          child: Stack(
            children: [
              PageView.builder(
                controller: _bannerCtrl,
                onPageChanged: (i) => _bannerPage.value = i,
                itemCount: count,
                itemBuilder: (_, i) {
                  if (cmsBanners.isNotEmpty) {
                    final b = cmsBanners[i] as Map<String, dynamic>;
                    return _buildDynamicBannerSlide(b);
                  }
                  return _buildBannerSlide(_banners[i]);
                },
              ),
              Positioned(
                bottom: 18,
                left: 24,
                right: 24,
                child: Row(
                  children: [
                    Expanded(
                      child: ValueListenableBuilder<int>(
                        valueListenable: _bannerPage,
                        builder: (_, page, __) => Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          textDirection: TextDirection.rtl,
                          children: List.generate(
                            count,
                            (i) => AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              width: page == i ? 22 : 7,
                              height: 7,
                              decoration: BoxDecoration(
                                color: page == i ? Colors.white : Colors.white38,
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(0.20)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified_rounded, color: Colors.white, size: 15),
                          SizedBox(width: 5),
                          Text(
                            'متاجر موثقة',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildDynamicBannerSlide(Map<String, dynamic> b) {
    final title    = (b['title'] as String?) ?? '';
    final subtitle = (b['subtitle'] as String?) ?? '';
    final btnText  = (b['buttonText'] as String?) ?? 'تسوق الآن';
    final imageUrl = (b['imageUrl'] as String?) != null
        ? _resolveImgUrl(b['imageUrl'] as String)
        : null;
    Color c1, c2;
    try {
      c1 = Color(int.parse((b['color1'] as String).replaceFirst('#', '0xFF')));
    } catch (_) { c1 = kHoney; }
    try {
      c2 = Color(int.parse((b['color2'] as String).replaceFirst('#', '0xFF')));
    } catch (_) { c2 = kDarkHoney; }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 2, 16, 8),
      decoration: BoxDecoration(
        gradient: imageUrl == null
            ? LinearGradient(colors: [c1, c2], begin: Alignment.centerRight, end: Alignment.centerLeft)
            : null,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          ...kLiftedShadow,
          BoxShadow(
            color: c2.withOpacity(0.14),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl != null)
            Image.network(imageUrl, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                decoration: BoxDecoration(gradient: LinearGradient(colors: [c1, c2],
                  begin: Alignment.centerRight, end: Alignment.centerLeft)),
              ),
            ),
          if (imageUrl != null)
            Container(decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.black54, Colors.transparent],
                begin: Alignment.centerRight, end: Alignment.centerLeft))),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
            child: Row(
              textDirection: TextDirection.rtl,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment:  MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.white.withOpacity(0.18)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 14),
                            SizedBox(width: 5),
                            Text(
                              'اختيار فاخر',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(title, style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white),
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                      if (subtitle.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: Colors.white70,
                            height: 1.35,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white38),
                        ),
                        child: Text(
                          btnText,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerSlide(_BannerData d) => Container(
    margin: const EdgeInsets.fromLTRB(16, 2, 16, 8),
    decoration: BoxDecoration(
      gradient: d.imageUrl == null
          ? LinearGradient(
              colors: [d.color1, d.color2],
              begin: Alignment.centerRight,
              end:   Alignment.centerLeft,
            )
          : null,
      borderRadius: BorderRadius.circular(28),
      boxShadow: [
        ...kLiftedShadow,
        BoxShadow(
          color: d.color2.withOpacity(0.16),
          blurRadius: 28,
          offset: const Offset(0, 14),
        ),
      ],
    ),
    clipBehavior: Clip.antiAlias,
    child: Stack(
      fit: StackFit.expand,
      children: [
        // Background image (or gradient fallback)
        if (d.imageUrl != null)
          Image.network(
            d.imageUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [d.color1, d.color2],
                  begin: Alignment.centerRight,
                  end:   Alignment.centerLeft,
                ),
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [d.color1, d.color2],
                begin: Alignment.centerRight,
                end:   Alignment.centerLeft,
              ),
            ),
          ),
        // Darkening overlay so text stays readable
        if (d.imageUrl != null)
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xCC000000), Color(0x55000000)],
                begin: Alignment.centerRight,
                end:   Alignment.centerLeft,
              ),
            ),
          ),
        // Text content
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment:  MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: Colors.white.withOpacity(0.18)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 14),
                          SizedBox(width: 5),
                          Text(
                            'سوق العسل بريميوم',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(d.title, style: const TextStyle(
                      fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                      fontSize: 18, color: Colors.white),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 6),
                    Text(
                      d.subtitle,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        color: Colors.white70,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white38),
                      ),
                      child: const Text('تسوق الآن', style: TextStyle(
                        fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                        fontSize: 12, color: Colors.white)),
                    ),
                  ],
                ),
              ),
              if (d.imageUrl == null)
                Text(d.emoji, style: const TextStyle(fontSize: 72)),
            ],
          ),
        ),
      ],
    ),
  );

  // ── Categories ──────────────────────────────────────────────────────────────
  Widget _buildCategoriesRow() {
    return Consumer<AppState>(builder: (_, st, __) {
      // Prefer CMS-managed categories; fall back to API categories
      final useCms = st.hasCmsCategories;
      final cats   = useCms ? st.homeCmsCategories : st.categories;
      if (cats.isEmpty) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('التصنيفات', subtitle: 'اكتشف أقسام العسل المختارة لك'),
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection:  Axis.horizontal,
              padding:          const EdgeInsets.symmetric(horizontal: 14),
              reverse:          true,
              itemCount:        cats.length,
              itemBuilder: (_, i) => FadeInWidget(
                delay: Duration(milliseconds: i * 60),
                child: useCms
                    ? _buildCmsCategoryChip(cats[i])
                    : _buildCategoryChip(cats[i] as Map<String, dynamic>),
              ),
            ),
          ),
          const SizedBox(height: 4),
        ],
      );
    });
  }

  Widget _buildCmsCategoryChip(dynamic cat) {
    final name     = (cat['name'] as String?) ?? '';
    final emoji    = (cat['iconEmoji'] as String?) ?? '🍯';
    final colorHex = (cat['colorHex'] as String?) ?? '#D4A437';
    final imageUrl = (cat['imageUrl'] as String?);
    Color bgColor;
    try {
      bgColor = Color(int.parse(colorHex.replaceFirst('#', 'FF'), radix: 16));
    } catch (_) {
      bgColor = kAmber;
    }
    final imageWidget = imageUrl != null && imageUrl.isNotEmpty
        ? ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.network(
              _resolveImgUrl(imageUrl), fit: BoxFit.cover, width: 62, height: 62,
              errorBuilder: (_, __, ___) =>
                  Center(child: Text(emoji, style: const TextStyle(fontSize: 26))),
            ),
          )
        : Center(child: Text(emoji, style: const TextStyle(fontSize: 26)));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 7),
      child: TapScaleWidget(
        onTap: () => _openCategoryFilter(context, name),
        child: Column(
          children: [
            Container(
              width: 74, height: 74,
              decoration: BoxDecoration(
                color: bgColor.withOpacity(0.15),
                border: Border.all(color: bgColor.withOpacity(0.4), width: 1.5),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: bgColor.withOpacity(0.22), blurRadius: 12, offset: const Offset(0,6))],
              ),
              child: imageWidget,
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: 84,
              child: Text(name, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                  fontSize: 11, color: kTextBrown, height: 1.25)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(Map<String, dynamic> cat) {
    final name    = (cat['name'] as String?) ?? '';
    final visual  = kCategoryVisuals[name];
    final icon    = visual?.icon ?? Icons.category_rounded;
    final colors  = visual?.gradient ?? [kAmber, kDarkHoney];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 7),
      child: TapScaleWidget(
        onTap: () => _openCategoryFilter(context, name),
        child: Column(
          children: [
            Container(
              width: 74, height: 74,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: colors.last.withOpacity(0.28), blurRadius: 12, offset: const Offset(0,6))],
              ),
              child: Icon(icon, color: Colors.white, size: 31),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: 84,
              child: Text(name, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                  fontSize: 11, color: kTextBrown, height: 1.25)),
            ),
          ],
        ),
      ),
    );
  }

  // ── Featured Stores ─────────────────────────────────────────────────────────
  Widget _buildFeaturedStores() {
    return Consumer<AppState>(builder: (_, st, __) {
      if (st.loadingStores) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionTitle('متاجر مميزة', subtitle: 'متاجر موثقة بعناية وتجربة فاخرة'),
            SizedBox(
              height: 206,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                reverse: true,
                itemCount: 4,
                itemBuilder: (_, __) => const SkeletonFeaturedCard(),
              ),
            ),
            const SizedBox(height: 8),
          ],
        );
      }

      // If CMS featured stores are configured, use them; else fall back to first 6 stores
      final useCms = st.hasFeaturedStores;
      List<Map<String, dynamic>> cards;
      if (useCms) {
        // Map FeaturedStore entries to a uniform card shape
        cards = st.featuredStores
            .where((f) => f['merchant'] != null)
            .map<Map<String, dynamic>>((f) {
          final m = f['merchant'] as Map<String, dynamic>;
          return {
            'id':           m['id'],
            'storeName':    m['storeName'],
            'logoUrl':      f['imageUrl'] ?? m['logoUrl'],
            'bannerUrl':    m['bannerUrl'],
            'customLabel':  f['customLabel'],
            'averageRating': m['averageRating'],
            'reviewCount':   m['reviewCount'],
          };
        }).toList();
      } else {
        cards = st.stores.take(6).map((s) => Map<String, dynamic>.from(s)).toList();
      }
      if (cards.isEmpty) return const SizedBox.shrink();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle('متاجر مميزة', subtitle: 'متاجر موثقة بعناية وتجربة فاخرة'),
          SizedBox(
            height: 206,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding:         const EdgeInsets.symmetric(horizontal: 14),
              reverse:         true,
              itemCount:       cards.length,
              itemBuilder:     (_, i) => FadeInWidget(
                delay: Duration(milliseconds: i * 80),
                child: _buildFeaturedStoreCard(cards[i]),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      );
    });
  }

  Widget _buildFeaturedStoreCard(Map<String, dynamic> store) {
    final name     = (store['storeName'] as String?) ?? '';
    final logoUrl  = (store['logoUrl'] as String?);
    final rating   = double.tryParse(store['averageRating']?.toString() ?? '0') ?? 0;
    final revCount = (store['reviewCount'] as int?) ?? 0;
    final customLabel = (store['customLabel'] as String?)?.trim();

    Widget _logoArea() {
      const radius = BorderRadius.vertical(top: Radius.circular(16));
      if (logoUrl != null && logoUrl.isNotEmpty) {
        return ClipRRect(
          borderRadius: radius,
          child: Image.network(
            logoUrl,
            height: 90, width: double.infinity, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _gradientLogoBox(name, 90, 60, radius),
          ),
        );
      }
      return _gradientLogoBox(name, 90, 60, radius);
    }

    return TapScaleWidget(
      onTap: () => context.read<AppState>().openStore(store['id'] as String),
      child: Container(
        width: 176,
        margin: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: kBorder.withOpacity(0.45)),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kHoney.withOpacity(0.08),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          children: [
            Stack(
              children: [
                _logoArea(),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified_rounded, color: kSuccess, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          customLabel?.isNotEmpty == true ? customLabel! : 'موثق',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: kTextDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                      fontSize: 14, color: kTextDark),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: kHoney, size: 14),
                      const SizedBox(width: 2),
                      Text(rating.toStringAsFixed(1),
                        style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                          fontSize: 12, color: kHoney)),
                      const SizedBox(width: 4),
                      Text('($revCount)', style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 10, color: kTextMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: kSurfaceWarm,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Text(
                      'توصيل سريع • جودة مختارة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: kTextBrown,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Promo Banner ────────────────────────────────────────────────────────────
  Widget _buildPromoBanner() {
    return Consumer<AppState>(builder: (_, st, __) {
      if (st.homePromotions.isNotEmpty) {
        final p = st.homePromotions.first as Map<String, dynamic>;
        final title    = (p['title'] as String?) ?? '';
        final subtitle = (p['subtitle'] as String?) ?? '';
        final imageUrl = (p['imageUrl'] as String?) != null
            ? _resolveImgUrl(p['imageUrl'] as String)
            : null;
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [kRoyal, Color(0xFF7B3B00)],
                begin: Alignment.centerRight, end: Alignment.centerLeft),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              ...kCardShadow,
              BoxShadow(
                color: kRoyal.withOpacity(0.14),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              if (imageUrl != null)
                Positioned.fill(
                  child: Image.network(imageUrl, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox()),
                ),
              if (imageUrl != null)
                Positioned.fill(child: Container(
                    decoration: BoxDecoration(
                        gradient: LinearGradient(
                            colors: [Colors.black54, Colors.transparent],
                            begin: Alignment.centerRight, end: Alignment.centerLeft)))),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  textDirection: TextDirection.rtl,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const HoneyChip('عرض خاص', background: Color(0x33FFFFFF), textColor: Colors.white),
                          const SizedBox(height: 8),
                          Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white)),
                          if (subtitle.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.white70)),
                          ],
                        ],
                      ),
                    ),
                    if (imageUrl == null) const Text('🎁', style: TextStyle(fontSize: 56)),
                  ],
                ),
              ),
            ],
          ),
        );
      }

      // Fallback static promo
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [kRoyal, Color(0xFF7B3B00)],
              begin: Alignment.centerRight, end: Alignment.centerLeft),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kRoyal.withOpacity(0.14),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const HoneyChip('نصيحة خبراء العسل', background: Color(0x33FFFFFF), textColor: Colors.white),
                  const SizedBox(height: 8),
                  const Text('كيف تختار\nعسلًا طبيعيًا أصيلًا؟',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white)),
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white60),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    ),
                    child: const Text('اقرأ الدليل', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const Text('🌿', style: TextStyle(fontSize: 56)),
          ],
        ),
      );
    });
  }

  // ── All Stores Grid ─────────────────────────────────────────────────────────
  Widget _buildAllStoresGrid() {
    return Consumer<AppState>(builder: (_, st, __) {
      if (st.loadingStores) {
        return Column(
          children: [
            const SectionTitle('جميع المتاجر', subtitle: 'تصفح المتاجر الفاخرة القريبة من ذوقك'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: GridView.builder(
                shrinkWrap:   true,
                physics:      const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12, mainAxisSpacing: 12,
                  childAspectRatio: 0.79,
                ),
                itemCount: 6,
                itemBuilder: (_, __) => const SkeletonStoreCard(),
              ),
            ),
          ],
        );
      }
      final stores = st.stores;
      if (stores.isEmpty) {
        return EmptyState(
          icon: '🏪', title: 'لا توجد متاجر حالياً',
          subtitle: 'سيتم إضافة متاجر قريباً',
          onAction: st.loadStores,
          actionLabel: 'تحديث',
        );
      }

      return Column(
        children: [
          const SectionTitle('جميع المتاجر', subtitle: 'تصفح المتاجر الفاخرة القريبة من ذوقك'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: GridView.builder(
              shrinkWrap:   true,
              physics:      const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12, mainAxisSpacing: 12,
                childAspectRatio: 0.79,
              ),
              itemCount: stores.length,
              itemBuilder: (_, i) => FadeInWidget(
                delay: Duration(milliseconds: (i * 50).clamp(0, 400)),
                child: _buildStoreGridCard(stores[i]),
              ),
            ),
          ),
        ],
      );
    });
  }

  Widget _buildStoreGridCard(Map<String, dynamic> store) {
    final name      = (store['storeName'] as String?) ?? '';
    final logoUrl   = (store['logoUrl'] as String?);
    final rating    = double.tryParse(store['averageRating']?.toString() ?? '0') ?? 0;
    final revCount  = (store['reviewCount'] as int?) ?? 0;
    final prodCount = (store['_count']?['products'] as int?) ?? 0;

    Widget _logoArea() {
      if (logoUrl != null && logoUrl.isNotEmpty) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          child: Image.network(
            logoUrl,
            height: 110, width: double.infinity, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _gradientLogoBox(name, 110, 68,
              const BorderRadius.vertical(top: Radius.circular(16))),
          ),
        );
      }
      return _gradientLogoBox(name, 110, 68,
        const BorderRadius.vertical(top: Radius.circular(16)));
    }

    return TapScaleWidget(
      onTap: () => context.read<AppState>().openStore(store['id'] as String),
      child: Container(
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: kBorder.withOpacity(0.4)),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kHoney.withOpacity(0.07),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                _logoArea(),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.verified_rounded,
                      color: kSuccess,
                      size: 17,
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                      fontSize: 14, color: kTextDark),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: kHoney, size: 13),
                      const SizedBox(width: 2),
                      Text(rating.toStringAsFixed(1),
                        style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                          fontSize: 11, color: kHoney)),
                      const SizedBox(width: 4),
                      Text('($revCount)', style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 10, color: kTextMuted)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: kSurfaceWarm,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          '$prodCount منتج',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: kTextBrown,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Search overlay ──────────────────────────────────────────────────────────
  Widget _gradientLogoBox(String name, double height, double logoSize, BorderRadius radius) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [kSurfaceWarm, Color(0xFFEEDDBA)],
          begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: radius,
      ),
      child: Center(child: StoreLogoWidget(storeName: name, size: logoSize)),
    );
  }

  void _openSearchOverlay(BuildContext context) {
    showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'بحث',
      barrierColor: Colors.black.withOpacity(0.55),
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (ctx, _, __) => const _SearchOverlay(),
      transitionBuilder: (ctx, anim, _, child) => SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, -0.15),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOut)),
        child: FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  // ── Category filter bottom sheet ─────────────────────────────────────────
  void _openCategoryFilter(BuildContext context, String catName) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CategoryStoresSheet(catName: catName),
    );
  }
}

// ── Search overlay widget ──────────────────────────────────────────────────────
class _SearchOverlay extends StatefulWidget {
  const _SearchOverlay();
  @override State<_SearchOverlay> createState() => _SearchOverlayState();
}

class _SearchOverlayState extends State<_SearchOverlay> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    return Directionality(
      textDirection: TextDirection.rtl,
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.only(
            top: 16,
            left: 16, right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16,
          ),
          child: Material(
            color: Colors.transparent,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Search field
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: TextField(
                    controller: _ctrl,
                    autofocus: true,
                    textDirection: TextDirection.rtl,
                    decoration: InputDecoration(
                      hintText: 'ابحث عن منتج أو متجر...',
                      hintStyle: const TextStyle(
                          fontFamily: 'Cairo', color: kTextMuted, fontSize: 14),
                      prefixIcon: const Icon(Icons.search_rounded, color: kHoney),
                      suffixIcon: st.searching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                  width: 16, height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: kHoney)),
                            )
                          : _ctrl.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, color: kTextMuted),
                                  onPressed: () {
                                    _ctrl.clear();
                                    context.read<AppState>().clearSearch();
                                  },
                                )
                              : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                    ),
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 15, color: kTextDark),
                    onChanged: (v) {
                      setState(() {});
                      context.read<AppState>().search(v);
                    },
                  ),
                ),

                const SizedBox(height: 12),

                // Results
                if (st.searchResults.isNotEmpty)
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.55,
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.10),
                              blurRadius: 16,
                              offset: const Offset(0, 4))
                        ],
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: st.searchResults.length,
                        separatorBuilder: (_, __) => const Divider(
                            height: 1, indent: 60, endIndent: 16),
                        itemBuilder: (_, i) {
                          final p = st.searchResults[i] as Map<String, dynamic>;
                          final name  = (p['name'] as String?) ?? '';
                          final price = p['price']?.toString() ?? '';
                          final imgUrl = (p['imageUrl'] as String?);
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            leading: Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: kSurfaceWarm,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: imgUrl != null && imgUrl.isNotEmpty
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.network(imgUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) =>
                                              const Center(child: Text('🍯'))))
                                  : const Center(
                                      child: Text('🍯',
                                          style: TextStyle(fontSize: 20))),
                            ),
                            title: Text(name,
                                style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: kTextDark)),
                            subtitle: price.isNotEmpty
                                ? Text('$price جنيه',
                                    style: const TextStyle(
                                        fontFamily: 'Cairo',
                                        fontSize: 12,
                                        color: kHoney,
                                        fontWeight: FontWeight.w700))
                                : null,
                            onTap: () {
                              Navigator.of(context).pop();
                              context.read<AppState>().openProduct(p);
                            },
                          );
                        },
                      ),
                    ),
                  )
                else if (_ctrl.text.isNotEmpty && !st.searching)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Center(
                      child: Text(
                        'لا توجد نتائج',
                        style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 14,
                            color: kTextMuted),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Category stores bottom sheet ──────────────────────────────────────────────
class _CategoryStoresSheet extends StatelessWidget {
  final String catName;
  const _CategoryStoresSheet({required this.catName});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    // Filter stores by category name (case-insensitive contains)
    final all = st.stores;
    final filtered = all.where((s) {
      final cats = (s['categories'] as List?) ?? [];
      final storeName = (s['storeName'] as String?) ?? '';
      if (cats.any((c) =>
          (c is String && c.toLowerCase().contains(catName.toLowerCase())) ||
          (c is Map &&
              (c['name']?.toString() ?? '')
                  .toLowerCase()
                  .contains(catName.toLowerCase())))) {
        return true;
      }
      // fallback: don't filter out if no category metadata — show all
      return cats.isEmpty;
    }).toList();

    final stores = filtered.isNotEmpty ? filtered : all;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        builder: (_, scrollCtrl) => Container(
          decoration: const BoxDecoration(
            color: kBackground,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40, height: 4,
                decoration: BoxDecoration(
                    color: kBorder,
                    borderRadius: BorderRadius.circular(2)),
              ),
              // Title
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(catName,
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              color: kTextDark)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: kTextMuted),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Store grid
              Expanded(
                child: stores.isEmpty
                    ? const Center(
                        child: Text('لا توجد متاجر في هذا التصنيف',
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                color: kTextMuted,
                                fontSize: 14)))
                    : GridView.builder(
                        controller: scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 0.85,
                        ),
                        itemCount: stores.length,
                        itemBuilder: (ctx, i) {
                          final s = stores[i] as Map<String, dynamic>;
                          final name = (s['storeName'] as String?) ?? '';
                          final rating = double.tryParse(
                                  s['averageRating']?.toString() ?? '0') ??
                              0;
                          final revCount = (s['reviewCount'] as int?) ?? 0;
                          return GestureDetector(
                            onTap: () {
                              Navigator.pop(context);
                              context
                                  .read<AppState>()
                                  .openStore(s['id'] as String);
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: kSurface,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: kCardShadow,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Container(
                                    height: 90,
                                    decoration: const BoxDecoration(
                                      gradient: LinearGradient(
                                          colors: [kSurfaceWarm, Color(0xFFEEDDBA)],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight),
                                      borderRadius: BorderRadius.vertical(
                                          top: Radius.circular(16)),
                                    ),
                                    child: Center(
                                        child: StoreLogoWidget(
                                            storeName: name, size: 60)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(name,
                                            style: const TextStyle(
                                                fontFamily: 'Cairo',
                                                fontWeight: FontWeight.w700,
                                                fontSize: 12,
                                                color: kTextDark),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 4),
                                        Row(children: [
                                          const Icon(Icons.star_rounded,
                                              color: kHoney, size: 12),
                                          const SizedBox(width: 2),
                                          Text(rating.toStringAsFixed(1),
                                              style: const TextStyle(
                                                  fontFamily: 'Cairo',
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 11,
                                                  color: kHoney)),
                                          const SizedBox(width: 4),
                                          Text('($revCount)',
                                              style: const TextStyle(
                                                  fontFamily: 'Cairo',
                                                  fontSize: 10,
                                                  color: kTextMuted)),
                                        ]),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Data class ────────────────────────────────────────────────────────────────
class _BannerData {
  final String title, subtitle, emoji;
  final Color color1, color2;
  final String? imageUrl;
  const _BannerData(this.title, this.subtitle, this.color1, this.color2, this.emoji, {this.imageUrl});
}
