import { PuzzleData, Coordinate } from "./types";
import { loadSmallDictionary, getWordsStartingWith } from "./dictionaryLoader";

const START: Coordinate = { row: 0, col: 0 };

/**
 * Generate a Blackout puzzle where every tile must be used
 * Uses expert strategy: separate word chain (1D) from Hamiltonian path (2D), then combine
 */
export async function generateBlackoutPuzzle(puzzleId: number = 1, gridSize: number = 6): Promise<PuzzleData> {
  const totalTiles = gridSize * gridSize;
  console.log(`🎯 Generating Blackout Puzzle #${puzzleId} (${gridSize}x${gridSize}, ${totalTiles} tiles)`);
  
  // STEP 1: Generate word chain (1D sequence of letters)
  const letterSequence = await generateWordChain(totalTiles);
  if (!letterSequence) {
    throw new Error("Failed to generate word chain");
  }
  
  // STEP 2: Generate Hamiltonian path (2D geometry, random-looking)
  const path = generateHamiltonianPath(gridSize);
  
  // STEP 3: Map letters onto path
  const grid = mapLettersToPath(letterSequence.letters, path, gridSize);
  
  // Extract words from letter sequence
  const words = letterSequence.words;
  
  // END is the last tile in the path
  const END = path[path.length - 1];
  
  // Create puzzle data
  const puzzle: PuzzleData = {
    id: puzzleId,
    grid,
    start: START,
    end: END,
    easyPath: path,
    easyWords: words,
    optimalPath: null,
    optimalWords: null,
    goldMoves: null
  };
  
  // Debug output
  await debugOutput(puzzle, totalTiles);
  
  return puzzle;
}

/**
 * Word chain generation result
 */
interface WordChainResult {
  letters: string;  // Full sequence of letters
  words: string[];  // The words that make up the chain
}

/**
 * Generate a word chain that uses exactly N tiles
 * Uses memoized backtracking with exact fill
 */
