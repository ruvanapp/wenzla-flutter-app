import 'package:flutter/material.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// سوق العسل – Premium Design System: Color Tokens v2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Primary Brand ───────────────────────────────────────────────────────────
const kHoney      = Color(0xFFC08B22); // Deep honey gold – primary brand
const kHoneyLight = Color(0xFFD4A437); // Medium honey – secondary / tints
const kAmber      = Color(0xFFD97706); // Warm amber – highlights
const kDarkHoney  = Color(0xFF9A6B14); // Pressed / active state
const kCaramel    = Color(0xFF7A3E10); // Dark caramel accent
const kRoyal      = Color(0xFF2C1204); // Deep royal brown – heavy surfaces

// ─── Text ────────────────────────────────────────────────────────────────────
const kTextDark   = Color(0xFF1A0E02); // Primary text
const kTextBrown  = Color(0xFF4A2A10); // Secondary text
const kTextMuted  = Color(0xFF9A7848); // Muted / placeholder
const kTextOnDark = Color(0xFFF5E8C8); // Text on dark surfaces

// ─── Background & Surface ────────────────────────────────────────────────────
const kBackground  = Color(0xFFF5ECD8); // Warm ivory – page background
const kSurface     = Color(0xFFFFFFFF); // Card surface
const kSurfaceWarm = Color(0xFFFFF0D0); // Cream card surface
const kSurfaceDark = Color(0xFF1E0E02); // Deep dark surface (headers/hero)

// ─── Borders & Dividers ──────────────────────────────────────────────────────
const kBorder      = Color(0xFFDFC890);
const kDivider     = Color(0xFFEDD9A8);

// ─── Status ──────────────────────────────────────────────────────────────────
const kSuccess = Color(0xFF166534);
const kError   = Color(0xFFB91C1C);
const kWarning = Color(0xFFB45309);
const kInfo    = Color(0xFF0369A1);

// ─── Gradient Presets ────────────────────────────────────────────────────────
/// Primary honey gradient: deep gold → caramel
const kGradientPrimary = LinearGradient(
  colors: [Color(0xFFD4A437), Color(0xFF9A6B14)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

/// Dark luxury gradient: royal brown → deep caramel
const kGradientDark = LinearGradient(
  colors: [Color(0xFF2C1204), Color(0xFF7A3E10)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

/// Warm gold header gradient
const kGradientHeader = LinearGradient(
  colors: [Color(0xFFEAA82A), Color(0xFFC08B22), Color(0xFF8A6016)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

/// Subtle warm surface tint gradient
const kGradientSurface = LinearGradient(
  colors: [Color(0xFFFFF8EC), Color(0xFFF5ECD8)],
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
);

// ─── Shadow Helpers ───────────────────────────────────────────────────────────
List<BoxShadow> get kCardShadow => [
  BoxShadow(
    color: const Color(0xFFBF8820).withOpacity(0.12),
    blurRadius: 16,
    spreadRadius: 0,
    offset: const Offset(0, 4),
  ),
  BoxShadow(
    color: Colors.black.withOpacity(0.04),
    blurRadius: 4,
    offset: const Offset(0, 1),
  ),
];

List<BoxShadow> get kLiftedShadow => [
  BoxShadow(
    color: const Color(0xFFBF8820).withOpacity(0.18),
    blurRadius: 28,
    spreadRadius: 0,
    offset: const Offset(0, 10),
  ),
  BoxShadow(
    color: Colors.black.withOpacity(0.06),
    blurRadius: 8,
    offset: const Offset(0, 2),
  ),
];

List<BoxShadow> get kNavShadow => [
  BoxShadow(
    color: Colors.black.withOpacity(0.10),
    blurRadius: 24,
    spreadRadius: 0,
    offset: const Offset(0, -6),
  ),
  BoxShadow(
    color: const Color(0xFFBF8820).withOpacity(0.06),
    blurRadius: 8,
    offset: const Offset(0, -2),
  ),
];

List<BoxShadow> get kButtonShadow => [
  BoxShadow(
    color: const Color(0xFFBF8820).withOpacity(0.35),
    blurRadius: 16,
    spreadRadius: 0,
    offset: const Offset(0, 6),
  ),
];

// ─── Category Visuals ─────────────────────────────────────────────────────────
class CategoryVisual {
  final IconData icon;
  final List<Color> gradient;
  const CategoryVisual(this.icon, this.gradient);
}

const Map<String, CategoryVisual> kCategoryVisuals = {
  'مناحل عسل طبيعي':
      CategoryVisual(Icons.filter_vintage_rounded,
          [Color(0xFFE8A020), Color(0xFFC06410)]),
  'عطارات أعشاب طبية':
      CategoryVisual(Icons.eco_rounded,
          [Color(0xFF5A9B5E), Color(0xFF1E6B22)]),
  'عصارات زيوت طبيعية':
      CategoryVisual(Icons.water_drop_rounded,
          [Color(0xFFC4844C), Color(0xFF7A4018)]),
  'حبوب بن وقهوة':
      CategoryVisual(Icons.local_cafe_rounded,
          [Color(0xFFB08040), Color(0xFF5C3818)]),
};

// ─── Radius System ────────────────────────────────────────────────────────────
const double kRadiusXS  =  6.0;
const double kRadiusS   = 10.0;
const double kRadiusM   = 14.0;
const double kRadiusL   = 18.0;
const double kRadiusXL  = 24.0;
const double kRadiusXXL = 32.0;

// ─── Spacing System ───────────────────────────────────────────────────────────
const double kSpaceXS  =  4.0;
const double kSpaceS   =  8.0;
const double kSpaceM   = 12.0;
const double kSpaceL   = 16.0;
const double kSpaceXL  = 20.0;
const double kSpaceXXL = 28.0;
