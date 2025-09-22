// Shared types for WordDomain game

export interface Coordinate {
  row: number;
  col: number;
}

export interface PuzzleData {
  id: number;
  grid: string[][];
  start: Coordinate;
  end: Coordinate;
  easyPath: Coordinate[]; // Generated solution path
  easyWords: string[]; // Actual words placed on the path
  optimalPath: Coordinate[] | null; // Solver's optimal path (filled later)
  optimalWords: string[] | null; // Optimal words found by solver (filled later)
  goldMoves: number | null; // Length of optimal solution (filled later)
}

export interface WordPlacement {
  word: string;
  path: Coordinate[];
}