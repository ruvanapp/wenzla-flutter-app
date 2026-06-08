import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';
import '../../services/api_service.dart';
import '../profile/referral_screen.dart';

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
      _appState!.loadHomePromoCard();
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
            await Future.wait([st.loadStores(), st.loadCategories(), st.loadHomeCms(force: true), st.loadHomePromoCard()]);
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
              borderRadius: BorderRadius.circular(10),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                'assets/branding/souq_alasal_logo.png',
                fit: BoxFit.cover,
              ),
            ),
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
        Selector<AppState, int>(
          selector: (_, st) => st.cartCount,
          builder: (ctx, cartCount, __) => Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined, color: kTextDark),
                onPressed: () => ctx.read<AppState>().showScreen(AppScreen.cart, bottomIndex: 2),
              ),
              if (cartCount > 0)
                Positioned(
                  right: 6, top: 6,
                  child: Container(
                    width: 18, height: 18,
                    decoration: const BoxDecoration(color: kError, shape: BoxShape.circle),
                    child: Center(child: Text('$cartCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10,
                        fontWeight: FontWeight.w700, fontFamily: 'Cairo'))),
                  ),
                ),
            ],
          ),
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
  /// Returns null for empty/invalid URLs so callers can skip Image.network.
  static String? _resolveImgUrl(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    return url.startsWith('http') ? url : '$kApiUrl$url';
  }

  static String? _homeImageUrl(
    String? url, {
    double? width,
    double? height,
    String crop = 'fill',
  }) {
    final resolved = _resolveImgUrl(url);
    return NetImage.optimizeCloudinaryUrl(
      resolved,
      width: width?.round(),
      height: height?.round(),
      crop: crop,
    );
  }

  Widget _buildHeroBanner() {
    return Consumer<AppState>(builder: (_, st, __) {
      final cmsBanners = st.homeBanners;

      // ── Still loading: show shimmer instead of Pexels fallback ──────────────
      if (st.cmsLoading && cmsBanners.isEmpty) {
        return _buildBannerShimmer();
      }

      // ── CMS loaded: use real banners or Pexels as true offline fallback ─────
      final count = cmsBanners.isNotEmpty ? cmsBanners.length : _banners.length;
      return Padding(
        padding: const EdgeInsets.fromLTRB(0, 6, 0, 8),
        child: SizedBox(
          height: 170,
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

  Widget _buildBannerShimmer() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 6, 0, 8),
      child: SizedBox(
        height: 170,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: ShimmerBox(height: 214),
          ),
        ),
      ),
    );
  }

  Widget _buildDynamicBannerSlide(Map<String, dynamic> b) {
    final title    = (b['title'] as String?) ?? '';
    final subtitle = (b['subtitle'] as String?) ?? '';
    final btnText  = (b['buttonText'] as String?) ?? 'تسوق الآن';
    final imageUrl = _homeImageUrl(
      b['imageUrl'] as String?,
      width: 1200,
      height: 448,
      crop: 'fill',
    );
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
        // Always show gradient — visible when image is null or fails to load
        gradient: LinearGradient(colors: [c1, c2], begin: Alignment.centerRight, end: Alignment.centerLeft),
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
            NetImage(
              url: imageUrl,
              fit: BoxFit.cover,
              fallback: '',
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
          NetImage(
            url: _homeImageUrl(
              d.imageUrl,
              width: 1200,
              height: 448,
              crop: 'fill',
            ),
            fit: BoxFit.cover,
            fallback: '',
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
      // ── Loading: show shimmer skeleton ───────────────────────────────────────
      if (st.cmsLoading && st.categories.isEmpty) {
        return const SkeletonCategoryRow();
      }

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
    final resolved = _homeImageUrl(
      imageUrl,
      width: 124,
      height: 124,
      crop: 'fill',
    );
    final imageWidget = resolved != null
        ? ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: NetImage(
              url: resolved,
              fit: BoxFit.cover,
              width: 62,
              height: 62,
              borderRadius: BorderRadius.circular(18),
              fallback: emoji,
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
              height: 192,
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
            height: 192,
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
          const SizedBox(height: 4),
        ],
      );
    });
  }

  Widget _buildFeaturedStoreCard(Map<String, dynamic> store) {
    final name     = (store['storeName'] as String?) ?? '';
    // Prefer bannerUrl (landscape) for the card image area; fall back to logoUrl
    final cardImageUrl = _homeImageUrl(
      (store['bannerUrl'] as String?)?.isNotEmpty == true
          ? store['bannerUrl'] as String?
          : store['logoUrl'] as String?,
      width: 352,
      height: 212,
      crop: 'fill',
    );
    final prodCount = (store['_count']?['products'] as int?) ?? 0;
    final customLabel = (store['customLabel'] as String?)?.trim();

    Widget logoArea() {
      const radius = BorderRadius.vertical(top: Radius.circular(20));
      if (cardImageUrl != null && cardImageUrl.isNotEmpty) {
        return NetImage(
          url: cardImageUrl,
          height: 106,
          fit: BoxFit.cover,
          borderRadius: radius,
          fallback: '',
        );
      }
      return _gradientLogoBox(name, 106, 64, radius);
    }

    return TapScaleWidget(
      onTap: () => context.read<AppState>().openStoreWithData(store.cast<String, dynamic>()),
      child: Container(
        width: 176,
        margin: const EdgeInsets.symmetric(horizontal: 7),
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kBorder.withOpacity(0.4)),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kHoney.withOpacity(0.07),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                logoArea(),
                Positioned(
                  top: 8,
                  right: 8,
                  child: _verifiedBadge(
                    customLabel?.isNotEmpty == true ? customLabel! : 'موثق',
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                      color: kTextDark,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  // Compact info row: 🚚 3 أيام · 📦 X منتج
                  Row(
                    textDirection: TextDirection.rtl,
                    children: [
                      const Icon(Icons.local_shipping_outlined, color: kHoney, size: 11),
                      const SizedBox(width: 3),
                      const Text(
                        '٣ أيام',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: kTextBrown,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.inventory_2_outlined, color: kTextBrown, size: 11),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          prodCount > 0 ? '$prodCount منتج' : 'متجر جديد',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: kTextBrown,
                          ),
                          overflow: TextOverflow.ellipsis,
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

  // ── Promo Banner ────────────────────────────────────────────────────────────
  Widget _buildPromoBanner() {
    return Consumer<AppState>(builder: (_, st, __) {
      if (st.homePromotions.isNotEmpty) {
        final p = st.homePromotions.first as Map<String, dynamic>;
        final title    = (p['title'] as String?) ?? '';
        final subtitle = (p['subtitle'] as String?) ?? '';
        final imageUrl = _homeImageUrl(
          p['imageUrl'] as String?,
          width: 720,
          height: 280,
          crop: 'fill',
        );
        return Container(
          margin: const EdgeInsets.fromLTRB(14, 4, 14, 8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [kRoyal, Color(0xFF7B3B00)],
                begin: Alignment.centerRight, end: Alignment.centerLeft),
            borderRadius: BorderRadius.circular(20),
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
                  child: NetImage(
                    url: imageUrl,
                    fit: BoxFit.cover,
                    fallback: '',
                  ),
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

      // ── Dynamic dashboard-controlled promo card (Phase: home banner upgrade) ──
      final card = st.homePromoCard;
      // Hide entirely if disabled or not yet loaded
      if (card == null || card['enabled'] != true) {
        return const SizedBox.shrink();
      }
      final pcTitle = (card['title'] as String?)?.trim().isNotEmpty == true
          ? card['title'] as String
          : 'عروض اليوم';
      final pcDesc = (card['description'] as String?)?.trim().isNotEmpty == true
          ? card['description'] as String
          : 'خصومات خاصة على منتجات مختارة لفترة محدودة';
      final pcBtn = (card['buttonText'] as String?)?.trim().isNotEmpty == true
          ? card['buttonText'] as String
          : 'تسوق الآن';

      return Container(
        margin: const EdgeInsets.fromLTRB(14, 4, 14, 8),
        padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [kRoyal, Color(0xFF7B3B00)],
              begin: Alignment.centerRight, end: Alignment.centerLeft),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kRoyal.withOpacity(0.14),
              blurRadius: 14,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  HoneyChip(pcTitle, background: const Color(0x33FFFFFF), textColor: Colors.white),
                  const SizedBox(height: 6),
                  Text(
                    pcDesc,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: Colors.white,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => _handlePromoAction(context, card),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white60),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      minimumSize: const Size(0, 32),
                    ),
                    child: Text(
                      pcBtn,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            // Circular icon container — clean look without an emoji
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.14),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.28), width: 1),
              ),
              child: const Center(
                child: Icon(
                  Icons.local_offer_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
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
                  crossAxisSpacing: 10, mainAxisSpacing: 10,
                  childAspectRatio: 0.95,
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
                crossAxisSpacing: 10, mainAxisSpacing: 10,
                childAspectRatio: 0.95,
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
    // Banner first (landscape), fall back to logo (square) — keeps this card
    // visually consistent with the Featured card.
    final cardImageUrl = _homeImageUrl(
      (store['bannerUrl'] as String?)?.isNotEmpty == true
          ? store['bannerUrl'] as String?
          : store['logoUrl'] as String?,
      width: 360,
      height: 260,
      crop: 'fill',
    );
    final prodCount = (store['_count']?['products'] as int?) ?? 0;

    Widget logoArea() {
      const radius = BorderRadius.vertical(top: Radius.circular(20));
      if (cardImageUrl != null && cardImageUrl.isNotEmpty) {
        return NetImage(
          url: cardImageUrl,
          height: 130,
          fit: BoxFit.cover,
          borderRadius: radius,
          fallback: '',
        );
      }
      return _gradientLogoBox(name, 130, 72, radius);
    }

    return TapScaleWidget(
      onTap: () => context.read<AppState>().openStoreWithData(store.cast<String, dynamic>()),
      child: Container(
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kBorder.withOpacity(0.4)),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: kHoney.withOpacity(0.07),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                logoArea(),
                Positioned(
                  top: 8,
                  right: 8,
                  child: _verifiedBadge('موثق'),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: kTextDark,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    prodCount > 0 ? '$prodCount منتج' : 'متجر جديد',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: kTextMuted,
                    ),
                    textAlign: TextAlign.center,
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

  /// Unified verified badge used by both Featured and All Stores cards.
  Widget _verifiedBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.92),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.verified_rounded, color: kSuccess, size: 12),
          const SizedBox(width: 3),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: kTextDark,
            ),
          ),
        ],
      ),
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

  // ── Promo card CTA action handler ───────────────────────────────────────────
  void _handlePromoAction(BuildContext context, Map<String, dynamic> card) {
    final actionType = (card['actionType'] as String?) ?? 'none';
    final actionTarget = (card['actionTarget'] as String?) ?? '';
    final st = context.read<AppState>();

    switch (actionType) {
      case 'product':
        if (actionTarget.isEmpty) return;
        st.openProductById(actionTarget);
        break;
      case 'store':
        if (actionTarget.isEmpty) return;
        st.openStoreWithData({'id': actionTarget});
        break;
      case 'category':
        if (actionTarget.isEmpty) return;
        _openCategoryFilter(context, actionTarget);
        break;
      case 'cart':
        st.showScreen(AppScreen.cart, bottomIndex: 2);
        break;
      case 'external_url':
        if (actionTarget.isEmpty) return;
        final uri = Uri.tryParse(actionTarget);
        if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
          launchUrl(uri, mode: LaunchMode.externalApplication);
        }
        break;
      case 'referral':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ReferralScreen()),
        );
        break;
      default:
        break;
    }
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
                                  ? NetImage(
                                      url: imgUrl,
                                      width: 44,
                                      height: 44,
                                      fit: BoxFit.cover,
                                      borderRadius: BorderRadius.circular(10),
                                    )
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
                                  .openStoreWithData(s.cast<String, dynamic>());
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
