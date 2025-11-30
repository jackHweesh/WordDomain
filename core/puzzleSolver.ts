// TODO: implement optimal solver for WordDomain puzzles
import { Coordinate, PuzzleData } from "./types";
import { loadBigDictionary } from "./dictionaryLoader";

/**
 * Trie node for efficient word prefix and completion checking
 */
class TrieNode {
  children: { [key: string]: TrieNode } = {};
  isWord: boolean = false;
}

/**
 * Trie data structure for word lookup
 */
class Trie {
  private root: TrieNode = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isWord = true;
  }

  hasPrefix(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return true;
  }

  isWord(word: string): boolean {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return node.isWord;
  }
}

/**
 * Word edge representing a valid word path on the grid
 */
interface WordEdge {
  word: string;
  pathCoords: Coordinate[];
  from: Coordinate;
  to: Coordinate;
}

/**
 * BFS node for shortest path finding
 */
interface BFSNode {
  cell: Coordinate;
  parent?: BFSNode;
  edge?: WordEdge;
  usedTiles: Set<string>; // Track all tiles used in the path so far
}

// Cache for the trie (built once)
let cachedTrie: Trie | null = null;

/**
 * Load all words from the big dictionary
 */
async function loadBigDictionaryWords(): Promise<string[]> {
  const bigDictionary = await loadBigDictionary();
  console.log(`📚 Loaded big dictionary: ${bigDictionary.length} words`);
  return bigDictionary;
}

/**
 * Build trie from big dictionary (cached)
 */
async function buildTrie(): Promise<Trie> {
  if (cachedTrie) {
    return cachedTrie;
  }

  console.log("🔤 Building trie from big dictionary...");
  const trie = new Trie();
  
  // Load all words from big dictionary
  const allWords = await loadBigDictionaryWords();

  // Insert words of length >= 3 into trie
  let wordCount = 0;
  for (const word of allWords) {
    if (word.length >= 3) {
      trie.insert(word);
      wordCount++;
    }
  }

  console.log(`📚 Loaded ${wordCount} words into trie from BIG dictionary`);
  console.log(`✅ Sample words from big dictionary:`, allWords.slice(0, 10));
  cachedTrie = trie;
  return trie;
}

/**
 * Find all valid word paths starting from a given cell
 */
function findWordsFromCell(
  grid: string[][], 
  startCell: Coordinate, 
  trie: Trie
): WordEdge[] {
  const edges: WordEdge[] = [];
  const maxLength = 6;
  
  // 8-directional movement vectors
  const directions = [
    { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
    { row: 0, col: -1 },                      { row: 0, col: 1 },
    { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 }
  ];

  function dfs(
    currentCell: Coordinate,
    currentWord: string,
    pathCoords: Coordinate[],
    visited: Set<string>
  ): void {
    // Check if current word is valid
    if (currentWord.length >= 3 && trie.isWord(currentWord)) {
      edges.push({
        word: currentWord,
        pathCoords: [...pathCoords],
        from: startCell,
        to: currentCell
      });
    }

    // Stop if we've reached max length
    if (currentWord.length >= maxLength) {
      return;
    }

    // Try each direction
    for (const dir of directions) {
      const nextCell = {
        row: currentCell.row + dir.row,
        col: currentCell.col + dir.col
      };

      // Check bounds and not visited in this word
      const key = `${nextCell.row},${nextCell.col}`;
      if (nextCell.row < 0 || nextCell.row >= grid.length ||
          nextCell.col < 0 || nextCell.col >= grid[0].length ||
          visited.has(key)) {
        continue;
      }

      // Get the letter at this cell
      const letter = grid[nextCell.row][nextCell.col].toLowerCase();
      const newWord = currentWord + letter;

      // Prune if prefix is not valid
      if (!trie.hasPrefix(newWord)) {
        continue;
      }

      // Continue DFS
      visited.add(key);
      pathCoords.push(nextCell);
      dfs(nextCell, newWord, pathCoords, visited);
      pathCoords.pop();
      visited.delete(key);
    }
  }

  // Start DFS from the start cell
  const startLetter = grid[startCell.row][startCell.col].toLowerCase();
  const visited = new Set([`${startCell.row},${startCell.col}`]);
  const pathCoords = [startCell];
  
  dfs(startCell, startLetter, pathCoords, visited);

  return edges;
}

/**
 * Precompute all word edges on the grid
 */
function precomputeWordEdges(grid: string[][], trie: Trie): WordEdge[] {
  console.log("🔍 Precomputing word edges...");
  const allEdges: WordEdge[] = [];
  const maxEdges = 50000; // Safety cap

  // For each cell on the grid, find all words starting from it
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      const startCell = { row, col };
      const edges = findWordsFromCell(grid, startCell, trie);
      allEdges.push(...edges);

      // Safety check
      if (allEdges.length > maxEdges) {
        console.log(`⚠️  Hit edge cap of ${maxEdges}, stopping early`);
        break;
      }
    }
    if (allEdges.length > maxEdges) break;
  }

  console.log(`📊 Total word edges: ${allEdges.length}`);
  
  // Calculate average edges per starting cell
  const uniqueStarts = new Set(allEdges.map(e => `${e.from.row},${e.from.col}`));
  const avgPerCell = allEdges.length / uniqueStarts.size;
  console.log(`📈 Average edges per starting cell: ${avgPerCell.toFixed(1)}`);

  return allEdges;
}

