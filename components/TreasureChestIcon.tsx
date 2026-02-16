import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../src/styles/theme';

interface TreasureChestIconProps {
  size?: number;
  color?: string;
}

export default function TreasureChestIcon({ size = 24, color = Colors.surfaceDark }: TreasureChestIconProps) {
  const s = size / 24;
  const stroke = Math.max(1.2, size * 0.08);
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Base of chest */}
      <View
        style={[
          styles.part,
          {
            width: 16 * s,
            height: 10 * s,
            borderRadius: 2 * s,
            borderWidth: stroke,
            borderColor: color,
            backgroundColor: 'transparent',
            top: 10 * s,
            left: 4 * s,
          },
        ]}
      />
      {/* Lid */}
      <View
        style={[
          styles.part,
          {
            width: 16 * s,
            height: 6 * s,
            borderRadius: 2 * s,
            borderWidth: stroke,
            borderColor: color,
            backgroundColor: 'transparent',
            top: 6 * s,
            left: 4 * s,
          },
        ]}
      />
      {/* Lock */}
      <View
        style={[
          styles.part,
          {
            width: 4 * s,
            height: 4 * s,
            borderRadius: 2 * s,
            borderWidth: stroke,
            borderColor: color,
            backgroundColor: 'transparent',
            top: 12 * s,
            left: 10 * s,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  part: {
    position: 'absolute',
  },
});
