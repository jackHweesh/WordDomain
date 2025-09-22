import { generatePuzzle } from '../core/puzzleGenerator.js';
import { solveOptimal } from '../core/puzzleSolver.js';
import { isValidWord } from '../core/wordValidator.js';
import Board from '../components/Board.js';
import HUD from '../components/HUD.js';
const { useState, useEffect, useCallback } = React;
const PuzzleScreen = () => {
    const [puzzle, setPuzzle] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [loading, setLoading] = useState(false);
    // Initialize puzzle and game state
    const initializeGame = useCallback(async () => {
        setLoading(true);
        try {
            console.log("🎮 Initializing new puzzle...");
            // Generate puzzle
            const newPuzzle = await generatePuzzle(Math.floor(Math.random() * 1000) + 1);
            // Solve for optimal path
            const { optimalWords, optimalPath, goldMoves } = await solveOptimal(newPuzzle);
            // Attach optimal solution to puzzle
            newPuzzle.optimalWords = optimalWords;
            newPuzzle.optimalPath = optimalPath;
            newPuzzle.goldMoves = goldMoves;
            // Create deep copy of grid for gameplay
            const workingGrid = newPuzzle.grid.map(row => [...row]);
            // Initialize game state
            const initialState = {
                grid: workingGrid,
                currentStart: newPuzzle.start,
                selection: [newPuzzle.start],
                playedWords: [],
                status: 'playing',
                goldMoves: goldMoves
            };
            setPuzzle(newPuzzle);
            setGameState(initialState);
            console.log("✅ Game initialized:", {
                start: newPuzzle.start,
                end: newPuzzle.end,
                goldMoves,
                optimalWords
            });
        }
        catch (error) {
            console.error("❌ Failed to initialize game:", error);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Initialize on mount
    useEffect(() => {
        initializeGame();
    }, [initializeGame]);
    // Check if two coordinates are 8-directionally adjacent
    const isAdjacent8 = useCallback((a, b) => {
        const rowDiff = Math.abs(b.row - a.row);
        const colDiff = Math.abs(b.col - a.col);
        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    }, []);
    // Build current word string from selection
    const getCurrentWord = useCallback(() => {
        if (!gameState)
            return '';
        return gameState.selection.map(coord => gameState.grid[coord.row][coord.col]).join('').toLowerCase();
    }, [gameState]);
    // Handle tile press
    const handleTilePress = useCallback((coord) => {
        if (!gameState || !puzzle)
            return;
        console.log(`🎯 Tile press: (${coord.row},${coord.col})`);
        // Check if tile is already selected (for backtracking)
        const selectedIndex = gameState.selection.findIndex(sel => sel.row === coord.row && sel.col === coord.col);
        if (selectedIndex !== -1) {
            // Backtracking: remove tiles after this one
            if (selectedIndex === gameState.selection.length - 1) {
                // Removing last tile (allowed)
                const newSelection = gameState.selection.slice(0, -1);
                setGameState({
                    ...gameState,
                    selection: newSelection,
                    status: 'playing'
                });
                console.log("✅ Backtracked to:", newSelection.length, "tiles");
                return;
            }
            else if (selectedIndex === 0) {
                // Cannot remove START tile
                console.log("❌ Cannot remove START tile");
                return;
            }
            else {
                // Cannot remove middle tiles
                console.log("❌ Cannot remove middle tiles");
                return;
            }
        }
        // Check if this is the first tile after START
        if (gameState.selection.length === 1) {
            // First tap must be the current START tile
            if (coord.row !== gameState.currentStart.row || coord.col !== gameState.currentStart.col) {
                console.log("❌ First tap must be START tile");
                return;
            }
        }
        else {
            // Subsequent taps must be adjacent to last selected tile
            const lastSelected = gameState.selection[gameState.selection.length - 1];
            if (!isAdjacent8(lastSelected, coord)) {
                console.log("❌ Tile not adjacent to last selected");
                return;
            }
        }
        // Add tile to selection
        const newSelection = [...gameState.selection, coord];
        setGameState({
            ...gameState,
            selection: newSelection,
            status: 'playing'
        });
        console.log("✅ Tile accepted, selection length:", newSelection.length);
    }, [gameState, puzzle, isAdjacent8]);
    // Handle word submission
    const handleSubmit = useCallback(async () => {
        if (!gameState || !puzzle)
            return;
        const currentWord = getCurrentWord();
        console.log(`📝 Submitting word: "${currentWord}" (${gameState.selection.length} tiles)`);
        // Check minimum length
        if (gameState.selection.length < 3) {
            console.log("❌ Word too short (minimum 3 letters)");
            return;
        }
        // Validate word
        const isValid = await isValidWord(currentWord);
        console.log(`🔍 Word validation: ${isValid}`);
        if (isValid) {
            // Valid word - accept it
            const newPlayedWord = {
                word: currentWord,
                path: [...gameState.selection]
            };
            // Remove all selected tiles except the last one (new START)
            const newGrid = gameState.grid.map(row => [...row]);
            for (let i = 0; i < gameState.selection.length - 1; i++) {
                const coord = gameState.selection[i];
                newGrid[coord.row][coord.col] = ''; // Clear the tile
            }
            // Last selected tile becomes new START
            const newStart = gameState.selection[gameState.selection.length - 1];
            // Check if we've reached the END
            const isWon = newStart.row === puzzle.end.row && newStart.col === puzzle.end.col;
            // Determine medal
            let medal;
            if (isWon) {
                const playedCount = gameState.playedWords.length + 1;
                if (playedCount === gameState.goldMoves) {
                    medal = 'gold';
                }
                else if (playedCount === gameState.goldMoves + 1) {
                    medal = 'silver';
                }
                else {
                    medal = 'bronze';
                }
            }
            setGameState({
                ...gameState,
                grid: newGrid,
                currentStart: newStart,
                selection: [newStart],
                playedWords: [...gameState.playedWords, newPlayedWord],
                status: isWon ? 'won' : 'playing',
                medal
            });
            console.log("✅ Word accepted:", {
                word: currentWord,
                newStart,
                playedWordsCount: gameState.playedWords.length + 1,
                isWon,
                medal
            });
            if (isWon) {
                console.log("🏆 GAME WON! Medal:", medal);
                console.log(`📊 Final stats: ${gameState.playedWords.length + 1} words, ${gameState.goldMoves} gold target`);
            }
        }
        else {
            // Invalid word - reset to initial state
            console.log("❌ Invalid word - resetting to initial puzzle state");
            const workingGrid = puzzle.grid.map(row => [...row]);
            setGameState({
                ...gameState,
                grid: workingGrid,
                currentStart: puzzle.start,
                selection: [puzzle.start],
                playedWords: [],
                status: 'invalid'
            });
        }
    }, [gameState, puzzle, getCurrentWord]);
    // Handle backtrack
    const handleBacktrack = useCallback(() => {
        if (!gameState || gameState.selection.length <= 1)
            return;
        const newSelection = gameState.selection.slice(0, -1);
        setGameState({
            ...gameState,
            selection: newSelection,
            status: 'playing'
        });
        console.log("⬅️ Backtracked to:", newSelection.length, "tiles");
    }, [gameState]);
    if (loading) {
        return (React.createElement("div", { style: { padding: '20px', textAlign: 'center' } },
            React.createElement("h2", null, "Loading puzzle...")));
    }
    if (!puzzle || !gameState) {
        return (React.createElement("div", { style: { padding: '20px', textAlign: 'center' } },
            React.createElement("h2", null, "Failed to load puzzle"),
            React.createElement("button", { onClick: initializeGame }, "Retry")));
    }
    return (React.createElement("div", { style: { padding: '20px', maxWidth: '800px', margin: '0 auto' } },
        React.createElement("div", { style: { marginBottom: '20px', textAlign: 'center' } },
            React.createElement("h1", null, "\uD83C\uDFAE WordDomain Puzzle"),
            React.createElement("button", { onClick: initializeGame, style: { margin: '10px' } }, "New Puzzle")),
        React.createElement(HUD, { currentWord: getCurrentWord(), onSubmit: handleSubmit, onBacktrack: handleBacktrack, goldMoves: gameState.goldMoves, playedCount: gameState.playedWords.length, status: gameState.status, medal: gameState.medal }),
        React.createElement(Board, { grid: gameState.grid, start: gameState.currentStart, end: puzzle.end, selection: gameState.selection, onTilePress: handleTilePress }),
        gameState.playedWords.length > 0 && (React.createElement("div", { style: { marginTop: '20px' } },
            React.createElement("h3", null, "\uD83D\uDCDD Played Words:"),
            React.createElement("ul", null, gameState.playedWords.map((played, index) => (React.createElement("li", { key: index },
                React.createElement("strong", null, played.word),
                " (",
                played.path.length,
                " tiles)"))))))));
};
export default PuzzleScreen;
