import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../src/styles/theme';

interface WordDomainLogoProps {
  size?: number;
}

export default function WordDomainLogo({ size = 80 }: WordDomainLogoProps) {
  const gridSize = 5;
  const tileSize = (size - Spacing.xs * 2) / gridSize;
  
  // Path as specified:
  // (0,0) yellow/gold START
  // Right to (0,1) blue
  // Right to (0,2) blue
  // Down to (1,2) yellow/gold
  // Right to (1,3) blue
  // Down to (2,3) blue
  // Down to (3,3) blue
  // Right to (3,4) blue
  // Down to (4,4) yellow/gold END
  const path = [
    { row: 0, col: 0 }, // START yellow/gold
    { row: 0, col: 1 }, // blue
    { row: 0, col: 2 }, // blue
    { row: 1, col: 2 }, // yellow/gold
    { row: 1, col: 3 }, // blue
    { row: 2, col: 3 }, // blue
    { row: 3, col: 3 }, // blue
    { row: 3, col: 4 }, // blue
    { row: 4, col: 4 }, // END yellow/gold
  ];
  
  const pathSet = new Set<string>();
  path.forEach(p => pathSet.add(`${p.row},${p.col}`));
  
  const isStart = (row: number, col: number) => row === 0 && col === 0;
  const isYellowTile = (row: number, col: number) => 
    (row === 0 && col === 0) || (row === 1 && col === 2) || (row === 4 && col === 4);
  const isOnPath = (row: number, col: number) => pathSet.has(`${row},${col}`);
  
  const getTileStyle = (row: number, col: number) => {
    if (isYellowTile(row, col)) {
      return {
        backgroundColor: Colors.accent, // Gold/yellow
        borderWidth: 1,
        borderColor: Colors.accent,
      };
    } else if (isOnPath(row, col)) {
      return {
        backgroundColor: Colors.accentSecondary, // Royal blue
        borderWidth: 1,
        borderColor: Colors.accentSecondary,
      };
    } else {
      return {
        backgroundColor: Colors.tileBackground,
        borderWidth: 1,
        borderColor: Colors.tileBorder,
      };
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: gridSize }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: gridSize }, (_, colIndex) => {
            const tileStyle = getTileStyle(rowIndex, colIndex);
            
            return (
              <View
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.tile,
                  {
                    width: tileSize,
                    height: tileSize,
                  },
                  tileStyle,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xs,
    backgroundColor: Colors.tileBackground,
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: Colors.tileBorder,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 1,
  },
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
});
