/**
 * Fog of War Progress Storage Service
 * 
 * Separate progress tracking for Fog of War game mode
 * Uses "fog-" prefix to keep it separate from Classic mode
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Medal } from './progressStorage';

const UNLOCKED_PUZZLES_KEY = '@worddomain:fog_unlocked_puzzles';
const MEDALS_KEY = '@worddomain:fog_medals';

interface UnlockedPuzzles {
  [category: string]: number[]; // e.g., { "4x4": [1, 2, 3], "5x5": [1] }
}

interface Medals {
  [puzzleKey: string]: Medal; // e.g., { "fog-4x4-1": "gold", "fog-4x4-2": "silver" }
}

/**
 * Get the puzzle key for storage (e.g., "fog-4x4-1")
 */
function getPuzzleKey(category: Category, puzzleId: number): string {
  return `fog-${category}-${puzzleId}`;
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
 * Get all unlocked puzzles for Fog of War
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
 * Check if a puzzle is unlocked in Fog of War
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
 * Get medal for a Fog of War puzzle
 */
export async function getMedal(category: Category, puzzleId: number): Promise<Medal | null> {
  try {
    const data = await AsyncStorage.getItem(MEDALS_KEY);
    if (data) {
      const medals: Medals = JSON.parse(data);
      const key = getPuzzleKey(category, puzzleId);
      return medals[key] || null;
    }
    return null;
  } catch (error) {
    console.error('Error loading medal:', error);
    return null;
  }
}

/**
 * Save medal for a Fog of War puzzle
 */
export async function saveMedal(category: Category, puzzleId: number, medal: Medal): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(MEDALS_KEY);
    const medals: Medals = data ? JSON.parse(data) : {};
    const key = getPuzzleKey(category, puzzleId);
    
    // Only save if better medal (gold > silver > bronze)
    const currentMedal = medals[key];
    if (!currentMedal || (medal === 'gold') || (medal === 'silver' && currentMedal === 'bronze')) {
      medals[key] = medal;
      await AsyncStorage.setItem(MEDALS_KEY, JSON.stringify(medals));
    }
  } catch (error) {
    console.error('Error saving medal:', error);
  }
}

/**
 * Get all medals for a Fog of War category
 */
export async function getMedalsForCategory(category: Category): Promise<Medals> {
  try {
    const data = await AsyncStorage.getItem(MEDALS_KEY);
    if (data) {
      const allMedals: Medals = JSON.parse(data);
      const categoryMedals: Medals = {};
      
      Object.keys(allMedals).forEach(key => {
        if (key.startsWith(`fog-${category}-`)) {
          categoryMedals[key] = allMedals[key];
        }
      });
      
      return categoryMedals;
    }
    return {};
  } catch (error) {
    console.error('Error loading medals for category:', error);
    return {};
  }
}

/**
 * Clear medal for a specific Fog of War puzzle
 */
export async function clearMedal(category: Category, puzzleId: number): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(MEDALS_KEY);
    if (data) {
      const medals: Medals = JSON.parse(data);
    const key = getPuzzleKey(category, puzzleId);
    delete medals[key];
    await AsyncStorage.setItem(MEDALS_KEY, JSON.stringify(medals));
    console.log(`🗑️  Cleared medal for Fog of War puzzle ${category}-${puzzleId}`);
    }
  } catch (error) {
    console.error('Error clearing medal:', error);
  }
}

/**
 * Clear progress (unlock status) for a specific Fog of War puzzle
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
        console.log(`🗑️  Cleared unlock status for Fog of War puzzle ${category}-${puzzleId}`);
      }
    }
  } catch (error) {
    console.error('Error clearing puzzle progress:', error);
  }
}

