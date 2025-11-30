import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Coordinate } from '../core/types';
import Tile from './Tile';

interface BoardProps {
  grid: string[][];
  start: Coordinate;
  end: Coordinate;
  selection: Coordinate[];
  usedTiles?: Set<string>;
  onTilePress: (coord: Coordinate) => void;
}

export default function Board({ grid, start, end, selection, usedTiles, onTilePress }: BoardProps) {
  const isSelected = (coord: Coordinate): boolean => {
    return selection.some(sel => sel.row === coord.row && sel.col === coord.col);
  };

  const isLastSelected = (coord: Coordinate): boolean => {
    const lastSelected = selection[selection.length - 1];
    return lastSelected && lastSelected.row === coord.row && lastSelected.col === coord.col;
  };

  const isDisabled = (coord: Coordinate): boolean => {
    const tileKey = `${coord.row},${coord.col}`;
    
    // Check if tile is used
    if (usedTiles && usedTiles.has(tileKey)) {
      return true;
    }
    
    // Check if already selected (except last one for backtracking)
    if (isSelected(coord) && !isLastSelected(coord)) {
      return true;
    }
    
    // Check if tile is empty
    if (!grid[coord.row][coord.col]) {
      return true;
    }
    
    return false;
  };

  const getTileType = (coord: Coordinate): 'start' | 'end' | 'selected' | 'last-selected' | 'normal' | 'used' => {
    const tileKey = `${coord.row},${coord.col}`;
    
    // Check if tile is used (but don't override start/end if they happen to be used)
    const isUsed = usedTiles && usedTiles.has(tileKey);
    
    if (coord.row === start.row && coord.col === start.col) {
      return 'start';
    }
    if (coord.row === end.row && coord.col === end.col) {
      return 'end';
    }
    if (isUsed) {
      return 'used';
    }
    if (isLastSelected(coord)) {
      return 'last-selected';
    }
    if (isSelected(coord)) {
      return 'selected';
    }
    return 'normal';
  };

  const gridSize = grid[0].length;
  const screenWidth = Dimensions.get('window').width;
  const tileSize = Math.floor((screenWidth - 40) / gridSize) - 4; // 40 for padding, 4 for gaps

  return (
    <View style={styles.container}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((letter, colIndex) => {
            const coord = { row: rowIndex, col: colIndex };
            return (
              <Tile
                key={`${rowIndex}-${colIndex}`}
                letter={letter}
                coord={coord}
                type={getTileType(coord)}
                disabled={isDisabled(coord)}
                onPress={() => onTilePress(coord)}
                size={tileSize}
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
    backgroundColor: '#E8DDD4', // Warm beige background like a wooden table
    borderRadius: 12,
    padding: 8,
    alignSelf: 'center',
    // Soft shadow for depth
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
  },
});
