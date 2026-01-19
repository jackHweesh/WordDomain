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
import { generateBlackoutPuzzle } from '../core/blackoutPuzzleGenerator';
import { isValidWord, getMinWordLength } from '../core/wordValidator';
import { loadBigDictionary } from '../core/dictionaryLoader';
import { Coordinate, PuzzleData } from '../core/types';
import Board from '../components/Board';
import { getCategories } from '../services/puzzleLoader';
import { Category } from '../services/progressStorage';
import { getBlackoutPuzzleCount } from '../services/blackoutPuzzleCache';
import { saveTrophy, unlockNextPuzzle } from '../services/blackoutProgressStorage';
import { getBlackoutPuzzle } from '../services/blackoutPuzzleCache';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import TrophyIcon from '../components/TrophyIcon';
import PathVisualization from '../components/PathVisualization';
import Confetti from '../components/Confetti';
import { Colors, Spacing, Fonts, Radius, Shadows } from '../src/styles/theme';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

interface GameState {
  grid: string[][];
  currentStart: Coordinate;
  selection: Coordinate[];
  playedWords: Array<{ word: string; path: Coordinate[] }>;
  status: 'playing' | 'won' | 'invalid';
  usedTiles: Set<string>;
  totalTiles: number; // Total tiles in the grid
}