/**
 * Build adjacency list from word edges
 */
function buildAdjacencyList(edges: WordEdge[]): Map<string, WordEdge[]> {
  const adjList = new Map<string, WordEdge[]>();
  
  for (const edge of edges) {
    const key = `${edge.from.row},${edge.from.col}`;
    if (!adjList.has(key)) {
      adjList.set(key, []);
    }
    adjList.get(key)!.push(edge);
  }
  
  return adjList;
}

/**
 * Find optimal path using BFS on word graph
 */
function findOptimalPath(
  grid: string[][], 
  start: Coordinate, 
  end: Coordinate, 
  edges: WordEdge[]
): { optimalWords: string[], optimalPath: Coordinate[], goldMoves: number } | null {
  console.log("🎯 Finding optimal path with BFS...");
  console.log(`📍 BFS: Looking for path from (${start.row},${start.col}) to (${end.row},${end.col})`);
  
  const adjList = buildAdjacencyList(edges);
  const startKey = `${start.row},${start.col}`;
  const endKey = `${end.row},${end.col}`;
  
  console.log(`🔗 BFS: Built adjacency list with ${adjList.size} starting cells`);
  console.log(`🎯 BFS: Start cell (${startKey}) has ${adjList.get(startKey)?.length || 0} outgoing word edges`);
  
  // BFS queue
  const queue: BFSNode[] = [{ cell: start, usedTiles: new Set([startKey]) }];
  const visited = new Set<string>();
  visited.add(startKey);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if we've reached the end
    if (`${current.cell.row},${current.cell.col}` === endKey) {
      console.log(`🎉 BFS: Found path to END! Reconstructing optimal solution...`);
      
      // Reconstruct path
      const optimalWords: string[] = [];
      const optimalPath: Coordinate[] = [];
      let node: BFSNode | undefined = current;
      
      while (node && node.edge) {
        optimalWords.unshift(node.edge.word);
        optimalPath.unshift(...node.edge.pathCoords);
        node = node.parent;
      }
      
      // Add the start coordinate if not already included
      if (optimalPath.length === 0 || 
          optimalPath[0].row !== start.row || 
          optimalPath[0].col !== start.col) {
        optimalPath.unshift(start);
      }
      
      // Remove duplicate coordinates at word boundaries (overlaps)
      const cleanedPath: Coordinate[] = [optimalPath[0]];
      for (let i = 1; i < optimalPath.length; i++) {
        const current = optimalPath[i];
        const previous = cleanedPath[cleanedPath.length - 1];
        if (current.row !== previous.row || current.col !== previous.col) {
          cleanedPath.push(current);
        }
      }
      
      return {
        optimalWords,
        optimalPath: cleanedPath,
        goldMoves: optimalWords.length
      };
    }
    
    // Explore neighbors
    const cellKey = `${current.cell.row},${current.cell.col}`;
    const neighborEdges = adjList.get(cellKey) || [];
    
    for (const edge of neighborEdges) {
      const nextKey = `${edge.to.row},${edge.to.col}`;
      
      // Check if this edge would reuse any tiles from the current path
      // BUT allow the 1-tile overlap (the first tile of this edge can match the last tile of current path)
      const edgeTileKeys = edge.pathCoords.map(coord => `${coord.row},${coord.col}`);
      
      // Get the last tile of the current path (where the overlap should be)
      const currentPathLastTile = current.edge ? 
        `${current.edge.pathCoords[current.edge.pathCoords.length - 1].row},${current.edge.pathCoords[current.edge.pathCoords.length - 1].col}` : 
        `${current.cell.row},${current.cell.col}`;
      
      // Check for conflicts, but allow the first tile of the new edge to overlap with the last tile of current path
      const wouldReuseTile = edgeTileKeys.some((tileKey, index) => {
        // Allow the first tile to overlap (index 0), but not any other tiles
        if (index === 0 && tileKey === currentPathLastTile) {
          return false; // This is the allowed overlap
        }
        return current.usedTiles.has(tileKey);
      });
      
      if (!visited.has(nextKey) && !wouldReuseTile) {
        // Create new usedTiles set with this edge's tiles added
        const newUsedTiles = new Set(current.usedTiles);
        edgeTileKeys.forEach(tileKey => newUsedTiles.add(tileKey));
        
        visited.add(nextKey);
        queue.push({
          cell: edge.to,
          parent: current,
          edge: edge,
          usedTiles: newUsedTiles
        });
      }
    }
  }
  
  return null; // No path found
}

