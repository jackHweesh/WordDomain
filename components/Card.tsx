import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../src/styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[] | (ViewStyle | false | undefined)[];
  padding?: 'md' | 'lg';
}

export default function Card({ children, style, padding = 'md' }: CardProps) {
  return (
    <View style={[
      styles.card,
      { padding: padding === 'md' ? Spacing.md : Spacing.lg },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.soft,
  },
});

