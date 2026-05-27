import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/api_service.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class WalletRechargeSheet extends StatefulWidget {
  final String? token;
  final VoidCallback? onSubmitted;

  const WalletRechargeSheet({
    super.key,
    required this.token,
    this.onSubmitted,
  });

  @override
  State<WalletRechargeSheet> createState() => _WalletRechargeSheetState();
}

class _WalletRechargeSheetState extends State<WalletRechargeSheet> {
  final _amountCtrl = TextEditingController();
  final _picker = ImagePicker();
  final _scrollCtrl = ScrollController();
  final _amountFocus = FocusNode();
  String _paymentMethod = 'VODAFONE_CASH';
  XFile? _pickedImage;
  bool _submitting = false;
  bool _uploadingImage = false;
  bool _uploadSuccess = false;
  String? _error;
  double? _uploadProgress;

  static const _methods = [
    {
      'value': 'VODAFONE_CASH',
      'label': 'Vodafone Cash',
      'subtitle': 'تحويل سريع عبر رقم الهاتف',
      'icon': Icons.phone_android_rounded,
      'color': Color(0xFFE60000),
    },
    {
      'value': 'INSTAPAY',
      'label': 'InstaPay',
      'subtitle': 'تحويل فوري عبر InstaPay',
      'icon': Icons.flash_on_rounded,
      'color': Color(0xFF6A1B9A),
    },
    {
      'value': 'BANK_TRANSFER',
      'label': 'Bank Transfer',
      'subtitle': 'تحويل بنكي مع رفع الإيصال',
      'icon': Icons.account_balance_rounded,
      'color': Color(0xFF0D47A1),
    },
  ];

  @override
  void dispose() {
    _amountCtrl.dispose();
    _scrollCtrl.dispose();
    _amountFocus.dispose();
    super.dispose();
  }

