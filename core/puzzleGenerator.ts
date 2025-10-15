import { PuzzleData, Coordinate, WordPlacement } from "./types";
import { getWordsStartingWith, getRandomWord } from "./dictionaryLoader";

// TODO: build solvable puzzles (grid + easy path)

const START: Coordinate = { row: 0, col: 0 };

/**
 * Generate a solvable puzzle with a guaranteed solution path
 */
export async function generatePuzzle(puzzleId: number = 1, gridSize: number = 6): Promise<PuzzleData> {
  const END: Coordinate = { row: gridSize - 1, col: gridSize - 1 };
  console.log(`🎯 Generating Puzzle #${puzzleId}`);
  
  // Initialize empty grid
  const grid = initializeGrid(gridSize);
  
  // Generate the easy solution path using SAW approach
  const { path: easyPath, words: easyWords } = await generateEasyPathSAW(grid, gridSize);
  
  // Fill remaining empty cells with random letters
  fillRemainingCells(grid, gridSize);
  
  // Create puzzle data
  const puzzle: PuzzleData = {
    id: puzzleId,
    grid,
    start: START,
    end: END,
    easyPath,
    easyWords, // Words placed during path generation
    optimalPath: null, // Will be filled by solver later
    optimalWords: null, // Will be filled by solver later
    goldMoves: null    // Will be filled by solver later
  };
  
  // Debug output
  await debugOutput(puzzle);
  
  return puzzle;
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
 * Generate the easy solution path using SAW approach (guaranteed)
 */
async function generateEasyPathSAW(grid: string[][], gridSize: number): Promise<{ path: Coordinate[], words: string[] }> {
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🎯 Attempt ${attempt + 1}:`);
      
      // A. Pick a valid word chain
      const words = await pickValidWordChain();
      if (!words) {
        console.log(`⚠️  Failed to pick word chain`);
        continue;
      }
      
      // B. Calculate exact path length T
      const T = words[0].length + words.slice(1).reduce((sum, word) => sum + (word.length - 1), 0);
      console.log(`📝 Word chain: ${words.join(" → ")} (T=${T})`);
      
      // C. Build exact-length SAW path of length T ending at END
      const END: Coordinate = { row: gridSize - 1, col: gridSize - 1 };
      const path = buildExactLengthSAW(T, gridSize, END);
      if (!path) {
        console.log(`⚠️  Failed to build SAW path of length ${T}`);
        continue;
      }
      
      console.log(`🛤️  SAW path: ${path.length} tiles, start=${JSON.stringify(path[0])}, end=${JSON.stringify(path[path.length-1])}`);
      
      // Verify adjacency and check for straight runs
      const adjacencyOK = verifyAdjacency(path);
      const straightRunMax = getMaxStraightRun(path);
      console.log(`🔗 Adjacency OK: ${adjacencyOK}`);
      console.log(`📏 Straight-run max: ${straightRunMax}`);
      
      // D. Place words on the path
      placeWordsOnPath(grid, words, path);
      
      // E. Verify final tile is END
      const finalTile = path[path.length - 1];
      if (finalTile.row !== END.row || finalTile.col !== END.col) {
        console.log(`⚠️  Path doesn't end at END: ${JSON.stringify(finalTile)}`);
        continue;
      }
      
      console.log(`✅ Generated SAW path successfully!`);
      return { path, words };
      
    } catch (error) {
      console.log(`⚠️  Attempt ${attempt + 1} failed: ${error}`);
      continue;
    }
  }
  
  throw new Error("Failed to generate puzzle after maximum attempts");
}

/**
 * Pick a valid word chain from the dictionary
 */
