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

  const AccountHeader({
    super.key,
    required this.name,
    required this.phone,
    this.isLoading = false,
    this.onSearchTap,
    this.onMenuTap,
  });

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: _HoneyDripClipper(),
      child: Container(
        // Extra bottom padding to keep the clip visible.
        padding: const EdgeInsets.only(bottom: 36),
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
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
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
                const SizedBox(height: 22),
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.20),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _userInfo() {
    final initials = name.isNotEmpty
        ? name.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join()
        : '؟';

    return Row(
      textDirection: TextDirection.rtl,
      children: [
        // Avatar circle
        Container(
          width: 62,
          height: 62,
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
                fontSize: 22,
                color: kDarkHoney,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        // Name + phone
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                  fontSize: 17,
                  color: Colors.white,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              if (phone.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.85),
                  ),
                ),
              ],
            ],
          ),
        ),
        // Edit profile hint
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.edit_outlined, color: Colors.white, size: 13),
              SizedBox(width: 4),
              Text(
                'تعديل',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 11,
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _skeleton() {
    return Row(
      textDirection: TextDirection.rtl,
      children: [
        Container(
          width: 62,
          height: 62,
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
              width: 130,
              height: 14,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(7),
              ),
            ),
            const SizedBox(height: 6),
            Container(
              width: 90,
              height: 11,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
          ],
        ),
      ],
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