async function generateWordChain(targetTiles: number): Promise<WordChainResult | null> {
  // Load and organize dictionary
  const allWords = await loadSmallDictionary();
  
  // Build wordsByStart: map from start letter to list of words
  const wordsByStart: { [letter: string]: string[] } = {};
  for (const word of allWords) {
    const w = word.toLowerCase();
    if (w.length < 3 || w.length > 10) continue; // Reasonable word lengths
    const firstLetter = w[0];
    if (!wordsByStart[firstLetter]) {
      wordsByStart[firstLetter] = [];
    }
    wordsByStart[firstLetter].push(w);
  }
  
  // Build end letter frequency map (for heuristics)
  const endLetterFrequency: { [letter: string]: number } = {};
  for (const wordList of Object.values(wordsByStart)) {
    for (const word of wordList) {
      const endLetter = word[word.length - 1];
      endLetterFrequency[endLetter] = (endLetterFrequency[endLetter] || 0) + 1;
    }
  }
  
  // Memoization cache: (currentLetter, remainingTiles) -> can succeed
  const memo = new Map<string, boolean>();
  
  // Track which words have been used (to avoid repetition)
  const usedWords = new Set<string>();
  
  /**
   * Memoized backtracking to find exact fill
   */
  function canFillFrom(currentLetter: string, remainingTiles: number): boolean {
    if (remainingTiles < 0) return false;
    if (remainingTiles === 0) return true; // Successfully filled
    
    const key = `${currentLetter},${remainingTiles}`;
    if (memo.has(key)) {
      return memo.get(key)!;
    }
    
    const candidates = wordsByStart[currentLetter] || [];
    if (candidates.length === 0) {
      memo.set(key, false);
      return false;
    }
    
    // Sort candidates by heuristic value (prefer words ending in common letters)
    const scored = candidates.map(word => ({
      word,
      score: endLetterFrequency[word[word.length - 1]] || 0,
      length: word.length,
    }));
    
    // Sort: prefer words with good end letters, then prefer variety in length
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      // Prefer shorter words when we have many tiles, longer when we're close
      if (remainingTiles > 30) {
        return a.length - b.length; // Prefer shorter early
      } else {
        return b.length - a.length; // Prefer longer near end
      }
    });
    
    // Try candidates in order
    for (const { word } of scored) {
      // Skip if word too long for remaining tiles
      // First word contributes full length, subsequent words contribute (length - 1)
      const contribution = usedWords.size === 0 ? word.length : (word.length - 1);
      if (contribution > remainingTiles) continue;
      
      // Check if we can complete from here
      const newRemaining = remainingTiles - contribution;
      const nextLetter = word[word.length - 1];
      
      if (canFillFrom(nextLetter, newRemaining)) {
        memo.set(key, true);
        return true;
      }
    }
    
    memo.set(key, false);
    return false;
  }
  
  /**
   * Build the actual chain (after feasibility check)
   */
  function buildChain(currentLetter: string, remainingTiles: number): string[] | null {
    if (remainingTiles === 0) return [];
    
    const candidates = wordsByStart[currentLetter] || [];
    if (candidates.length === 0) return null;
    
    // Score candidates (same heuristic as above)
    const scored = candidates.map(word => ({
      word,
      score: endLetterFrequency[word[word.length - 1]] || 0,
      length: word.length,
    }));
    
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (remainingTiles > 30) {
        return a.length - b.length;
      } else {
        return b.length - a.length;
      }
    });
    
    // Try candidates in random order (with bias from sorting)
    const shuffled = [...scored];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    for (const { word } of shuffled) {
      // Skip if already used (encourage variety)
      if (usedWords.has(word)) continue;
      
      const contribution = usedWords.size === 0 ? word.length : (word.length - 1);
      if (contribution > remainingTiles) continue;
      
      const newRemaining = remainingTiles - contribution;
      const nextLetter = word[word.length - 1];
      
      // Check feasibility before committing
      if (!canFillFrom(nextLetter, newRemaining)) continue;
      
      // Recursively build rest
      usedWords.add(word);
      const rest = buildChain(nextLetter, newRemaining);
      if (rest !== null) {
        return [word, ...rest];
      }
      usedWords.delete(word);
    }
    
    return null;
  }
  
  // Try multiple times with different starting words
  const startLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const shuffledStarts = [...startLetters].sort(() => Math.random() - 0.5);
  
  for (const startLetter of shuffledStarts) {
    const candidates = wordsByStart[startLetter] || [];
    if (candidates.length === 0) continue;
    
    // Try a few starting words
    const startWords = candidates
      .filter(w => w.length >= 3 && w.length <= Math.min(8, targetTiles))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    
    for (const startWord of startWords) {
      memo.clear();
      usedWords.clear();
      
      const startContribution = startWord.length;
      const remainingAfterStart = targetTiles - startContribution;
      
      if (remainingAfterStart < 0) continue;
      
      // Check feasibility
      if (!canFillFrom(startWord[startWord.length - 1], remainingAfterStart)) {
        continue;
      }
      
      // Build chain
      usedWords.add(startWord);
      const rest = buildChain(startWord[startWord.length - 1], remainingAfterStart);
      
      if (rest !== null) {
        const words = [startWord, ...rest];
        
        // Verify total length
        const totalLength = words[0].length + words.slice(1).reduce((sum, w) => sum + (w.length - 1), 0);
        if (totalLength !== targetTiles) {
          console.warn(`⚠️  Word chain length mismatch: ${totalLength} vs ${targetTiles}`);
          continue;
        }
        
        // Build letter sequence
        let letters = words[0];
        for (let i = 1; i < words.length; i++) {
          // Overlap: skip first letter of subsequent words
          letters += words[i].slice(1);
        }
        
        return { letters, words };
      }
      
      usedWords.delete(startWord);
    }
  }
  
  return null;
}

/**
 * Generate a random-looking Hamiltonian path using backbite algorithm
 */
