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
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2C1204), Color(0xFF4A2810)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: kRoyal.withOpacity(0.18),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            // Store logo
            _StoreLogo(storeName: storeName, logoUrl: storeLogoUrl),
            const SizedBox(width: 12),
            // Store info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    storeName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Cairo',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.delivery_dining_outlined,
                          color: kHoneyLight, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        'توصيل خلال 3 أيام',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.65),
                          fontSize: 10.5,
                          fontFamily: 'Cairo',
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
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: kHoney,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'عرض المتجر',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontFamily: 'Cairo',
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
    const size = 42.0;
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
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
