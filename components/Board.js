import Tile from './Tile.js';
const Board = ({ grid, start, end, selection, onTilePress }) => {
    const isSelected = (coord) => {
        return selection.some(sel => sel.row === coord.row && sel.col === coord.col);
    };
    const isLastSelected = (coord) => {
        const lastSelected = selection[selection.length - 1];
        return lastSelected && lastSelected.row === coord.row && lastSelected.col === coord.col;
    };
    const isDisabled = (coord) => {
        // Disable if already selected (except last one for backtracking)
        if (isSelected(coord) && !isLastSelected(coord)) {
            return true;
        }
        // Disable if tile is empty
        if (!grid[coord.row][coord.col]) {
            return true;
        }
        return false;
    };
    const getTileType = (coord) => {
        if (coord.row === start.row && coord.col === start.col) {
            return 'start';
        }
        if (coord.row === end.row && coord.col === end.col) {
            return 'end';
        }
        if (isLastSelected(coord)) {
            return 'last-selected';
        }
        if (isSelected(coord)) {
            return 'selected';
        }
        return 'normal';
    };
    return (React.createElement("div", { style: {
            display: 'grid',
            gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
            gap: '2px',
            maxWidth: '400px',
            margin: '0 auto',
            padding: '10px',
            backgroundColor: '#333',
            borderRadius: '8px'
        } }, grid.map((row, rowIndex) => row.map((letter, colIndex) => {
        const coord = { row: rowIndex, col: colIndex };
        return (React.createElement(Tile, { key: `${rowIndex}-${colIndex}`, letter: letter, coord: coord, type: getTileType(coord), disabled: isDisabled(coord), onClick: () => onTilePress(coord) }));
    }))));
};
export default Board;
