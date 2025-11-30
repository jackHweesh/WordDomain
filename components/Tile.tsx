import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Coordinate } from '../core/types';

interface TileProps {
  letter: string;
  coord: Coordinate;
  type: 'start' | 'end' | 'selected' | 'last-selected' | 'normal' | 'used';
  disabled: boolean;
  onPress: () => void;
  size?: number;
}

export default function Tile({ letter, type, disabled, onPress, size }: TileProps) {
  if (!letter) {
    return (
      <TouchableOpacity 
        style={[
          styles.tile, 
          styles.empty,
          size && { width: size, height: size }
        ]} 
        disabled 
      />
    );
  }

  const getTileStyle = (): ViewStyle => {
    switch (type) {
      case 'start':
        return styles.startTile;
      case 'end':
        return styles.endTile;
      case 'selected':
      case 'last-selected': // Both selected tiles are green
        return styles.selectedTile;
      case 'used':
        return styles.usedTile;
      default:
        return styles.normalTile;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.tile, 
        getTileStyle(), 
        disabled && styles.disabled,
        size && { width: size, height: size }
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.letter, 
        type === 'used' && styles.usedLetter,
        type === 'end' && styles.endLetter
      ]}>
        {letter.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    margin: 2,
    // Subtle shadow for depth like physical tiles
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  empty: {
    backgroundColor: '#E8DDD4', // Warm beige for empty spaces
  },
  normalTile: {
    backgroundColor: '#FAF8F3', // Cream
    borderWidth: 1,
    borderColor: '#D4C5B9', // Soft beige border
  },
  startTile: {
    backgroundColor: '#D4B896', // Warm tan
    borderWidth: 2,
    borderColor: '#8B6F47', // Darker brown accent
  },
  endTile: {
    backgroundColor: '#8B6F47', // Warm dark brown
    borderWidth: 2,
    borderColor: '#5D4E37', // Darker brown
  },
  selectedTile: {
    backgroundColor: '#D4B896', // Warm tan for selected
    borderWidth: 2,
    borderColor: '#8B6F47', // Darker brown accent
  },
  usedTile: {
    backgroundColor: '#E8DDD4', // Warm beige, faded
    borderWidth: 1,
    borderColor: '#D4C5B9', // Soft border
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  letter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown text
  },
  usedLetter: {
    color: '#A8A19A', // Warm gray for used tiles
  },
  endLetter: {
    color: '#FAF8F3', // Cream text on dark brown END tile
  },
});
