import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../src/styles/theme';

interface LightbulbIconProps {
  size?: number;
  /**
   * Background color BEHIND the icon.
   * Needed to "carve" the neck pinch using masking Views.
   * If your button has a solid fill, set this to that fill color.
   */
  bgColor?: string;
}

export default function LightbulbIcon({
  size = 32,
  bgColor = 'transparent',
}: LightbulbIconProps) {
  const S = size;

  // Stroke thickness — clamp so tiny icons don't get hairline strokes
  const T = Math.max(1.5, S * 0.06);

  const outlineBrown = Colors.surfaceDark;
  const bulbYellow = '#F7E27B';
  const baseGray = '#9E9E9E';
  const stripeGray = '#C9C9C9';

  // Helper function for absolute positioning
  const abs = (left: number, top: number, w: number, h: number, r?: number) => ({
    position: 'absolute' as const,
    left,
    top,
    width: w,
    height: h,
    borderRadius: r ?? 0,
  });

  return (
    <View style={[styles.container, { width: S, height: S }]}>
      {/* ==================================================
          Bulb GLASS FILL (no borders, just yellow union)
          Then we carve pinch with bgColor masks if provided.
         ================================================== */}
      {/* Big yellow dome */}
      <View
        style={[
          abs(0.18 * S, 0.18 * S, 0.64 * S, 0.64 * S, 999),
          { backgroundColor: bulbYellow },
        ]}
      />

      {/* Slight lower bulge to keep roundness near bottom */}
      <View
        style={[
          abs(0.22 * S, 0.45 * S, 0.56 * S, 0.40 * S, 999),
          { backgroundColor: bulbYellow },
        ]}
      />

      {/* Neck fill block (will be pinched by masks) */}
      <View
        style={[
          abs(0.33 * S, 0.62 * S, 0.34 * S, 0.16 * S, 999),
          { backgroundColor: bulbYellow },
        ]}
      />

      {/* ---- Pinch masks (carve inward). Only works if bgColor is solid. ---- */}
      {/* Left carve circle */}
      <View
        style={[
          abs(0.18 * S, 0.60 * S, 0.26 * S, 0.26 * S, 999),
          { backgroundColor: bgColor },
        ]}
      />
      {/* Right carve circle */}
      <View
        style={[
          abs(0.56 * S, 0.60 * S, 0.26 * S, 0.26 * S, 999),
          { backgroundColor: bgColor },
        ]}
      />

      {/* ==================================================
          Bulb OUTLINE (one continuous outline = no seams)
          This is the key improvement.
         ================================================== */}
      <View
        style={[
          abs(0.18 * S, 0.18 * S, 0.64 * S, 0.64 * S, 999),
          {
            backgroundColor: 'transparent',
            borderColor: outlineBrown,
            borderWidth: T,
          },
        ]}
      />
      {/* Outline neck — separate piece, but we hide the join under the collar */}
      <View
        style={[
          abs(0.33 * S, 0.62 * S, 0.34 * S, 0.16 * S, 999),
          {
            backgroundColor: 'transparent',
            borderColor: outlineBrown,
            borderWidth: T,
          },
        ]}
      />

      {/* =========================
          Collar (gray cap)
         ========================= */}
      <View
        style={[
          abs(0.28 * S, 0.72 * S, 0.44 * S, 0.10 * S, 999),
          {
            backgroundColor: baseGray,
            borderColor: outlineBrown,
            borderWidth: T,
          },
        ]}
      />

      {/* =========================
          Screw outer cylinder
         ========================= */}
      <View
        style={[
          abs(0.28 * S, 0.80 * S, 0.44 * S, 0.18 * S, 0.06 * S),
          {
            backgroundColor: 'transparent',
            borderColor: outlineBrown,
            borderWidth: T,
          },
        ]}
      />

      {/* =========================
          Screw stripes (no weird overlaps)
         ========================= */}
      {[
        0.815 * S,
        0.865 * S,
        0.915 * S,
      ].map((y, i) => (
        <View
          key={i}
          style={[
            abs(0.32 * S, y, 0.36 * S, 0.045 * S, 999),
            {
              backgroundColor: stripeGray,
              borderColor: outlineBrown,
              borderWidth: Math.max(1, T * 0.75),
            },
          ]}
        />
      ))}

      {/* =========================
          Bottom nub
         ========================= */}
      <View
        style={[
          abs(0.42 * S, 0.965 * S, 0.16 * S, 0.055 * S, 999),
          {
            backgroundColor: baseGray,
            borderColor: outlineBrown,
            borderWidth: T,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
});
