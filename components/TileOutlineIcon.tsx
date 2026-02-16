import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../src/styles/theme';

interface TileOutlineIconProps {
  size?: number;
  color?: string;
}

export default function TileOutlineIcon({ size = 24, color = Colors.textPrimary }: TileOutlineIconProps) {
  const pad = size * 0.15;
  const inner = size - pad * 2;
  const borderRadius = inner * 0.2;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius,
          borderWidth: Math.max(1.5, size * 0.12),
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
