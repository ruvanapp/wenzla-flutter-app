import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();

    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        backgroundColor: kBackground,
        titleSpacing: 0,
        automaticallyImplyLeading: false,
        title: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: TextField(
            controller:  _ctrl,
            autofocus:   true,
            textDirection: TextDirection.rtl,
            onChanged:   (q) => context.read<AppState>().search(q),
            decoration:  InputDecoration(
              hintText: 'ابحث عن عسل، منتج، أو متجر...',
              filled:   true,
              fillColor: kSurface,
              prefixIcon: const Icon(Icons.search_rounded, color: kHoney),
              suffixIcon: _ctrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, color: kTextMuted),
                      onPressed: () {
                        _ctrl.clear();
                        context.read<AppState>().clearSearch();
                      })
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: kBorder)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: kBorder)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: kHoney, width: 1.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
      ),
      body: _buildBody(context, st),
    );
  }

  Widget _buildBody(BuildContext context, AppState st) {
    if (st.searching) {
      return const Center(child: CircularProgressIndicator(color: kHoney));
    }

    if (_ctrl.text.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('🔍', style: TextStyle(fontSize: 56)),
            SizedBox(height: 12),
            Text('ابحث عن منتجاتك المفضلة', style: TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w600,
              fontSize: 16, color: kTextMuted)),
            SizedBox(height: 4),
            Text('عسل، مناحل، منتجات طبيعية...', style: TextStyle(
              fontFamily: 'Cairo', fontSize: 13, color: kTextMuted)),
          ],
        ),
      );
    }

    if (st.searchResults.isEmpty) {
      return EmptyState(
        icon: '😔',
        title: 'لا نتائج لـ "${_ctrl.text}"',
        subtitle: 'جرّب كلمات بحث مختلفة',
        onAction: () {
          _ctrl.clear();
          context.read<AppState>().clearSearch();
        },
        actionLabel: 'مسح البحث',
      );
    }

    return ListView.builder(
      padding:   const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: st.searchResults.length,
      itemBuilder: (_, i) => _buildSearchResult(context, st.searchResults[i]),
    );
  }

  Widget _buildSearchResult(BuildContext context, Map<String, dynamic> p) {
    final name      = (p['name']       as String?) ?? '';
    final price     = double.tryParse(p['price']?.toString() ?? '0') ?? 0;
    final imgUrl    = (p['imageUrl']   as String?);
    final storeName = (p['merchant']?['storeName'] as String?) ?? '';

    return GestureDetector(
      onTap: () => context.read<AppState>().openProduct(Map<String, dynamic>.from(p)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: kSurface, borderRadius: BorderRadius.circular(14),
          boxShadow: kCardShadow),
        child: Row(
          textDirection: TextDirection.rtl,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: NetImage(url: imgUrl, width: 70, height: 70, fit: BoxFit.cover),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                    style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                      fontSize: 14, color: kTextDark),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                  if (storeName.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(storeName, style: const TextStyle(
                      fontFamily: 'Cairo', fontSize: 11, color: kTextMuted)),
                  ],
                  const SizedBox(height: 6),
                  Row(children: [
                    Text('${price.toStringAsFixed(0)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo',
                        fontWeight: FontWeight.w800, fontSize: 16, color: kHoney)),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => context.read<AppState>()
                          .addToCart(Map<String, dynamic>.from(p)),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: kHoney, borderRadius: BorderRadius.circular(20)),
                        child: const Text('أضف', style: TextStyle(
                          fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                          fontSize: 12, color: Colors.white)),
                      ),
                    ),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
