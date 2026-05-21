import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../state/app_state.dart';
import '../../../theme/colors.dart';
import '../../../widgets/widgets.dart';

class CartEmptyState extends StatelessWidget {
  const CartEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FadeInWidget(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon illustration
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: kSurfaceWarm,
                  shape: BoxShape.circle,
                  border: Border.all(color: kBorder, width: 2),
                ),
                child: const Icon(Icons.shopping_cart_outlined,
                    size: 64, color: kHoney),
              ),
              const SizedBox(height: 24),
              Text(
                'سلتك فارغة',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: kTextDark,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                'أضف منتجاتك المفضلة من متاجرنا',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: kTextMuted,
                    ),
              ),
              const SizedBox(height: 32),
              HoneyButton(
                label: 'ابدأ التسوق',
                icon: Icons.storefront_outlined,
                onPressed: () => context
                    .read<AppState>()
                    .showScreen(AppScreen.home, bottomIndex: 0),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