function generateHamiltonianPath(gridSize: number): Coordinate[] {
  // Start with a simple valid Hamiltonian path (snake)
  let path = generateSnakePath(gridSize);
  
  // Apply backbite randomization
  const iterations = getBackbiteIterations(gridSize);
  path = applyBackbiteRandomization(path, gridSize, iterations);
  
  // Optional: reject if too pattern-like (but for now, accept all)
  // Could add pattern scoring here if needed
  
  return path;
}

/**
 * Generate a simple snake path as starting point for backbite
 */
function generateSnakePath(gridSize: number): Coordinate[] {
  const path: Coordinate[] = [];
  for (let row = 0; row < gridSize; row++) {
    if (row % 2 === 0) {
      // Left to right
      for (let col = 0; col < gridSize; col++) {
        path.push({ row, col });
      }
    } else {
      // Right to left
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push({ row, col });
      }
    }
  }
  return path;
}

/**
 * Get number of backbite iterations based on grid size
 */
function getBackbiteIterations(gridSize: number): number {
  const baseIterations: { [size: number]: number } = {
    4: 500,
    5: 1000,
    6: 2000,
    7: 4000,
    8: 8000,
  };
  return baseIterations[gridSize] || 5000;
}

/**
 * Apply backbite randomization to a Hamiltonian path
 * Backbite: pick a random node, find a neighbor that's non-adjacent in the path,
 * then reverse the segment between them (if valid)
 */
function applyBackbiteRandomization(
  path: Coordinate[],
  gridSize: number,
  iterations: number
): Coordinate[] {
  let currentPath = [...path];
  
  // Build coordinate-to-index map
  const coordToIndex = new Map<string, number>();
  function updateMap() {
    coordToIndex.clear();
    currentPath.forEach((coord, index) => {
      coordToIndex.set(`${coord.row},${coord.col}`, index);
    });
  }
  updateMap();
  
  // 8-directional neighbors
  const directions = [
    { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
    { row: 0, col: -1 },                       { row: 0, col: 1 },
    { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 }
  ];
  
  function isAdjacent(coord1: Coordinate, coord2: Coordinate): boolean {
    const rowDiff = Math.abs(coord2.row - coord1.row);
    const colDiff = Math.abs(coord2.col - coord1.col);
    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
  }
  
  let successfulMoves = 0;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Pick a random index in the path
    const index = Math.floor(Math.random() * currentPath.length);
    const coord = currentPath[index];
    
    // Find neighbors that are in the path but not adjacent in sequence
    const neighbors: number[] = [];
    for (const dir of directions) {
      const neighbor = { row: coord.row + dir.row, col: coord.col + dir.col };
      if (neighbor.row < 0 || neighbor.row >= gridSize || 
          neighbor.col < 0 || neighbor.col >= gridSize) continue;
      
      const neighborKey = `${neighbor.row},${neighbor.col}`;
      const neighborIndex = coordToIndex.get(neighborKey);
      if (neighborIndex === undefined) continue; // Not in path
      
      // Check if they're adjacent in the path sequence
      if (Math.abs(neighborIndex - index) === 1) continue; // Already adjacent
      
      neighbors.push(neighborIndex);
    }
    
    if (neighbors.length === 0) continue;
    
    // Pick a random neighbor for backbite
    const targetIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
    
    // Perform backbite: reverse the segment between index and targetIndex
    const startIdx = Math.min(index, targetIndex);
    const endIdx = Math.max(index, targetIndex);
    
    // Check if reversal would maintain adjacency at boundaries
    const beforeStart = startIdx > 0 ? currentPath[startIdx - 1] : null;
    const afterEnd = endIdx < currentPath.length - 1 ? currentPath[endIdx + 1] : null;
    
    // After reversal: startIdx gets endIdx's coord, endIdx gets startIdx's coord
    const newStartCoord = currentPath[endIdx];
    const newEndCoord = currentPath[startIdx];
    
    // Check if boundaries remain adjacent
    let valid = true;
    if (beforeStart && !isAdjacent(beforeStart, newStartCoord)) {
      valid = false;
    }
    if (afterEnd && !isAdjacent(newEndCoord, afterEnd)) {
      valid = false;
    }
    
    if (!valid) continue;
    
    // Perform reversal
    const segment = currentPath.slice(startIdx, endIdx + 1);
    segment.reverse();
    
    const newPath = [
      ...currentPath.slice(0, startIdx),
      ...segment,
      ...currentPath.slice(endIdx + 1)
    ];
    
    // Verify the new path is valid
    if (isValidPath(newPath, gridSize)) {
      currentPath = newPath;
      updateMap();
      successfulMoves++;
    }
  }
  
  // Verify final path
  if (!isValidPath(currentPath, gridSize)) {
    console.warn("⚠️  Backbite resulted in invalid path, using original");
    return path;
  }
  
  return currentPath;
}