/**
 * Verify optimal path properties
 */
function verifyOptimalPath(
  optimalPath: Coordinate[],
  optimalWords: string[],
  start: Coordinate,
  end: Coordinate
): boolean {
  // Check start and end
  if (optimalPath.length === 0) return false;
  const first = optimalPath[0];
  const last = optimalPath[optimalPath.length - 1];
  
  if (first.row !== start.row || first.col !== start.col ||
      last.row !== end.row || last.col !== end.col) {
    return false;
  }
  
  // Check 8-directional adjacency
  for (let i = 0; i < optimalPath.length - 1; i++) {
    const current = optimalPath[i];
    const next = optimalPath[i + 1];
    
    const rowDiff = Math.abs(next.row - current.row);
    const colDiff = Math.abs(next.col - current.col);
    
    if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Solve for optimal path through the puzzle
 */
export async function solveOptimal(puzzle: PuzzleData): Promise<{
  optimalWords: string[];
  optimalPath: Coordinate[];
  goldMoves: number;
}> {
  try {
    console.log("🧩 Solving optimal path...");
    
    // Build trie from big dictionary
    const trie = await buildTrie();
    
    // Precompute word edges
    const edges = precomputeWordEdges(puzzle.grid, trie);
    
  if (edges.length === 0) {
    throw new Error("No valid word edges found on grid - check if big dictionary is loaded correctly");
  }
  
  console.log(`🔍 Solver: Found ${edges.length} valid word edges from big dictionary`);
  console.log(`📝 Solver: Sample word edges:`, edges.slice(0, 5).map(e => `${e.word} (${e.from.row},${e.from.col} → ${e.to.row},${e.to.col})`));
    
    // Find optimal path
    const result = findOptimalPath(puzzle.grid, puzzle.start, puzzle.end, edges);
    
    if (!result) {
      throw new Error("No optimal path found from START to END");
    }
    
    // Verify the solution
    const isValid = verifyOptimalPath(
      result.optimalPath, 
      result.optimalWords, 
      puzzle.start, 
      puzzle.end
    );
    
    if (!isValid) {
      throw new Error("Optimal path verification failed");
    }
    
    console.log(`✅ Optimal solution found: ${result.optimalWords.join(" → ")} (${result.goldMoves} words)`);
    console.log(`🛤️  Optimal path length: ${result.optimalPath.length} tiles`);
    
    return result;
    
  } catch (error) {
    console.error("❌ Solver failed:", error);
    
    // Return minimal object to prevent UI crash
    return {
      optimalWords: [],
      optimalPath: [],
      goldMoves: 0
    };
  }
}