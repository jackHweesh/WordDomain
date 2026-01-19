/**
 * Puzzle Loader Service
 * 
 * Loads pre-generated puzzles from data/puzzles.json
 */

import { PuzzleData } from '../core/types';
import { Category } from './progressStorage';

interface PuzzlesData {
  [category: string]: PuzzleData[];
}

let puzzlesCache: PuzzlesData | null = null;

/**
 * Load all puzzles from JSON file
 */
async function loadPuzzlesData(): Promise<PuzzlesData> {
  if (puzzlesCache) {
    return puzzlesCache;
  }

  try {
    const puzzlesData = require('../data/puzzles.json');
    puzzlesCache = puzzlesData as PuzzlesData;
    
    // Ensure all categories exist (even if empty)
    const categories: Category[] = ['4x4', '5x5', '6x6', '7x7', '8x8'];
    categories.forEach(cat => {
      if (!puzzlesCache![cat]) {
        puzzlesCache![cat] = [];
      }
    });
    
    return puzzlesCache;
  } catch (error) {
    console.error('Error loading puzzles:', error);
    // Return empty structure if file doesn't exist or is invalid
    puzzlesCache = {
      '4x4': [],
      '5x5': [],
      '6x6': [],
      '7x7': [],
      '8x8': [],
    };
    return puzzlesCache;
  }
}

/**
 * Get a specific puzzle by category and ID
 */
export async function getPuzzle(category: Category, puzzleId: number): Promise<PuzzleData | null> {
  try {
    const puzzles = await loadPuzzlesData();
    const categoryPuzzles = puzzles[category];
    
    if (!categoryPuzzles) {
      console.error(`Category ${category} not found in puzzles data`);
      return null;
    }
    
    // Puzzles are 1-indexed in UI, 0-indexed in array
    const puzzle = categoryPuzzles[puzzleId - 1];
    
    if (!puzzle) {
      console.error(`Puzzle ${puzzleId} not found in category ${category}`);
      return null;
    }
    
    return puzzle;
  } catch (error) {
    console.error(`Error getting puzzle ${category}-${puzzleId}:`, error);
    return null;
  }
}

/**
 * Get all puzzles for a category
 */
export async function getPuzzlesForCategory(category: Category): Promise<PuzzleData[]> {
  try {
    const puzzles = await loadPuzzlesData();
    return puzzles[category] || [];
  } catch (error) {
    console.error(`Error getting puzzles for category ${category}:`, error);
    return [];
  }
}

/**
 * Get the total number of puzzles in a category
 */
export async function getPuzzleCount(category: Category): Promise<number> {
  try {
    const puzzles = await loadPuzzlesData();
    return puzzles[category]?.length || 0;
  } catch (error) {
    console.error(`Error getting puzzle count for category ${category}:`, error);
    return 0;
  }
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const puzzles = await loadPuzzlesData();
    return Object.keys(puzzles) as Category[];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

