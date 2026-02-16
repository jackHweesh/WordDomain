import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../src/styles/theme';

interface TokenIconProps {
  size?: number;
  /** Optional count to show next to the token (same color as token, no + or -) */
  count?: number;
  style?: ViewStyle;
}

const TOKEN_FILL = Colors.accent;
const TOKEN_RIM = Colors.surfaceDark;

export default function TokenIcon({ size = 24, count, style }: TokenIconProps) {
  const stroke = Math.max(1.5, size * 0.12);
  const innerSize = size - stroke * 2;

  return (
    <View style={[styles.container, { height: size }, style]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: TOKEN_RIM,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: TOKEN_FILL,
            },
          ]}
        />
      </View>
      {count !== undefined && count !== null && (
        <Text style={[styles.count, { fontSize: size * 0.7, color: TOKEN_FILL }]}>
          {count}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  fill: {},
  count: {
    fontWeight: '700',
  },
});
