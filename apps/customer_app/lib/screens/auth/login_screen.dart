import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';
import '../profile/profile_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _otpCtrl   = TextEditingController();
  String _dialCode  = '+20';
  String _flag      = '🇪🇬';
  bool   _otpSent   = false;
  bool   _loading   = false;
  String _error     = '';

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();

    if (st.isLoggedIn) return const ProfileScreen();

    return Scaffold(
      backgroundColor: kBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              // Logo
              Container(
                width: 90, height: 90,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [kAmber, kDarkHoney],
                    begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: kLiftedShadow,
                ),
                child: const Center(child: Text('🍯', style: TextStyle(fontSize: 46))),
              ),
              const SizedBox(height: 20),
              const Text('سوق العسل', style: TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                fontSize: 26, color: kTextDark)),
              const Text('تسجيل الدخول', style: TextStyle(
                fontFamily: 'Cairo', fontSize: 14, color: kTextMuted)),
              const SizedBox(height: 40),

              // Error banner
              if (_error.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: kError.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: kError.withOpacity(0.3))),
                  child: Row(
                    textDirection: TextDirection.rtl,
                    children: [
                      const Icon(Icons.error_outline_rounded, color: kError, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error, style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 13, color: kError))),
                    ],
                  ),
                ),

              if (!_otpSent) ...[
                // Phone input
                Container(
                  decoration: BoxDecoration(
                    color: kSurface, borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: kBorder),
                  ),
                  child: Row(
                    textDirection: TextDirection.rtl,
                    children: [
                      // Country picker
                      GestureDetector(
                        onTap: () => _showCountryPicker(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                          decoration: const BoxDecoration(
                            border: Border(left: BorderSide(color: kBorder))),
                          child: Row(children: [
                            Text(_flag, style: const TextStyle(fontSize: 20)),
                            const SizedBox(width: 6),
                            Text(_dialCode, style: const TextStyle(
                              fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                              fontSize: 14, color: kTextDark)),
                            const Icon(Icons.keyboard_arrow_down_rounded,
                                size: 18, color: kTextMuted),
                          ]),
                        ),
                      ),
                      // Phone field
                      Expanded(
                        child: TextField(
                          controller:    _phoneCtrl,
                          textDirection: TextDirection.ltr,
                          keyboardType:  TextInputType.phone,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          style: const TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w600, fontSize: 16),
                          decoration: const InputDecoration(
                            hintText: '01XXXXXXXXX',
                            hintStyle: TextStyle(color: kTextMuted),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(horizontal: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                HoneyButton(
                  label:   _loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق',
                  loading: _loading,
                  onPressed: _sendOtp,
                ),
              ] else ...[
                // OTP input
                Text('أدخل رمز التحقق المرسل إلى\n$_dialCode ${_phoneCtrl.text}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, color: kTextBrown)),
                const SizedBox(height: 20),
                TextField(
                  controller:    _otpCtrl,
                  textDirection: TextDirection.ltr,
                  textAlign:     TextAlign.center,
                  keyboardType:  TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                  style: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800, fontSize: 28, letterSpacing: 12),
                  decoration: InputDecoration(
                    hintText: '------',
                    hintStyle: const TextStyle(color: kBorder, letterSpacing: 12),
                    filled: true, fillColor: kSurface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: kBorder)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: kBorder)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: kHoney, width: 2)),
                  ),
                ),
                const SizedBox(height: 16),
                HoneyButton(
                  label:   _loading ? 'جاري التحقق...' : 'تحقق وسجّل الدخول',
                  loading: _loading,
                  onPressed: _verifyOtp,
                ),
                const SizedBox(height: 12),
                TextButton.icon(
                  icon:  const Icon(Icons.arrow_back_rounded, size: 16),
                  label: const Text('تغيير رقم الهاتف', style: TextStyle(fontFamily: 'Cairo')),
                  onPressed: () => setState(() { _otpSent = false; _error = ''; }),
                ),
              ],

              const SizedBox(height: 32),
              const Text('للطلب المباشر عبر واتساب', style: TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 13, color: kTextMuted)),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                icon:  const Icon(Icons.chat_rounded, size: 18),
                label: const Text('للطلب المباشر عبر واتساب', style: TextStyle(
                  fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 14)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF25D366),
                  side: const BorderSide(color: Color(0xFF25D366), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                ),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  void _showCountryPicker(BuildContext context) {
    const codes = [
      ('مصر', '+20', '🇪🇬'),
      ('السعودية', '+966', '🇸🇦'),
      ('الإمارات', '+971', '🇦🇪'),
      ('الكويت', '+965', '🇰🇼'),
      ('قطر', '+974', '🇶🇦'),
    ];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4,
                decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            ...codes.map((c) => ListTile(
              leading: Text(c.$3, style: const TextStyle(fontSize: 24)),
              title: Text(c.$1, style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600)),
              trailing: Text(c.$2, style: const TextStyle(fontFamily: 'Cairo', color: kTextMuted)),
              onTap: () {
                setState(() { _dialCode = c.$2; _flag = c.$3; });
                Navigator.of(context).pop();
              },
            )),
          ],
        ),
      ),
    );
  }

  Future<void> _sendOtp() async {
    if (_phoneCtrl.text.isEmpty) {
      setState(() => _error = 'أدخل رقم الهاتف');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    final phone = '$_dialCode${_phoneCtrl.text.trim()}';
    final ok    = await context.read<AppState>().sendOtp(phone);
    setState(() { _loading = false; _otpSent = ok; });
    if (!ok) setState(() => _error = 'فشل إرسال رمز التحقق، حاول مرة أخرى');
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.length < 4) {
      setState(() => _error = 'أدخل رمز التحقق كاملاً');
      return;
    }
    setState(() { _loading = true; _error = ''; });
    final phone = '$_dialCode${_phoneCtrl.text.trim()}';
    final ok    = await context.read<AppState>().verifyOtp(phone, _otpCtrl.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (!ok) setState(() => _error = 'رمز التحقق غير صحيح');
  }
}
