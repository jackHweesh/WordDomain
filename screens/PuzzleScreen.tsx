import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Modal,
  Dimensions 
} from 'react-native';
import { generatePuzzle } from '../core/puzzleGenerator';
import { solveOptimal } from '../core/puzzleSolver';
import { isValidWord, getMinWordLength } from '../core/wordValidator';
import { Coordinate, PuzzleData } from '../core/types';
import Board from '../components/Board';
import HUD from '../components/HUD';

interface GameState {
  grid: string[][];
  currentStart: Coordinate;
  selection: Coordinate[];
  playedWords: Array<{ word: string; path: Coordinate[] }>;
  status: 'playing' | 'won' | 'invalid';
  goldMoves: number;
  medal?: 'gold' | 'silver' | 'bronze';
  usedTiles: Set<string>; // Track tiles that have been used in submitted words
}

export default function PuzzleScreen() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [gridSize, setGridSize] = useState(6);
  const [showSolutions, setShowSolutions] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const initializeGame = useCallback(async () => {
    setLoading(true);
    try {
      const newPuzzle = await generatePuzzle(Math.floor(Math.random() * 1000) + 1, gridSize);
      const { optimalWords, optimalPath, goldMoves } = await solveOptimal(newPuzzle);
      
      newPuzzle.optimalWords = optimalWords;
      newPuzzle.optimalPath = optimalPath;
      newPuzzle.goldMoves = goldMoves;

      const workingGrid = newPuzzle.grid.map(row => [...row]);
      const initialState: GameState = {
        grid: workingGrid,
        currentStart: newPuzzle.start,
        selection: [newPuzzle.start], // Auto-select the START tile
        playedWords: [],
        status: 'playing',
        goldMoves: goldMoves,
        usedTiles: new Set<string>(),
      };
      
      setPuzzle(newPuzzle);
      setGameState(initialState);
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      setGameState(null);
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }, [gridSize]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const isAdjacent8 = useCallback((a: Coordinate, b: Coordinate): boolean => {
    const rowDiff = Math.abs(b.row - a.row);
    const colDiff = Math.abs(b.col - a.col);
    return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
  }, []);

  const getCurrentWord = useCallback((): string => {
    if (!gameState || !puzzle) return '';
    return gameState.selection.map(coord => gameState.grid[coord.row][coord.col]).join('').toLowerCase();
  }, [gameState, puzzle]);

  const handleTilePress = useCallback((coord: Coordinate) => {
    if (!gameState || !puzzle) return;
    if (gameState.status === 'won') return;

    const tileKey = `${coord.row},${coord.col}`;
    
    // Check if tile is already used
    if (gameState.usedTiles.has(tileKey)) {
      return; // Can't select used tiles
    }
    
    // Check if this is the last selected tile (undo functionality)
    // BUT: Don't allow deselecting the START tile (first tile in selection)
    if (gameState.selection.length > 1) {
      const lastTile = gameState.selection[gameState.selection.length - 1];
      if (lastTile.row === coord.row && lastTile.col === coord.col) {
        // Undo last selection (but not if it's the START tile)
        const newSelection = gameState.selection.slice(0, -1);
        setGameState({ ...gameState, selection: newSelection, status: 'playing' });
        return;
      }
    } else if (gameState.selection.length === 1) {
      // If only START tile is selected, don't allow deselecting it
      const startTile = gameState.selection[0];
      if (startTile.row === coord.row && startTile.col === coord.col) {
        return; // Can't deselect the START tile
      }
    }
    
    // Check if this is the current start tile
    if (gameState.selection.length === 0) {
      if (coord.row !== gameState.currentStart.row || coord.col !== gameState.currentStart.col) {
        return; // Must start from the current start tile
      }
    } else {
      // Check if this tile is adjacent to the last selected tile
      const lastTile = gameState.selection[gameState.selection.length - 1];
      if (!isAdjacent8(lastTile, coord)) {
        return; // Not adjacent
      }
      
      // Check if tile is already selected in current word
      if (gameState.selection.some(t => t.row === coord.row && t.col === coord.col)) {
        return; // Already selected
      }
    }
    
    // Add tile to current path
    const newSelection = [...gameState.selection, coord];
    setGameState({ ...gameState, selection: newSelection, status: 'playing' });
  }, [gameState, puzzle, isAdjacent8]);

  const handleSubmit = useCallback(async () => {
    if (!gameState || !puzzle) return;
    if (gameState.selection.length < getMinWordLength()) return;
    
    const word = gameState.selection.map(tile => 
      gameState.grid[tile.row][tile.col]
    ).join("");
    
    const valid = await isValidWord(word);
    
    if (valid) {
      // Valid word - add to user words
      const newPlayedWord = {
        word: word.toLowerCase(),
        path: [...gameState.selection],
      };
      
      // Mark all tiles as used except the last one (which becomes new START)
      const lastTile = gameState.selection[gameState.selection.length - 1];
      const newUsedTiles = new Set(gameState.usedTiles);
      
      gameState.selection.forEach(tile => {
        const tileKey = `${tile.row},${tile.col}`;
        // Don't mark the last tile as used since it becomes the new START
        if (tile.row !== lastTile.row || tile.col !== lastTile.col) {
          newUsedTiles.add(tileKey);
        }
      });
      
      // The last tile becomes the new start
      const newStart = { row: lastTile.row, col: lastTile.col };
      
      // Check win condition
      const isWon = lastTile.row === puzzle.end.row && lastTile.col === puzzle.end.col;
      
      // Determine medal
      let medal: 'gold' | 'silver' | 'bronze' | undefined;
      if (isWon) {
        const playedCount = gameState.playedWords.length + 1;
        if (playedCount === gameState.goldMoves) {
          medal = 'gold';
        } else if (playedCount === gameState.goldMoves + 1) {
          medal = 'silver';
        } else {
          medal = 'bronze';
        }
      }
      
      setGameState({
        ...gameState,
        currentStart: newStart,
        selection: [newStart],
        playedWords: [...gameState.playedWords, newPlayedWord],
        status: isWon ? 'won' : 'playing',
        medal,
        usedTiles: newUsedTiles,
      });
    } else {
      // Invalid word - reset game
      const workingGrid = puzzle.grid.map(row => [...row]);
      setGameState({
        ...gameState,
        grid: workingGrid,
        currentStart: puzzle.start,
        selection: [puzzle.start],
        playedWords: [],
        status: 'invalid',
        usedTiles: new Set<string>(),
      });
    }
  }, [gameState, puzzle]);

  const handleRestart = useCallback(() => {
    if (!gameState || !puzzle) return;
    
    const workingGrid = puzzle.grid.map(row => [...row]);
    setGameState({
      ...gameState,
      grid: workingGrid,
      currentStart: puzzle.start,
      selection: [puzzle.start],
      playedWords: [],
      status: 'playing',
      usedTiles: new Set<string>(),
      medal: undefined,
    });
  }, [gameState, puzzle]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading puzzle...</Text>
        <Text style={styles.loadingSubtext}>This may take 10-30 seconds</Text>
      </View>
    );
  }

  if (!puzzle || !gameState) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load puzzle</Text>
        <Text style={styles.errorSubtext}>Check console for details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeGame}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>WordDomain</Text>
        <View style={styles.buttonRow}>
          <View style={styles.sizeSelectorContainer}>
            <TouchableOpacity 
              style={styles.sizeSelectorButton}
              onPress={() => setShowSizeDropdown(!showSizeDropdown)}
            >
              <Text style={styles.sizeSelectorText}>{gridSize}×{gridSize}</Text>
            </TouchableOpacity>
            {showSizeDropdown && (
              <View style={styles.sizeDropdown}>
                {[4, 5, 6, 7, 8].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeDropdownOption,
                      gridSize === size && styles.sizeDropdownOptionActive
                    ]}
                    onPress={() => {
                      setGridSize(size);
                      setShowSizeDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.sizeDropdownText,
                      gridSize === size && styles.sizeDropdownTextActive
                    ]}>
                      {size}×{size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.newPuzzleButton} onPress={initializeGame}>
            <Text style={styles.newPuzzleButtonText}>New Puzzle</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.hintsButton}
            onPress={() => setShowSolutions(true)}
          >
            <Text style={styles.hintsButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <HUD
        currentWord={getCurrentWord()}
        goldMoves={gameState.goldMoves}
        playedCount={gameState.playedWords.length}
        status={gameState.status}
        medal={gameState.medal}
      />

      {/* Action Buttons - Above grid */}
      <View style={styles.actionButtonsContainer}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleRestart}
          >
            <Text style={styles.restartButtonText}>🔄 Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, (getCurrentWord().length < 3 || gameState.status === 'won') && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={getCurrentWord().length < 3 || gameState.status === 'won'}
          >
            <Text style={styles.submitButtonText}>✅ Submit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.boardContainer}>
        <Board
          grid={gameState.grid}
          start={gameState.currentStart}
          end={puzzle.end}
          selection={gameState.selection}
          usedTiles={gameState.usedTiles}
          onTilePress={handleTilePress}
        />
      </View>

      {/* Current Word Display - Underneath grid */}
      <View style={styles.currentWordContainer}>
        <Text style={styles.currentWordLabel}>Current Word: </Text>
        <Text style={[styles.currentWordText, !getCurrentWord() && styles.currentWordPlaceholder]}>
          {getCurrentWord() || 'Select tiles...'}
        </Text>
      </View>

      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>How to Play:</Text>
        <Text style={styles.instruction}>• Start from the START tile (tan)</Text>
        <Text style={styles.instruction}>• Tap adjacent tiles (including diagonals) to form words</Text>
        <Text style={styles.instruction}>• No tile reuse within the same word</Text>
        <Text style={styles.instruction}>• Submit valid words (3+ letters) to clear tiles and advance</Text>
        <Text style={styles.instruction}>• Reach the END tile (dark brown) to win!</Text>
      </View>

      {gameState.playedWords.length > 0 && (
        <View style={styles.playedWordsSection}>
          <Text style={styles.playedWordsTitle}>📝 Played Words:</Text>
          {gameState.playedWords.map((played, index) => (
            <Text key={index} style={styles.playedWord}>
              {index + 1}. <Text style={styles.playedWordBold}>{played.word}</Text> ({played.path.length} tiles)
            </Text>
          ))}
        </View>
      )}

      {/* Solutions Modal */}
      <Modal
        visible={showSolutions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSolutions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Puzzle Solutions</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSolutions(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Easy Path Solution */}
              <View style={styles.solutionSection}>
                <Text style={styles.solutionTitle}>📝 Easy Path (Setup Solution):</Text>
                <Text style={styles.solutionSubtitle}>
                  {puzzle.easyWords ? puzzle.easyWords.length : 0} words
                </Text>
                {puzzle.easyWords && puzzle.easyWords.length > 0 && (
                  <View style={styles.wordList}>
                    {puzzle.easyWords.map((word, index) => (
                      <Text key={index} style={styles.wordItem}>
                        {index + 1}. <Text style={styles.wordBold}>{word}</Text>
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.solutionPath}>
                  Path: {puzzle.easyPath ? puzzle.easyPath.length : 0} tiles
                </Text>
              </View>

              {/* Optimal Solution */}
              <View style={styles.solutionSection}>
                <Text style={styles.solutionTitle}>🏆 Optimal Solution (Gold):</Text>
                <Text style={styles.solutionSubtitle}>
                  {puzzle.optimalWords ? puzzle.optimalWords.length : 0} words
                </Text>
                {puzzle.optimalWords && puzzle.optimalWords.length > 0 && (
                  <View style={styles.wordList}>
                    {puzzle.optimalWords.map((word, index) => (
                      <Text key={index} style={styles.wordItem}>
                        {index + 1}. <Text style={styles.wordBold}>{word}</Text>
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.solutionPath}>
                  Path: {puzzle.optimalPath ? puzzle.optimalPath.length : 0} tiles
                </Text>
                <Text style={styles.goldMoves}>
                  🥇 Gold Target: {puzzle.goldMoves} words
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Cream background
  },
  contentContainer: {
    padding: 10,
    paddingTop: 40, // Reduced padding to move content up
    alignItems: 'center',
    flexGrow: 1,
  },
  actionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  currentWordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
  },
  currentWordLabel: {
    fontSize: 14,
    color: '#8B6F47', // Warm brown
  },
  currentWordText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown
    flex: 1,
  },
  currentWordPlaceholder: {
    color: '#A8A19A', // Warm gray
    fontSize: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  restartButtonText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    fontSize: 16,
  },
  boardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  instructionsSection: {
    width: '100%',
    padding: 15,
    backgroundColor: '#FAF8F3', // Cream
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E8DDD4', // Soft beige border
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown
    marginBottom: 10,
  },
  instruction: {
    fontSize: 14,
    color: '#8B6F47', // Warm brown
    lineHeight: 20,
    marginBottom: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5D4E37', // Dark brown
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#8B6F47', // Warm brown
  },
  errorText: {
    fontSize: 18,
    color: '#A85D3A', // Warm reddish-brown
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8B6F47', // Warm brown
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  retryButtonText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    marginBottom: 2,
    alignItems: 'center',
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  sizeSelectorContainer: {
    position: 'relative',
    zIndex: 10,
  },
  sizeSelectorButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  sizeSelectorText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    fontSize: 14,
  },
  sizeDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FAF8F3', // Cream
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E8DDD4', // Soft beige border
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  sizeDropdownOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD4',
  },
  sizeDropdownOptionActive: {
    backgroundColor: '#E8DDD4', // Warm beige
  },
  sizeDropdownText: {
    color: '#5D4E37', // Dark brown
    fontSize: 14,
    textAlign: 'center',
  },
  sizeDropdownTextActive: {
    fontWeight: 'bold',
    color: '#8B6F47', // Warm brown
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown
    marginBottom: 8,
    textAlign: 'center',
  },
  newPuzzleButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 8,
    borderRadius: 6,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  newPuzzleButtonText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hintsButton: {
    backgroundColor: '#D4B896', // Warm tan
    padding: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47', // Darker brown accent
  },
  hintsButtonText: {
    color: '#5D4E37', // Dark brown text
    fontWeight: 'bold',
    fontSize: 16,
  },
  playedWordsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FAF8F3', // Cream
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD4', // Soft beige border
  },
  playedWordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5D4E37', // Dark brown
  },
  playedWord: {
    fontSize: 14,
    marginBottom: 5,
    color: '#8B6F47', // Warm brown
  },
  playedWordBold: {
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(93, 78, 55, 0.6)', // Warm brown overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FAF8F3', // Cream
    borderRadius: 12,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
    padding: 20,
    borderWidth: 2,
    borderColor: '#D4B896', // Warm tan border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD4', // Soft beige border
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8DDD4', // Warm beige
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4C5B9',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#5D4E37', // Dark brown
  },
  modalScrollView: {
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  solutionSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FAF8F3', // Cream
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD4', // Soft beige border
  },
  solutionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#5D4E37', // Dark brown
  },
  solutionSubtitle: {
    fontSize: 14,
    color: '#8B6F47', // Warm brown
    marginBottom: 10,
  },
  wordList: {
    marginBottom: 10,
  },
  wordItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#5D4E37', // Dark brown
  },
  wordBold: {
    fontWeight: 'bold',
    color: '#8B6F47', // Warm brown
  },
  solutionPath: {
    fontSize: 12,
    color: '#8B6F47', // Warm brown
    marginTop: 5,
  },
  goldMoves: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B6F47', // Warm brown
    marginTop: 5,
  },
  coordinateLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5D4E37', // Dark brown
    marginTop: 10,
    marginBottom: 5,
  },
  coordinates: {
    fontSize: 10,
    color: '#8B6F47', // Warm brown
    fontFamily: 'monospace',
  },
});
