/**
 * Global Design System
 * 
 * Centralized theme constants for colors, spacing, typography, and shadows
 */

export const Colors = {
  background: 'transparent',      // app uses blue/violet gradient from root
  surface: '#E1C7A3',             // light tan
  surfaceDark: '#5A3B25',         // deep brown for headers / board frames
  accent: '#F4B345',              // warm gold for primary CTAs
  accentSecondary: '#6495ED',     // cornflower blue for selected tiles
  textPrimary: '#000000',        // black (headers, primary text)
  textSecondary: '#7C5C42',       // muted brown
  danger: '#BF4B4B',              // error
  tileBackground: '#F8F3EB',      // subtle off-white tile fill
  tileBorder: '#D8CDBE',          // faint border
  fogGrey: '#B8B8B8',             // messy light grey for Fog of War
  blackout: '#1A1A1A',            // black for Blackout mode
  hintGreen: '#9CAF88',           // sage green for hinted tiles
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

export const Fonts = {
  title: { fontSize: 32, fontWeight: '700' as const, letterSpacing: 0.5 },
  subtitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.textSecondary },
  body: { fontSize: 16, fontWeight: '400' as const, color: Colors.textPrimary },
  small: { fontSize: 14, color: Colors.textSecondary },
};

