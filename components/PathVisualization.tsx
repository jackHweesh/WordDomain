import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Coordinate } from '../core/types';
import { Colors } from '../src/styles/theme';

interface PathVisualizationProps {
  grid: string[][];
  playedWords: Array<{ word: string; path: Coordinate[] }>;
  initialStart: Coordinate;
  size?: number; // Size of the visualization container
  easyWords?: string[]; // Easy path words to check if words were hinted
  easyPath?: Coordinate[]; // Easy path coordinates to check if tiles were hinted
  hintedWordIndices?: Set<number>; // Set of word indices that were hinted (common hint)
  optimalWords?: string[] | null; // Optimal path words
  optimalPath?: Coordinate[] | null; // Optimal path coordinates
  optimalHintedWordIndices?: Set<number>; // Set of word indices that were hinted (gold hint)
  commonHintUsedWordIndices?: Set<number>; // Set of common hint word indices that were actually used
  goldHintUsedWordIndices?: Set<number>; // Set of gold hint word indices that were actually used
}

export default function PathVisualization({
  grid,
  playedWords,
  initialStart,
  size = 120,
  easyWords,
  easyPath,
  hintedWordIndices = new Set(),
  optimalWords,
  optimalPath,
  optimalHintedWordIndices = new Set(),
  commonHintUsedWordIndices = new Set(),
  goldHintUsedWordIndices = new Set(),
}: PathVisualizationProps) {
  const gridSize = grid.length;
  const tileSize = Math.floor((size - 8) / gridSize) - 2; // Account for padding and gaps

  // Collect all start tiles:
  // 1. Initial start
  // 2. Last tile of each word (becomes start for next word)
  const startTiles = new Set<string>();
  startTiles.add(`${initialStart.row},${initialStart.col}`);
  
  playedWords.forEach(word => {
    if (word.path.length > 0) {
      const lastTile = word.path[word.path.length - 1];
      startTiles.add(`${lastTile.row},${lastTile.col}`);
    }
  });

  // Helper function to get tiles for a specific word index from a path
  const getWordTiles = (words: string[], path: Coordinate[], wordIndex: number): Set<string> => {
    const tiles = new Set<string>();
    if (!words || !path || wordIndex < 0 || wordIndex >= words.length) return tiles;
    
    // Find the starting path index for this word
    let pathIndex = 0;
    for (let i = 0; i < wordIndex; i++) {
      const word = words[i];
      const isFirst = i === 0;
      for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
        if (!isFirst && letterIndex === 0) {
          // Skip first letter of subsequent words (overlap)
        } else {
          pathIndex++;
        }
      }
    }
    
    // Get tiles for this word
    const word = words[wordIndex];
    const isFirst = wordIndex === 0;
    const seenCoords = new Set<string>();
    
    for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
      if (pathIndex >= path.length) break;
      
      const coord = path[pathIndex];
      const tileKey = `${coord.row},${coord.col}`;
      
      if (!seenCoords.has(tileKey)) {
        tiles.add(tileKey);
        seenCoords.add(tileKey);
      }
      
      if (!isFirst && letterIndex === 0) {
        // Letter already placed by previous word, pathIndex stays the same
      } else {
        pathIndex++;
      }
    }
    
    return tiles;
  };

  // Helper function to get the path coordinates for a specific word index
  // FIXED: Walks the combined path word by word and detects overlap duplication automatically
  const getWordPathForIndex = (words: string[], path: Coordinate[], wordIndex: number): Coordinate[] => {
    const coords: Coordinate[] = [];
    if (!words || !path || wordIndex < 0 || wordIndex >= words.length) return coords;
    
    // Walk through the combined path word by word
    let pathIndex = 0;
    
    // First, walk through all words before wordIndex to find the starting position
    for (let i = 0; i < wordIndex; i++) {
      const word = words[i];
      if (!word || pathIndex >= path.length) break;
      
      // Extract exactly word.length tiles for this word
      const wordTiles: Coordinate[] = [];
      for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
        if (pathIndex >= path.length) break;
        wordTiles.push(path[pathIndex]);
        pathIndex++;
      }
      
      // After extracting the word, check for overlap duplication
      if (wordTiles.length > 0 && pathIndex < path.length) {
        const lastTile = wordTiles[wordTiles.length - 1];
        const nextTile = path[pathIndex];
        
        // Check if next tile is the same as last tile (overlap is duplicated)
        const overlapDuplicated = lastTile.row === nextTile.row && lastTile.col === nextTile.col;
        
        if (!overlapDuplicated) {
          // Overlap is shared (not duplicated) - we need to go back one
          // because pathIndex already points to the next word's first tile
          // which is the same as this word's last tile
          pathIndex--;
        }
        // If overlapDuplicated is true, pathIndex is already correct (pointing to the duplicated overlap)
      }
    }
    
    // Now extract the tiles for the requested wordIndex
    const word = words[wordIndex];
    if (!word) return coords;
    
    // Extract exactly word.length tiles
    for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
      if (pathIndex >= path.length) break;
      coords.push(path[pathIndex]);
      pathIndex++;
    }
    
    return coords;
  };

  // Helper function to check if a played word matches a specific word and path exactly
  const checkWordMatchesHint = (
    playedWord: { word: string; path: Coordinate[] },
    hintWord: string,
    hintPath: Coordinate[]
  ): boolean => {
    // Check if words match
    if (playedWord.word.toLowerCase() !== hintWord.toLowerCase()) {
      return false;
    }
    
    // Check if paths match exactly (same tiles in same order)
    if (playedWord.path.length !== hintPath.length) {
      return false;
    }
    
    for (let i = 0; i < playedWord.path.length; i++) {
      if (playedWord.path[i].row !== hintPath[i].row || 
          playedWord.path[i].col !== hintPath[i].col) {
        return false;
      }
    }
    
    return true;
  };

  // SIMPLIFIED LOGIC: commonHintUsedWordIndices and goldHintUsedWordIndices already contain
  // only word indices that were BOTH hinted AND used (calculated at win time)
  // We just need to find which played words match these hint words and mark their tiles green
  const hintedWordTiles = new Set<string>();
  
  // DEBUG: Log what we received
  console.log('🔍 DEBUG [PathVisualization]: Received props:');
  console.log('  - commonHintUsedWordIndices:', Array.from(commonHintUsedWordIndices));
  console.log('  - goldHintUsedWordIndices:', Array.from(goldHintUsedWordIndices));
  console.log('  - playedWords count:', playedWords.length);
  console.log('  - playedWords:', playedWords.map(w => ({ word: w.word, pathLength: w.path.length })));
  
  // Helper: Mark tiles green for a specific hint word index
  // This function processes ONE hint word index and marks ALL its matching tiles green
  const markTilesForHintWord = (
    wordIndex: number,
    hintWords: string[],
    hintPath: Coordinate[]
  ) => {
    if (wordIndex >= hintWords.length) {
      console.log('🔍 DEBUG [PathVisualization]: markTilesForHintWord - wordIndex', wordIndex, 'out of bounds');
      return;
    }
    
    const hintWord = hintWords[wordIndex];
    const hintPathForWord = getWordPathForIndex(hintWords, hintPath, wordIndex);
    console.log('🔍 DEBUG [PathVisualization]: markTilesForHintWord - wordIndex', wordIndex, '- hintWord:', hintWord, '- hintPathLength:', hintPathForWord.length);
    
    // Find the played word that matches this hint word exactly
    // IMPORTANT: Check ALL played words, not just the first one
    let foundMatch = false;
    for (const playedWord of playedWords) {
      const matches = checkWordMatchesHint(playedWord, hintWord, hintPathForWord);
      if (matches) {
        console.log('🔍 DEBUG [PathVisualization]: ✅ MATCH FOUND for wordIndex', wordIndex, '- marking', playedWord.path.length, 'tiles green');
        // Mark all tiles of this matching played word as green (excluding start tiles)
        // Each tile is added to the Set, so duplicates are automatically handled
        let tilesMarked = 0;
        playedWord.path.forEach((tile) => {
          const tileKey = `${tile.row},${tile.col}`;
          if (!startTiles.has(tileKey)) {
            hintedWordTiles.add(tileKey);
            tilesMarked++;
          }
        });
        console.log('🔍 DEBUG [PathVisualization]: Marked', tilesMarked, 'tiles green for wordIndex', wordIndex);
        foundMatch = true;
        // Break after finding the match for this wordIndex
        // This is correct - we only want to mark tiles once per wordIndex
        break;
      }
    }
    if (!foundMatch) {
      console.log('🔍 DEBUG [PathVisualization]: ❌ NO MATCH found for wordIndex', wordIndex, '- hintWord:', hintWord);
    }
  };
  
  // Mark tiles green for all common hint words that were used
  // CRITICAL: Iterate through ALL indices in commonHintUsedWordIndices, not just the first one
  if (easyPath && easyWords && commonHintUsedWordIndices.size > 0) {
    // Convert Set to Array to ensure we process all elements
    const hintIndicesArray = Array.from(commonHintUsedWordIndices);
    console.log('🔍 DEBUG [PathVisualization]: Processing', hintIndicesArray.length, 'common hint indices:', hintIndicesArray);
    for (const wordIndex of hintIndicesArray) {
      markTilesForHintWord(wordIndex, easyWords, easyPath);
    }
    console.log('🔍 DEBUG [PathVisualization]: Total hinted tiles marked green:', hintedWordTiles.size);
  } else {
    console.log('🔍 DEBUG [PathVisualization]: Skipping common hints - easyPath:', !!easyPath, 'easyWords:', !!easyWords, 'size:', commonHintUsedWordIndices.size);
  }
  
  // Mark tiles green for all gold hint words that were used
  // CRITICAL: Iterate through ALL indices in goldHintUsedWordIndices, not just the first one
  if (optimalPath && optimalWords && goldHintUsedWordIndices.size > 0) {
    // Convert Set to Array to ensure we process all elements
    const hintIndicesArray = Array.from(goldHintUsedWordIndices);
    for (const wordIndex of hintIndicesArray) {
      markTilesForHintWord(wordIndex, optimalWords, optimalPath);
    }
  }
  
  // Collect all tiles used in paths (but not start tiles)
  const usedTiles = new Set<string>();
  
  playedWords.forEach((word) => {
    word.path.forEach((tile) => {
      const tileKey = `${tile.row},${tile.col}`;
      // Only add if it's not a start tile
      if (!startTiles.has(tileKey)) {
        usedTiles.add(tileKey);
      }
    });
  });

  const getTileStyle = (row: number, col: number): any => {
    const tileKey = `${row},${col}`;
    
    if (startTiles.has(tileKey)) {
      // Gold for start tiles
      return {
        backgroundColor: Colors.accent,
        borderWidth: 1,
        borderColor: Colors.accent,
      };
    } else if (hintedWordTiles.has(tileKey)) {
      // Sage green for tiles from hinted words
      return {
        backgroundColor: Colors.hintGreen,
        borderWidth: 1,
        borderColor: Colors.hintGreen,
      };
    } else if (usedTiles.has(tileKey)) {
      // Royal blue for used tiles (not start, not hinted)
      return {
        backgroundColor: Colors.accentSecondary,
        borderWidth: 1,
        borderColor: Colors.accentSecondary,
      };
    } else {
      // Normal tile for unused
      return {
        backgroundColor: Colors.tileBackground,
        borderWidth: 1,
        borderColor: Colors.tileBorder,
      };
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((letter, colIndex) => {
            // Skip empty cells
            if (!letter) {
              return (
                <View
                  key={`${rowIndex}-${colIndex}`}
                  style={[styles.tile, { width: tileSize, height: tileSize }]}
                />
              );
            }

            return (
              <View
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  getTileStyle(rowIndex, colIndex),
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    margin: 1,
    borderRadius: 3,
  },
});

