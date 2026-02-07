import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Modal,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
const screenWidth = Dimensions.get('window').width;
import { generatePuzzle } from '../core/puzzleGenerator';
import { solveOptimal } from '../core/puzzleSolver';
import { getFogOfWarPuzzle } from '../services/fogOfWarPuzzleCache';
import { isValidWord, getMinWordLength } from '../core/wordValidator';
import { loadBigDictionary } from '../core/dictionaryLoader';
import { Coordinate, PuzzleData } from '../core/types';
import FogOfWarBoard from '../components/FogOfWarBoard';
import HUD from '../components/HUD';
import { getPuzzleCount, getCategories } from '../services/puzzleLoader';
import { Category } from '../services/progressStorage';
import { saveMedal, unlockNextPuzzle } from '../services/fogOfWarProgressStorage';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import MedalIcon from '../components/MedalIcon';
import LightbulbIcon from '../components/LightbulbIcon';
import PathVisualization from '../components/PathVisualization';
import Confetti from '../components/Confetti';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';
import { Colors, Spacing, Fonts, Radius, Shadows } from '../src/styles/theme';

interface GameState {
  grid: string[][];
  currentStart: Coordinate;
  selection: Coordinate[];
  playedWords: Array<{ word: string; path: Coordinate[] }>;
  status: 'playing' | 'won' | 'invalid';
  goldMoves: number;
  medal?: 'gold' | 'silver' | 'bronze';
  usedTiles: Set<string>;
}

interface PuzzleScreenProps {
  category?: Category;
  puzzleId?: number;
  onBack?: () => void;
  onSelectPuzzle?: (category: Category, puzzleId: number) => void;
  onBackToHome?: () => void;
}

const CATEGORY_TITLES: { [key in Category]: string } = {
  '4x4': '4×4',
  '5x5': '5×5',
  '6x6': '6×6',
  '7x7': '7×7',
  '8x8': '8×8',
};

