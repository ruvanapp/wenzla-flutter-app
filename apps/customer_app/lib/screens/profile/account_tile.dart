import 'package:flutter/material.dart';
import '../../theme/colors.dart';

/// A single interactive row inside an [AccountSection].
/// Supports scale-press animation, icon container, optional subtitle,
/// custom trailing widget, and a destructive (red) mode.
class AccountTile extends StatefulWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Color? iconColor;
  final Color? iconBg;
  final Widget? trailing;
  final bool isDestructive;
  final bool showChevron;
  final bool isDisabled;

  const AccountTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
    this.iconColor,
    this.iconBg,
    this.trailing,
    this.isDestructive = false,
    this.showChevron = true,
    this.isDisabled = false,
  });

  @override
  State<AccountTile> createState() => _AccountTileState();
}

class _AccountTileState extends State<AccountTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 80),
      reverseDuration: const Duration(milliseconds: 200),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeIn),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final baseColor =
        widget.isDestructive ? kError : (widget.iconColor ?? kHoney);
    final bgColor = widget.iconBg ?? baseColor.withOpacity(0.10);
    final enabled = !widget.isDisabled && widget.onTap != null;

    return ScaleTransition(
      scale: _scale,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _ctrl.forward() : null,
        onTapUp: (_) {
          _ctrl.reverse();
          if (enabled) widget.onTap?.call();
        },
        onTapCancel: () => _ctrl.reverse(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            textDirection: TextDirection.rtl,
            children: [
              // Icon container
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: enabled ? bgColor : kBorder,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(
                  widget.icon,
                  color: enabled ? baseColor : kTextMuted,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              // Title + subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.title,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: widget.isDestructive
                            ? kError
                            : enabled
                                ? kTextDark
                                : kTextMuted,
                      ),
                    ),
                    if (widget.subtitle != null) ...[
                      const SizedBox(height: 1),
                      Text(
                        widget.subtitle!,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: kTextMuted,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Trailing widget or chevron
              if (widget.trailing != null)
                widget.trailing!
              else if (widget.showChevron)
                Icon(
                  enabled ? Icons.chevron_left_rounded : Icons.lock_outline_rounded,
                  color: widget.isDestructive
                      ? kError.withOpacity(0.5)
                      : enabled
                          ? kTextMuted
                          : kTextMuted.withOpacity(0.75),
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