  Future<void> _pickScreenshot() async {
    setState(() {
      _uploadingImage = true;
      _uploadSuccess = false;
      _uploadProgress = 0.15;
      _error = null;
    });
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 72,
      maxWidth: 1440,
    );
    if (!mounted) return;
    if (file == null) {
      setState(() {
        _uploadingImage = false;
        _uploadProgress = null;
      });
      return;
    }
    setState(() {
      _uploadProgress = 0.82;
    });
    await Future<void>.delayed(const Duration(milliseconds: 260));
    setState(() {
      _pickedImage = file;
      _uploadingImage = false;
      _uploadProgress = 1;
      _uploadSuccess = true;
      _error = null;
    });
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    if (!mounted) return;
    setState(() {
      _uploadProgress = null;
      _uploadSuccess = false;
    });
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'يرجى إدخال مبلغ صحيح');
      return;
    }
    if (_pickedImage == null) {
      setState(() => _error = 'يرجى رفع صورة إثبات التحويل');
      return;
    }
    if (_uploadingImage) {
      setState(() => _error = 'يرجى الانتظار حتى يكتمل تجهيز صورة الإثبات');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _uploadProgress = 0.2;
    });

    final api = ApiService(token: widget.token);
    final exists = await File(_pickedImage!.path).exists();
    if (!exists) {
      setState(() {
        _submitting = false;
        _uploadProgress = null;
        _error = 'تعذر الوصول إلى صورة الإثبات قبل الرفع';
      });
      return;
    }
    final upload = await api.postMultipart(
      '/uploads/wallet-recharge-screenshot',
      auth: true,
      fields: const {},
      filePath: _pickedImage!.path,
    );

    final screenshotUrl = upload is Map ? upload['imageUrl']?.toString() : null;
    if (screenshotUrl == null || screenshotUrl.isEmpty) {
      final backendMessage =
          upload is Map ? upload['message']?.toString() : null;
      setState(() {
        _submitting = false;
        _uploadProgress = null;
        _error = backendMessage?.isNotEmpty == true
            ? backendMessage!
            : 'فشل رفع صورة الإثبات';
      });
      return;
    }
    setState(() {
      _uploadProgress = 0.75;
    });

    final created = await api.post(
      '/customer/wallet-recharge-requests',
      {
        'amount': amount,
        'paymentMethod': _paymentMethod,
        'screenshotUrl': screenshotUrl,
      },
      auth: true,
    );

    if (!mounted) return;
    if (created is! Map || created['id'] == null) {
      setState(() {
        _submitting = false;
        _uploadProgress = null;
        _error = 'تعذر إرسال طلب الشحن';
      });
      return;
    }

    setState(() {
      _uploadProgress = 1;
      _uploadSuccess = true;
    });
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    widget.onSubmitted?.call();
    Navigator.pop(context, true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          'تم إرسال طلب شحن المحفظة وهو الآن قيد المراجعة',
          textDirection: TextDirection.rtl,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
          ),
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: kSuccess,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      ),
    );
  }

  String _methodSubtitle() {
    final method = _methods.firstWhere(
      (item) => item['value'] == _paymentMethod,
      orElse: () => _methods.first,
    );
    return method['subtitle']! as String;
  }

  Future<void> _retryUploadSelection() => _pickScreenshot();

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: SafeArea(
        child: AnimatedPadding(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          padding: EdgeInsets.only(
            left: 14,
            right: 14,
            top: 12,
            bottom: bottomInset + 12,
          ),
          child: SingleChildScrollView(
            controller: _scrollCtrl,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 52,
                    height: 5.5,
                    decoration: BoxDecoration(
                      color: kBorder,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFFF4DF), Color(0xFFFFE8B5)],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: kBorder.withOpacity(0.75)),
                    boxShadow: [
                      ...kLiftedShadow,
                      BoxShadow(
                        color: kHoney.withOpacity(0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    textDirection: TextDirection.rtl,
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [kHoneyLight, kDarkHoney],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: kButtonShadow,
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'شحن المحفظة',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w800,
                                fontSize: 21,
                                color: kTextDark,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'أرسل طلب شحن يدوي وسيقوم فريق الإدارة بمراجعته قبل إضافته للمحفظة',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 13,
                                height: 1.35,
                                color: kTextBrown,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  decoration: BoxDecoration(
                    color: kSurface,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: kBorder.withOpacity(0.55)),
                    boxShadow: [
                      ...kCardShadow,
                      BoxShadow(
                        color: Colors.black.withOpacity(0.025),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'المبلغ المطلوب شحنه',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: kTextDark,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'أدخل قيمة التحويل كما تظهر في إيصال الدفع',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: kTextMuted,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _amountCtrl,
                        focusNode: _amountFocus,
                        keyboardType:
                            const TextInputType.numberWithOptions(decimal: true),
                        onTap: () {
                          Future<void>.delayed(const Duration(milliseconds: 250), () {
                            if (!_scrollCtrl.hasClients) return;
                            _scrollCtrl.animateTo(
                              _scrollCtrl.position.maxScrollExtent * 0.18,
                              duration: const Duration(milliseconds: 220),
                              curve: Curves.easeOut,
                            );
                          });
                        },
                        decoration: InputDecoration(
                          labelText: 'المبلغ',
                          hintText: 'مثال: 150',
                          prefixIcon: Container(
                            margin: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: kHoney.withOpacity(0.11),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.payments_rounded, color: kHoney),
                          ),
                          suffixText: 'جنيه',
                          filled: true,
                          fillColor: kBackground,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 18,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: const BorderSide(color: kBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: BorderSide(color: kBorder.withOpacity(0.8)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: const BorderSide(color: kHoney, width: 1.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  decoration: BoxDecoration(
                    color: kSurface,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: kBorder.withOpacity(0.55)),
                    boxShadow: [
                      ...kCardShadow,
                      BoxShadow(
                        color: Colors.black.withOpacity(0.025),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'طريقة التحويل',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: kTextDark,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _methodSubtitle(),
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: kTextMuted,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._methods.map((method) {
                        final isActive = _paymentMethod == method['value'];
                        final color = method['color']! as Color;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: _submitting
                                ? null
                                : () => setState(() => _paymentMethod = method['value']! as String),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 220),
                              curve: Curves.easeOut,
                              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                              decoration: BoxDecoration(
                                color: isActive ? color.withOpacity(0.08) : kBackground,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: isActive ? color : kBorder.withOpacity(0.7),
                                  width: isActive ? 1.5 : 1,
                                ),
                                boxShadow: isActive
                                    ? [
                                        BoxShadow(
                                          color: color.withOpacity(0.14),
                                          blurRadius: 16,
                                          offset: const Offset(0, 8),
                                        ),
                                      ]
                                    : const [],
                              ),
                              child: Row(
                                textDirection: TextDirection.rtl,
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: isActive
                                          ? color.withOpacity(0.14)
                                          : Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      method['icon']! as IconData,
                                      color: color,
                                      size: 24,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          method['label']! as String,
                                          style: TextStyle(
                                            fontFamily: 'Cairo',
                                            fontWeight: isActive
                                                ? FontWeight.w800
                                                : FontWeight.w700,
                                            fontSize: 14,
                                            color: kTextDark,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          method['subtitle']! as String,
                                          style: const TextStyle(
                                            fontFamily: 'Cairo',
                                            fontSize: 11,
                                            color: kTextMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 220),
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isActive ? color : Colors.transparent,
                                      border: Border.all(
                                        color: isActive ? color : kBorder,
                                        width: 1.5,
                                      ),
                                    ),
                                    child: isActive
                                        ? const Icon(
                                            Icons.check_rounded,
                                            color: Colors.white,
                                            size: 15,
                                          )
                                        : null,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  decoration: BoxDecoration(
                    color: kSurface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: kBorder.withOpacity(0.55)),
                    boxShadow: [
                      ...kCardShadow,
                      BoxShadow(
                        color: Colors.black.withOpacity(0.025),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'صورة إثبات التحويل',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: kTextDark,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'ارفع صورة واضحة لإيصال التحويل أو لقطة الشاشة',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: kTextMuted,
                        ),
                      ),
                      const SizedBox(height: 12),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeOut,
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFFAF1), Color(0xFFFFF3DF)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: _error != null && _pickedImage == null
                                ? kError.withOpacity(0.45)
                                : kBorder.withOpacity(0.75),
                          ),
                        ),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 260),
                          child: _uploadingImage
                              ? Column(
                                  key: const ValueKey('uploading-state'),
                                  children: [
                                    const ShimmerBox(
                                      width: double.infinity,
                                      height: 190,
                                      borderRadius: BorderRadius.all(
                                        Radius.circular(18),
                                      ),
                                    ),
                                    const SizedBox(height: 14),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(999),
                                      child: LinearProgressIndicator(
                                        minHeight: 8,
                                        value: _uploadProgress,
                                        color: kHoney,
                                        backgroundColor: kBorder.withOpacity(0.35),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    const Text(
                                      'جاري تجهيز الصورة ورفعها بأفضل جودة...',
                                      style: TextStyle(
                                        fontFamily: 'Cairo',
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: kTextBrown,
                                      ),
                                    ),
                                  ],
                                )
                              : _pickedImage != null
                                  ? Column(
                                      key: const ValueKey('preview-state'),
                                      children: [
                                        Stack(
                                          children: [
                                            ClipRRect(
                                              borderRadius: BorderRadius.circular(18),
                                              child: Image.file(
                                                File(_pickedImage!.path),
                                                height: 206,
                                                width: double.infinity,
                                                fit: BoxFit.cover,
                                              ),
                                            ),
                                            Positioned(
                                              top: 10,
                                              left: 10,
                                              child: AnimatedScale(
                                                duration: const Duration(milliseconds: 240),
                                                scale: _uploadSuccess ? 1 : 0.88,
                                                child: AnimatedOpacity(
                                                  duration: const Duration(milliseconds: 240),
                                                  opacity: _uploadSuccess ? 1 : 0.92,
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(
                                                      horizontal: 10,
                                                      vertical: 7,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.white.withOpacity(0.94),
                                                      borderRadius: BorderRadius.circular(18),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(
                                                          _uploadSuccess
                                                              ? Icons.check_circle_rounded
                                                              : Icons.image_outlined,
                                                          color: _uploadSuccess
                                                              ? kSuccess
                                                              : kHoney,
                                                          size: 16,
                                                        ),
                                                        const SizedBox(width: 5),
                                                        Text(
                                                          _uploadSuccess
                                                              ? 'تم تجهيز الصورة'
                                                              : 'جاهزة للرفع',
                                                          style: TextStyle(
                                                            fontFamily: 'Cairo',
                                                            fontWeight: FontWeight.w800,
                                                            fontSize: 11,
                                                            color: _uploadSuccess
                                                                ? kSuccess
                                                                : kTextDark,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if (_uploadProgress != null) ...[
                                          const SizedBox(height: 12),
                                          ClipRRect(
                                            borderRadius: BorderRadius.circular(999),
                                            child: LinearProgressIndicator(
                                              minHeight: 8,
                                              value: _uploadProgress,
                                              color: kHoney,
                                              backgroundColor: kBorder.withOpacity(0.35),
                                            ),
                                          ),
                                        ],
                                      ],
                                    )
                                  : Container(
                                      key: const ValueKey('empty-state'),
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 36,
                                        horizontal: 16,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(18),
                                        border: Border.all(
                                          color: kBorder.withOpacity(0.9),
                                          style: BorderStyle.solid,
                                        ),
                                      ),
                                      child: const Column(
                                        children: [
                                          Icon(
                                            Icons.cloud_upload_rounded,
                                            size: 40,
                                            color: kHoney,
                                          ),
                                          SizedBox(height: 12),
                                          Text(
                                            'اسحب أو اختر صورة إثبات التحويل',
                                            style: TextStyle(
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w800,
                                              fontSize: 14,
                                              color: kTextDark,
                                            ),
                                          ),
                                          SizedBox(height: 6),
                                          Text(
                                            'سيتم ضغط الصورة تلقائيًا قبل الرفع لتحسين السرعة',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontFamily: 'Cairo',
                                              fontSize: 12,
                                              color: kTextMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: (_submitting || _uploadingImage)
                                  ? null
                                  : _pickScreenshot,
                              icon: const Icon(Icons.upload_rounded),
                              label: Text(
                                _pickedImage == null ? 'اختيار صورة' : 'تغيير الصورة',
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: kHoney,
                                side: const BorderSide(color: kHoney),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                          if (_error != null && _pickedImage == null) ...[
                            const SizedBox(width: 10),
                            TextButton.icon(
                              onPressed: (_submitting || _uploadingImage)
                                  ? null
                                  : _retryUploadSelection,
                              icon: const Icon(Icons.refresh_rounded, size: 18),
                              label: const Text(
                                'إعادة المحاولة',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              style: TextButton.styleFrom(
                                foregroundColor: kError,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF2F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: kError.withOpacity(0.18)),
                    ),
                    child: Row(
                      textDirection: TextDirection.rtl,
                      children: [
                        const Icon(Icons.error_outline_rounded, color: kError, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              color: kError,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: _submitting ? [] : kButtonShadow,
                  ),
                  child: HoneyButton(
                    label: _submitting ? 'جاري إرسال طلب الشحن...' : 'إرسال طلب الشحن',
                    loading: _submitting,
                    icon: _submitting ? null : Icons.arrow_forward_rounded,
                    onPressed: (_submitting || _uploadingImage) ? null : _submit,
                    fontSize: 15,
                    padding: const EdgeInsets.symmetric(vertical: 17),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}