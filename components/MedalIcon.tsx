import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../src/styles/theme';

interface MedalIconProps {
  type: 'gold' | 'silver' | 'bronze';
  size?: number;
}

export default function MedalIcon({ type, size = 20 }: MedalIconProps) {
  const getColors = () => {
    switch (type) {
      case 'gold':
        return {
          main: '#FFD700',
          accent: '#FFA500',
          ribbon: '#FF8C00',
        };
      case 'silver':
        return {
          main: '#C0C0C0',
          accent: '#A8A8A8',
          ribbon: '#808080',
        };
      case 'bronze':
        return {
          main: '#CD7F32',
          accent: '#B87333',
          ribbon: '#8B4513',
        };
      default:
        return {
          main: Colors.textSecondary,
          accent: Colors.textSecondary,
          ribbon: Colors.textSecondary,
        };
    }
  };

  const colors = getColors();
  const scale = size / 20; // Base size is 20

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Medal body - circular */}
      <View
        style={[
          styles.medalBody,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: (size * 0.85) / 2,
            backgroundColor: colors.main,
            borderWidth: 2 * scale,
            borderColor: colors.accent,
          },
        ]}
      >
        {/* Inner circle for depth */}
        <View
          style={[
            styles.innerCircle,
            {
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: (size * 0.5) / 2,
              borderWidth: 1 * scale,
              borderColor: colors.accent,
            },
          ]}
        />
      </View>
      
      {/* Ribbon at top */}
      <View
        style={[
          styles.ribbon,
          {
            width: size * 0.4,
            height: size * 0.15,
            backgroundColor: colors.ribbon,
            top: -size * 0.05,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  medalBody: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  innerCircle: {
    backgroundColor: 'transparent',
  },
  ribbon: {
    position: 'absolute',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});

