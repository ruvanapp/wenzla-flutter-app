import 'package:flutter/material.dart';
import '../../../theme/colors.dart';
import '../../../widgets/widgets.dart';

class CartTotalsCard extends StatelessWidget {
  final double subtotal;
  final double? deliveryFee; // null when no governorate is selected yet
  final double discount;

  const CartTotalsCard({
    super.key,
    required this.subtotal,
    this.deliveryFee,
    this.discount    = 0,
  });

  @override
  Widget build(BuildContext context) {
    final fee = deliveryFee ?? 0;
    final total = (subtotal + fee - discount).clamp(0.0, double.infinity);

    final String feeValue;
    final Color? feeColor;
    final double feeFontSize;
    if (deliveryFee == null) {
      feeValue = 'اختر المحافظة لحساب رسوم التوصيل';
      feeColor = kTextMuted;
      feeFontSize = 11;
    } else if (fee <= 0) {
      feeValue = 'مجاني';
      feeColor = Colors.green;
      feeFontSize = 13;
    } else {
      feeValue = '${fee.toStringAsFixed(0)} ج.م';
      feeColor = null;
      feeFontSize = 13;
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 8, 14, 0),
      child: HoneyCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ملخص الطلب',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: kTextDark,
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                ),
          ),
          const SizedBox(height: 14),
          _Row(
            label: 'المجموع الفرعي',
            value: '${subtotal.toStringAsFixed(0)} ج.م',
          ),
          const SizedBox(height: 8),
          _Row(
            label: 'رسوم التوصيل',
            value: feeValue,
            valueColor: feeColor,
            valueFontSize: feeFontSize,
          ),
          if (discount > 0) ...[
            const SizedBox(height: 8),
            _Row(
              label: 'خصم القسيمة',
              value: '- ${discount.toStringAsFixed(0)} ج.م',
              valueColor: Colors.green,
            ),
          ],
          const SizedBox(height: 14),
          const Divider(color: kBorder),
          const SizedBox(height: 12),
          // Total row
          Row(
            children: [
              Text(
                'الإجمالي',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: kTextDark,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [kHoney, kDarkHoney],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Text(
                  '${total.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final double valueFontSize;

  const _Row({
    required this.label,
    required this.value,
    this.valueColor,
    this.valueFontSize = 13,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(color: kTextBrown, fontSize: 13),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor ?? kTextDark,
              fontWeight: FontWeight.w700,
              fontSize: valueFontSize,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