async function pickValidWordChain(): Promise<string[] | null> {
  const maxRetries = 200;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      // Load dictionary and create lookup
      const allWords = await Promise.all('abcdefghijklmnopqrstuvwxyz'.split('').map(letter => getWordsStartingWith(letter))).then(results => results.flat());
      const byStart: { [letter: string]: string[] } = {};
      for (const word of allWords) {
        const firstLetter = word[0];
        if (!byStart[firstLetter]) byStart[firstLetter] = [];
        byStart[firstLetter].push(word);
      }
      
      // Randomly choose k (2-4 words)
      const k = Math.floor(Math.random() * 3) + 2;
      
      // Randomly choose target lengths (3-6 each)
      const lengths: number[] = [];
      for (let i = 0; i < k; i++) {
        lengths.push(Math.floor(Math.random() * 4) + 3); // 3-6
      }
      
      const words: string[] = [];
      
      // Pick first word
      const firstLength = lengths[0];
      const firstCandidates = allWords.filter(w => w.length === firstLength);
      if (firstCandidates.length === 0) continue;
      
      const firstWord = firstCandidates[Math.floor(Math.random() * firstCandidates.length)];
      words.push(firstWord);
      
      // Pick subsequent words
      for (let i = 1; i < lengths.length; i++) {
        const targetLength = lengths[i];
        const lastLetter = words[i - 1][words[i - 1].length - 1];
        const candidates = (byStart[lastLetter] || []).filter(w => w.length === targetLength);
        
        if (candidates.length === 0) {
          // Can't find a chaining word, try again
          break;
        }
        
        const word = candidates[Math.floor(Math.random() * candidates.length)];
        words.push(word);
      }
      
      // Check if we got all words
      if (words.length === k) {
        return words;
      }
      
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * Build an exact-length Self-Avoiding Walk (SAW) path that ends at END
 */
function buildExactLengthSAW(T: number, gridSize: number, END: Coordinate): Coordinate[] | null {
  const maxAttempts = 200; // Cap total SAW attempts
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const maxSteps = 15000; // Safety cap for DFS steps
    let stepsUsed = 0;
    
    // 8-directional movement vectors
    const directions = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row: 0, col: -1 },                      { row: 0, col: 1 },
      { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 }
    ];
    
    function dfs(current: Coordinate, path: Coordinate[], visited: Set<string>): Coordinate[] | null {
      stepsUsed++;
      if (stepsUsed > maxSteps) {
        return null; // Safety cap exceeded
      }
      
      const remainingSteps = T - path.length;
      
      // Success condition: exact length T and at END
      if (path.length === T) {
        if (current.row === END.row && current.col === END.col) {
          return [...path];
        }
        return null;
      }
      
      // Dead-end pruning: can't reach END with remaining steps
      const manhattanDist = Math.abs(current.row - END.row) + Math.abs(current.col - END.col);
      if (manhattanDist > remainingSteps) {
        return null;
      }
      
      // Small cut: if remaining steps ≤ 3 and no cell within Manhattan distance
      if (remainingSteps <= 3) {
        const hasReachableCell = directions.some(dir => {
          const neighbor = { row: current.row + dir.row, col: current.col + dir.col };
          const key = `${neighbor.row},${neighbor.col}`;
          const neighborDist = Math.abs(neighbor.row - END.row) + Math.abs(neighbor.col - END.col);
          return neighbor.row >= 0 && neighbor.row < gridSize &&
                 neighbor.col >= 0 && neighbor.col < gridSize &&
                 !visited.has(key) &&
                 neighborDist <= remainingSteps - 1;
        });
        if (!hasReachableCell) {
          return null;
        }
      }
      
      // Get valid neighbors with bias and constraints
      const validNeighbors = directions
        .map(dir => ({ 
          coord: { row: current.row + dir.row, col: current.col + dir.col },
          delta: dir 
        }))
        .filter(({ coord }) => {
          const key = `${coord.row},${coord.col}`;
          return coord.row >= 0 && coord.row < gridSize &&
                 coord.col >= 0 && coord.col < gridSize &&
                 !visited.has(key) &&
                 // Lock END until last step
                 !(coord.row === END.row && coord.col === END.col && remainingSteps > 1);
        })
        .map(({ coord, delta }) => {
          // Calculate bias scores
          const manhattanDist = Math.abs(coord.row - END.row) + Math.abs(coord.col - END.col);
          const distanceBias = Math.max(0, 10 - manhattanDist); // Favor closer to END
          
          // Turn bonus: favor different direction from last step
          let turnBias = 5; // Base bonus
          if (path.length >= 2) {
            const lastDelta = {
              row: path[path.length - 1].row - path[path.length - 2].row,
              col: path[path.length - 1].col - path[path.length - 2].col
            };
            if (delta.row === lastDelta.row && delta.col === lastDelta.col) {
              turnBias = 0; // Same direction gets no bonus
            }
          }
          
          const totalScore = distanceBias + turnBias + Math.random() * 5; // Random component
          
          return { coord, delta, score: totalScore };
        })
        .sort((a, b) => b.score - a.score); // Higher score first
      
      // Try each neighbor
      for (const { coord } of validNeighbors) {
        const key = `${coord.row},${coord.col}`;
        visited.add(key);
        path.push(coord);
        
        // Check straight-run constraint: no more than 3 steps in same direction
        if (path.length >= 4) {
          const lastThreeDeltas: { row: number; col: number }[] = [];
          for (let i = path.length - 3; i < path.length; i++) {
            const delta = {
              row: path[i].row - path[i - 1].row,
              col: path[i].col - path[i - 1].col
            };
            lastThreeDeltas.push(delta);
          }
          
          if (lastThreeDeltas.every(d => 
            d.row === lastThreeDeltas[0].row && d.col === lastThreeDeltas[0].col
          )) {
            // Would create 4+ straight steps, backtrack
            path.pop();
            visited.delete(key);
            continue;
          }
        }
        
        const result = dfs(coord, path, visited);
        if (result) {
          return result;
        }
        
        // Backtrack
        path.pop();
        visited.delete(key);
      }
      
      return null;
    }
    
    // Start DFS from START
    const startKey = `${START.row},${START.col}`;
    const visited = new Set([startKey]);
    const path = [START];
    
    const result = dfs(START, path, visited);
    if (result) {
      return result;
    }
  }
  
  return null;
}

