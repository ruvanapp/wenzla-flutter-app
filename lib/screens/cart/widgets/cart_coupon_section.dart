import 'package:flutter/material.dart';
import '../../../theme/colors.dart';
import '../../../widgets/widgets.dart';

class CartCouponSection extends StatefulWidget {
  final ValueChanged<double>? onDiscountApplied;

  const CartCouponSection({super.key, this.onDiscountApplied});

  @override
  State<CartCouponSection> createState() => _CartCouponSectionState();
}

class _CartCouponSectionState extends State<CartCouponSection>
    with SingleTickerProviderStateMixin {
  final _controller = TextEditingController();
  bool _expanded  = false;
  bool _loading   = false;
  bool _applied   = false;
  String? _error;
  double _discount = 0;

  late final AnimationController _anim;
  late final Animation<double> _heightAnim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _heightAnim = CurvedAnimation(parent: _anim, curve: Curves.easeOutCubic);
  }

  @override
  void dispose() {
    _anim.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _expanded = !_expanded);
    _expanded ? _anim.forward() : _anim.reverse();
  }

  Future<void> _apply() async {
    final code = _controller.text.trim().toUpperCase();
    if (code.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    await Future.delayed(const Duration(milliseconds: 800)); // UI demo
    if (!mounted) return;
    if (code == 'HONEY10') {
      _discount = 10;
      _applied  = true;
      _error    = null;
      widget.onDiscountApplied?.call(_discount);
    } else {
      _discount = 0;
      _applied  = false;
      _error    = 'الكود غير صالح أو منتهي الصلاحية';
    }
    setState(() => _loading = false);
  }

  void _remove() {
    _controller.clear();
    _discount = 0;
    _applied  = false;
    _error    = null;
    widget.onDiscountApplied?.call(0);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
      child: HoneyCard(
      padding: const EdgeInsets.all(0),
      child: Column(
        children: [
          // Header row (always visible)
          TapScaleWidget(
            onTap: _applied ? null : _toggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: kSurfaceWarm,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.local_offer_outlined,
                        color: kHoney, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _applied
                        ? Row(children: [
                            const Icon(Icons.check_circle_rounded,
                                color: Colors.green, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              'خصم ${_discount.toStringAsFixed(0)} ج.م مطبّق',
                              style: const TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14),
                            ),
                          ])
                        : Text(
                            'هل لديك قسيمة خصم؟',
                            style: TextStyle(
                              color: kTextBrown,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                  ),
                  if (_applied)
                    TapScaleWidget(
                      onTap: _remove,
                      child: const Icon(Icons.close_rounded,
                          color: Color(0xFFE53935), size: 20),
                    )
                  else
                    AnimatedRotation(
                      turns: _expanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 250),
                      child: const Icon(Icons.keyboard_arrow_down_rounded,
                          color: kTextMuted),
                    ),
                ],
              ),
            ),
          ),
          // Expandable input area
          if (!_applied)
            SizeTransition(
              sizeFactor: _heightAnim,
              child: Column(
                children: [
                  const Divider(height: 1, color: kBorder),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            textDirection: TextDirection.ltr,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              letterSpacing: 2,
                              fontWeight: FontWeight.w700,
                              color: kTextDark,
                            ),
                            decoration: InputDecoration(
                              hintText: 'أدخل الكود',
                              hintStyle: const TextStyle(color: kTextMuted),
                              filled: true,
                              fillColor: kSurfaceWarm,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide:
                                    const BorderSide(color: kBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide:
                                    const BorderSide(color: kBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide:
                                    const BorderSide(color: kHoney, width: 2),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          height: 48,
                          child: _loading
                              ? const Center(
                                  child: SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: kHoney),
                                  ),
                                )
                              : ElevatedButton(
                                  onPressed: _apply,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: kHoney,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 18),
                                  ),
                                  child: const Text('تطبيق',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w800)),
                                ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: Color(0xFFE53935), size: 16),
                          const SizedBox(width: 6),
                          Text(
                            _error!,
                            style: const TextStyle(
                                color: Color(0xFFE53935), fontSize: 12),
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
  }
}
