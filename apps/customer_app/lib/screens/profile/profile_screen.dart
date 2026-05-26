import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';
import 'account_header.dart';
import 'account_section.dart';
import 'account_tile.dart';
import 'wallet_history_screen.dart';
import 'wallet_recharge_sheet.dart';

/// Full-featured account / profile screen for سوق العسل.
///
/// Shown when the user is logged in (the login tab switches to this view).
/// Includes: curved header, wallet/points cards, sectioned tiles, social
/// links, seller CTA, and logout with confirmation dialog.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  // ── Animation controller for staggered entry ─────────────────────────────
  late final AnimationController _entryCtrl;
  String _supportWhatsappNumber = '';
  String _supportWhatsappMessage =
      'السلام عليكم، محتاج مساعدة في تطبيق سوق العسل';
  List<dynamic> _walletRechargeRequests = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _loadSupportWhatsapp();
    _loadWalletRechargeRequests();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AppState>().refreshProfile(silent: true);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _entryCtrl.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      context.read<AppState>().refreshProfile(silent: true);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Future<void> _refresh() async {
    await Future.wait([
      context.read<AppState>().refreshProfile(),
      context.read<AppState>().loadOrders(),
      _loadSupportWhatsapp(),
      _loadWalletRechargeRequests(),
    ]);
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
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

  Future<void> _loadWalletRechargeRequests() async {
    try {
      final api = ApiService(token: context.read<AppState>().token);
      final res = await api.get('/customer/wallet-recharge-requests', auth: true);
      if (!mounted) return;
      setState(() {
        _walletRechargeRequests = res is List ? res : [];
      });
    } catch (_) {}
  }

  Future<void> _openSupportWhatsapp() async {
    final number = _supportWhatsappNumber.trim();
    if (number.isEmpty) return;
    final normalized = number.startsWith('+') ? number.substring(1) : number;
    final message = Uri.encodeComponent(_supportWhatsappMessage.trim());
    await _launch('https://wa.me/$normalized?text=$message');
  }

  Future<void> _openWalletRechargeSheet() async {
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => WalletRechargeSheet(
        token: context.read<AppState>().token,
        onSubmitted: _loadWalletRechargeRequests,
      ),
    );
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          msg,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w600,
          ),
          textDirection: TextDirection.rtl,
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: kHoney,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 28),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _confirmLogout() {
    showDialog<void>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding:
              const EdgeInsets.fromLTRB(24, 20, 24, 12),
          title: const Row(
            children: [
              Icon(Icons.logout_rounded, color: kError, size: 22),
              SizedBox(width: 10),
              Text(
                'تسجيل الخروج',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                  fontSize: 17,
                  color: kTextDark,
                ),
              ),
            ],
          ),
          content: const Text(
            'هل تريد تسجيل الخروج من حسابك؟',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 14, color: kTextBrown),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'إلغاء',
                style: TextStyle(fontFamily: 'Cairo', color: kTextMuted),
              ),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.read<AppState>().logout();
              },
              style: FilledButton.styleFrom(
                backgroundColor: kError,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              child: const Text(
                'تسجيل الخروج',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAbout() {
    showDialog<void>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  'assets/branding/souq_alasal_logo.png',
                  width: 64, height: 64, fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'سوق العسل',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  color: kTextDark,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'الإصدار 1.0.6',
                style: TextStyle(
                    fontFamily: 'Cairo', fontSize: 12, color: kTextMuted),
              ),
              const SizedBox(height: 14),
              const Text(
                'سوق العسل هو المنصة الرقمية الأولى للعسل الطبيعي في مصر، يجمع أفضل مناحل العسل الطبيعي والمنتجات العضوية في مكان واحد.',
                style: TextStyle(
                    fontFamily: 'Cairo', fontSize: 13, color: kTextBrown),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'حسناً',
                style: TextStyle(fontFamily: 'Cairo', color: kHoney),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    final rawName = (st.user?['name'] as String?)?.trim() ?? '';
    final phone = (st.user?['phone'] as String?) ?? '';
    final name = rawName.isNotEmpty && rawName != phone
        ? rawName
        : 'أهلاً بك 👋';
    final walletBalance = _walletBalanceText(st.user?['walletBalance']);
    final latestRecharge =
        _walletRechargeRequests.isNotEmpty ? _walletRechargeRequests.first : null;

    return Scaffold(
      backgroundColor: kBackground,
      body: RefreshIndicator(
        color: kHoney,
        backgroundColor: kSurface,
        displacement: 60,
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Curved header ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                child: AccountHeader(
                  name: name,
                  phone: phone,
                  onSearchTap: () => context
                      .read<AppState>()
                      .showScreen(AppScreen.home, bottomIndex: 0),
                  onEditTap: () => _toast('تعديل الملف الشخصي — قريباً!'),
                ),
              ),
            ),

            // ── Wallet + points row ────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 80),
                child: _buildWalletRow(walletBalance),
              ),
            ),

            if (latestRecharge != null)
              SliverToBoxAdapter(
                child: FadeInWidget(
                  delay: const Duration(milliseconds: 95),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: kSurface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: kBorder),
                        boxShadow: kCardShadow,
                      ),
                      child: Row(
                        textDirection: TextDirection.rtl,
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: kHoney.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.timelapse_rounded,
                              color: kHoney,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'آخر طلب شحن',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: kTextDark,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _walletRechargeStatusLabel(
                                    latestRecharge['status']?.toString(),
                                  ),
                                  style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 12,
                                    color: kTextMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _badge(
                            _walletRechargeStatusShort(
                              latestRecharge['status']?.toString(),
                            ),
                            _walletRechargeStatusColor(
                              latestRecharge['status']?.toString(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 110),
                child: AccountSection(
                  title: 'المحفظة',
                  tiles: [
                    AccountTile(
                      icon: Icons.add_card_rounded,
                      title: 'شحن المحفظة',
                      subtitle: 'أرسل طلب شحن يدوي وارفع صورة إثبات التحويل',
                      iconColor: kHoney,
                      trailing: const Text(
                        'إرسال طلب',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: kHoney,
                        ),
                      ),
                      onTap: _openWalletRechargeSheet,
                    ),
                    AccountTile(
                      icon: Icons.receipt_long_rounded,
                      title: 'سجل المحفظة',
                      subtitle: 'عرض جميع عمليات الشحن والإضافة والخصم',
                      iconColor: kRoyal,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const WalletHistoryScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Account section ────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 130),
                child: AccountSection(
                  title: 'حسابي',
                  tiles: [
                    AccountTile(
                      icon: Icons.receipt_long_rounded,
                      title: 'طلباتي',
                      subtitle: 'متابعة وعرض جميع الطلبات',
                      onTap: () => context
                          .read<AppState>()
                          .showScreen(AppScreen.orders, bottomIndex: 1),
                    ),
                    AccountTile(
                      icon: Icons.person_rounded,
                      title: 'ملفي الشخصي',
                      subtitle: 'تعديل البيانات الشخصية',
                      onTap: () => _toast('تعديل الملف الشخصي — قريباً!'),
                    ),
                    AccountTile(
                      icon: Icons.location_on_rounded,
                      title: 'عناويني',
                      subtitle: 'إدارة عناوين التوصيل',
                      onTap: () => _toast('إدارة العناوين — قريباً!'),
                    ),
                    AccountTile(
                      icon: Icons.favorite_rounded,
                      title: 'قائمة الأمنيات',
                      subtitle: 'المنتجات المحفوظة',
                      iconColor: const Color(0xFFE91E63),
                      onTap: () => _toast('قائمة الأمنيات — قريباً!'),
                    ),
                    AccountTile(
                      icon: Icons.notifications_rounded,
                      title: 'الإشعارات',
                      subtitle: 'إعدادات وتفضيلات الإشعارات',
                      trailing: _badge('مفعّل', kSuccess),
                      showChevron: false,
                      onTap: () => _toast('إعدادات الإشعارات — قريباً!'),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 165),
                child: AccountSection(
                  title: 'الدعم والمساعدة',
                  tiles: [
                    AccountTile(
                      icon: Icons.support_agent_rounded,
                      title: 'الدعم والمساعدة',
                      subtitle: _supportWhatsappNumber.isEmpty
                          ? 'سيتوفر التواصل عبر واتساب بعد تفعيل بيانات الدعم'
                          : 'تواصل معنا عبر واتساب',
                      iconColor: kSuccess,
                      trailing: _supportWhatsappNumber.isEmpty
                          ? _badge('غير متاح', kTextMuted)
                          : const Text(
                              'تواصل الآن',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: kHoney,
                              ),
                            ),
                      isDisabled: _supportWhatsappNumber.isEmpty,
                      onTap: _supportWhatsappNumber.isEmpty
                          ? null
                          : _openSupportWhatsapp,
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Referral banner ────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 170),
                child: _buildReferralBanner(),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Policies ───────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 200),
                child: AccountSection(
                  title: 'السياسات',
                  tiles: [
                    AccountTile(
                      icon: Icons.assignment_return_rounded,
                      title: 'سياسة الاسترجاع',
                      subtitle: 'تعرف على شروط الإرجاع والاسترداد',
                      iconColor: kTextBrown,
                      onTap: () => _toast('سياسة الاسترجاع — قريباً!'),
                    ),
                    AccountTile(
                      icon: Icons.description_rounded,
                      title: 'الشروط والأحكام',
                      subtitle: 'الأحكام المنظمة لاستخدام التطبيق',
                      iconColor: kTextBrown,
                      onTap: () => _toast('الشروط والأحكام — قريباً!'),
                    ),
                    AccountTile(
                      icon: Icons.info_rounded,
                      title: 'عن التطبيق',
                      subtitle: 'معلومات الإصدار والمنصة',
                      iconColor: kHoney,
                      onTap: _showAbout,
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Social section ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 230),
                child: AccountSection(
                  title: 'تابعنا على منصات التواصل',
                  tiles: [
                    AccountTile(
                      icon: Icons.chat_rounded,
                      title: 'واتساب',
                      subtitle: 'تواصل معنا مباشرة',
                      iconColor: const Color(0xFF25D366),
                      onTap: _supportWhatsappNumber.isEmpty
                          ? null
                          : _openSupportWhatsapp,
                    ),
                    AccountTile(
                      icon: Icons.facebook,
                      title: 'فيسبوك',
                      subtitle: 'صفحتنا الرسمية',
                      iconColor: const Color(0xFF1877F2),
                      onTap: () => _launch('https://facebook.com'),
                    ),
                    AccountTile(
                      icon: Icons.camera_alt_rounded,
                      title: 'إنستغرام',
                      subtitle: 'تابع أحدث منتجاتنا',
                      iconColor: const Color(0xFFE1306C),
                      onTap: () => _launch('https://instagram.com'),
                    ),
                    AccountTile(
                      icon: Icons.music_note_rounded,
                      title: 'تيك توك',
                      subtitle: 'شاهد مقاطعنا',
                      iconColor: const Color(0xFF333333),
                      onTap: () => _launch('https://tiktok.com'),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Seller CTA banner ──────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 260),
                child: _buildSellerBanner(),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // ── Logout button ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 290),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: HoneyButton(
                    label: 'تسجيل الخروج',
                    color: kError,
                    onPressed: _confirmLogout,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ),

            // ── App version footer ─────────────────────────────────────────
            SliverToBoxAdapter(
              child: FadeInWidget(
                delay: const Duration(milliseconds: 320),
                child: Padding(
                  padding: const EdgeInsets.only(top: 28, bottom: 44),
                  child: Column(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [kAmber, kDarkHoney],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: kCardShadow,
                        ),
                        child: const Center(
                          child: Text('🍯', style: TextStyle(fontSize: 26)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'سوق العسل',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: kTextBrown,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'الإصدار 1.0.6',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: kTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Sub-widgets ───────────────────────────────────────────────────────────

  Widget _buildWalletRow(String walletBalance) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      child: IntrinsicHeight(
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            Expanded(
              child: _statCard(
                icon: Icons.account_balance_wallet_rounded,
                label: 'محفظتي',
                value: walletBalance,
                unit: 'جنيه',
                color: kHoney,
                onTap: _openWalletRechargeSheet,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _statCard(
                icon: Icons.stars_rounded,
                label: 'نقاط الولاء',
                value: '0',
                unit: 'نقطة',
                color: const Color(0xFF7B1FA2),
                onTap: () => _toast('نقاط الولاء — قريباً!'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard({
    required IconData icon,
    required String label,
    required String value,
    required String unit,
    required Color color,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          decoration: BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              ...kCardShadow,
              BoxShadow(
                color: color.withOpacity(0.05),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
            border: Border.all(color: color.withOpacity(0.15)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                textDirection: TextDirection.rtl,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
                      color: color,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    unit,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: kTextMuted,
                    ),
                  ),
                ],
              ),
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: kTextMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _walletRechargeStatusLabel(String? status) {
    switch (status) {
      case 'APPROVED':
        return 'تمت مراجعة طلب الشحن والموافقة عليه';
      case 'REJECTED':
        return 'تم رفض طلب الشحن، يرجى مراجعة الإدارة';
      case 'PENDING':
      default:
        return 'طلب الشحن قيد المراجعة من الإدارة';
    }
  }

  String _walletRechargeStatusShort(String? status) {
    switch (status) {
      case 'APPROVED':
        return 'مقبول';
      case 'REJECTED':
        return 'مرفوض';
      case 'PENDING':
      default:
        return 'قيد المراجعة';
    }
  }

  Color _walletRechargeStatusColor(String? status) {
    switch (status) {
      case 'APPROVED':
        return kSuccess;
      case 'REJECTED':
        return kError;
      case 'PENDING':
      default:
        return kHoney;
    }
  }

  String _walletBalanceText(dynamic value) {
    if (value == null) return '0.00';
    if (value is num) return value.toStringAsFixed(2);
    final parsed = double.tryParse(value.toString());
    if (parsed == null) return '0.00';
    return parsed.toStringAsFixed(2);
  }

  Widget _buildReferralBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFF3D8), Color(0xFFFFE8A3)],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kBorder),
          boxShadow: kCardShadow,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _toast('برنامج الإحالة — قريباً!'),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                textDirection: TextDirection.rtl,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: kHoney.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                        child: Text('🎁', style: TextStyle(fontSize: 24))),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ادعُ أصدقاءك واربح!',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: kTextDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'احصل على مكافآت عند دعوة أصدقائك للتسوق',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: kTextMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_left_rounded,
                      color: kTextMuted, size: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSellerBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF4A2511), Color(0xFF8B4513)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: kLiftedShadow,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            splashColor: Colors.white.withOpacity(0.08),
            onTap: _supportWhatsappNumber.isEmpty
                ? null
                : _openSupportWhatsapp,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                textDirection: TextDirection.rtl,
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Text('🏪', style: TextStyle(fontSize: 28)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'كن بائعاً معنا',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'انضم لسوق العسل وابدأ رحلة البيع الآن',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.80),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'سجّل الآن',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