/**
 * Check if a path is valid (all tiles unique, all adjacent, starts at (0,0))
 */
function isValidPath(path: Coordinate[], gridSize: number): boolean {
  if (path.length !== gridSize * gridSize) return false;
  
  // Check start
  if (path[0].row !== 0 || path[0].col !== 0) return false;
  
  // Check all tiles unique
  const seen = new Set<string>();
  for (const coord of path) {
    const key = `${coord.row},${coord.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  
  // Check adjacency (8-directional)
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const rowDiff = Math.abs(b.row - a.row);
    const colDiff = Math.abs(b.col - a.col);
    if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Map letter sequence onto coordinate path
 */
function mapLettersToPath(letters: string, path: Coordinate[], gridSize: number): string[][] {
  if (letters.length !== path.length) {
    throw new Error(`Letter sequence length ${letters.length} doesn't match path length ${path.length}`);
  }
  
  const grid: string[][] = [];
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = "";
    }
  }
  
  for (let i = 0; i < path.length; i++) {
    const coord = path[i];
    grid[coord.row][coord.col] = letters[i].toUpperCase();
  }
  
  return grid;
}

/**
 * Initialize a grid with empty strings
 */
function initializeGrid(gridSize: number): string[][] {
  const grid: string[][] = [];
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = "";
    }
  }
  return grid;
}

/**
 * Debug output for generated puzzle
 */
async function debugOutput(puzzle: PuzzleData, totalTiles: number): Promise<void> {
  console.log(`\n🎮 Generated Blackout Puzzle:`);
  console.log(`Grid:`);
  for (let row = 0; row < puzzle.grid.length; row++) {
    console.log(`Row ${row}: ${puzzle.grid[row].join(' ')}`);
  }
  
  console.log(`\n📍 Full Path (${totalTiles} tiles, must use all ${totalTiles} tiles):`);
  const pathSet = new Set<string>();
  for (const coord of puzzle.easyPath) {
    pathSet.add(`${coord.row},${coord.col}`);
  }
  console.log(`✅ Tiles visited: ${pathSet.size} / ${totalTiles}`);
  
  // Verify adjacency
  let validAdj = true;
  for (let i = 0; i < puzzle.easyPath.length - 1; i++) {
    const a = puzzle.easyPath[i];
    const b = puzzle.easyPath[i + 1];
    const rowDiff = Math.abs(b.row - a.row);
    const colDiff = Math.abs(b.col - a.col);
    if (rowDiff > 1 || colDiff > 1) {
      validAdj = false;
      break;
    }
  }
  console.log(`✅ Adjacency valid: ${validAdj}`);
  
  if (puzzle.easyWords) {
    const wordChainLength = puzzle.easyWords[0].length + 
      puzzle.easyWords.slice(1).reduce((sum, w) => sum + (w.length - 1), 0);
    console.log(`\n📝 Word Chain (${puzzle.easyWords.length} words): ${puzzle.easyWords.join(' → ')}`);
    console.log(`✅ Word chain length: ${wordChainLength} (should match path length ${totalTiles})`);
  }
  
  console.log(`\n🎯 START: (${puzzle.start.row},${puzzle.start.col})`);
  console.log(`🏁 END: (${puzzle.end.row},${puzzle.end.col})`);
  console.log(`${'='.repeat(50)}\n`);
}
