import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Coordinate } from '../core/types';
import Tile from './Tile';
import { Colors } from '../src/styles/theme';

interface FogOfWarBoardProps {
  grid: string[][];
  start: Coordinate;
  end: Coordinate;
  selection: Coordinate[];
  usedTiles?: Set<string>;
  fadingTiles?: Set<string>;
  hintedTiles?: Set<string>;
  glowingHintTiles?: Set<string>; // Tiles that are currently glowing green
  onTilePress: (coord: Coordinate) => void;
  animationTrigger?: { coord: Coordinate; type: 'select' | 'unselect' | 'invalid' } | null;
  fogMap: boolean[][]; // 2D array: true = hidden, false = visible
}

export default function FogOfWarBoard({ 
  grid, 
  start, 
  end, 
  selection, 
  usedTiles, 
  fadingTiles,
  hintedTiles,
  glowingHintTiles,
  onTilePress, 
  animationTrigger,
  fogMap
}: FogOfWarBoardProps) {
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

  const getTileType = (coord: Coordinate): 'start' | 'end' | 'selected' | 'last-selected' | 'normal' | 'used' | 'hinted' => {
    const tileKey = `${coord.row},${coord.col}`;
    
    // Check if tile is used (but don't override start/end if they happen to be used)
    const isUsed = usedTiles && usedTiles.has(tileKey);
    const isGlowing = glowingHintTiles && glowingHintTiles.has(tileKey); // Only show green if currently glowing
    const isEndTile = coord.row === end.row && coord.col === end.col;
    const isStartTile = coord.row === start.row && coord.col === start.col;
    
    // Start tile always stays gold
    if (isStartTile) {
      return 'start';
    }
    
    // End tile should be blue when selected, not gold
    if (isEndTile) {
      if (isLastSelected(coord) || isSelected(coord)) {
        return isLastSelected(coord) ? 'last-selected' : 'selected';
      }
      return isGlowing ? 'hinted' : 'end';
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
    if (isGlowing) {
      return 'hinted';
    }
    return 'normal';
  };

  const gridSize = grid[0].length;
  const screenWidth = Dimensions.get('window').width;
  const tileSize = Math.floor((screenWidth - 40) / gridSize) - 4; // Match Board calculation
  
  // Fog size is 140% of tile size to ensure seamless coverage with no visible edges
  // Larger overlap eliminates any gaps or seams between adjacent fog overlays
  const fogSize = Math.floor(tileSize * 1.4);
  // Center fog on tile: offset = (fogSize - tileSize) / 2
  const fogOffset = (fogSize - tileSize) / 2;

  // Check if a tile should be fogged using fogMap
  const isFogged = (row: number, col: number): boolean => {
    // Safety check - if fogMap is empty or invalid, don't fog anything
    if (!fogMap || !fogMap[row] || fogMap[row][col] === undefined) {
      return false;
    }
    
    // Use fogMap: true = hidden/fogged, false = visible
    // All tiles (including start and end) follow the same visibility rules
    return fogMap[row][col] === true;
  };

  // Create subtle wood grain texture lines (matching Board)
  const woodGrainLines = Array.from({ length: 12 }, (_, i) => (
    <View key={i} style={[styles.woodGrainLine, { top: `${i * 8.33}%` }]} />
  ));

  // Create additional texture pattern (diagonal lines for depth)
  const texturePattern = Array.from({ length: 6 }, (_, i) => (
    <View key={`pattern-${i}`} style={[styles.texturePattern, { 
      top: `${i * 16.67}%`,
      transform: [{ rotate: `${i % 2 === 0 ? '2deg' : '-2deg'}` }]
    }]} />
  ));

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Subtle texture overlay */}
        <View style={styles.textureOverlay}>
          {woodGrainLines}
          {texturePattern}
        </View>
        
        {/* Inner shadow overlay (creates inset tray effect) */}
        <View style={styles.innerShadowTop} />
        <View style={styles.innerShadowBottom} />
        <View style={styles.innerShadowLeft} />
        <View style={styles.innerShadowRight} />
        
        {/* Tiles grid */}
        <View style={styles.tilesContainer}>
          {grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((letter, colIndex) => {
                const coord = { row: rowIndex, col: colIndex };
                const tileKey = `${rowIndex},${colIndex}`;
                const isUsed = usedTiles && usedTiles.has(tileKey);
                const isFading = fadingTiles && fadingTiles.has(tileKey);
                const isCurrentStart = coord.row === start.row && coord.col === start.col;
                const fogged = isFogged(rowIndex, colIndex);
                
                const getAnimationTrigger = (): 'select' | 'unselect' | 'invalid' | null => {
                  if (animationTrigger && 
                      animationTrigger.coord.row === coord.row && 
                      animationTrigger.coord.col === coord.col) {
                    return animationTrigger.type;
                  }
                  return null;
                };

                // Always use the same wrapper structure for consistent fog positioning
                // This ensures fog overlay position doesn't shift when tiles become used
                return (
                  <View 
                    key={`${rowIndex}-${colIndex}`} 
                    style={styles.tileWrapper}
                  >
                    {/* Tile component - only render if not used (or is current start or fading) */}
                    {(!isUsed || isCurrentStart || isFading) ? (
                      <Tile
                        letter={letter}
                        coord={coord}
                        type={getTileType(coord)}
                        disabled={isDisabled(coord) || fogged} // Block presses when fogged
                        onPress={() => {
                          if (!fogged) {
                            onTilePress(coord);
                          }
                        }}
                        size={tileSize}
                        animationTrigger={getAnimationTrigger()}
                        isFading={isFading || false}
                      />
                    ) : (
                      // Empty space placeholder when tile is used - matches Classic mode
                      <View style={{ width: tileSize, height: tileSize, margin: 2 }} />
                    )}
                    
                    {/* Fog overlay - render based on fogMap, regardless of tile presence */}
                    {/* Always positioned relative to the same wrapper container */}
                    <FogOverlay 
                      fogged={fogged}
                      fogSize={fogSize}
                      fogOffset={fogOffset}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignSelf: 'center',
    // Outer shadow - lifts board off the screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  container: {
    backgroundColor: '#4A3728', // Dark oak base color
    borderRadius: 16,
    padding: 12,
    // Border stroke - creates frame effect
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    overflow: 'hidden', // Important for overlays
    position: 'relative',
  },
  innerShadowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    pointerEvents: 'none',
    zIndex: 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  innerShadowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    pointerEvents: 'none',
    zIndex: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  innerShadowLeft: {
    position: 'absolute',
    top: 8,
    left: 0,
    bottom: 8,
    width: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  innerShadowRight: {
    position: 'absolute',
    top: 8,
    right: 0,
    bottom: 8,
    width: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    opacity: 0.10, // Very subtle texture
  },
  woodGrainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#5A4535', // Lighter wood grain line
    opacity: 0.4,
  },
  texturePattern: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6A5545',
    opacity: 0.15,
  },
  tilesContainer: {
    position: 'relative',
    zIndex: 3, // Above all overlays
  },
  row: {
    flexDirection: 'row',
    position: 'relative',
  },
  tileWrapper: {
    position: 'relative',
    // No margin here - Tile component already has margin: 2
    // This prevents double margins that cause layout shifts
    // Container must maintain consistent dimensions for fog overlay positioning
    // Fog overlay is absolutely positioned relative to this container
  },
  fogOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(184, 184, 184, 1.0)', // Colors.fogGrey fully opaque
    borderRadius: 0, // Square with no rounded corners
    zIndex: 1000, // Above the tile
    // No shadow, no borders - completely flat for uniform appearance
  },
});

// Simple fog overlay component - no animation for performance
interface FogOverlayProps {
  fogged: boolean;
  fogSize: number;
  fogOffset: number;
}

function FogOverlay({ fogged, fogSize, fogOffset }: FogOverlayProps) {
  // Don't render if not fogged - simple and fast
  if (!fogged) {
    return null;
  }

  return (
    <View
      style={[
        styles.fogOverlay,
        {
          width: fogSize,
          height: fogSize,
          top: -fogOffset,
          left: -fogOffset,
        }
      ]}
      pointerEvents="none"
    />
  );
}
