import 'package:flutter/material.dart';
import '../../../theme/colors.dart';

class CartTotalsCard extends StatelessWidget {
  final double subtotal;
  final double? deliveryFee; // null when no governorate is selected yet
  final double discount;
  final int itemCount;

  const CartTotalsCard({
    super.key,
    required this.subtotal,
    this.deliveryFee,
    this.discount = 0,
    this.itemCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final fee = deliveryFee ?? 0;
    final total = (subtotal + fee - discount).clamp(0.0, double.infinity);

    final String feeValue;
    final Color? feeColor;
    final double feeFontSize;
    if (deliveryFee == null) {
      feeValue = 'اختر المحافظة';
      feeColor = kTextMuted;
      feeFontSize = 12;
    } else if (fee <= 0) {
      feeValue = 'مجاني';
      feeColor = const Color(0xFF22A05B);
      feeFontSize = 13;
    } else {
      feeValue = '${fee.toStringAsFixed(0)} ج.م';
      feeColor = null;
      feeFontSize = 13;
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 0),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            textDirection: TextDirection.rtl,
            children: const [
              Icon(Icons.receipt_long_outlined, size: 16, color: kHoney),
              SizedBox(width: 6),
              Text(
                'ملخص الطلب',
                style: TextStyle(
                  color: kTextDark,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Divider(color: kBorder, height: 1),
          const SizedBox(height: 6),
          _CompactRow(
            label: 'عدد المنتجات',
            value: '$itemCount',
          ),
          const SizedBox(height: 4),
          _CompactRow(
            label: 'المجموع الفرعي',
            value: '${subtotal.toStringAsFixed(0)} ج.م',
          ),
          const SizedBox(height: 4),
          _CompactRow(
            label: 'رسوم التوصيل',
            value: feeValue,
            valueColor: feeColor,
            valueFontSize: feeFontSize,
          ),
          if (discount > 0) ...[
            const SizedBox(height: 4),
            _CompactRow(
              label: 'الخصم',
              value: '- ${discount.toStringAsFixed(0)} ج.م',
              valueColor: const Color(0xFF22A05B),
            ),
          ],
          const SizedBox(height: 6),
          const Divider(color: kBorder, height: 1),
          const SizedBox(height: 6),
          Row(
            textDirection: TextDirection.rtl,
            children: [
              const Text(
                'الإجمالي',
                style: TextStyle(
                  color: kTextDark,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  fontFamily: 'Cairo',
                ),
              ),
              const Spacer(),
              Text(
                '${total.toStringAsFixed(0)} ج.م',
                style: const TextStyle(
                  color: kHoney,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CompactRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final double valueFontSize;

  const _CompactRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.valueFontSize = 12.5,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      textDirection: TextDirection.rtl,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: kTextBrown,
            fontSize: 12,
            fontFamily: 'Cairo',
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor ?? kTextDark,
              fontWeight: FontWeight.w700,
              fontSize: valueFontSize,
              fontFamily: 'Cairo',
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
