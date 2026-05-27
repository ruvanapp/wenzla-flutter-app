import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class WalletHistoryScreen extends StatefulWidget {
  const WalletHistoryScreen({super.key});

  @override
  State<WalletHistoryScreen> createState() => _WalletHistoryScreenState();
}

class _WalletHistoryScreenState extends State<WalletHistoryScreen> {
  bool _loading = true;
  String _filter = 'all';
  List<dynamic> _items = [];
  Map<String, dynamic> _summary = const {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiService(token: context.read<AppState>().token);
      final res = await api.get('/customer/wallet-transactions?filter=$_filter', auth: true);
      if (!mounted) return;
      setState(() {
        _items = res is Map && res['items'] is List ? List<dynamic>.from(res['items']) : [];
        _summary = res is Map && res['summary'] is Map
            ? Map<String, dynamic>.from(res['summary'])
            : const {};
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _money(dynamic value) {
    final parsed = value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');
    return (parsed ?? 0).toStringAsFixed(2);
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'completed':
        return 'مكتملة';
      case 'posted':
        return 'مسجلة';
      default:
        return 'محدثة';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: kBackground,
        appBar: AppBar(
          title: const Text(
            'سجل المحفظة',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: kTextDark,
            ),
          ),
          backgroundColor: kBackground,
          elevation: 0,
          iconTheme: const IconThemeData(color: kTextDark),
        ),
        body: RefreshIndicator(
          color: kHoney,
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFF4DD), Color(0xFFFFE6B0)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    ...kLiftedShadow,
                    BoxShadow(
                      color: kHoney.withOpacity(0.08),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ملخص المحفظة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: kTextDark,
                      ),
                    ),
                    const SizedBox(height: 14),
                    _summaryRow('الرصيد الحالي', _money(_summary['currentBalance']), kHoney),
                    const SizedBox(height: 10),
                    _summaryRow('إجمالي المبالغ المضافة', _money(_summary['totalCredited']), kSuccess),
                    const SizedBox(height: 10),
                    _summaryRow('إجمالي المبالغ المخصومة', _money(_summary['totalDebited']), kError),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _filterChip('all', 'الكل')),
                  const SizedBox(width: 8),
                  Expanded(child: _filterChip('credits', 'الإضافات')),
                  const SizedBox(width: 8),
                  Expanded(child: _filterChip('debits', 'الخصومات')),
                ],
              ),
              const SizedBox(height: 16),
              if (_loading)
                ...List.generate(
                  4,
                  (_) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: kSurface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: kCardShadow,
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ShimmerBox(width: 140, height: 14),
                          SizedBox(height: 10),
                          ShimmerBox(width: 100, height: 12),
                          SizedBox(height: 10),
                          ShimmerBox(width: double.infinity, height: 12),
                        ],
                      ),
                    ),
                  ),
                )
              else if (_items.isEmpty)
                const EmptyState(
                  icon: '💳',
                  title: 'لا توجد حركات في المحفظة بعد',
                  subtitle: 'ستظهر هنا جميع عمليات الشحن والإضافة والخصم فور تسجيلها',
                )
              else
                ..._items.map((item) => _transactionCard(item)).toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value, Color color) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: kTextBrown,
            ),
          ),
        ),
        Text(
          '$value جنيه',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            fontSize: 15,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _filterChip(String value, String label) {
    final selected = _filter == value;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () {
        if (_filter == value) return;
        setState(() => _filter = value);
        _load();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? kHoney.withOpacity(0.15) : kSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? kHoney : kBorder),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: selected ? FontWeight.w800 : FontWeight.w700,
            color: selected ? kDarkHoney : kTextMuted,
          ),
        ),
      ),
    );
  }

  Widget _transactionCard(dynamic raw) {
    final item = raw as Map;
    final amount = (item['amount'] is num)
        ? (item['amount'] as num).toDouble()
        : double.tryParse(item['amount']?.toString() ?? '') ?? 0;
    final isCredit = amount >= 0;
    final color = isCredit ? kSuccess : kError;
    final amountText = '${isCredit ? '+' : '-'}${amount.abs().toStringAsFixed(2)}';
    final date = DateTime.tryParse(item['createdAt']?.toString() ?? '');

    return FadeInWidget(
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.12)),
          boxShadow: [
            ...kCardShadow,
            BoxShadow(
              color: color.withOpacity(0.05),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isCredit ? Icons.south_west_rounded : Icons.north_east_rounded,
                    color: color,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['label']?.toString() ?? 'حركة محفظة',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: kTextDark,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _statusLabel(item['status']?.toString()),
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: kTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '$amountText جنيه',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if ((item['adminNote']?.toString().trim().isNotEmpty ?? false))
              Text(
                item['adminNote'].toString(),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  color: kTextBrown,
                  height: 1.4,
                ),
              ),
            if ((item['adminNote']?.toString().trim().isNotEmpty ?? false))
              const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    date == null
                        ? '—'
                        : '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')} • ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      color: kTextMuted,
                    ),
                  ),
                ),
                Text(
                  'الرصيد بعد العملية: ${_money(item['balanceAfter'])}',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: kTextMuted,
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