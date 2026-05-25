import 'package:flutter/material.dart';
import '../../theme/colors.dart';

/// Curved honey-drip header used at the top of the profile/account screen.
///
/// Shows a warm gold gradient clipped into a gentle wave at the bottom,
/// with the app logo row at the top and the user avatar + name below.
class AccountHeader extends StatelessWidget {
  final String name;
  final String phone;
  final bool isLoading;
  final VoidCallback? onSearchTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onEditTap;

  const AccountHeader({
    super.key,
    required this.name,
    required this.phone,
    this.isLoading = false,
    this.onSearchTap,
    this.onMenuTap,
    this.onEditTap,
  });

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: _HoneyDripClipper(),
      child: Container(
        padding: const EdgeInsets.only(bottom: 24),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFD4A437), Color(0xFFA87820), Color(0xFF7A4C0A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 6, 18, 0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── App bar row ──────────────────────────────────────────────
                Row(
                  textDirection: TextDirection.rtl,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Menu icon (right side in RTL)
                    _iconButton(Icons.menu_rounded, onMenuTap),
                    // Centered logo
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text('🍯', style: TextStyle(fontSize: 22)),
                        SizedBox(width: 8),
                        Text(
                          'سوق العسل',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    // Search icon (left side in RTL)
                    _iconButton(Icons.search_rounded, onSearchTap),
                  ],
                ),
                const SizedBox(height: 18),
                // ── User info ────────────────────────────────────────────────
                isLoading ? _skeleton() : _userInfo(),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _iconButton(IconData icon, VoidCallback? onTap) {
    if (onTap == null) return const SizedBox(width: 40, height: 40);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.18),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 19,
        ),
      ),
    );
  }

  Widget _userInfo() {
    final initials = name.isNotEmpty
        ? name
            .trim()
            .split(' ')
            .map((w) => w.isNotEmpty ? w[0] : '')
            .where((char) => RegExp(r'[A-Za-z\u0600-\u06FF]').hasMatch(char))
            .take(2)
            .join()
        : '؟';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.18),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: Text(
                initials.isNotEmpty ? initials : '🍯',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  color: kDarkHoney,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: Colors.white,
                  ),
                ),
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    phone,
                    textDirection: TextDirection.ltr,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white.withOpacity(0.82),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onEditTap != null)
            GestureDetector(
              onTap: onEditTap,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.edit_outlined, color: Colors.white, size: 14),
                    SizedBox(width: 6),
                    Text(
                      'تعديل',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _skeleton() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: const BoxDecoration(
              color: Colors.white24,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 140,
                height: 13,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(7),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: 96,
                height: 10,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom honey-drip bottom clip
// ─────────────────────────────────────────────────────────────────────────────
class _HoneyDripClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();

    path.lineTo(0, size.height - 28);

    // First gentle curve (right side in RTL — actually left in screen coords)
    path.quadraticBezierTo(
      size.width * 0.20, size.height + 10,
      size.width * 0.40, size.height - 20,
    );
    // Second curve rises slightly
    path.quadraticBezierTo(
      size.width * 0.60, size.height - 44,
      size.width * 0.80, size.height - 16,
    );
    // Final curve back down to edge
    path.quadraticBezierTo(
      size.width * 0.92, size.height - 6,
      size.width, size.height - 18,
    );

    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> _) => false;
}
