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
  Alert,
} from 'react-native';
const screenWidth = Dimensions.get('window').width;
import { generatePuzzle } from '../core/puzzleGenerator';
import { solveOptimal } from '../core/puzzleSolver';
import { isValidWord, getMinWordLength } from '../core/wordValidator';
import { loadBigDictionary } from '../core/dictionaryLoader';
import { Coordinate, PuzzleData } from '../core/types';
import Board from '../components/Board';
import HUD from '../components/HUD';
import { getPuzzle, getPuzzleCount, getCategories } from '../services/puzzleLoader';
import { Category, saveMedal, unlockNextPuzzle } from '../services/progressStorage';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import MedalIcon from '../components/MedalIcon';
import LightbulbIcon from '../components/LightbulbIcon';
import PathVisualization from '../components/PathVisualization';
import Confetti from '../components/Confetti';
import TokenIcon from '../components/TokenIcon';
import TokenRewardOverlay from '../components/TokenRewardOverlay';
import { getTokenBalance, addTokens, deductTokens, claimDailyTokensIfEligible } from '../services/tokenStorage';
import { Colors, Spacing, Fonts, Radius, Shadows } from '../src/styles/theme';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

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

export default function PuzzleScreen({ category, puzzleId, onBack, onSelectPuzzle, onBackToHome }: PuzzleScreenProps) {
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
  // Common Hint (easy path) tracking
  const [commonHintCount, setCommonHintCount] = useState(0);
  const [commonHintedWordIndices, setCommonHintedWordIndices] = useState<Set<number>>(new Set());
  const [commonHintedWordIndicesAtWin, setCommonHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [commonHintUsedWordIndices, setCommonHintUsedWordIndices] = useState<Set<number>>(new Set()); // Track which common hint words were actually used
  const [commonHintUsedWordIndicesAtWin, setCommonHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  // Gold Hint (optimal path) tracking
  const [goldHintCount, setGoldHintCount] = useState(0);
  const [goldHintedWordIndices, setGoldHintedWordIndices] = useState<Set<number>>(new Set());
  const [goldHintedWordIndicesAtWin, setGoldHintedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const [goldHintUsedWordIndices, setGoldHintUsedWordIndices] = useState<Set<number>>(new Set()); // Track which gold hint words were actually used
  const [goldHintUsedWordIndicesAtWin, setGoldHintUsedWordIndicesAtWin] = useState<Set<number>>(new Set());
  const winModalOpacity = useRef(new Animated.Value(0)).current;
  const winCardScale = useRef(new Animated.Value(0.9)).current;
  const winCardOpacity = useRef(new Animated.Value(0)).current;
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenBalanceLoaded, setTokenBalanceLoaded] = useState(false);
  const [showTokenReward, setShowTokenReward] = useState<number>(0);
  const [tokenCounterPosition, setTokenCounterPosition] = useState<{ x: number; y: number } | undefined>();
  const tokenCounterRef = useRef<View>(null);

  const refreshTokenBalance = useCallback(async () => {
    const balance = await getTokenBalance();
    setTokenBalance(balance);
    setTokenBalanceLoaded(true);
  }, []);

  const initializeGame = useCallback(async () => {
    setLoading(true);
    // Clear board immediately so no old tiles show while new puzzle loads (fixes custom level size change)
    setPuzzle(null);
    setGameState(null);
    try {
      let newPuzzle: PuzzleData;
      
      if (category && puzzleId) {
        const loadedPuzzle = await getPuzzle(category, puzzleId);
        if (!loadedPuzzle) {
          throw new Error(`Failed to load puzzle ${category}-${puzzleId}`);
        }
        newPuzzle = loadedPuzzle;
        
        if (!newPuzzle.optimalWords || !newPuzzle.optimalPath || !newPuzzle.goldMoves) {
          console.warn(`Puzzle ${category}-${puzzleId} missing optimal solution, computing...`);
          const { optimalWords, optimalPath, goldMoves } = await solveOptimal(newPuzzle);
          newPuzzle.optimalWords = optimalWords;
          newPuzzle.optimalPath = optimalPath;
          newPuzzle.goldMoves = goldMoves;
        }
      } else {
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
      setShowWinModal(false);
      // Reset hints
      setHintedTiles(new Set());
      setGlowingHintTiles(new Set());
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

  useEffect(() => {
    refreshTokenBalance();
  }, [refreshTokenBalance]);

  // After puzzle and tiles have loaded: claim daily tokens if eligible and show reward animation
  useEffect(() => {
    if (loading || !puzzle || !gameState) return;
    let cancelled = false;
    (async () => {
      const granted = await claimDailyTokensIfEligible();
      if (cancelled) return;
      if (granted > 0) {
        await refreshTokenBalance();
        setShowTokenReward(granted);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, puzzle, gameState, refreshTokenBalance]);

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
      
      const lastTile = gameState.selection[gameState.selection.length - 1];
      
      // Check if this word matches any common hint words
      const newCommonHintUsedWordIndices = new Set(commonHintUsedWordIndices);
      if (puzzle.easyWords && puzzle.easyPath) {
        // Check all hinted words from 0 to commonHintCount-1
        for (let wordIndex = 0; wordIndex < commonHintCount; wordIndex++) {
          if (wordIndex < puzzle.easyWords.length) {
            // Get the path for this word
            const hintWord = puzzle.easyWords[wordIndex];
            const hintPath = getWordPathForIndex(puzzle.easyWords, puzzle.easyPath, wordIndex);
            if (checkWordMatchesHint(newPlayedWord, hintWord, hintPath)) {
              newCommonHintUsedWordIndices.add(wordIndex);
            }
          }
        }
      }
      
      // Check if this word matches any gold hint words
      const newGoldHintUsedWordIndices = new Set(goldHintUsedWordIndices);
      if (puzzle.optimalWords && puzzle.optimalPath) {
        // Check all hinted words from 0 to goldHintCount-1
        for (let wordIndex = 0; wordIndex < goldHintCount; wordIndex++) {
          if (wordIndex < puzzle.optimalWords.length) {
            // Get the path for this word
            const hintWord = puzzle.optimalWords[wordIndex];
            const hintPath = getWordPathForIndex(puzzle.optimalWords, puzzle.optimalPath, wordIndex);
            if (checkWordMatchesHint(newPlayedWord, hintWord, hintPath)) {
              newGoldHintUsedWordIndices.add(wordIndex);
            }
          }
        }
      }
      
      setCommonHintUsedWordIndices(newCommonHintUsedWordIndices);
      setGoldHintUsedWordIndices(newGoldHintUsedWordIndices);
      
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
        
        setGameState({
          ...gameState,
          currentStart: newStart,
          selection: [newStart],
          playedWords: [...gameState.playedWords, newPlayedWord],
          status: isWon ? 'won' : 'playing',
          medal,
          usedTiles: newUsedTiles,
        });
        
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
          
          // Store for visualization
          setCommonHintedWordIndicesAtWin(new Set(commonHintedWordIndices));
          setGoldHintedWordIndicesAtWin(new Set(goldHintedWordIndices));
          setCommonHintUsedWordIndicesAtWin(commonHintMatches);
          setGoldHintUsedWordIndicesAtWin(goldHintMatches);
          
          // Reset hints when puzzle is completed
          setHintedTiles(new Set());
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
      });
      // Don't reset hints on invalid word - only clear visible tiles
      setHintedTiles(new Set());
    }
  }, [gameState, puzzle, category, puzzleId, hintedTiles, commonHintedWordIndices, goldHintedWordIndices, commonHintUsedWordIndices, goldHintUsedWordIndices, getWordPathForIndex, checkWordMatchesHint]);

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
  // Returns the coordinates that make up just that one word
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
    
    // Get the next word index to reveal
    const nextWordIndex = commonHintCount;
    if (nextWordIndex >= puzzle.easyWords.length) return; // All words already revealed
    
    // Mark this word index as hinted
    setCommonHintedWordIndices(prev => {
      const updated = new Set(prev);
      updated.add(nextWordIndex);
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
  }, [puzzle, commonHintCount, getWordCoordinates]);

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
  }, [puzzle, goldHintCount, getWordCoordinates, hintedTiles]);

  const onCommonHintPress = useCallback(async () => {
    if (tokenBalance < 1) {
      Alert.alert('Not enough tokens', 'You need 1 token for a Common Hint. Open the app on a new day for 3 free tokens, or watch an ad for 2 tokens.');
      return;
    }
    const { success } = await deductTokens(1);
    if (!success) {
      Alert.alert('Not enough tokens', 'You need 1 token for a Common Hint.');
      return;
    }
    await refreshTokenBalance();
    handleCommonHint();
  }, [tokenBalance, handleCommonHint, refreshTokenBalance]);

  const onGoldHintPress = useCallback(async () => {
    if (tokenBalance < 3) {
      Alert.alert('Not enough tokens', 'You need 3 tokens for a Gold Hint. Open the app on a new day for 3 free tokens, or watch an ad for 2 tokens.');
      return;
    }
    const { success } = await deductTokens(3);
    if (!success) {
      Alert.alert('Not enough tokens', 'You need 3 tokens for a Gold Hint.');
      return;
    }
    await refreshTokenBalance();
    handleGoldHint();
  }, [tokenBalance, handleGoldHint, refreshTokenBalance]);

  const onWatchAdPress = useCallback(() => {
    setShowSolutions(false);
    setTimeout(() => {
      setShowTokenReward(2);
    }, 350);
  }, []);

  const handleTokenRewardComplete = useCallback(async () => {
    if (showTokenReward === 2) await addTokens(2);
    await refreshTokenBalance();
    setShowTokenReward(0);
  }, [showTokenReward, refreshTokenBalance]);

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
    setShowWinModal(false);
    // Don't reset hints - keep hint count and clear visible tiles
    setHintedTiles(new Set());
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

          <View
            ref={tokenCounterRef}
            style={styles.tokenCounterWrap}
            onLayout={() => {
              tokenCounterRef.current?.measureInWindow((x, y, width, height) => {
                setTokenCounterPosition({ x: x + width / 2, y: y + height / 2 });
              });
            }}
          >
            <TokenIcon size={22} count={tokenBalanceLoaded ? tokenBalance : undefined} />
          </View>
          
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

        {/* Grid - DO NOT MODIFY */}
        <View style={styles.boardContainer}>
          <Board
            key={`board-${puzzle.id}-${gameState.grid.length}-${gameState.grid[0].length}`}
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

        {/* Current Word Capsule */}
        <View style={styles.currentWordContainer}>
          <Text style={styles.currentWordLabel}>
            Current Word:
          </Text>
          <Text style={styles.currentWordValue}>
            {getCurrentWord()}
          </Text>
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
              <TouchableOpacity
                style={[
                  styles.hintButton,
                  (!puzzle?.easyWords || commonHintCount >= (puzzle?.easyWords?.length || 0)) && styles.hintButtonDisabled,
                ]}
                onPress={onCommonHintPress}
                activeOpacity={0.8}
                disabled={!puzzle?.easyWords || commonHintCount >= (puzzle?.easyWords?.length || 0)}
              >
                <Text style={styles.hintButtonText}>Common Hint</Text>
                <TokenIcon size={20} count={1} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.hintButton,
                  (!puzzle?.optimalWords || goldHintCount >= (puzzle?.optimalWords?.length || 0)) && styles.hintButtonDisabled,
                ]}
                onPress={onGoldHintPress}
                activeOpacity={0.8}
                disabled={!puzzle?.optimalWords || goldHintCount >= (puzzle?.optimalWords?.length || 0)}
              >
                <Text style={styles.hintButtonText}>Gold Hint</Text>
                <TokenIcon size={20} count={3} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.watchAdButton} onPress={onWatchAdPress} activeOpacity={0.8}>
                <Text style={styles.watchAdButtonText}>Watch Ad</Text>
                <TokenIcon size={20} count={2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showTokenReward > 0 && (
        <TokenRewardOverlay
          amount={showTokenReward}
          onComplete={handleTokenRewardComplete}
          targetPosition={tokenCounterPosition}
        />
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
    color: '#000000',
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
    color: '#000000',
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
  },
  tokenCounterWrap: {
    minWidth: 44,
    height: 40,
    justifyContent: 'center',
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
    color: '#000000',
  },
  boardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.surface,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...Shadows.soft,
  },
  hintButtonDisabled: {
    opacity: 0.5,
  },
  hintButtonText: {
    ...Fonts.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  watchAdButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.surfaceDark,
  },
  watchAdButtonText: {
    ...Fonts.body,
    fontWeight: '600',
    color: Colors.textPrimary,
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
