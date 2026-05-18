import 'package:flutter/material.dart';
import '../../theme/colors.dart';

/// Groups a list of [AccountTile]s under a section label inside
/// a rounded white card with subtle shadow.
class AccountSection extends StatelessWidget {
  final String title;
  final List<Widget> tiles;

  const AccountSection({
    super.key,
    required this.title,
    required this.tiles,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section label
          Padding(
            padding: const EdgeInsets.only(bottom: 10, right: 4, top: 4),
            child: Row(
              textDirection: TextDirection.rtl,
              children: [
                Container(
                  width: 3, height: 14,
                  decoration: BoxDecoration(
                    color: kHoney,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  textDirection: TextDirection.rtl,
                  style: const TextStyle(
                    fontFamily:    'Cairo',
                    fontWeight:    FontWeight.w700,
                    fontSize:      13,
                    color:         kTextBrown,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
          // Card container
          Container(
            decoration: BoxDecoration(
              color: kSurface,
              borderRadius: BorderRadius.circular(18),
              boxShadow: kCardShadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Column(
                children: [
                  for (int i = 0; i < tiles.length; i++) ...[
                    tiles[i],
                    if (i < tiles.length - 1)
                      Divider(
                        height: 1,
                        indent: 72,
                        endIndent: 0,
                        color: kDivider,
                      ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
