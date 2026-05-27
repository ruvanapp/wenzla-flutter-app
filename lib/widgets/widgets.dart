import 'package:flutter/material.dart';
import '../theme/colors.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// سوق العسل – Premium Widget Library v2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─────────────────────────────────────────────────────────────────────────────
// ShimmerBox – animated shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────
class ShimmerBox extends StatefulWidget {
  final double? width;
  final double? height;
  final BorderRadius borderRadius;

  const ShimmerBox({
    super.key,
    this.width,
    this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _anim = Tween<double>(begin: -2.0, end: 2.5).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _anim,
    builder: (_, __) => Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        borderRadius: widget.borderRadius,
        gradient: LinearGradient(
          begin: Alignment(_anim.value, 0),
          end: Alignment(_anim.value + 1.6, 0),
          colors: const [
            Color(0xFFE8D4A8),
            Color(0xFFFFF4D8),
            Color(0xFFE8D4A8),
          ],
        ),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonStoreCard
// ─────────────────────────────────────────────────────────────────────────────
class SkeletonStoreCard extends StatelessWidget {
  const SkeletonStoreCard({super.key});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: kSurface,
      borderRadius: BorderRadius.circular(kRadiusL),
      boxShadow: kCardShadow,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.vertical(top: Radius.circular(kRadiusL)),
          child: ShimmerBox(height: 110),
        ),
        Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ShimmerBox(width: 90, height: 13, borderRadius: BorderRadius.circular(6)),
              const SizedBox(height: 6),
              ShimmerBox(width: 60, height: 10, borderRadius: BorderRadius.circular(5)),
              const SizedBox(height: 8),
              ShimmerBox(width: 50, height: 10, borderRadius: BorderRadius.circular(5)),
            ],
          ),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonFeaturedCard
// ─────────────────────────────────────────────────────────────────────────────
class SkeletonFeaturedCard extends StatelessWidget {
  const SkeletonFeaturedCard({super.key});

  @override
  Widget build(BuildContext context) => Container(
    width: 152,
    margin: const EdgeInsets.symmetric(horizontal: 6),
    decoration: BoxDecoration(
      color: kSurface,
      borderRadius: BorderRadius.circular(kRadiusL),
      boxShadow: kCardShadow,
    ),
    child: Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.vertical(top: Radius.circular(kRadiusL)),
          child: ShimmerBox(height: 90),
        ),
        Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ShimmerBox(width: 100, height: 12, borderRadius: BorderRadius.circular(5)),
              const SizedBox(height: 6),
              ShimmerBox(width: 60, height: 10, borderRadius: BorderRadius.circular(5)),
            ],
          ),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FadeInWidget – fade + slide on mount
// ─────────────────────────────────────────────────────────────────────────────
class FadeInWidget extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;
  final Offset slideFrom;

  const FadeInWidget({
    super.key,
    required this.child,
    this.delay     = Duration.zero,
    this.duration  = const Duration(milliseconds: 420),
    this.slideFrom = const Offset(0, 0.05),
  });

  @override
  State<FadeInWidget> createState() => _FadeInWidgetState();
}

class _FadeInWidgetState extends State<FadeInWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl    = AnimationController(vsync: this, duration: widget.duration);
    _opacity = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide   = Tween<Offset>(begin: widget.slideFrom, end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    if (widget.delay == Duration.zero) {
      _ctrl.forward();
    } else {
      Future.delayed(widget.delay, () { if (mounted) _ctrl.forward(); });
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: _opacity,
    child: SlideTransition(position: _slide, child: widget.child),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TapScaleWidget – scale press feedback
// ─────────────────────────────────────────────────────────────────────────────
class TapScaleWidget extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scaleDown;

  const TapScaleWidget({
    super.key,
    required this.child,
    this.onTap,
    this.scaleDown = 0.93,
  });

  @override
  State<TapScaleWidget> createState() => _TapScaleWidgetState();
}

class _TapScaleWidgetState extends State<TapScaleWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 90),
      reverseDuration: const Duration(milliseconds: 190),
    );
    _scale = Tween<double>(begin: 1.0, end: widget.scaleDown)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeIn));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown:  (_) => _ctrl.forward(),
    onTapUp:    (_) { _ctrl.reverse(); widget.onTap?.call(); },
    onTapCancel: () => _ctrl.reverse(),
    child: ScaleTransition(scale: _scale, child: widget.child),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HoneyButton – primary CTA with gradient and press animation
