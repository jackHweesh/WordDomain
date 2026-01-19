/**
 * Fog of War Puzzle Cache
 * 
 * Caches generated Fog of War puzzles to ensure consistency
 * (same puzzle ID always returns the same puzzle)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PuzzleData } from '../core/types';
import { Category } from './progressStorage';
import { generatePuzzle } from '../core/puzzleGenerator';
import { solveOptimal } from '../core/puzzleSolver';

const CACHE_KEY = '@worddomain:fog_puzzle_cache';

interface PuzzleCache {
  [key: string]: PuzzleData; // e.g., "4x4-1" -> PuzzleData
}

let memoryCache: PuzzleCache | null = null;

/**
 * Get cache key for a puzzle
 */
function getCacheKey(category: Category, puzzleId: number): string {
  return `fog-${category}-${puzzleId}`;
}

/**
 * Load puzzle cache from storage
 */
async function loadCache(): Promise<PuzzleCache> {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    if (data) {
      memoryCache = JSON.parse(data);
      return memoryCache || {};
    }
  } catch (error) {
    console.error('Error loading fog puzzle cache:', error);
  }

  memoryCache = {};
  return memoryCache;
}

/**
 * Save puzzle cache to storage
 */
async function saveCache(cache: PuzzleCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    memoryCache = cache;
  } catch (error) {
    console.error('Error saving fog puzzle cache:', error);
  }
}

/**
 * Get or generate a Fog of War puzzle
 */
export async function getFogOfWarPuzzle(category: Category, puzzleId: number): Promise<PuzzleData> {
  const cache = await loadCache();
  const key = getCacheKey(category, puzzleId);
  
  // Check if puzzle is cached
  if (cache[key]) {
    return cache[key];
  }
  
  // Generate new puzzle
  const categorySizes: { [key in Category]: number } = {
    '4x4': 4,
    '5x5': 5,
    '6x6': 6,
    '7x7': 7,
    '8x8': 8,
  };
  const size = categorySizes[category];
  
  // Use a consistent seed based on category and puzzleId
  // This ensures the same puzzle is generated each time
  const seed = (puzzleId * 1000) + (category === '4x4' ? 10000 : category === '5x5' ? 20000 : category === '6x6' ? 30000 : category === '7x7' ? 40000 : 50000);
  
  console.log(`🎯 Generating Fog of War puzzle ${category}-${puzzleId} with seed ${seed}`);
  let puzzle = await generatePuzzle(seed, size);
  
  // Solve for optimal solution
  const { optimalWords, optimalPath, goldMoves } = await solveOptimal(puzzle);
  puzzle.optimalWords = optimalWords;
  puzzle.optimalPath = optimalPath;
  puzzle.goldMoves = goldMoves;
  
  // Cache the puzzle
  cache[key] = puzzle;
  await saveCache(cache);
  
  return puzzle;
}

/**
 * Clear a specific puzzle from cache to force regeneration
 */
export async function clearFogOfWarPuzzle(category: Category, puzzleId: number): Promise<void> {
  const cache = await loadCache();
  const key = getCacheKey(category, puzzleId);
  
  if (cache[key]) {
    delete cache[key];
    await saveCache(cache);
    console.log(`🗑️  Cleared Fog of War puzzle ${category}-${puzzleId} from cache`);
  }
}

/**
 * Regenerate a specific puzzle with a NEW random seed (clears cache and generates completely new puzzle)
 */
export async function regenerateFogOfWarPuzzle(category: Category, puzzleId: number): Promise<PuzzleData> {
  // Clear the puzzle from cache first
  await clearFogOfWarPuzzle(category, puzzleId);
  
  // Generate with a NEW random seed instead of the deterministic one
  const cache = await loadCache();
  const key = getCacheKey(category, puzzleId);
  
  const categorySizes: { [key in Category]: number } = {
    '4x4': 4,
    '5x5': 5,
    '6x6': 6,
    '7x7': 7,
    '8x8': 8,
  };
  const size = categorySizes[category];
  
  // Use a random seed to generate a completely NEW puzzle
  // This ensures it's different from the previous one
  const randomSeed = Math.floor(Math.random() * 1000000) + Date.now();
  
  console.log(`🎯 Regenerating Fog of War puzzle ${category}-${puzzleId} with NEW random seed ${randomSeed}`);
  let puzzle = await generatePuzzle(randomSeed, size);
  
  // Solve for optimal solution
  const { optimalWords, optimalPath, goldMoves } = await solveOptimal(puzzle);
  puzzle.optimalWords = optimalWords;
  puzzle.optimalPath = optimalPath;
  puzzle.goldMoves = goldMoves;
  
  // Cache the new puzzle
  cache[key] = puzzle;
  await saveCache(cache);
  
  return puzzle;
}

