import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/api_service.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';

/// Referral screen — shows user's referral code, stats, and share options.
class ReferralScreen extends StatefulWidget {
  const ReferralScreen({super.key});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen> {
  bool _loading = true;
  String? _code;
  bool _enabled = false;
  int _referrerReward = 50;
  int _refereeReward = 25;
  int _totalReferred = 0;
  int _pending = 0;
  int _completed = 0;
  double _totalEarned = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final st = context.read<AppState>();
      final api = ApiService(token: st.token);
      final results = await Future.wait([
        api.get('/customer/referral/my-code', auth: true),
        api.get('/customer/referral/stats', auth: true),
      ]);

      final codeRes = results[0];
      final statsRes = results[1];

      if (codeRes != null && codeRes['enabled'] == true) {
        _enabled = true;
        _code = codeRes['code'] as String?;
        _referrerReward = (codeRes['referrerReward'] ?? 50) as int;
        _refereeReward = (codeRes['refereeReward'] ?? 25) as int;
      }

      if (statsRes != null && statsRes['enabled'] == true) {
        _totalReferred = (statsRes['totalReferred'] ?? 0) as int;
        _pending = (statsRes['pending'] ?? 0) as int;
        _completed = (statsRes['completed'] ?? 0) as int;
        _totalEarned = (statsRes['totalEarned'] ?? 0).toDouble();
      }
    } catch (e) {
      _error = 'فشل تحميل بيانات الإحالة';
    }
    if (mounted) setState(() => _loading = false);
  }

  void _copyCode() {
    if (_code == null) return;
    Clipboard.setData(ClipboardData(text: _code!));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('تم نسخ الكود', style: TextStyle(fontFamily: 'Cairo')),
        backgroundColor: kRoyal,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _shareCode() {
    if (_code == null) return;
    final msg = 'استخدم كود $_code عند التسجيل في سوق العسل واحصل على $_refereeReward جنيه في محفظتك! \u{1F36F}';
    SharePlus.instance.share(ShareParams(text: msg));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: kBackground,
        appBar: AppBar(
          title: const Text('ادع أصدقاءك', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
          backgroundColor: kRoyal,
          foregroundColor: kTextOnDark,
          centerTitle: true,
        ),
        body: const Center(child: CircularProgressIndicator(color: kHoney)),
      );
    }

    if (!_enabled) {
      return Scaffold(
        backgroundColor: kBackground,
        appBar: AppBar(
          title: const Text('ادع أصدقاءك', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
          backgroundColor: kRoyal,
          foregroundColor: kTextOnDark,
          centerTitle: true,
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.card_giftcard_rounded, size: 64, color: kTextMuted),
                SizedBox(height: 16),
                Text(
                  'برنامج الإحالة غير متاح حالياً',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w600, color: kTextMuted),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        title: const Text('ادع أصدقاءك واربح', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 17)),
        backgroundColor: kRoyal,
        foregroundColor: kTextOnDark,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: kHoney,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Hero card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF5C3317), Color(0xFFD4A437)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: kRoyal.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: Column(
                children: [
                  const Icon(Icons.card_giftcard_rounded, size: 48, color: Colors.white),
                  const SizedBox(height: 12),
                  Text(
                    'ادع أصدقاءك واحصل على $_referrerReward جنيه',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'صديقك يحصل على $_refereeReward جنيه أيضاً!',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white.withValues(alpha: 0.85)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _code ?? '...',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 6,
                          ),
                        ),
                        const SizedBox(width: 12),
                        GestureDetector(
                          onTap: _copyCode,
                          child: const Icon(Icons.copy_rounded, color: Colors.white70, size: 22),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _copyCode,
                          icon: const Icon(Icons.copy_rounded, size: 18),
                          label: const Text('نسخ الكود', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: kRoyal,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _shareCode,
                          icon: const Icon(Icons.share_rounded, size: 18),
                          label: const Text('مشاركة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kHoney,
                            foregroundColor: kRoyal,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Stats
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: kSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('إحصائياتك', style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.bold, color: kRoyal)),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _StatTile(icon: Icons.people_rounded, label: 'المدعوين', value: '$_totalReferred'),
                      _StatTile(icon: Icons.hourglass_top_rounded, label: 'قيد الانتظار', value: '$_pending'),
                      _StatTile(icon: Icons.check_circle_rounded, label: 'مكتمل', value: '$_completed'),
                      _StatTile(icon: Icons.account_balance_wallet_rounded, label: 'أرباحك', value: '${_totalEarned.toStringAsFixed(0)} ج.م'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // How it works
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: kSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('كيف يعمل؟', style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.bold, color: kRoyal)),
                  const SizedBox(height: 12),
                  const _StepRow(num: '1', text: 'شارك كود الإحالة مع أصدقائك'),
                  const _StepRow(num: '2', text: 'صديقك يسجل باستخدام الكود'),
                  const _StepRow(num: '3', text: 'عند اكتمال أول طلب يتم تسليمه'),
                  const _StepRow(num: '4', text: 'كلاكما يحصل على مكافأة في المحفظة!'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _StatTile({super.key, required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 22, color: kHoney),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.bold, color: kRoyal)),
          Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: kTextMuted)),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  final String num;
  final String text;
  const _StepRow({super.key, required this.num, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 24, height: 24,
            decoration: BoxDecoration(
              color: kHoney.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(child: Text(num, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.bold, color: kHoney))),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: kTextDark))),
        ],
      ),
    );
  }
}
