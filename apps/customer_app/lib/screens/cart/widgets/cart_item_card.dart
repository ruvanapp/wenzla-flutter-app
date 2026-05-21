import 'package:flutter/material.dart';
import '../../../theme/colors.dart';
import '../../../widgets/widgets.dart';

class CartItemCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onRemove;
  final ValueChanged<int> onQtyChanged;

  const CartItemCard({
    super.key,
    required this.item,
    required this.onRemove,
    required this.onQtyChanged,
  });

  @override
  Widget build(BuildContext context) {
    final name     = (item['name']     as String?) ?? '';
    final price    = (item['price']    as num?)    ?? 0;
    final qty      = (item['qty']      as int?)    ?? 1;
    final imageUrl = (item['imageUrl'] as String?);
    final total    = price * qty;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: HoneyCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 82,
              height: 82,
              child: imageUrl != null && imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      width: 82,
                      height: 82,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _imagePlaceholder(),
                    )
                  : _imagePlaceholder(),
            ),
          ),
          const SizedBox(width: 12),
          // Name + price + qty
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: kTextDark,
                  ),
                ),
                const SizedBox(height: 6),
                // Unit price
                Text(
                  '${price.toStringAsFixed(0)} ج.م / قطعة',
                  style: const TextStyle(
                    fontSize: 12,
                    color: kTextMuted,
                  ),
                ),
                const SizedBox(height: 8),
                // Qty controls + total
                Row(
                  children: [
                    // Qty selector
                    _QtyControl(
                      qty: qty,
                      onChanged: onQtyChanged,
                    ),
                    const Spacer(),
                    // Line total
                    Text(
                      '${total.toStringAsFixed(0)} ج.م',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: kHoney,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Remove button
          TapScaleWidget(
            onTap: onRemove,
            child: Padding(
              padding: const EdgeInsets.only(top: 2, right: 2),
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFECEC),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.close_rounded,
                    size: 16, color: Color(0xFFE53935)),
              ),
            ),
          ),
        ],
      ),
    ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      color: kSurfaceWarm,
      child: const Center(
        child: Icon(Icons.image_outlined, color: kBorder, size: 32),
      ),
    );
  }
}

class _QtyControl extends StatelessWidget {
  final int qty;
  final ValueChanged<int> onChanged;

  const _QtyControl({required this.qty, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: kSurfaceWarm,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: kBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _QtyBtn(
            icon: qty <= 1 ? Icons.delete_outline_rounded : Icons.remove_rounded,
            iconColor: qty <= 1 ? const Color(0xFFE53935) : kTextBrown,
            onTap: () => onChanged(qty - 1),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, anim) => ScaleTransition(
                scale: anim,
                child: child,
              ),
              child: Text(
                '$qty',
                key: ValueKey(qty),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: kTextDark,
                ),
              ),
            ),
          ),
          _QtyBtn(
            icon: Icons.add_rounded,
            iconColor: kHoney,
            onTap: () => onChanged(qty + 1),
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  const _QtyBtn(
      {required this.icon, required this.iconColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return TapScaleWidget(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        child: Icon(icon, size: 18, color: iconColor),
      ),
    );
  }
}