// ─────────────────────────────────────────────────────────────────────────────
class HoneyButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool fullWidth;
  final double fontSize;
  final EdgeInsets padding;
  final Color? color;
  final bool gradient;
  final IconData? icon;

  const HoneyButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading   = false,
    this.fullWidth = true,
    this.fontSize  = 15,
    this.padding   = const EdgeInsets.symmetric(vertical: 15),
    this.color,
    this.gradient  = true,
    this.icon,
  });

  @override
  State<HoneyButton> createState() => _HoneyButtonState();
}

class _HoneyButtonState extends State<HoneyButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 80),
      reverseDuration: const Duration(milliseconds: 170),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.96)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeIn));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.loading || widget.onPressed == null;

    Widget content = widget.loading
        ? const SizedBox(width: 22, height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, color: Colors.white, size: 18),
                const SizedBox(width: 6),
              ],
              Text(widget.label, style: TextStyle(
                fontFamily:   'Cairo',
                fontWeight:   FontWeight.w700,
                fontSize:     widget.fontSize,
                color:        Colors.white,
                letterSpacing: 0.2,
              )),
            ],
          );

    Widget btn = ScaleTransition(
      scale: _scale,
      child: GestureDetector(
        onTapDown:  (_) => !isDisabled ? _ctrl.forward() : null,
        onTapUp:    (_) { _ctrl.reverse(); if (!isDisabled) widget.onPressed?.call(); },
        onTapCancel: () => _ctrl.reverse(),
        child: Opacity(
          opacity: isDisabled ? 0.55 : 1.0,
          child: Container(
            padding: widget.padding,
            decoration: BoxDecoration(
              gradient: widget.gradient
                  ? const LinearGradient(
                      colors: [Color(0xFFD4A437), Color(0xFFA06B14)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: widget.gradient ? null : (widget.color ?? kHoney),
              borderRadius: BorderRadius.circular(kRadiusM),
              boxShadow: isDisabled ? null : kButtonShadow,
            ),
            child: Center(child: content),
          ),
        ),
      ),
    );

    return widget.fullWidth ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HoneyCard – premium card container
// ─────────────────────────────────────────────────────────────────────────────
class HoneyCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double borderRadius;
  final VoidCallback? onTap;
  final Color color;
  final bool elevated;

  const HoneyCard({
    super.key,
    required this.child,
    this.padding      = const EdgeInsets.all(16),
    this.borderRadius = kRadiusL,
    this.onTap,
    this.color        = kSurface,
    this.elevated     = false,
  });

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color:        color,
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow:    elevated ? kLiftedShadow : kCardShadow,
    ),
    child: Material(
      color:        Colors.transparent,
      borderRadius: BorderRadius.circular(borderRadius),
      child: InkWell(
        borderRadius: BorderRadius.circular(borderRadius),
        onTap:        onTap,
        splashColor:  kHoney.withOpacity(0.05),
        highlightColor: kHoney.withOpacity(0.03),
        child: Padding(padding: padding, child: child),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionTitle – premium section header with accent bar
// ─────────────────────────────────────────────────────────────────────────────
class SectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final VoidCallback? onSeeAll;
  final bool showAccent;

  const SectionTitle(this.title, {
    super.key,
    this.subtitle,
    this.onSeeAll,
    this.showAccent = true,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
    child: Row(
      textDirection: TextDirection.rtl,
      children: [
        // Accent bar
        if (showAccent) ...[
          Container(
            width:  3,
            height: subtitle != null ? 36 : 22,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [kHoney, kDarkHoney],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(
                fontFamily:    'Cairo',
                fontWeight:    FontWeight.w800,
                fontSize:      17,
                color:         kTextDark,
                letterSpacing: -0.2,
              )),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!, style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize:   12,
                  color:      kTextMuted,
                )),
              ],
            ],
          ),
        ),
        if (onSeeAll != null)
          GestureDetector(
            onTap: onSeeAll,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: kHoney.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('عرض الكل', style: TextStyle(
                fontFamily:  'Cairo',
                fontWeight:  FontWeight.w700,
                fontSize:    12,
                color:       kHoney,
              )),
            ),
          ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HoneyChip – rounded pill label
// ─────────────────────────────────────────────────────────────────────────────
class HoneyChip extends StatelessWidget {
  final String label;
  final Color background;
  final Color textColor;
  final double fontSize;

  const HoneyChip(this.label, {
    super.key,
    this.background = kSurfaceWarm,
    this.textColor  = kTextBrown,
    this.fontSize   = 11,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color:        background,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(label, style: TextStyle(
      fontFamily:  'Cairo',
      fontWeight:  FontWeight.w700,
      fontSize:    fontSize,
      color:       textColor,
    )),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NetImage – network image with shimmer loading
// ─────────────────────────────────────────────────────────────────────────────
class NetImage extends StatelessWidget {
  final String?      url;
  final double?      width;
  final double?      height;
  final BoxFit       fit;
  final BorderRadius? borderRadius;
  final String       fallback;

  const NetImage({
    super.key,
    this.url,
    this.width,
    this.height,
    this.fit          = BoxFit.cover,
    this.borderRadius,
    this.fallback     = '🍯',
  });

  @override
  Widget build(BuildContext context) {
    Widget img;
    if (url != null && url!.startsWith('http')) {
      // cacheWidth/cacheHeight decode image at display size → reduces memory 4-8×
      final cw = width  != null ? (width!  * 2).toInt() : null;
      final ch = height != null ? (height! * 2).toInt() : null;
      img = Image.network(
        url!,
        width: width, height: height, fit: fit,
        cacheWidth:  cw,
        cacheHeight: ch,
        errorBuilder: (_, __, ___) => _placeholder(),
        loadingBuilder: (_, child, prog) =>
            prog == null ? child : _shimmer(),
      );
    } else {
      img = _placeholder();
    }

    if (borderRadius != null) {
      img = ClipRRect(borderRadius: borderRadius!, child: img);
    }
    return img;
  }

  Widget _placeholder() => Container(
    width: width, height: height,
    color: kSurfaceWarm,
    child: Center(child: Text(fallback, style: const TextStyle(fontSize: 28))),
  );

  Widget _shimmer() => ShimmerBox(
    width: width,
    height: height,
    borderRadius: borderRadius ?? const BorderRadius.all(Radius.zero),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StarRating
// ─────────────────────────────────────────────────────────────────────────────
class StarRating extends StatelessWidget {
  final double rating;
  final double size;

  const StarRating(this.rating, {super.key, this.size = 14});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: List.generate(5, (i) {
      if (i < rating.floor())  return Icon(Icons.star_rounded,         color: kHoney, size: size);
      if (i < rating)          return Icon(Icons.star_half_rounded,    color: kHoney, size: size);
      return                          Icon(Icons.star_outline_rounded,  color: kBorder, size: size);
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState – premium empty/error state
// ─────────────────────────────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final String  icon;
  final String  title;
  final String? subtitle;
  final VoidCallback? onAction;
  final String? actionLabel;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.onAction,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FadeInWidget(
            duration: const Duration(milliseconds: 500),
            child: Container(
              width: 88, height: 88,
              decoration: BoxDecoration(
                color: kSurfaceWarm,
                shape: BoxShape.circle,
                boxShadow: kCardShadow,
              ),
              child: Center(child: Text(icon, style: const TextStyle(fontSize: 42))),
            ),
          ),
          const SizedBox(height: 20),
          FadeInWidget(
            delay: const Duration(milliseconds: 100),
            child: Text(title, style: const TextStyle(
              fontFamily:  'Cairo',
              fontWeight:  FontWeight.w800,
              fontSize:    18,
              color:       kTextDark,
              letterSpacing: -0.2,
            ), textAlign: TextAlign.center),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            FadeInWidget(
              delay: const Duration(milliseconds: 180),
              child: Text(subtitle!, style: const TextStyle(
                fontFamily: 'Cairo', fontSize: 14, color: kTextMuted),
                textAlign: TextAlign.center),
            ),
          ],
          if (onAction != null) ...[
            const SizedBox(height: 28),
            FadeInWidget(
              delay: const Duration(milliseconds: 260),
              child: HoneyButton(
                label: actionLabel ?? 'حاول مرة أخرى',
                onPressed: onAction,
                fullWidth: false,
                padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 13),
              ),
            ),
          ],
        ],
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StoreLogoWidget – PNG asset or gradient fallback
// ─────────────────────────────────────────────────────────────────────────────
const _kLogoMap = {
  'مناحل النور':    'assets/store_logos/noor.png',
  'مناحل الرحمة':  'assets/store_logos/rahma.png',
  'مناحل الرحيق':  'assets/store_logos/rahiq.png',
  'مناحل السلطان': 'assets/store_logos/sultan.png',
  'مناحل البركة':  'assets/store_logos/baraka.png',
  'مناحل الهدى':   'assets/store_logos/huda.png',
  'مناحل الهدي':   'assets/store_logos/huda.png',
  'مناحل الشفا':   'assets/store_logos/shifa.png',
  'مناحل الريف':   'assets/store_logos/reef.png',
  'مناحل مكة':     'assets/store_logos/mecca.png',
  'مناحل الأصالة': 'assets/store_logos/asala.png',
  'مناحل القناوي': 'assets/store_logos/qanawi.png',
};

class StoreLogoWidget extends StatelessWidget {
  final String storeName;
  final double size;

  const StoreLogoWidget({super.key, required this.storeName, this.size = 56});

  @override
  Widget build(BuildContext context) {
    final asset = _kLogoMap[storeName];
    if (asset != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 4),
        child: Image.asset(asset,
          width: size, height: size, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback()),
      );
    }
    return _fallback();
  }

  Widget _fallback() {
    final initial = storeName.isNotEmpty ? storeName[0] : '🍯';
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFD4A437), Color(0xFF9A6B14)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size / 4),
        boxShadow: [
          BoxShadow(
            color: kHoney.withOpacity(0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(child: Text(
        initial,
        style: TextStyle(
          fontFamily:  'Cairo',
          color:       Colors.white,
          fontWeight:  FontWeight.w800,
          fontSize:    size * 0.36,
        ),
      )),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QtySelector – quantity ± controls
// ─────────────────────────────────────────────────────────────────────────────
class QtySelector extends StatelessWidget {
  final int qty;
  final ValueChanged<int> onChange;
  final double iconSize;
  final Color activeColor;

  const QtySelector({
    super.key,
    required this.qty,
    required this.onChange,
    this.iconSize    = 20,
    this.activeColor = kHoney,
  });

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      border:       Border.all(color: kBorder, width: 1.2),
      borderRadius: BorderRadius.circular(kRadiusM),
      color:        kSurface,
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _btn(Icons.remove_rounded, () => onChange(qty - 1), qty <= 1),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          transitionBuilder: (child, anim) =>
              ScaleTransition(scale: anim, child: child),
          child: Padding(
            key: ValueKey(qty),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Text('$qty', style: const TextStyle(
              fontFamily:  'Cairo',
              fontWeight:  FontWeight.w700,
              fontSize:    16,
              color:       kTextDark,
            )),
          ),
        ),
        _btn(Icons.add_rounded, () => onChange(qty + 1), false),
      ],
    ),
  );

  Widget _btn(IconData icon, VoidCallback fn, bool disabled) => InkWell(
    borderRadius: BorderRadius.circular(kRadiusM),
    onTap: disabled ? null : fn,
    child: Padding(
      padding: const EdgeInsets.all(9),
      child: Icon(icon, size: iconSize,
          color: disabled ? kBorder : activeColor),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderStatusChip
// ─────────────────────────────────────────────────────────────────────────────
class OrderStatusChip extends StatelessWidget {
  final String status;
  const OrderStatusChip(this.status, {super.key});

  static const _labels = {
    'PENDING':          'قيد الانتظار',
    'ACCEPTED':         'تم القبول',
    'PREPARING':        'جاري التحضير',
    'OUT_FOR_DELIVERY': 'في الطريق',
    'DELIVERED':        'تم التسليم',
    'CANCELLED':        'ملغي',
  };

  static const _colors = {
    'PENDING':          Color(0xFFF59E0B),
    'ACCEPTED':         Color(0xFF0277BD),
    'PREPARING':        Color(0xFF7B1FA2),
    'OUT_FOR_DELIVERY': Color(0xFF00838F),
    'DELIVERED':        Color(0xFF166534),
    'CANCELLED':        Color(0xFFB91C1C),
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[status] ?? kTextMuted;
    final label = _labels[status] ?? status;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color:  color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.35), width: 1.2),
      ),
      child: Text(label, style: TextStyle(
        fontFamily:  'Cairo',
        fontWeight:  FontWeight.w700,
        fontSize:    11,
        color:       color,
        letterSpacing: 0.1,
      )),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TrustBadge
// ─────────────────────────────────────────────────────────────────────────────
class TrustBadge extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color    color;

  const TrustBadge({super.key, required this.icon, required this.label,
      this.color = kHoney});

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 48, height: 48,
        decoration: BoxDecoration(
          color: color.withOpacity(0.10),
          shape: BoxShape.circle,
          border: Border.all(color: color.withOpacity(0.20)),
        ),
        child: Icon(icon, color: color, size: 22),
      ),
      const SizedBox(height: 6),
      Text(label, style: const TextStyle(
        fontFamily:  'Cairo',
        fontWeight:  FontWeight.w600,
        fontSize:    11,
        color:       kTextBrown,
      ), textAlign: TextAlign.center),
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PriceBadge – price display with unit
// ─────────────────────────────────────────────────────────────────────────────
class PriceBadge extends StatelessWidget {
  final double price;
  final double? originalPrice;
  final String currency;

  const PriceBadge(this.price, {super.key, this.originalPrice, this.currency = 'ج.م'});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Text('${price.toStringAsFixed(0)}', style: const TextStyle(
        fontFamily:  'Cairo',
        fontWeight:  FontWeight.w800,
        fontSize:    18,
        color:       kHoney,
      )),
      const SizedBox(width: 3),
      Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Text(currency, style: const TextStyle(
          fontFamily: 'Cairo', fontWeight: FontWeight.w600,
          fontSize: 12, color: kTextMuted)),
      ),
      if (originalPrice != null && originalPrice! > price) ...[
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text('${originalPrice!.toStringAsFixed(0)} $currency',
              style: const TextStyle(
                fontFamily:  'Cairo',
                fontSize:    12,
                color:       kTextMuted,
                decoration:  TextDecoration.lineThrough,
              )),
        ),
      ],
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradientIconBox – premium icon container with gradient
// ─────────────────────────────────────────────────────────────────────────────
class GradientIconBox extends StatelessWidget {
  final IconData icon;
  final List<Color> colors;
  final double size;
  final double iconSize;

  const GradientIconBox({
    super.key,
    required this.icon,
    this.colors    = const [Color(0xFFD4A437), Color(0xFF9A6B14)],
    this.size      = 44,
    this.iconSize  = 22,
  });

  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: colors,
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(size / 3),
      boxShadow: [
        BoxShadow(
          color: colors.last.withOpacity(0.30),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Icon(icon, color: Colors.white, size: iconSize),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoRow – labeled data row (used in details screens)
// ─────────────────────────────────────────────────────────────────────────────
class InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;

  const InfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      textDirection: TextDirection.rtl,
      children: [
        Container(
          width: 34, height: 34,
          decoration: BoxDecoration(
            color: (iconColor ?? kHoney).withOpacity(0.1),
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(icon, size: 17, color: iconColor ?? kHoney),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(
                fontFamily: 'Cairo', fontSize: 11, color: kTextMuted)),
              Text(value, style: const TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w600,
                fontSize: 13, color: kTextDark)),
            ],
          ),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryRow – used in cart/checkout totals
// ─────────────────────────────────────────────────────────────────────────────
class SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;
  final Color? valueColor;

  const SummaryRow(this.label, this.value, {
    super.key, this.isBold = false, this.valueColor,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      textDirection: TextDirection.rtl,
      children: [
        Text(label, style: TextStyle(
          fontFamily:  'Cairo',
          fontWeight:  isBold ? FontWeight.w700 : FontWeight.w400,
          fontSize:    isBold ? 15 : 13,
          color:       isBold ? kTextDark : kTextBrown,
        )),
        const Spacer(),
        Text(value, style: TextStyle(
          fontFamily:  'Cairo',
          fontWeight:  FontWeight.w700,
          fontSize:    isBold ? 18 : 13,
          color:       valueColor ?? (isBold ? kHoney : kTextDark),
        )),
      ],
    ),
  );
}
