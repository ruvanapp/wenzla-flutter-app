import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../../../theme/colors.dart';
import '../../../widgets/widgets.dart';

class CartStoreHeader extends StatelessWidget {
  final String storeName;
  final String? storeLogoUrl;
  final VoidCallback? onViewStore;

  const CartStoreHeader({
    super.key,
    required this.storeName,
    this.storeLogoUrl,
    this.onViewStore,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(14, 14, 14, 0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2C1204), Color(0xFF4A2810)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: kRoyal.withOpacity(0.25),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Store logo
            _StoreLogo(storeName: storeName, logoUrl: storeLogoUrl),
            const SizedBox(width: 14),
            // Store info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: kHoney.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: kHoneyLight.withOpacity(0.5), width: 1),
                        ),
                        child: Text(
                          '🏪 متجر',
                          style: TextStyle(
                            color: kHoneyLight,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    storeName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(Icons.delivery_dining_outlined,
                          color: kHoneyLight, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        'توصيل عادةً خلال 30-45 دقيقة',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.65),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // View Store button
            if (onViewStore != null)
              TapScaleWidget(
                onTap: onViewStore!,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: kHoney,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'عرض',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StoreLogo extends StatelessWidget {
  final String storeName;
  final String? logoUrl;

  const _StoreLogo({required this.storeName, this.logoUrl});

  @override
  Widget build(BuildContext context) {
    const size = 52.0;
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: CachedNetworkImage(
          imageUrl: NetImage.optimizeCloudinaryUrl(
                logoUrl!, width: 104, height: 104) ??
              logoUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          memCacheWidth: 104,
          memCacheHeight: 104,
          maxWidthDiskCache: 104,
          maxHeightDiskCache: 104,
          placeholder: (_, __) => StoreLogoWidget(storeName: storeName, size: size),
          errorWidget: (_, __, ___) =>
              StoreLogoWidget(storeName: storeName, size: size),
        ),
      );
    }
    return StoreLogoWidget(storeName: storeName, size: size);
  }
}