/**
 * Verify that all consecutive pairs in the path are 8-directionally adjacent
 */
function verifyAdjacency(path: Coordinate[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    
    const rowDiff = Math.abs(next.row - current.row);
    const colDiff = Math.abs(next.col - current.col);
    
    // Check 8-directional adjacency (including diagonals)
    if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the maximum number of consecutive steps in the same direction
 */
function getMaxStraightRun(path: Coordinate[]): number {
  if (path.length < 2) return 0;
  
  let maxRun = 1;
  let currentRun = 1;
  
  for (let i = 1; i < path.length - 1; i++) {
    const prevDelta = {
      row: path[i].row - path[i - 1].row,
      col: path[i].col - path[i - 1].col
    };
    
    const currDelta = {
      row: path[i + 1].row - path[i].row,
      col: path[i + 1].col - path[i].col
    };
    
    if (prevDelta.row === currDelta.row && prevDelta.col === currDelta.col) {
      currentRun++;
    } else {
      maxRun = Math.max(maxRun, currentRun);
      currentRun = 1;
    }
  }
  
  return Math.max(maxRun, currentRun);
}


/**
 * Place words on the specified path coordinates
 */
function placeWordsOnPath(grid: string[][], words: string[], path: Coordinate[]): void {
  let pathIndex = 0;
  
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const isFirst = wordIndex === 0;
    
    // Place letters of the word
    for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
      if (pathIndex >= path.length) {
        throw new Error("Path too short for words");
      }
      
      const coord = path[pathIndex];
      grid[coord.row][coord.col] = word[letterIndex].toUpperCase();
      
      // Skip first letter of subsequent words (overlap)
      if (!isFirst && letterIndex === 0) {
        // Letter already placed by previous word
      } else {
        pathIndex++;
      }
    }
  }
}



/**
 * Fill remaining empty cells with random letters
 */
function fillRemainingCells(grid: string[][], gridSize: number): void {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = getRandomLetter();
      }
    }
  }
}


/**
 * Get a random letter A-Z
 */
function getRandomLetter(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * letters.length)];
}


/**
 * Debug output for generated puzzle
 */
async function debugOutput(puzzle: PuzzleData): Promise<void> {
  console.log("\n🎮 Generated Puzzle:");
  console.log("Grid:");
  puzzle.grid.forEach((row, rowIndex) => {
    console.log(`Row ${rowIndex}: ${row.join(" ")}`);
  });
  
  console.log(`\n📍 Easy Path (${puzzle.easyPath.length} tiles):`);
  puzzle.easyPath.forEach((pos, index) => {
    const letter = puzzle.grid[pos.row][pos.col];
    console.log(`  ${index + 1}. (${pos.row},${pos.col}) = "${letter}"`);
  });
  
  // Extract word sequence from the path
  const wordSequence = await extractWordSequence(puzzle);
  console.log(`\n📝 Easy Words (${wordSequence.length} words): ${wordSequence.join(" → ")}`);
  console.log(`📊 Easy words placed: [${wordSequence.map(w => `"${w}"`).join(", ")}]`);
  
  // Show optimal words if available
  if (puzzle.optimalWords && puzzle.optimalWords.length > 0) {
    console.log(`\n🏆 Optimal Words (${puzzle.optimalWords.length} words): ${puzzle.optimalWords.join(" → ")}`);
    console.log(`🥇 Gold moves: ${puzzle.goldMoves}`);
  }
  
  console.log(`\n🎯 START: (${puzzle.start.row},${puzzle.start.col})`);
  console.log(`🏁 END: (${puzzle.end.row},${puzzle.end.col})`);
  console.log("=".repeat(50));
}

/**
 * Extract the word sequence from the easy path
 */
async function extractWordSequence(puzzle: PuzzleData): Promise<string[]> {
  // Return the actual words that were placed during generation
  return puzzle.easyWords;
}