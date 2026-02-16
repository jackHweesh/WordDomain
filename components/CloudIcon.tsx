import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CloudIconProps {
  size?: number;
  color?: string;
}

export default function CloudIcon({ size = 24, color = '#FFFFFF' }: CloudIconProps) {
  const s = size / 24;
  const r1 = 5 * s;
  const r2 = 6 * s;
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Cloud: top center bubble, two bottom bubbles */}
      <View style={[styles.bubble, { width: r2 * 2, height: r2 * 2, borderRadius: r2, top: 3 * s, left: (size - r2 * 2) / 2, backgroundColor: color }]} />
      <View style={[styles.bubble, { width: r1 * 2, height: r1 * 2, borderRadius: r1, top: 8 * s, left: 1 * s, backgroundColor: color }]} />
      <View style={[styles.bubble, { width: r1 * 2, height: r1 * 2, borderRadius: r1, top: 8 * s, left: size - r1 * 2 - 1 * s, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
  },
});
