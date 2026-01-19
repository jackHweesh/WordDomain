/**
 * Blackout Progress Storage Service
 * 
 * Separate progress tracking for Blackout game mode
 * Uses "blackout-" prefix and tracks trophies instead of medals
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from './progressStorage';

const UNLOCKED_PUZZLES_KEY = '@worddomain:blackout_unlocked_puzzles';
const TROPHIES_KEY = '@worddomain:blackout_trophies';

interface UnlockedPuzzles {
  [category: string]: number[]; // e.g., { "4x4": [1, 2, 3], "5x5": [1] }
}

interface Trophies {
  [puzzleKey: string]: boolean; // e.g., { "blackout-4x4-1": true, "blackout-4x4-2": true }
}

/**
 * Get the puzzle key for storage (e.g., "blackout-4x4-1")
 */
function getPuzzleKey(category: Category, puzzleId: number): string {
  return `blackout-${category}-${puzzleId}`;
}

/**
 * Initialize a category - unlock puzzle 1
 */
async function initializeCategory(category: Category): Promise<void> {
  const unlocked = await getUnlockedPuzzles();
  if (!unlocked[category] || unlocked[category].length === 0) {
    unlocked[category] = [1]; // First puzzle always unlocked
    await AsyncStorage.setItem(UNLOCKED_PUZZLES_KEY, JSON.stringify(unlocked));
  }
}

/**
 * Get all unlocked puzzles for Blackout
 */
export async function getUnlockedPuzzles(): Promise<UnlockedPuzzles> {
  try {
    const data = await AsyncStorage.getItem(UNLOCKED_PUZZLES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading unlocked puzzles:', error);
    return {};
  }
}

/**
 * Check if a puzzle is unlocked in Blackout
 */
export async function isPuzzleUnlocked(category: Category, puzzleId: number): Promise<boolean> {
  await initializeCategory(category);
  const unlocked = await getUnlockedPuzzles();
  return unlocked[category]?.includes(puzzleId) ?? false;
}

/**
 * Unlock a puzzle (typically called when previous puzzle is solved)
 */
export async function unlockPuzzle(category: Category, puzzleId: number): Promise<void> {
  await initializeCategory(category);
  const unlocked = await getUnlockedPuzzles();
  
  if (!unlocked[category]) {
    unlocked[category] = [];
  }
  
  if (!unlocked[category].includes(puzzleId)) {
    unlocked[category].push(puzzleId);
    unlocked[category].sort((a, b) => a - b); // Keep sorted
    await AsyncStorage.setItem(UNLOCKED_PUZZLES_KEY, JSON.stringify(unlocked));
  }
}

/**
 * Unlock the next puzzle in a category
 */
export async function unlockNextPuzzle(category: Category, currentPuzzleId: number): Promise<void> {
  await unlockPuzzle(category, currentPuzzleId + 1);
}

/**
 * Get trophy status for a Blackout puzzle
 */
export async function getTrophy(category: Category, puzzleId: number): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(TROPHIES_KEY);
    if (data) {
      const trophies: Trophies = JSON.parse(data);
      const key = getPuzzleKey(category, puzzleId);
      return trophies[key] || false;
    }
    return false;
  } catch (error) {
    console.error('Error loading trophy:', error);
    return false;
  }
}

/**
 * Save trophy for a Blackout puzzle
 */
export async function saveTrophy(category: Category, puzzleId: number): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(TROPHIES_KEY);
    const trophies: Trophies = data ? JSON.parse(data) : {};
    const key = getPuzzleKey(category, puzzleId);
    trophies[key] = true;
    await AsyncStorage.setItem(TROPHIES_KEY, JSON.stringify(trophies));
    console.log(`🏆 Saved trophy for Blackout puzzle ${category}-${puzzleId}`);
  } catch (error) {
    console.error('Error saving trophy:', error);
  }
}

/**
 * Get all trophies for a Blackout category
 */
export async function getTrophiesForCategory(category: Category): Promise<Trophies> {
  try {
    const data = await AsyncStorage.getItem(TROPHIES_KEY);
    if (data) {
      const allTrophies: Trophies = JSON.parse(data);
      const categoryTrophies: Trophies = {};
      
      Object.keys(allTrophies).forEach(key => {
        if (key.startsWith(`blackout-${category}-`)) {
          categoryTrophies[key] = allTrophies[key];
        }
      });
      
      return categoryTrophies;
    }
    return {};
  } catch (error) {
    console.error('Error loading trophies for category:', error);
    return {};
  }
}

/**
 * Clear trophy for a specific Blackout puzzle
 */
export async function clearTrophy(category: Category, puzzleId: number): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(TROPHIES_KEY);
    if (data) {
      const trophies: Trophies = JSON.parse(data);
      const key = getPuzzleKey(category, puzzleId);
      delete trophies[key];
      await AsyncStorage.setItem(TROPHIES_KEY, JSON.stringify(trophies));
      console.log(`🗑️  Cleared trophy for Blackout puzzle ${category}-${puzzleId}`);
    }
  } catch (error) {
    console.error('Error clearing trophy:', error);
  }
}

/**
 * Clear progress (unlock status) for a specific Blackout puzzle
 * Note: This doesn't remove it from unlocked list if it's puzzle 1 (always unlocked)
 */
export async function clearPuzzleProgress(category: Category, puzzleId: number): Promise<void> {
  try {
    const unlocked = await getUnlockedPuzzles();
    if (unlocked[category]) {
      // Remove puzzle from unlocked list (unless it's puzzle 1 which is always unlocked)
      if (puzzleId !== 1) {
        unlocked[category] = unlocked[category].filter(id => id !== puzzleId);
        await AsyncStorage.setItem(UNLOCKED_PUZZLES_KEY, JSON.stringify(unlocked));
        console.log(`🗑️  Cleared unlock status for Blackout puzzle ${category}-${puzzleId}`);
      }
    }
  } catch (error) {
    console.error('Error clearing puzzle progress:', error);
  }
}