interface BlackoutPuzzleScreenProps {
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

export default function BlackoutPuzzleScreen({ category, puzzleId, onBack, onSelectPuzzle, onBackToHome }: BlackoutPuzzleScreenProps) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState(6);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(!category || !puzzleId);
  const [showWinModal, setShowWinModal] = useState(false);
  const [tileAnimationTrigger, setTileAnimationTrigger] = useState<{ coord: Coordinate; type: 'select' | 'unselect' | 'invalid' } | null>(null);
  const [fadingTiles, setFadingTiles] = useState<Set<string>>(new Set());
  const [hintedTiles, setHintedTiles] = useState<Set<string>>(new Set());
  const [glowingHintTiles, setGlowingHintTiles] = useState<Set<string>>(new Set()); // Tiles that are currently glowing green
  // Classic Hint (progressive word reveal) tracking
  const [classicHintCount, setClassicHintCount] = useState(0);
  // Solve Puzzle Hint (all words at once) tracking
  const [solvePuzzleHintUsed, setSolvePuzzleHintUsed] = useState(false);
  // Legacy hint tracking (kept for compatibility but not used in Blackout)
  const [commonHintCount, setCommonHintCount] = useState(0);
  const [commonHintedWordIndices, setCommonHintedWordIndices] = useState<Set<number>>(new Set());
  const [commonHintedWordIndicesAtWin, setCommonHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [commonHintUsedWordIndices, setCommonHintUsedWordIndices] = useState<Set<number>>(new Set());
  const [commonHintUsedWordIndicesAtWin, setCommonHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [goldHintCount, setGoldHintCount] = useState(0);
  const [goldHintedWordIndices, setGoldHintedWordIndices] = useState<Set<number>>(new Set());
  const [goldHintedWordIndicesAtWin, setGoldHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [goldHintUsedWordIndices, setGoldHintUsedWordIndices] = useState<Set<number>>(new Set());
  const [goldHintUsedWordIndicesAtWin, setGoldHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const winModalOpacity = useRef(new Animated.Value(0)).current;
  const winCardScale = useRef(new Animated.Value(0.9)).current;
  const winCardOpacity = useRef(new Animated.Value(0)).current;

  const initializeGame = useCallback(async () => {
    setLoading(true);
    try {
      let newPuzzle: PuzzleData;
      
      if (category && puzzleId) {
        newPuzzle = await getBlackoutPuzzle(category, puzzleId);
      } else {
        newPuzzle = await generateBlackoutPuzzle(Math.floor(Math.random() * 1000) + 1, gridSize);
      }

      const totalTiles = newPuzzle.grid.length * newPuzzle.grid[0].length;
      const workingGrid = newPuzzle.grid.map(row => [...row]);
      const initialState: GameState = {
        grid: workingGrid,
        currentStart: newPuzzle.start,
        selection: [newPuzzle.start],
        playedWords: [],
        status: 'playing',
        usedTiles: new Set<string>(),
        totalTiles,
      };
      
      setPuzzle(newPuzzle);
      setGameState(initialState);
      setShowWinModal(false);
      // Reset hints
      setHintedTiles(new Set());
      setGlowingHintTiles(new Set());
      setClassicHintCount(0);
      setSolvePuzzleHintUsed(false);
      setCommonHintCount(0);
      setCommonHintedWordIndices(new Set());
      setCommonHintedWordIndicesAtWin(new Set());
      setCommonHintUsedWordIndices(new Set());
      setCommonHintUsedWordIndicesAtWin(new Set());
      setGoldHintCount(0);
      setGoldHintedWordIndices(new Set());
      setGoldHintedWordIndicesAtWin(new Set());
      setGoldHintUsedWordIndices(new Set());
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
  }, [category, puzzleId, gridSize, winModalOpacity, winCardScale, winCardOpacity]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Preload big dictionary on mount
  useEffect(() => {
    loadBigDictionary().catch(error => {
      console.error('Error preloading dictionary:', error);
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

  const handleTilePress = useCallback((coord: Coordinate) => {
    if (!gameState || !puzzle) return;
    if (gameState.status === 'won') return;

    const tileKey = `${coord.row},${coord.col}`;
    
    // Check for unselect (tapping last selected tile)
    if (gameState.selection.length > 1) {
      const lastTile = gameState.selection[gameState.selection.length - 1];
      if (lastTile.row === coord.row && lastTile.col === coord.col) {
        // Play tile press sound for unselect
        audioManager.playSound(SoundCategory.TILE_PRESS);
        const newSelection = gameState.selection.slice(0, -1);
        setGameState({ ...gameState, selection: newSelection, status: 'playing' });
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
    setTileAnimationTrigger({ coord, type: 'select' });
    setTimeout(() => setTileAnimationTrigger(null), 200);
  }, [gameState, puzzle, isAdjacent8]);

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
      
      // Check if this word matches any hinted words (Classic Hint or Solve Puzzle)
      const newCommonHintUsedWordIndices = new Set(commonHintUsedWordIndices);
      if (puzzle.easyWords && puzzle.easyPath) {
        // Check Classic Hint: all words from 0 to classicHintCount-1
        for (let wordIndex = 0; wordIndex < classicHintCount; wordIndex++) {
          if (wordIndex < puzzle.easyWords.length) {
            const hintWord = puzzle.easyWords[wordIndex];
            const hintPath = getWordPathForIndex(puzzle.easyWords, puzzle.easyPath, wordIndex);
            if (checkWordMatchesHint(newPlayedWord, hintWord, hintPath)) {
              newCommonHintUsedWordIndices.add(wordIndex);
            }
          }
        }
        // Check Solve Puzzle: all words if solvePuzzleHintUsed is true
        if (solvePuzzleHintUsed) {
          for (let wordIndex = 0; wordIndex < puzzle.easyWords.length; wordIndex++) {
            const hintWord = puzzle.easyWords[wordIndex];
            const hintPath = getWordPathForIndex(puzzle.easyWords, puzzle.easyPath, wordIndex);
            if (checkWordMatchesHint(newPlayedWord, hintWord, hintPath)) {
              newCommonHintUsedWordIndices.add(wordIndex);
            }
          }
        }
      }
      setCommonHintUsedWordIndices(newCommonHintUsedWordIndices);
      
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
        
        // Blackout win condition: reached END AND all tiles used
        const reachedEnd = lastTile.row === puzzle.end.row && lastTile.col === puzzle.end.col;
        const allTilesUsed = newUsedTiles.size === gameState.totalTiles - 1; // -1 because end tile is not in usedTiles
        const isWon = reachedEnd && allTilesUsed;
        const isFailure = reachedEnd && !allTilesUsed; // Reached END but not all tiles used
        
        setGameState({
          ...gameState,
          currentStart: newStart,
          selection: [newStart],
          playedWords: [...gameState.playedWords, newPlayedWord],
          status: isWon ? 'won' : isFailure ? 'invalid' : 'playing',
          usedTiles: newUsedTiles,
          totalTiles: gameState.totalTiles,
        });
        
        // Clear fading tiles
        setFadingTiles(new Set());
        
        if (isWon && category && puzzleId) {
          saveTrophy(category, puzzleId);
          unlockNextPuzzle(category, puzzleId);
        }
        
        if (isWon) {
          // Build the set of hinted word indices for Blackout mode
          const allHintedIndices = new Set<number>();
          if (puzzle.easyWords) {
            if (solvePuzzleHintUsed) {
              for (let i = 0; i < puzzle.easyWords.length; i++) allHintedIndices.add(i);
            } else {
              for (let i = 0; i < classicHintCount; i++) allHintedIndices.add(i);
            }
          }
          setCommonHintedWordIndicesAtWin(allHintedIndices);
          setGoldHintedWordIndicesAtWin(new Set());
          
          // Calculate which hinted words were actually used by checking ALL played words
          // Do this here to ensure we have the complete final solution
          const finalPlayedWords = [...gameState.playedWords, newPlayedWord];
          const finalCommonHintUsedWordIndices = new Set<number>();
          
          // Check each played word against all hinted words (Classic Hint and Solve Puzzle)
          finalPlayedWords.forEach((playedWord) => {
            if (puzzle.easyWords && puzzle.easyPath) {
              // Check Classic Hint: all words from 0 to classicHintCount-1
              for (let wordIndex = 0; wordIndex < classicHintCount; wordIndex++) {
                if (wordIndex < puzzle.easyWords.length) {
                  const hintWord = puzzle.easyWords[wordIndex];
                  const hintPath = getWordPathForIndex(puzzle.easyWords, puzzle.easyPath, wordIndex);
                  if (checkWordMatchesHint(playedWord, hintWord, hintPath)) {
                    finalCommonHintUsedWordIndices.add(wordIndex);
                  }
                }
              }
              // Check Solve Puzzle: all words if solvePuzzleHintUsed is true
              if (solvePuzzleHintUsed) {
                for (let wordIndex = 0; wordIndex < puzzle.easyWords.length; wordIndex++) {
                  const hintWord = puzzle.easyWords[wordIndex];
                  const hintPath = getWordPathForIndex(puzzle.easyWords, puzzle.easyPath, wordIndex);
                  if (checkWordMatchesHint(playedWord, hintWord, hintPath)) {
                    finalCommonHintUsedWordIndices.add(wordIndex);
                  }
                }
              }
            }
          });
          
          // Preserve the calculated used hint word indices
          // Use simplified calculation with allHintedIndices we built above
          // CRITICAL: This must process ALL hinted indices, not just the first one
          const calculateHintMatches = (hintedIndices: Set<number>, hintWords: string[] | null | undefined, hintPath: Coordinate[] | null | undefined): Set<number> => {
            const matchedIndices = new Set<number>();
            if (!hintWords || !hintPath) return matchedIndices;
            
            // Convert Set to Array to ensure explicit iteration through ALL elements
            const hintedIndicesArray = Array.from(hintedIndices);
            
            // For each hinted word index - process ALL of them
            for (const wordIndex of hintedIndicesArray) {
              if (wordIndex >= hintWords.length) continue;
              const hintWord = hintWords[wordIndex];
              const hintPathForWord = getWordPathForIndex(hintWords, hintPath, wordIndex);
              
              // Check if any played word matches this hint word and path exactly
              // Process ALL played words to find the match
              for (const playedWord of finalPlayedWords) {
                if (checkWordMatchesHint(playedWord, hintWord, hintPathForWord)) {
                  matchedIndices.add(wordIndex);
                  break; // Found a match for this wordIndex, move to next wordIndex
                }
              }
            }
            return matchedIndices;
          };
          const commonHintMatches = calculateHintMatches(allHintedIndices, puzzle.easyWords, puzzle.easyPath);
          setCommonHintUsedWordIndicesAtWin(commonHintMatches);
          setGoldHintUsedWordIndicesAtWin(new Set());
          
          // Reset hints when puzzle is completed
          setHintedTiles(new Set());
          setGlowingHintTiles(new Set());
          setClassicHintCount(0);
          setSolvePuzzleHintUsed(false);
          setCommonHintCount(0);
          setCommonHintedWordIndices(new Set());
          setCommonHintUsedWordIndices(new Set());
          setGoldHintCount(0);
          setGoldHintedWordIndices(new Set());
          setGoldHintUsedWordIndices(new Set());
          
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
        } else if (isFailure) {
          // Show failure modal
          setShowFailureModal(true);
        }
      }, 300); // Fade duration
    } else {
      // Play deny sound for invalid word
      audioManager.playSound(SoundCategory.DENY);
      
      const workingGrid = puzzle.grid.map(row => [...row]);
      setGameState({
        ...gameState,
        grid: workingGrid,
        currentStart: puzzle.start,
        selection: [puzzle.start],
        playedWords: [],
        status: 'invalid',
        usedTiles: new Set<string>(),
        totalTiles: gameState.totalTiles,
      });
      // Don't reset hints on invalid word - only clear visible tiles
      setHintedTiles(new Set());
      setGlowingHintTiles(new Set());
    }
  }, [gameState, puzzle, category, puzzleId, hintedTiles]);

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

  // Helper function to get ordered coordinates for the first N words from easyWords
  // This matches the exact logic from placeWordsOnPath in puzzleGenerator.ts
  const getWordCoordinatesOrdered = useCallback((words: string[], path: Coordinate[], wordCount: number): string[] => {
    const orderedCoords: string[] = [];
    if (!words || !path || wordCount === 0) return orderedCoords;
    
    let pathIndex = 0;
    const wordsToHint = words.slice(0, wordCount);
    const seenCoords = new Set<string>();
    
    for (let wordIndex = 0; wordIndex < wordsToHint.length; wordIndex++) {
      const word = wordsToHint[wordIndex];
      const isFirst = wordIndex === 0;
      
      // Place letters of the word (matches placeWordsOnPath logic exactly)
      for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
        if (pathIndex >= path.length) break;
        
        const coord = path[pathIndex];
        const tileKey = `${coord.row},${coord.col}`;
        
        // Add coordinate to ordered list only if not already seen (handle overlaps)
        if (!seenCoords.has(tileKey)) {
          orderedCoords.push(tileKey);
          seenCoords.add(tileKey);
        }
        
        // Skip first letter of subsequent words (overlap) - matches placeWordsOnPath
        if (!isFirst && letterIndex === 0) {
          // Letter already placed by previous word, pathIndex stays the same
        } else {
          pathIndex++;
        }
      }
    }
    
    return orderedCoords;
  }, []);

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

  // Helper function to get hint path text for display
  const getHintPathText = useCallback((): string[] => {
    const paths: string[] = [];
    
    if (puzzle && puzzle.easyWords) {
      if (classicHintCount > 0) {
        const revealedWords = puzzle.easyWords.slice(0, classicHintCount);
        if (revealedWords.length > 0) {
          paths.push(`Classic Hint: ${revealedWords.join(' --> ')}`);
        }
      }
      
      if (solvePuzzleHintUsed && puzzle.easyWords.length > 0) {
        paths.push(`Solve Puzzle: ${puzzle.easyWords.join(' --> ')}`);
      }
    }
    
    return paths;
  }, [puzzle, classicHintCount, solvePuzzleHintUsed]);

  const handleClassicHint = useCallback(() => {
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
    } : null);
    
    // Get the next word index to reveal
    const nextWordIndex = classicHintCount;
    if (nextWordIndex >= puzzle.easyWords.length) return; // All words already revealed
    
    // Mark this word index as hinted
    setCommonHintedWordIndices(prev => {
      const updated = new Set(prev);
      updated.add(nextWordIndex);
      return updated;
    });
    
    // Increment hint count
    setClassicHintCount(prev => prev + 1);
    
    // Get coordinates for ALL classic hint words revealed so far (including the new one)
    const allRevealedCoords: string[] = [];
    for (let i = 0; i <= nextWordIndex; i++) {
      const wordCoords = getWordCoordinates(puzzle.easyWords, puzzle.easyPath, i);
      wordCoords.forEach(coord => {
        if (!allRevealedCoords.includes(coord)) {
          allRevealedCoords.push(coord);
        }
      });
    }
    
    // Get coordinates for ONLY the new word being revealed (for animation)
    const newWordCoords = getWordCoordinates(puzzle.easyWords, puzzle.easyPath, nextWordIndex);
    
    // Get all previously revealed words (excluding the new one)
    const previouslyRevealedCoords = allRevealedCoords.filter(coord => !newWordCoords.includes(coord));
    
    // Also preserve any solve puzzle hint tiles that were already revealed
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
    setShowHints(false);
  }, [puzzle, classicHintCount, getWordCoordinates, hintedTiles]);

  const handleSolvePuzzleHint = useCallback(() => {
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
    } : null);
    
    // Mark solve puzzle hint as used
    setSolvePuzzleHintUsed(true);
    
    // Mark all word indices as hinted for Solve Puzzle
    setCommonHintedWordIndices(prev => {
      const updated = new Set(prev);
      for (let i = 0; i < puzzle.easyWords.length; i++) {
        updated.add(i);
      }
      return updated;
    });
    
    // Get coordinates for ALL words in the solution
    const allCoords: string[] = [];
    for (let i = 0; i < puzzle.easyWords.length; i++) {
      const wordCoords = getWordCoordinates(puzzle.easyWords, puzzle.easyPath, i);
      wordCoords.forEach(coord => {
        if (!allCoords.includes(coord)) {
          allCoords.push(coord);
        }
      });
    }
    
    // Animate all tiles appearing one at a time (same pace as other hints)
    const animationDuration = allCoords.length * 500; // Total animation time
    allCoords.forEach((tileKey, index) => {
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
        allCoords.forEach(tileKey => updated.delete(tileKey));
        return updated;
      });
    }, animationDuration + 2000); // 2 seconds after animation completes
    
    // Close the modal
    setShowHints(false);
  }, [puzzle, getWordCoordinates]);

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
      totalTiles: gameState.totalTiles,
    });
    setShowWinModal(false);
    // Don't reset hints - keep hint count and clear visible tiles
    setHintedTiles(new Set());
    setGlowingHintTiles(new Set());
    // Reset animations
    winModalOpacity.setValue(0);
    winCardScale.setValue(0.9);
    winCardOpacity.setValue(0);
  }, [gameState, puzzle, winModalOpacity, winCardScale, winCardOpacity]);

  const getNextPuzzle = useCallback(async (): Promise<{ category: Category; puzzleId: number } | null> => {
    if (!category || !puzzleId) return null;

    const categories: Category[] = ['4x4', '5x5', '6x6', '7x7', '8x8'];
    const currentCategoryIndex = categories.indexOf(category);
    
    // Get total puzzles in current category
    const currentCategoryCount = await getBlackoutPuzzleCount(category);
    
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
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                setShowHints(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.iconText}>💡</Text>
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

        {/* Grid */}
        <View style={styles.boardContainer}>
          <Board
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

        {/* Current Word Capsule */}
        <View style={styles.currentWordContainer}>
          <Text style={styles.currentWordLabel}>
            Current Word:
          </Text>
          <Text style={styles.currentWordValue}>
            {getCurrentWord()}
          </Text>
        </View>

        {/* Hint Paths Display - Scrollable */}
        {getHintPathText().length > 0 && (
          <View style={styles.hintPathsContainer}>
            <ScrollView 
              style={styles.hintPathsScrollView}
              contentContainerStyle={styles.hintPathsScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {getHintPathText().map((pathText, index) => (
                <Text key={index} style={styles.hintPathText}>
                  {pathText}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Status Message */}
        {gameState.status === 'invalid' && (
          <View style={styles.statusContainer}>
            <Text style={styles.invalidText}>❌ Invalid word - try again!</Text>
          </View>
        )}
        {gameState.status === 'won' && (
          <View style={styles.statusContainer}>
            <Text style={styles.wonText}>🏆 Blackout Achieved!</Text>
          </View>
        )}
      </View>

      {/* Gold confetti for Blackout completion - render outside modal so it starts immediately */}
      {showWinModal && <Confetti color="gold" />}

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
            <Text style={styles.winTitle}>Blackout Complete!</Text>
            
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
            
            {/* Trophy Indicator */}
            <View style={styles.trophyContainer}>
              <TrophyIcon size={64} />
            </View>

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
                Words: {gameState.playedWords.length}
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

      {/* Hints Modal */}
      <Modal
        visible={showHints}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHints(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💡 Get a Hint</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowHints(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hintOptionsContainer}>
              <PrimaryButton
                title="Classic Hint"
                onPress={handleClassicHint}
                style={styles.hintButton}
                disabled={!puzzle?.easyWords || classicHintCount >= (puzzle?.easyWords?.length || 0)}
              />
              <PrimaryButton
                title="Solve Puzzle"
                onPress={handleSolvePuzzleHint}
                style={styles.hintButton}
                disabled={!puzzle?.easyWords || solvePuzzleHintUsed}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Failure Modal */}
      <Modal
        visible={showFailureModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFailureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.failureCard}>
            <Text style={styles.failureTitle}>❌ Not Complete</Text>
            <Text style={styles.failureText}>
              You reached the END tile, but you haven't used all tiles on the board!
            </Text>
            <Text style={styles.failureSubtext}>
              Try again and make sure to use every single tile.
            </Text>
            <PrimaryButton
              title="Try Again"
              onPress={() => {
                setShowFailureModal(false);
                handleRestart();
              }}
              style={styles.failureButton}
            />
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>How to Play - Blackout</Text>
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
                <Text style={styles.instruction}>• Use EVERY tile on the board!</Text>
                <Text style={styles.instruction}>• Reach the END tile with all tiles used to achieve Blackout!</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles - similar to PuzzleScreen but adjusted for Blackout
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
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Fonts.title,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
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
  currentWordContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.tileBackground,
    borderColor: Colors.surfaceDark,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  currentWordLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  currentWordValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  solutionSection: {
    marginBottom: Spacing.xl,
  },
  solutionTitle: {
    ...Fonts.title,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  solutionSubtitle: {
    ...Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  wordList: {
    marginTop: Spacing.sm,
  },
  wordItem: {
    ...Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  wordBold: {
    fontWeight: '600',
    color: Colors.accent,
  },
  failureCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: screenWidth * 0.85,
    maxWidth: 400,
    ...Shadows.soft,
    alignItems: 'center',
  },
  failureTitle: {
    ...Fonts.title,
    fontSize: 24,
    color: '#A85D3A',
    marginBottom: Spacing.md,
  },
  failureText: {
    ...Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  failureSubtext: {
    ...Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  failureButton: {
    width: '100%',
  },
  statusContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  invalidText: {
    fontSize: 14,
    color: '#A85D3A',
    fontWeight: 'bold',
  },
  wonText: {
    fontSize: 16,
    color: '#8B6F47',
    fontWeight: 'bold',
  },
  winModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  winCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: screenWidth * 0.85,
    maxWidth: 400,
    ...Shadows.soft,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10000,
  },
  winTitle: {
    ...Fonts.title,
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
  trophyContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pathVisualizationContainer: {
    marginVertical: Spacing.md,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statText: {
    ...Fonts.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pathText: {
    ...Fonts.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  winButtonsContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  winPrimaryButton: {
    width: '100%',
  },
  winSecondaryButton: {
    width: '100%',
  },
  backToDomainButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  backToDomainText: {
    ...Fonts.body,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    width: screenWidth * 0.85,
    maxWidth: 400,
    maxHeight: '80%',
    ...Shadows.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tileBorder,
  },
  modalTitle: {
    ...Fonts.title,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  modalScrollView: {
    padding: Spacing.md,
  },
  hintOptionsContainer: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  hintButton: {
    width: '100%',
  },
  instructionsSection: {
    gap: Spacing.sm,
  },
  instruction: {
    ...Fonts.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  sizeSelectorModal: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    width: screenWidth * 0.7,
    ...Shadows.soft,
  },
  sizeOptionsContainer: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sizeOption: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.tileBackground,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: Colors.accent,
  },
  sizeOptionText: {
    ...Fonts.title,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  sizeOptionTextSelected: {
    color: Colors.background,
  },
  hintPathsContainer: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    width: '100%',
    maxHeight: 150, // Limit height to allow scrolling when needed
  },
  hintPathsScrollView: {
    maxHeight: 150,
  },
  hintPathsScrollContent: {
    paddingBottom: Spacing.xs,
  },
  hintPathText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'left',
    marginBottom: Spacing.xs,
  },
});

