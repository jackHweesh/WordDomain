import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Fonts } from '../src/styles/theme';

interface PillBadgeProps {
  text: string;
  borderColor?: 'accent' | 'surfaceDark';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function PillBadge({ 
  text, 
  borderColor = 'surfaceDark',
  style,
  textStyle 
}: PillBadgeProps) {
  const borderColorValue = borderColor === 'accent' ? Colors.accent : Colors.surfaceDark;

  return (
    <View style={[
      styles.badge,
      { borderColor: borderColorValue },
      style,
    ]}>
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.tileBackground,
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  text: {
    ...Fonts.small,
    fontWeight: '600',
  },
});

