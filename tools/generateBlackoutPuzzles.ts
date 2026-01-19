/**
 * Blackout Puzzle Generation Script
 * 
 * Pre-generates Blackout puzzles for all categories and saves them to data/blackoutPuzzles.json
 * Run with: npx tsx tools/generateBlackoutPuzzles.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateBlackoutPuzzle } from '../core/blackoutPuzzleGenerator';
import { PuzzleData } from '../core/types';

type Category = '4x4' | '5x5' | '6x6' | '7x7' | '8x8';

interface PuzzlesData {
  [category: string]: PuzzleData[];
}

// Set to 5 for testing, 100 for production
const PUZZLES_PER_CATEGORY = process.env.PUZZLE_COUNT ? parseInt(process.env.PUZZLE_COUNT) : 5;
const OUTPUT_FILE = path.join(__dirname, '../data/blackoutPuzzles.json');

const categoryConfig: { category: Category; gridSize: number }[] = [
  { category: '4x4', gridSize: 4 },
  { category: '5x5', gridSize: 5 },
  { category: '6x6', gridSize: 6 },
  { category: '7x7', gridSize: 7 },
  { category: '8x8', gridSize: 8 },
];

async function generatePuzzleForBlackout(
  puzzleId: number,
  gridSize: number
): Promise<PuzzleData> {
  console.log(`\n🎯 Generating Blackout puzzle ${puzzleId} (${gridSize}×${gridSize})...`);
  
  // Generate puzzle using improved algorithm
  const puzzle = await generateBlackoutPuzzle(puzzleId, gridSize);
  
  console.log(`✅ Puzzle ${puzzleId} complete: ${puzzle.easyWords?.length || 0} words`);
  
  return puzzle;
}

async function generateCategory(
  category: Category,
  gridSize: number,
  count: number
): Promise<PuzzleData[]> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📦 Generating ${count} Blackout puzzles for ${category} (${gridSize}×${gridSize})`);
  console.log(`${'='.repeat(50)}`);
  
  const puzzles: PuzzleData[] = [];
  let successCount = 0;
  let attemptCount = 0;
  const maxAttempts = count * 3; // Allow more failures (generation is harder)
  
  while (successCount < count && attemptCount < maxAttempts) {
    attemptCount++;
    const puzzleId = attemptCount;
    
    try {
      const puzzle = await generatePuzzleForBlackout(puzzleId, gridSize);
      puzzles.push(puzzle);
      successCount++;
      
      // Progress indicator
      if (successCount % 5 === 0 || successCount === count) {
        console.log(`\n📊 Progress: ${successCount}/${count} puzzles generated for ${category}`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate puzzle ${puzzleId} for ${category}:`, error);
      // Continue to next attempt
    }
  }
  
  if (successCount < count) {
    console.warn(`⚠️  Only generated ${successCount}/${count} puzzles for ${category}`);
  }
  
  return puzzles;
}

async function main() {
  console.log('🚀 Starting Blackout puzzle generation...');
  console.log(`📝 Target: ${PUZZLES_PER_CATEGORY} puzzles per category`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  
  const allPuzzles: PuzzlesData = {};
  
  // Generate puzzles for each category
  for (const config of categoryConfig) {
    try {
      const puzzles = await generateCategory(
        config.category,
        config.gridSize,
        PUZZLES_PER_CATEGORY
      );
      allPuzzles[config.category] = puzzles;
      console.log(`\n✅ Completed ${config.category}: ${puzzles.length} puzzles`);
    } catch (error) {
      console.error(`❌ Failed to generate puzzles for ${config.category}:`, error);
      allPuzzles[config.category] = []; // Empty array on failure
    }
  }
  
  // Save to JSON
  console.log(`\n💾 Saving puzzles to ${OUTPUT_FILE}...`);
  const jsonData = JSON.stringify(allPuzzles, null, 2);
  fs.writeFileSync(OUTPUT_FILE, jsonData, 'utf-8');
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Generation Summary:');
  console.log(`${'='.repeat(50)}`);
  let totalPuzzles = 0;
  for (const [category, puzzles] of Object.entries(allPuzzles)) {
    console.log(`  ${category}: ${puzzles.length} puzzles`);
    totalPuzzles += puzzles.length;
  }
  console.log(`\n✅ Total: ${totalPuzzles} puzzles generated`);
  console.log(`📁 Saved to: ${OUTPUT_FILE}`);
  console.log(`\n🎉 Blackout puzzle generation complete!`);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { generatePuzzleForBlackout };

