import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../src/styles/theme';

interface TrophyIconProps {
  size?: number;
  /** Use light/white colors for dark backgrounds (e.g. Blackout card) */
  light?: boolean;
}

export default function TrophyIcon({ size = 20, light = false }: TrophyIconProps) {
  const getColors = () => {
    if (light) {
      return {
        main: '#FFFFFF',
        accent: '#E0E0E0',
        base: '#B0B0B0',
      };
    }
    return {
      main: '#FFD700',      // Gold
      accent: '#FFA500',    // Orange-gold
      base: '#FF8C00',      // Darker gold for base
    };
  };

  const colors = getColors();
  const scale = size / 20; // Base size is 20

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Cup - circular like medal body */}
      <View
        style={[
          styles.cup,
          {
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: (size * 0.75) / 2,
            backgroundColor: colors.main,
            borderWidth: 2 * scale,
            borderColor: colors.accent,
            top: size * 0.08,
            left: (size - size * 0.75) / 2,
          },
        ]}
      >
        {/* Inner circle for depth (like medal) */}
        <View
          style={[
            styles.innerCircle,
            {
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: (size * 0.45) / 2,
              borderWidth: 1 * scale,
              borderColor: colors.accent,
              backgroundColor: 'transparent',
            },
          ]}
        />
      </View>
      
      {/* Left Handle */}
      <View
        style={[
          styles.handle,
          {
            width: size * 0.14,
            height: size * 0.32,
            borderRadius: size * 0.07,
            backgroundColor: colors.main,
            borderWidth: 2 * scale,
            borderColor: colors.accent,
            left: size * 0.06,
            top: size * 0.18,
          },
        ]}
      />
      
      {/* Right Handle */}
      <View
        style={[
          styles.handle,
          {
            width: size * 0.14,
            height: size * 0.32,
            borderRadius: size * 0.07,
            backgroundColor: colors.main,
            borderWidth: 2 * scale,
            borderColor: colors.accent,
            right: size * 0.06,
            top: size * 0.18,
          },
        ]}
      />
      
      {/* Neck/Stem */}
      <View
        style={[
          styles.neck,
          {
            width: size * 0.18,
            height: size * 0.1,
            borderRadius: size * 0.04,
            backgroundColor: colors.accent,
            borderWidth: 1 * scale,
            borderColor: colors.base,
            top: size * 0.75,
            left: (size - size * 0.18) / 2,
          },
        ]}
      />
      
      {/* Base - wider platform */}
      <View
        style={[
          styles.base,
          {
            width: size * 0.55,
            height: size * 0.12,
            borderRadius: size * 0.06,
            backgroundColor: colors.base,
            borderWidth: 2 * scale,
            borderColor: colors.accent,
            top: size * 0.82,
            left: (size - size * 0.55) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  cup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  innerCircle: {
    position: 'absolute',
  },
  handle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  neck: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

