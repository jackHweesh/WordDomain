#!/usr/bin/env node

/**
 * Regenerate all puzzles in a Fog of War category and clear their progress
 * 
 * Usage: npx tsx tools/regenerateFogCategory.ts <category>
 * Example: npx tsx tools/regenerateFogCategory.ts 5x5
 */

import { regenerateFogOfWarPuzzle, clearFogOfWarPuzzle } from '../services/fogOfWarPuzzleCache';
import { clearMedal, clearPuzzleProgress } from '../services/fogOfWarProgressStorage';
import { Category } from '../services/progressStorage';
import { getPuzzleCount } from '../services/puzzleLoader';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npx tsx tools/regenerateFogCategory.ts <category>');
    console.error('Example: npx tsx tools/regenerateFogCategory.ts 5x5');
    process.exit(1);
  }
  
  const category = args[0] as Category;
  
  if (!['4x4', '5x5', '6x6', '7x7', '8x8'].includes(category)) {
    console.error(`Invalid category: ${category}. Must be one of: 4x4, 5x5, 6x6, 7x7, 8x8`);
    process.exit(1);
  }
  
  // Get puzzle count for this category
  const puzzleCount = await getPuzzleCount(category);
  console.log(`🔄 Regenerating all ${puzzleCount} puzzles in Fog of War ${category} category...`);
  console.log(`🗑️  Clearing progress data for all puzzles...\n`);
  
  for (let puzzleId = 1; puzzleId <= puzzleCount; puzzleId++) {
    try {
      console.log(`\n📦 Processing puzzle ${category}-${puzzleId}...`);
      
      // Clear puzzle cache
      await clearFogOfWarPuzzle(category, puzzleId);
      
      // Clear progress data
      await clearMedal(category, puzzleId);
      await clearPuzzleProgress(category, puzzleId);
      
      // Regenerate with new random seed
      const puzzle = await regenerateFogOfWarPuzzle(category, puzzleId);
      
      console.log(`✅ Regenerated puzzle ${category}-${puzzleId}`);
      console.log(`   Grid size: ${puzzle.grid.length}x${puzzle.grid[0].length}`);
      console.log(`   Start: (${puzzle.start.row}, ${puzzle.start.col})`);
      console.log(`   End: (${puzzle.end.row}, ${puzzle.end.col})`);
      console.log(`   Gold moves: ${puzzle.goldMoves || 'N/A'}`);
      console.log(`   Progress data cleared`);
      
    } catch (error) {
      console.error(`❌ Failed to regenerate puzzle ${category}-${puzzleId}:`, error);
    }
  }
  
  console.log(`\n🎉 Successfully regenerated all ${puzzleCount} puzzles in ${category} category!`);
  console.log(`✅ All progress data has been cleared`);
}

if (require.main === module) {
  main();
}

