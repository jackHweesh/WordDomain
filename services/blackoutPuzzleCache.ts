/**
 * Blackout Puzzle Cache
 * 
 * Caches generated Blackout puzzles to ensure consistency
 * (same puzzle ID always returns the same puzzle)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PuzzleData } from '../core/types';
import { Category } from './progressStorage';
import { generateBlackoutPuzzle } from '../core/blackoutPuzzleGenerator';
import { getBlackoutPuzzleFromJson, getBlackoutPuzzlesForCategoryFromJson, getBlackoutPuzzleCountFromJson } from './blackoutPuzzleLoader';

const CACHE_KEY = '@worddomain:blackout_puzzle_cache';

interface PuzzleCache {
  [key: string]: PuzzleData; // e.g., "blackout-4x4-1" -> PuzzleData
}

let memoryCache: PuzzleCache | null = null;

/**
 * Get cache key for a puzzle
 */
function getCacheKey(category: Category, puzzleId: number): string {
  return `blackout-${category}-${puzzleId}`;
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
    console.error('Error loading blackout puzzle cache:', error);
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
    console.error('Error saving blackout puzzle cache:', error);
  }
}

/**
 * Get or generate a Blackout puzzle
 * First tries to load from pre-generated JSON, then falls back to generation/cache
 */
export async function getBlackoutPuzzle(category: Category, puzzleId: number): Promise<PuzzleData> {
  // 1. Try pre-generated JSON first (fast path)
  const jsonPuzzle = await getBlackoutPuzzleFromJson(category, puzzleId);
  if (jsonPuzzle) {
    return jsonPuzzle;
  }
  
  // 2. Fallback to AsyncStorage cache or generation
  const cache = await loadCache();
  const key = getCacheKey(category, puzzleId);
  
  // Check if puzzle is cached in AsyncStorage
  if (cache[key]) {
    return cache[key];
  }
  
  // Generate new puzzle (fallback if JSON doesn't exist)
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
  const seed = (puzzleId * 1000) + (category === '4x4' ? 100000 : category === '5x5' ? 200000 : category === '6x6' ? 300000 : category === '7x7' ? 400000 : 500000);
  
  console.log(`🎯 Generating Blackout puzzle ${category}-${puzzleId} with seed ${seed} (fallback - JSON not found)`);
  const puzzle = await generateBlackoutPuzzle(seed, size);
  
  // Cache the puzzle
  cache[key] = puzzle;
  await saveCache(cache);
  
  return puzzle;
}

/**
 * Clear a specific puzzle from cache to force regeneration
 */
export async function clearBlackoutPuzzle(category: Category, puzzleId: number): Promise<void> {
  const cache = await loadCache();
  const key = getCacheKey(category, puzzleId);
  
  if (cache[key]) {
    delete cache[key];
    await saveCache(cache);
    console.log(`🗑️  Cleared Blackout puzzle ${category}-${puzzleId} from cache`);
  }
}

/**
 * Get all puzzles for a category (for category screen)
 * Uses pre-generated JSON if available, otherwise returns placeholder data
 */
export async function getBlackoutPuzzlesForCategory(category: Category, maxPuzzles: number = 5): Promise<PuzzleData[]> {
  // Try to load from JSON first
  const jsonPuzzles = await getBlackoutPuzzlesForCategoryFromJson(category);
  if (jsonPuzzles.length > 0) {
    return jsonPuzzles.slice(0, maxPuzzles);
  }
  
  // If JSON doesn't exist, return placeholder puzzle data
  // Actual puzzle will be loaded when selected
  const puzzles: PuzzleData[] = [];
  
  for (let puzzleId = 1; puzzleId <= maxPuzzles; puzzleId++) {
    puzzles.push({
      id: puzzleId,
      grid: [], // Empty grid - will be loaded when puzzle is selected
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
      easyPath: [],
      easyWords: [],
      optimalPath: null,
      optimalWords: null,
      goldMoves: null,
    });
  }
  
  return puzzles;
}

/**
 * Get the total number of puzzles in a category
 */
export async function getBlackoutPuzzleCount(category: Category): Promise<number> {
  // Try to get count from JSON first
  const count = await getBlackoutPuzzleCountFromJson(category);
  if (count > 0) {
    return count;
  }
  
  // Fallback to default (assuming 5 puzzles per category)
  return 5;
}

/**
 * Regenerate a specific puzzle with a NEW random seed (clears cache and generates completely new puzzle)
 */
export async function regenerateBlackoutPuzzle(category: Category, puzzleId: number): Promise<PuzzleData> {
  // Clear the puzzle from cache first
  await clearBlackoutPuzzle(category, puzzleId);
  
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
  
  console.log(`🎯 Regenerating Blackout puzzle ${category}-${puzzleId} with NEW random seed ${randomSeed}`);
  const puzzle = await generateBlackoutPuzzle(randomSeed, size);
  
  // Cache the new puzzle
  cache[key] = puzzle;
  await saveCache(cache);
  
  return puzzle;
}

