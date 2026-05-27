import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import '../../theme/colors.dart';
import '../../widgets/widgets.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();

    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        backgroundColor: kBackground,
        titleSpacing: 16,
        title: const Text('التصنيفات', style: TextStyle(
          fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 20, color: kTextDark)),
        automaticallyImplyLeading: false,
      ),
      body: st.categories.isEmpty
          ? EmptyState(
              icon: '📂', title: 'جاري تحميل التصنيفات',
              onAction: () => context.read<AppState>().loadCategories())
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12, mainAxisSpacing: 12,
                childAspectRatio: 1.1,
              ),
              itemCount: st.categories.length,
              itemBuilder: (_, i) => _buildCategoryCard(context, st.categories[i]),
            ),
    );
  }

  Widget _buildCategoryCard(BuildContext context, Map<String, dynamic> cat) {
    final name    = (cat['name'] as String?) ?? '';
    final visual  = kCategoryVisuals[name];
    final icon    = visual?.icon ?? Icons.category_rounded;
    final colors  = visual?.gradient ?? [kAmber, kDarkHoney];

    return GestureDetector(
      onTap: () => context.read<AppState>().showScreen(AppScreen.home, bottomIndex: 0),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(
            color: colors.last.withOpacity(0.3),
            blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment:  MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: Colors.white, size: 26),
              ),
              Text(name, style: const TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                fontSize: 14, color: Colors.white),
                maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}
