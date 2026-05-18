import 'package:flutter/material.dart';
import 'colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    fontFamily: 'Cairo',
    brightness: Brightness.light,
    scaffoldBackgroundColor: kBackground,

    colorScheme: ColorScheme.light(
      primary:                  kHoney,
      onPrimary:                Colors.white,
      primaryContainer:         kSurfaceWarm,
      onPrimaryContainer:       kCaramel,
      secondary:                kCaramel,
      onSecondary:              Colors.white,
      tertiary:                 kAmber,
      surface:                  kSurface,
      onSurface:                kTextDark,
      surfaceContainerHighest:  kSurfaceWarm,
      outline:                  kBorder,
      outlineVariant:           kDivider,
      error:                    kError,
      shadow:                   Color(0x14BF8820),
    ),

    // ── AppBar ──────────────────────────────────────────────────────────────
    appBarTheme: AppBarTheme(
      backgroundColor:             kBackground,
      foregroundColor:             kTextDark,
      elevation:                   0,
      scrolledUnderElevation:      0.5,
      shadowColor:                 kBorder.withOpacity(0.5),
      surfaceTintColor:            Colors.transparent,
      centerTitle:                 false,
      titleTextStyle: const TextStyle(
        fontFamily:   'Cairo',
        fontWeight:   FontWeight.w800,
        fontSize:     20,
        color:        kTextDark,
        letterSpacing: -0.3,
      ),
    ),

    // ── NavigationBar ────────────────────────────────────────────────────────
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor:             kSurface,
      indicatorColor:              kHoney.withOpacity(0.14),
      indicatorShape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(14)),
      ),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: kHoney, size: 24);
        }
        return IconThemeData(color: kTextMuted.withOpacity(0.8), size: 22);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontFamily:   'Cairo',
            fontWeight:   FontWeight.w700,
            fontSize:     11.5,
            color:        kHoney,
            letterSpacing: 0.2,
          );
        }
        return TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w500,
          fontSize:   11,
          color:      kTextMuted.withOpacity(0.8),
        );
      }),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      elevation:     0,
      height:        64,
    ),

    // ── Cards ────────────────────────────────────────────────────────────────
    cardTheme: CardTheme(
      elevation:        0,
      color:            kSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadiusL),
      ),
    ),

    // ── FilledButton ─────────────────────────────────────────────────────────
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kHoney,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(kRadiusM),
        ),
        textStyle: const TextStyle(
          fontFamily:    'Cairo',
          fontWeight:    FontWeight.w700,
          fontSize:      15,
          letterSpacing: 0.2,
        ),
        padding:   const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        elevation: 0,
      ),
    ),

    // ── OutlinedButton ───────────────────────────────────────────────────────
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kHoney,
        side:            const BorderSide(color: kHoney, width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(kRadiusM),
        ),
        textStyle: const TextStyle(
          fontFamily:  'Cairo',
          fontWeight:  FontWeight.w600,
          fontSize:    14,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
    ),

    // ── TextButton ───────────────────────────────────────────────────────────
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: kHoney,
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w600,
          fontSize:   14,
        ),
      ),
    ),

    // ── InputDecoration ──────────────────────────────────────────────────────
    inputDecorationTheme: InputDecorationTheme(
      filled:          true,
      fillColor:       kSurface,
      hintStyle: const TextStyle(
        color:      kTextMuted,
        fontFamily: 'Cairo',
        fontSize:   14,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusM),
        borderSide:   const BorderSide(color: kBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusM),
        borderSide:   const BorderSide(color: kBorder, width: 1.2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusM),
        borderSide:   const BorderSide(color: kHoney, width: 1.8),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusM),
        borderSide:   const BorderSide(color: kError, width: 1.2),
      ),
    ),

    // ── Chip ─────────────────────────────────────────────────────────────────
    chipTheme: ChipThemeData(
      backgroundColor:  kSurfaceWarm,
      selectedColor:    kHoney,
      labelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
      padding:          const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
    ),

    // ── Divider ──────────────────────────────────────────────────────────────
    dividerTheme: const DividerThemeData(
      color:     kDivider,
      thickness: 1,
      space:     0,
    ),

    // ── Dialog ───────────────────────────────────────────────────────────────
    dialogTheme: DialogTheme(
      backgroundColor:  kSurface,
      surfaceTintColor: Colors.transparent,
      elevation:        0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadiusXL),
      ),
    ),

    // ── BottomSheet ──────────────────────────────────────────────────────────
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: kBackground,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(kRadiusXL),
        ),
      ),
    ),

    // ── Snackbar ─────────────────────────────────────────────────────────────
    snackBarTheme: SnackBarThemeData(
      behavior:         SnackBarBehavior.floating,
      backgroundColor:  kSurfaceDark,
      contentTextStyle: const TextStyle(
        fontFamily: 'Cairo',
        fontWeight: FontWeight.w600,
        fontSize:   13,
        color:      kTextOnDark,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadiusM),
      ),
    ),

    // ── Typography ───────────────────────────────────────────────────────────
    textTheme: const TextTheme(
      displayLarge:   TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 28, color: kTextDark, letterSpacing: -0.5),
      headlineLarge:  TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 24, color: kTextDark, letterSpacing: -0.3),
      headlineMedium: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 20, color: kTextDark, letterSpacing: -0.2),
      headlineSmall:  TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 18, color: kTextDark),
      titleLarge:     TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 17, color: kTextDark),
      titleMedium:    TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 15, color: kTextDark),
      titleSmall:     TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 13, color: kTextBrown),
      bodyLarge:      TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w400, fontSize: 15, color: kTextDark, height: 1.6),
      bodyMedium:     TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w400, fontSize: 14, color: kTextBrown, height: 1.5),
      bodySmall:      TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w400, fontSize: 12, color: kTextMuted, height: 1.4),
      labelLarge:     TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w600, fontSize: 13, color: kTextDark),
      labelSmall:     TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w500, fontSize: 11, color: kTextMuted, letterSpacing: 0.3),
    ),
  );
}
