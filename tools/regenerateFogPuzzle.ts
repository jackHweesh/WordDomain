#!/usr/bin/env node

/**
 * Regenerate a specific Fog of War puzzle
 * 
 * Usage: npx tsx tools/regenerateFogPuzzle.ts <category> <puzzleId>
 * Example: npx tsx tools/regenerateFogPuzzle.ts 5x5 1
 */

import { regenerateFogOfWarPuzzle } from '../services/fogOfWarPuzzleCache';
import { Category } from '../services/progressStorage';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: npx tsx tools/regenerateFogPuzzle.ts <category> <puzzleId>');
    console.error('Example: npx tsx tools/regenerateFogPuzzle.ts 5x5 1');
    process.exit(1);
  }
  
  const category = args[0] as Category;
  const puzzleId = parseInt(args[1], 10);
  
  if (!['4x4', '5x5', '6x6', '7x7', '8x8'].includes(category)) {
    console.error(`Invalid category: ${category}. Must be one of: 4x4, 5x5, 6x6, 7x7, 8x8`);
    process.exit(1);
  }
  
  if (isNaN(puzzleId) || puzzleId < 1) {
    console.error(`Invalid puzzle ID: ${args[1]}. Must be a positive number.`);
    process.exit(1);
  }
  
  console.log(`🔄 Regenerating Fog of War puzzle ${category}-${puzzleId}...`);
  
  try {
    const puzzle = await regenerateFogOfWarPuzzle(category, puzzleId);
    console.log(`✅ Successfully regenerated puzzle ${category}-${puzzleId}`);
    console.log(`   Grid size: ${puzzle.grid.length}x${puzzle.grid[0].length}`);
    console.log(`   Start: (${puzzle.start.row}, ${puzzle.start.col})`);
    console.log(`   End: (${puzzle.end.row}, ${puzzle.end.col})`);
    console.log(`   Gold moves: ${puzzle.goldMoves || 'N/A'}`);
  } catch (error) {
    console.error(`❌ Failed to regenerate puzzle:`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