export default function FogOfWarPuzzleScreen({ category, puzzleId, onBack, onSelectPuzzle, onBackToHome }: PuzzleScreenProps) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState(6);
  const [showSolutions, setShowSolutions] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(!category || !puzzleId);
  const [showWinModal, setShowWinModal] = useState(false);
  const [tileAnimationTrigger, setTileAnimationTrigger] = useState<{ coord: Coordinate; type: 'select' | 'unselect' | 'invalid' } | null>(null);
  const [fadingTiles, setFadingTiles] = useState<Set<string>>(new Set());
  const [hintedTiles, setHintedTiles] = useState<Set<string>>(new Set());
  const [glowingHintTiles, setGlowingHintTiles] = useState<Set<string>>(new Set()); // Tiles that are currently glowing green
  // SIMPLIFIED HINT TRACKING:
  // - Track which word indices were hinted (commonHintedWordIndices, goldHintedWordIndices)
  // - At win time, calculate which hinted words match final solution (commonHintUsedWordIndicesAtWin, goldHintUsedWordIndicesAtWin)
  // Common Hint (easy path) tracking
  const [commonHintCount, setCommonHintCount] = useState(0);
  const [commonHintedWordIndices, setCommonHintedWordIndices] = useState<Set<number>>(new Set());
  const [commonHintedWordIndicesAtWin, setCommonHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [commonHintUsedWordIndicesAtWin, setCommonHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  // Gold Hint (optimal path) tracking
  const [goldHintCount, setGoldHintCount] = useState(0);
  const [goldHintedWordIndices, setGoldHintedWordIndices] = useState<Set<number>>(new Set());
  const [goldHintedWordIndicesAtWin, setGoldHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [goldHintUsedWordIndicesAtWin, setGoldHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [fogMap, setFogMap] = useState<boolean[][]>([]); // 2D array: true = hidden, false = visible
  const winModalOpacity = useRef(new Animated.Value(0)).current;
  const winCardScale = useRef(new Animated.Value(0.9)).current;
  const winCardOpacity = useRef(new Animated.Value(0)).current;

  // Initialize fogMap: all tiles hidden except start and its neighbors
  const initializeFogMap = useCallback((grid: string[][], start: Coordinate): boolean[][] => {
    const gridSize = grid.length;
    const fog: boolean[][] = [];
    
    // Initialize all tiles as hidden (true = hidden)
    for (let row = 0; row < gridSize; row++) {
      fog[row] = [];
      for (let col = 0; col < gridSize; col++) {
        fog[row][col] = true; // All tiles start hidden
      }
    }
    
    // Reveal start tile
    fog[start.row][start.col] = false;
    
    // Reveal all adjacent tiles (8-directional)
    const directions = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row: 0, col: -1 }, { row: 0, col: 1 },
      { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 },
    ];
    
    directions.forEach(dir => {
      const newRow = start.row + dir.row;
      const newCol = start.col + dir.col;
      
      if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
        if (grid[newRow][newCol]) { // Only reveal if tile has a letter
          fog[newRow][newCol] = false;
        }
      }
    });
    
    return fog;
  }, []);

  // Update fogMap based on current selection - SIMPLE: current tile + all adjacent (within 1 tile)
  const updateFogMap = useCallback((grid: string[][], selection: Coordinate[], start: Coordinate, end: Coordinate): boolean[][] => {
    const gridSize = grid.length;
    const fog: boolean[][] = [];
    
    // Initialize all tiles as hidden (true = hidden/fogged)
    for (let row = 0; row < gridSize; row++) {
      fog[row] = [];
      for (let col = 0; col < gridSize; col++) {
        fog[row][col] = true;
      }
    }
    
    // Get current tile (last in selection, or start if no selection)
    const currentTile = selection.length > 0 ? selection[selection.length - 1] : start;
    
    // Reveal current tile
    if (currentTile.row >= 0 && currentTile.row < gridSize && currentTile.col >= 0 && currentTile.col < gridSize) {
      fog[currentTile.row][currentTile.col] = false;
      
      // Reveal all tiles within 1 tile away (8-directional adjacency)
      const directions = [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 },                       { row: 0, col: 1 },
        { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 },
      ];
      
      for (const dir of directions) {
        const newRow = currentTile.row + dir.row;
        const newCol = currentTile.col + dir.col;
        
        // Check bounds and reveal if valid
        if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
          fog[newRow][newCol] = false;
        }
      }
    }
    
    return fog;
  }, []);

  const initializeGame = useCallback(async () => {
    setLoading(true);
    try {
      let newPuzzle: PuzzleData;
      
      // Fog of War uses cached puzzles for consistency (like Classic mode)
      if (category && puzzleId) {
        newPuzzle = await getFogOfWarPuzzle(category, puzzleId);
      } else {
        // Custom mode - generate random puzzle
        newPuzzle = await generatePuzzle(Math.floor(Math.random() * 1000) + 1, gridSize);
        const { optimalWords, optimalPath, goldMoves } = await solveOptimal(newPuzzle);
        newPuzzle.optimalWords = optimalWords;
        newPuzzle.optimalPath = optimalPath;
        newPuzzle.goldMoves = goldMoves;
      }

      const workingGrid = newPuzzle.grid.map(row => [...row]);
      const initialState: GameState = {
        grid: workingGrid,
        currentStart: newPuzzle.start,
        selection: [newPuzzle.start],
        playedWords: [],
        status: 'playing',
        goldMoves: newPuzzle.goldMoves || 0,
        usedTiles: new Set<string>(),
      };
      
      setPuzzle(newPuzzle);
      setGameState(initialState);
      // Initialize fogMap - all hidden except start and neighbors
      const initialFog = initializeFogMap(workingGrid, newPuzzle.start);
      setFogMap(initialFog);
      setShowWinModal(false);
      // Reset hints
      setHintedTiles(new Set());
      setGlowingHintTiles(new Set());
      setCommonHintCount(0);
      setCommonHintedWordIndices(new Set());
      setCommonHintedWordIndicesAtWin(new Set());
      setCommonHintUsedWordIndicesAtWin(new Set());
      setGoldHintCount(0);
      setGoldHintedWordIndices(new Set());
      setGoldHintedWordIndicesAtWin(new Set());
      setGoldHintUsedWordIndicesAtWin(new Set());
      // Reset animations
      winModalOpacity.setValue(0);
      winCardScale.setValue(0.9);
      winCardOpacity.setValue(0);
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      setGameState(null);
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }, [category, puzzleId, gridSize, winModalOpacity, winCardScale, winCardOpacity, initializeFogMap]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Preload big dictionary on mount to eliminate first word check delay
  useEffect(() => {
    loadBigDictionary().catch(error => {
      console.error('Error preloading dictionary:', error);
      // Non-blocking - if it fails, it will load on first word check
    });
  }, []);

  const isAdjacent8 = useCallback((a: Coordinate, b: Coordinate): boolean => {
    const rowDiff = Math.abs(b.row - a.row);
    const colDiff = Math.abs(b.col - a.col);
    return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
  }, []);

  const getCurrentWord = useCallback((): string => {
    if (!gameState || !puzzle) return '';
    return gameState.selection.map(coord => gameState.grid[coord.row][coord.col]).join('').toLowerCase();
  }, [gameState, puzzle]);

  // Helper function to get the path coordinates for a specific word index
  // FIXED: Walks the combined path word by word and detects overlap duplication automatically
  const getWordPathForIndex = useCallback((words: string[], path: Coordinate[], wordIndex: number): Coordinate[] => {
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
  }, []);

  // Helper function to check if a played word matches a specific word and path exactly
  const checkWordMatchesHint = useCallback((
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
  }, []);

  // Helper function to get hint path text
  const getHintPathText = useCallback((): string[] => {
    const paths: string[] = [];
    
    if (puzzle && commonHintCount > 0 && puzzle.easyWords) {
      const revealedWords = puzzle.easyWords.slice(0, commonHintCount);
      if (revealedWords.length > 0) {
        paths.push(`Common Path: ${revealedWords.join(' --> ')}`);
      }
    }
    
    if (puzzle && goldHintCount > 0 && puzzle.optimalWords) {
      const revealedWords = puzzle.optimalWords.slice(0, goldHintCount);
      if (revealedWords.length > 0) {
        paths.push(`Gold Path: ${revealedWords.join(' --> ')}`);
      }
    }
    
    return paths;
  }, [puzzle, commonHintCount, goldHintCount]);

  const handleTilePress = useCallback((coord: Coordinate) => {
    if (!gameState || !puzzle) return;
    if (gameState.status === 'won') return;

    const tileKey = `${coord.row},${coord.col}`;
    
    // Check if tile is fogged (hidden) - block clicks on fogged tiles
    if (fogMap[coord.row] && fogMap[coord.row][coord.col]) {
      setTileAnimationTrigger({ coord, type: 'invalid' });
      setTimeout(() => setTileAnimationTrigger(null), 200);
      return;
    }
    
    // Check for unselect (tapping last selected tile)
    if (gameState.selection.length > 1) {
      const lastTile = gameState.selection[gameState.selection.length - 1];
      if (lastTile.row === coord.row && lastTile.col === coord.col) {
        // Play tile press sound for unselect
        audioManager.playSound(SoundCategory.TILE_PRESS);
        const newSelection = gameState.selection.slice(0, -1);
        setGameState({ ...gameState, selection: newSelection, status: 'playing' });
        // Update fogMap based on new selection
        const newFog = updateFogMap(gameState.grid, newSelection, gameState.currentStart, puzzle.end);
        setFogMap(newFog);
        setTileAnimationTrigger({ coord, type: 'unselect' });
        setTimeout(() => setTileAnimationTrigger(null), 200);
        return;
      }
    } else if (gameState.selection.length === 1) {
      const startTile = gameState.selection[0];
      if (startTile.row === coord.row && startTile.col === coord.col) {
        // Can't unselect start tile
        setTileAnimationTrigger({ coord, type: 'invalid' });
        setTimeout(() => setTileAnimationTrigger(null), 200);
        return;
      }
    }
    
    // Check for invalid taps
    if (gameState.usedTiles.has(tileKey)) {
      setTileAnimationTrigger({ coord, type: 'invalid' });
      setTimeout(() => setTileAnimationTrigger(null), 200);
      return;
    }
    
    if (gameState.selection.length === 0) {
      if (coord.row !== gameState.currentStart.row || coord.col !== gameState.currentStart.col) {
        setTileAnimationTrigger({ coord, type: 'invalid' });
        setTimeout(() => setTileAnimationTrigger(null), 200);
        return;
      }
    } else {
      const lastTile = gameState.selection[gameState.selection.length - 1];
      if (!isAdjacent8(lastTile, coord)) {
        setTileAnimationTrigger({ coord, type: 'invalid' });
        setTimeout(() => setTileAnimationTrigger(null), 200);
        return;
      }
      
      if (gameState.selection.some(t => t.row === coord.row && t.col === coord.col)) {
        setTileAnimationTrigger({ coord, type: 'invalid' });
        setTimeout(() => setTileAnimationTrigger(null), 200);
        return;
      }
    }
    
    // Valid selection
    // Play tile press sound for selection
    audioManager.playSound(SoundCategory.TILE_PRESS);
    const newSelection = [...gameState.selection, coord];
    setGameState({ ...gameState, selection: newSelection, status: 'playing' });
    // Update fogMap based on new selection
    const newFog = updateFogMap(gameState.grid, newSelection, gameState.currentStart, puzzle.end);
    setFogMap(newFog);
    setTileAnimationTrigger({ coord, type: 'select' });
    setTimeout(() => setTileAnimationTrigger(null), 200);
  }, [gameState, puzzle, isAdjacent8, fogMap, updateFogMap]);

  const handleSubmit = useCallback(async () => {
    if (!gameState || !puzzle) return;
    if (gameState.selection.length < getMinWordLength()) return;
    
    const word = gameState.selection.map(tile => 
      gameState.grid[tile.row][tile.col]
    ).join("");
    
    const valid = await isValidWord(word);
    
    if (valid) {
      // Play puzzle interaction sound when valid word disappears
      audioManager.playSound(SoundCategory.PUZZLE);
      
      const newPlayedWord = {
        word: word.toLowerCase(),
        path: [...gameState.selection],
      };
      
      // Note: We no longer track hint usage during play
      // All hint matching is calculated at win time for simplicity and accuracy
      
      const lastTile = gameState.selection[gameState.selection.length - 1];
      
      // Mark tiles to fade out (all except the last one)
      const tilesToFade = new Set<string>();
      gameState.selection.forEach(tile => {
        const tileKey = `${tile.row},${tile.col}`;
        if (tile.row !== lastTile.row || tile.col !== lastTile.col) {
          tilesToFade.add(tileKey);
        }
      });
      setFadingTiles(tilesToFade);
      
      // After fade animation completes, update gameState
      setTimeout(() => {
        const newUsedTiles = new Set(gameState.usedTiles);
        tilesToFade.forEach(tileKey => {
          newUsedTiles.add(tileKey);
        });
        
        // Remove hinted tiles that were used
        const newHintedTiles = new Set(hintedTiles);
        tilesToFade.forEach(tileKey => {
          newHintedTiles.delete(tileKey);
        });
        setHintedTiles(newHintedTiles);
        
        const newStart = { row: lastTile.row, col: lastTile.col };
        const isWon = lastTile.row === puzzle.end.row && lastTile.col === puzzle.end.col;
        
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
          
          if (category && puzzleId && medal) {
            saveMedal(category, puzzleId, medal);
            unlockNextPuzzle(category, puzzleId);
          }
        }
        
        const newGameState: GameState = {
          ...gameState,
          currentStart: newStart,
          selection: [newStart],
          playedWords: [...gameState.playedWords, newPlayedWord],
          status: isWon ? 'won' : 'playing',
          medal,
          usedTiles: newUsedTiles,
        };
        setGameState(newGameState);
        // Update fogMap based on new start position
        const newFog = updateFogMap(newGameState.grid, [newStart], newStart, puzzle.end);
        setFogMap(newFog);
        
        // Clear fading tiles
        setFadingTiles(new Set());
        
        if (isWon) {
          // SIMPLIFIED HINT TRACKING: Calculate which hinted words were actually used
          // This is the single source of truth for the emoji grid visualization
          const finalPlayedWords = [...gameState.playedWords, newPlayedWord];
          
          // For each word index that was hinted, check if any played word matches it exactly
          // CRITICAL: This must process ALL hinted indices, not just the first one
          const calculateHintMatches = (
            hintedIndices: Set<number>,
            hintWords: string[] | null | undefined,
            hintPath: Coordinate[] | null | undefined
          ): Set<number> => {
            const matchedIndices = new Set<number>();
            if (!hintWords || !hintPath) {
              console.log('🔍 DEBUG [Calculate Matches]: No hintWords or hintPath provided');
              return matchedIndices;
            }
            
            // Convert Set to Array to ensure explicit iteration through ALL elements
            const hintedIndicesArray = Array.from(hintedIndices);
            console.log('🔍 DEBUG [Calculate Matches]: Processing hinted indices:', hintedIndicesArray);
            console.log('🔍 DEBUG [Calculate Matches]: Final played words:', finalPlayedWords.map(w => ({ word: w.word, pathLength: w.path.length })));
            
            // For each hinted word index - process ALL of them
            for (const wordIndex of hintedIndicesArray) {
              if (wordIndex >= hintWords.length) {
                console.log('🔍 DEBUG [Calculate Matches]: Skipping wordIndex', wordIndex, '- out of bounds');
                continue;
              }
              
              const hintWord = hintWords[wordIndex];
              const hintPathForWord = getWordPathForIndex(hintWords, hintPath, wordIndex);
              console.log('🔍 DEBUG [Calculate Matches]: Checking wordIndex', wordIndex, '- hintWord:', hintWord, '- hintPathLength:', hintPathForWord.length);
              console.log('🔍 DEBUG [Calculate Matches]: Hint path for wordIndex', wordIndex, ':', hintPathForWord.map(c => `(${c.row},${c.col})`).join(' -> '));
              
              // Check if any played word matches this hint word and path exactly
              // Process ALL played words to find the match
              let foundMatch = false;
              for (const playedWord of finalPlayedWords) {
                console.log('🔍 DEBUG [Calculate Matches]:   Comparing with playedWord:', playedWord.word, '- pathLength:', playedWord.path.length);
                console.log('🔍 DEBUG [Calculate Matches]:   Played path:', playedWord.path.map(c => `(${c.row},${c.col})`).join(' -> '));
                
                const matches = checkWordMatchesHint(playedWord, hintWord, hintPathForWord);
                console.log('🔍 DEBUG [Calculate Matches]:   Match result:', matches);
                
                if (matches) {
                  console.log('🔍 DEBUG [Calculate Matches]: ✅ MATCH FOUND for wordIndex', wordIndex, '- playedWord:', playedWord.word);
                  matchedIndices.add(wordIndex);
                  foundMatch = true;
                  break; // Found a match for this wordIndex, move to next wordIndex
                }
              }
              if (!foundMatch) {
                console.log('🔍 DEBUG [Calculate Matches]: ❌ NO MATCH for wordIndex', wordIndex, '- hintWord:', hintWord);
              }
            }
            console.log('🔍 DEBUG [Calculate Matches]: Final matched indices:', Array.from(matchedIndices));
            return matchedIndices;
          };
          
          // Calculate matches for both hint types
          const commonHintMatches = calculateHintMatches(
            commonHintedWordIndices,
            puzzle.easyWords,
            puzzle.easyPath
          );
          const goldHintMatches = calculateHintMatches(
            goldHintedWordIndices,
            puzzle.optimalWords,
            puzzle.optimalPath
          );
          
          // Store for visualization (using simpler naming)
          console.log('🔍 DEBUG [Win Time]: ===== HINT TRACKING SUMMARY =====');
          console.log('🔍 DEBUG [Win Time]: commonHintedWordIndices:', Array.from(commonHintedWordIndices));
          console.log('🔍 DEBUG [Win Time]: commonHintMatches (used):', Array.from(commonHintMatches));
          console.log('🔍 DEBUG [Win Time]: goldHintedWordIndices:', Array.from(goldHintedWordIndices));
          console.log('🔍 DEBUG [Win Time]: goldHintMatches (used):', Array.from(goldHintMatches));
          console.log('🔍 DEBUG [Win Time]: ====================================');
          
          setCommonHintedWordIndicesAtWin(new Set(commonHintedWordIndices));
          setGoldHintedWordIndicesAtWin(new Set(goldHintedWordIndices));
          setCommonHintUsedWordIndicesAtWin(commonHintMatches);
          setGoldHintUsedWordIndicesAtWin(goldHintMatches);
          
          // Reset hints when puzzle is completed
          setHintedTiles(new Set());
          setGlowingHintTiles(new Set());
          setCommonHintCount(0);
          setCommonHintedWordIndices(new Set());
          setGoldHintCount(0);
          setGoldHintedWordIndices(new Set());
          
          // Play celebration sound when win modal appears
          audioManager.playSound(SoundCategory.CELEBRATION);
          
          // Show win modal with animation
          setShowWinModal(true);
        Animated.parallel([
          Animated.timing(winModalOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.spring(winCardScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(winCardOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
        }
      }, 300); // Fade duration
    } else {
      // Play deny sound for invalid word
      audioManager.playSound(SoundCategory.DENY);
      
      const workingGrid = puzzle.grid.map(row => [...row]);
      const resetState: GameState = {
        ...gameState,
        grid: workingGrid,
        currentStart: puzzle.start,
        selection: [puzzle.start],
        playedWords: [],
        status: 'invalid',
        usedTiles: new Set<string>(),
      };
      setGameState(resetState);
      // Reset fogMap
      const resetFog = initializeFogMap(workingGrid, puzzle.start);
      setFogMap(resetFog);
      // Don't reset hints on invalid word - only clear visible tiles
      setHintedTiles(new Set());
    }
  }, [gameState, puzzle, category, puzzleId, updateFogMap, initializeFogMap, hintedTiles, commonHintedWordIndices, goldHintedWordIndices, getWordPathForIndex, checkWordMatchesHint]);

  // Helper function to check if playedWords match easyWords in order
  const checkWordsMatchEasyPath = useCallback((playedWords: Array<{ word: string; path: Coordinate[] }>, easyWords: string[]): boolean => {
    if (playedWords.length === 0) return true; // No words played yet, consider it matching
    if (playedWords.length > easyWords.length) return false; // Too many words
    
    // Check if each played word matches the corresponding easy word
    for (let i = 0; i < playedWords.length; i++) {
      if (playedWords[i].word.toLowerCase() !== easyWords[i].toLowerCase()) {
        return false;
      }
    }
    return true;
  }, []);

  // Helper function to get coordinates for a specific word index from a path
  const getWordCoordinates = useCallback((words: string[], path: Coordinate[], wordIndex: number): string[] => {
    const coords: string[] = [];
    if (!words || !path || wordIndex < 0 || wordIndex >= words.length) return coords;
    
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
    
    // Now get coordinates for this specific word
    const word = words[wordIndex];
    const isFirst = wordIndex === 0;
    const seenCoords = new Set<string>();
    
    for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
      if (pathIndex >= path.length) break;
      
      const coord = path[pathIndex];
      const tileKey = `${coord.row},${coord.col}`;
      
      if (!seenCoords.has(tileKey)) {
        coords.push(tileKey);
        seenCoords.add(tileKey);
      }
      
      if (!isFirst && letterIndex === 0) {
        // Letter already placed by previous word, pathIndex stays the same
      } else {
        pathIndex++;
      }
    }
    
    return coords;
  }, []);

  const handleCommonHint = useCallback(() => {
    if (!puzzle || !puzzle.easyWords || !puzzle.easyPath) return;
    
    // Always reset puzzle to start when hint is used
    const workingGrid = puzzle.grid.map(row => [...row]);
    setGameState(prev => prev ? {
      ...prev,
      grid: workingGrid,
      currentStart: puzzle.start,
      selection: [puzzle.start],
      playedWords: [],
      status: 'playing',
      usedTiles: new Set<string>(),
      medal: undefined,
    } : null);
    
    // Reset fogMap
    const resetFog = initializeFogMap(workingGrid, puzzle.start);
    setFogMap(resetFog);
    
    // Get the next word index to reveal
    const nextWordIndex = commonHintCount;
    if (nextWordIndex >= puzzle.easyWords.length) return; // All words already revealed
    
    // Mark this word index as hinted
    setCommonHintedWordIndices(prev => {
      const updated = new Set(prev);
      updated.add(nextWordIndex);
      console.log('🔍 DEBUG [Hint Called]: Added wordIndex', nextWordIndex, '| All hinted indices:', Array.from(updated));
      return updated;
    });
    
    // Increment hint count
    setCommonHintCount(prev => prev + 1);
    
    // Get coordinates for ALL common hint words revealed so far (including the new one)
    const allCommonRevealedCoords: string[] = [];
    for (let i = 0; i <= nextWordIndex; i++) {
      const wordCoords = getWordCoordinates(puzzle.easyWords, puzzle.easyPath, i);
      wordCoords.forEach(coord => {
        if (!allCommonRevealedCoords.includes(coord)) {
          allCommonRevealedCoords.push(coord);
        }
      });
    }
    
    // Get coordinates for ONLY the new word being revealed (for animation)
    const newWordCoords = getWordCoordinates(puzzle.easyWords, puzzle.easyPath, nextWordIndex);
    
    // Get all previously revealed common hint words (excluding the new one)
    const previouslyRevealedCommonCoords = allCommonRevealedCoords.filter(coord => !newWordCoords.includes(coord));
    
    // Also preserve any gold hint tiles that were already revealed
    const currentHintedTiles = new Set(hintedTiles);
    previouslyRevealedCommonCoords.forEach(coord => currentHintedTiles.add(coord));
    setHintedTiles(currentHintedTiles);
    
    // Then animate ONLY the new word appearing one tile at a time
    const animationDuration = newWordCoords.length * 500; // Total animation time
    newWordCoords.forEach((tileKey, index) => {
      setTimeout(() => {
        setHintedTiles(prev => {
          const updated = new Set(prev);
          updated.add(tileKey);
          return updated;
        });
        setGlowingHintTiles(prev => {
          const updated = new Set(prev);
          updated.add(tileKey);
          return updated;
        });
      }, index * 500); // 500ms delay between each tile
    });
    
    // After animation completes + 2 seconds, remove green glow
    setTimeout(() => {
      setGlowingHintTiles(prev => {
        const updated = new Set(prev);
        newWordCoords.forEach(tileKey => updated.delete(tileKey));
        return updated;
      });
    }, animationDuration + 2000); // 2 seconds after animation completes
    
    // Close the modal
    setShowSolutions(false);
  }, [puzzle, commonHintCount, getWordCoordinates, initializeFogMap, hintedTiles]);

  const handleGoldHint = useCallback(() => {
    if (!puzzle || !puzzle.optimalWords || !puzzle.optimalPath) return;
    
    // Always reset puzzle to start when hint is used
    const workingGrid = puzzle.grid.map(row => [...row]);
    setGameState(prev => prev ? {
      ...prev,
      grid: workingGrid,
      currentStart: puzzle.start,
      selection: [puzzle.start],
      playedWords: [],
      status: 'playing',
      usedTiles: new Set<string>(),
      medal: undefined,
    } : null);
    
    // Reset fogMap
    const resetFog = initializeFogMap(workingGrid, puzzle.start);
    setFogMap(resetFog);
    
    // Get the next word index to reveal
    const nextWordIndex = goldHintCount;
    if (nextWordIndex >= puzzle.optimalWords.length) return; // All words already revealed
    
    // Mark this word index as hinted
    setGoldHintedWordIndices(prev => {
      const updated = new Set(prev);
      updated.add(nextWordIndex);
      return updated;
    });
    
    // Increment hint count
    setGoldHintCount(prev => prev + 1);
    
    // Get coordinates for ALL words revealed so far (including the new one)
    const allRevealedCoords: string[] = [];
    for (let i = 0; i <= nextWordIndex; i++) {
      const wordCoords = getWordCoordinates(puzzle.optimalWords, puzzle.optimalPath, i);
      wordCoords.forEach(coord => {
        if (!allRevealedCoords.includes(coord)) {
          allRevealedCoords.push(coord);
        }
      });
    }
    
    // Get coordinates for ONLY the new word being revealed (for animation)
    const newWordCoords = getWordCoordinates(puzzle.optimalWords, puzzle.optimalPath, nextWordIndex);
    
    // First, show all previously revealed words immediately (without animation)
    // Also include any common hint tiles that were already revealed
    const previouslyRevealedCoords = allRevealedCoords.filter(coord => !newWordCoords.includes(coord));
    const currentHintedTiles = new Set(hintedTiles);
    previouslyRevealedCoords.forEach(coord => currentHintedTiles.add(coord));
    setHintedTiles(currentHintedTiles);
    
    // Then animate ONLY the new word appearing one tile at a time
    const animationDuration = newWordCoords.length * 500; // Total animation time
    newWordCoords.forEach((tileKey, index) => {
      setTimeout(() => {
        setHintedTiles(prev => {
          const updated = new Set(prev);
          updated.add(tileKey);
          return updated;
        });
        setGlowingHintTiles(prev => {
          const updated = new Set(prev);
          updated.add(tileKey);
          return updated;
        });
      }, index * 500); // 500ms delay between each tile
    });
    
    // After animation completes + 2 seconds, remove green glow
    setTimeout(() => {
      setGlowingHintTiles(prev => {
        const updated = new Set(prev);
        newWordCoords.forEach(tileKey => updated.delete(tileKey));
        return updated;
      });
    }, animationDuration + 2000); // 2 seconds after animation completes
    
    // Close the modal
    setShowSolutions(false);
  }, [puzzle, goldHintCount, getWordCoordinates, initializeFogMap, hintedTiles]);

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
    // Reset fogMap to initial state
    const resetFog = initializeFogMap(workingGrid, puzzle.start);
    setFogMap(resetFog);
    setShowWinModal(false);
    // Don't reset hints - keep hint count and clear visible tiles
    setHintedTiles(new Set());
    // Reset animations
    winModalOpacity.setValue(0);
    winCardScale.setValue(0.9);
    winCardOpacity.setValue(0);
  }, [gameState, puzzle, winModalOpacity, winCardScale, winCardOpacity, initializeFogMap]);

  const getNextPuzzle = useCallback(async (): Promise<{ category: Category; puzzleId: number } | null> => {
    if (!category || !puzzleId) return null;

    const categories: Category[] = ['4x4', '5x5', '6x6', '7x7', '8x8'];
    const currentCategoryIndex = categories.indexOf(category);
    
    // Get total puzzles in current category
    const currentCategoryCount = await getPuzzleCount(category);
    
    // If there's a next puzzle in the same category
    if (puzzleId < currentCategoryCount) {
      return { category, puzzleId: puzzleId + 1 };
    }
    
    // If this is the last puzzle in the category, go to first puzzle of next category
    if (currentCategoryIndex < categories.length - 1) {
      const nextCategory = categories[currentCategoryIndex + 1];
      return { category: nextCategory, puzzleId: 1 };
    }
    
    // If this is the last puzzle of the last category, go to first puzzle of first category
    return { category: '4x4', puzzleId: 1 };
  }, [category, puzzleId]);

  const handleNextPuzzle = useCallback(async () => {
    setShowWinModal(false);
    winModalOpacity.setValue(0);
    winCardScale.setValue(0.9);
    winCardOpacity.setValue(0);
    
    // If in custom mode, regenerate a new puzzle of the same size
    if (isCustomMode) {
      await initializeGame();
      return;
    }
    
    const nextPuzzle = await getNextPuzzle();
    if (nextPuzzle && onSelectPuzzle) {
      onSelectPuzzle(nextPuzzle.category, nextPuzzle.puzzleId);
    } else if (onBack) {
      // Fallback to going back if navigation not available
      onBack();
    }
  }, [isCustomMode, initializeGame, getNextPuzzle, onSelectPuzzle, onBack, winModalOpacity, winCardScale, winCardOpacity]);

  const handleBackToDomain = useCallback(() => {
    setShowWinModal(false);
    winModalOpacity.setValue(0);
    winCardScale.setValue(0.9);
    winCardOpacity.setValue(0);
    if (onBackToHome) {
      onBackToHome();
    } else if (onBack) {
      // Fallback to onBack if onBackToHome not provided
      onBack();
    }
  }, [onBack, onBackToHome, winModalOpacity, winCardScale, winCardOpacity]);

  const getPuzzleTitle = (): string => {
    if (category && puzzleId) {
      return `${CATEGORY_TITLES[category]} · Puzzle ${puzzleId}`;
    }
    return `Custom · ${gridSize}×${gridSize}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!puzzle || !gameState) {
    // Show loading instead of error to prevent flash
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => {
              audioManager.playSound(SoundCategory.UI);
              if (onBack) onBack();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.chevron}>‹</Text>
          </TouchableOpacity>
          
          {isCustomMode ? (
            <TouchableOpacity 
              onPress={() => setShowSizeDropdown(true)}
              activeOpacity={0.7}
              style={styles.headerTitleContainer}
            >
              <Text style={styles.headerTitle}>{getPuzzleTitle()}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{getPuzzleTitle()}</Text>
            </View>
          )}
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setShowSolutions(true)}
              activeOpacity={0.7}
            >
              <LightbulbIcon />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setShowInstructions(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.iconText}>?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grid with Fog of War */}
        <View style={styles.boardContainer}>
          <FogOfWarBoard
            grid={gameState.grid}
            start={gameState.currentStart}
            end={puzzle.end}
            selection={gameState.selection}
            usedTiles={gameState.usedTiles}
            fadingTiles={fadingTiles}
            hintedTiles={hintedTiles}
            glowingHintTiles={glowingHintTiles}
            onTilePress={handleTilePress}
            animationTrigger={tileAnimationTrigger}
            fogMap={fogMap}
            boardRevealKey={isCustomMode ? `custom:${puzzle.id}` : `${category}:${puzzleId}`}
          />
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <SecondaryButton 
            title="Restart" 
            onPress={handleRestart}
            style={styles.restartButton}
          />
          <PrimaryButton 
            title="Submit" 
            onPress={handleSubmit}
            disabled={getCurrentWord().length < getMinWordLength() || gameState.status === 'won'}
            style={styles.submitButton}
            playSound={false}
          />
        </View>

        {/* Hint Paths Display */}
        {getHintPathText().length > 0 && (
          <View style={styles.hintPathsContainer}>
            {getHintPathText().map((pathText, index) => (
              <Text key={index} style={styles.hintPathText}>
                {pathText}
              </Text>
            ))}
          </View>
        )}

        {/* HUD for win status */}
        <HUD
          currentWord={getCurrentWord()}
          goldMoves={gameState.goldMoves}
          playedCount={gameState.playedWords.length}
          status={gameState.status}
          medal={gameState.medal}
        />
      </View>

      {/* Confetti - render outside modal so it starts immediately */}
      {showWinModal && gameState.medal === 'gold' && <Confetti color="gold" />}
      {showWinModal && gameState.medal === 'silver' && <Confetti color="silver" />}

      {/* Win Modal */}
      {showWinModal && (
        <Animated.View
          style={[
            styles.winModalOverlay,
            { opacity: winModalOpacity },
          ]}
        >
          <Animated.View
            style={[
              styles.winCard,
              {
                transform: [{ scale: winCardScale }],
                opacity: winCardOpacity,
              },
            ]}
          >
            <Text style={styles.winTitle}>Puzzle Complete!</Text>
            
            <TouchableOpacity
              style={styles.winCloseButton}
              onPress={() => {
                setShowWinModal(false);
                winModalOpacity.setValue(0);
                winCardScale.setValue(0.9);
                winCardOpacity.setValue(0);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.winCloseButtonText}>✕</Text>
            </TouchableOpacity>
            
            {/* Medal Indicator */}
            {gameState.medal && (
              <View style={styles.medalContainer}>
                <MedalIcon type={gameState.medal} size={32} />
                <Text style={styles.medalText}>
                  {gameState.medal.toUpperCase()} MEDAL
                </Text>
              </View>
            )}

            {/* Path Visualization */}
            <View style={styles.pathVisualizationContainer}>
              <PathVisualization
                grid={gameState.grid}
                playedWords={gameState.playedWords}
                initialStart={puzzle.start}
                size={132}
                easyWords={puzzle.easyWords}
                easyPath={puzzle.easyPath}
                hintedWordIndices={commonHintedWordIndicesAtWin}
                optimalWords={puzzle.optimalWords}
                optimalPath={puzzle.optimalPath}
                optimalHintedWordIndices={goldHintedWordIndicesAtWin}
                commonHintUsedWordIndices={commonHintUsedWordIndicesAtWin}
                goldHintUsedWordIndices={goldHintUsedWordIndicesAtWin}
              />
            </View>

            {/* Stats Summary */}
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                Moves: {gameState.playedWords.length}
              </Text>
              {gameState.playedWords.length > 0 && (
                <Text style={styles.pathText}>
                  {gameState.playedWords.map(w => w.word).join(' → ')}
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.winButtonsContainer}>
              <PrimaryButton
                title="Next Puzzle"
                onPress={handleNextPuzzle}
                style={styles.winPrimaryButton}
              />
              <SecondaryButton
                title="Replay Puzzle"
                onPress={handleRestart}
                style={styles.winSecondaryButton}
              />
              <TouchableOpacity
                onPress={handleBackToDomain}
                style={styles.backToDomainButton}
              >
                <Text style={styles.backToDomainText}>Back to Domain</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Hints Modal */}
      <Modal
        visible={showSolutions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSolutions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <LightbulbIcon size={30} />
                <Text style={styles.modalTitle}>Get a Hint</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSolutions(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hintOptionsContainer}>
              <PrimaryButton
                title="Common Hint"
                onPress={handleCommonHint}
                style={styles.hintButton}
                disabled={!puzzle?.easyWords || commonHintCount >= (puzzle?.easyWords?.length || 0)}
              />
              <PrimaryButton
                title="Gold Hint"
                onPress={handleGoldHint}
                style={styles.hintButton}
                disabled={!puzzle?.optimalWords || goldHintCount >= (puzzle?.optimalWords?.length || 0)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Size Selector Modal (Custom Mode Only) */}
      {isCustomMode && (
        <Modal
          visible={showSizeDropdown}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowSizeDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.sizeSelectorModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Grid Size</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowSizeDropdown(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sizeOptionsContainer}>
                {[4, 5, 6, 7, 8].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      gridSize === size && styles.sizeOptionSelected,
                    ]}
                    onPress={() => {
                      setGridSize(size);
                      setShowSizeDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sizeOptionText,
                        gridSize === size && styles.sizeOptionTextSelected,
                      ]}
                    >
                      {size}×{size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Instructions Modal */}
      <Modal
        visible={showInstructions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Play</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInstructions(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.instructionsSection}>
                <Text style={styles.instruction}>• Start from the START tile (gold)</Text>
                <Text style={styles.instruction}>• Tap adjacent tiles (including diagonals) to form words</Text>
                <Text style={styles.instruction}>• No tile reuse within the same word</Text>
                <Text style={styles.instruction}>• Submit valid words (3+ letters) to clear tiles and advance</Text>
                <Text style={styles.instruction}>• Reach the END tile (gold) to win!</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Fonts.body,
    color: Colors.textPrimary,
  },
  loadingSubtext: {
    marginTop: Spacing.xs,
    ...Fonts.small,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Fonts.subtitle,
    color: Colors.danger,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    ...Fonts.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: 8,
    minWidth: 100,
  },
  retryButtonText: {
    ...Fonts.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 32,
    color: Colors.surfaceDark,
    fontWeight: '300',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: 88, // 40 + gap + 40 for two icons
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
    color: Colors.surfaceDark,
  },
  boardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    width: '100%',
  },
  restartButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tileBorder,
    paddingBottom: Spacing.md,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modalTitle: {
    ...Fonts.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.tileBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  hintOptionsContainer: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  hintButton: {
    width: '100%',
  },
  hintPathsContainer: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  hintPathText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'left',
    marginBottom: Spacing.xs,
  },
  solutionSection: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.tileBackground,
    borderRadius: 8,
  },
  solutionTitle: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },
  solutionSubtitle: {
    ...Fonts.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  wordList: {
    marginBottom: Spacing.sm,
  },
  wordItem: {
    ...Fonts.body,
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },
  wordBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  goldMoves: {
    ...Fonts.body,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  instructionsSection: {
    padding: Spacing.md,
  },
  instruction: {
    ...Fonts.body,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  winModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  winCard: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    width: '80%',
    alignItems: 'center',
    ...Shadows.soft,
    position: 'relative',
  },
  winCloseButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  winCloseButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  winTitle: {
    ...Fonts.title,
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  pathVisualizationContainer: {
    width: 132,
    height: 132,
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  pathText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  medalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  medalText: {
    ...Fonts.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  winButtonsContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  winPrimaryButton: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  winSecondaryButton: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  backToDomainButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  backToDomainText: {
    ...Fonts.small,
    color: Colors.textSecondary,
  },
  sizeSelectorModal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '80%',
    maxWidth: 300,
    ...Shadows.soft,
  },
  sizeOptionsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  sizeOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.tileBackground,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  sizeOptionText: {
    ...Fonts.subtitle,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  sizeOptionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
