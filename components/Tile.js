const Tile = ({ letter, coord, type, disabled, onClick }) => {
    const getTileStyle = () => {
        const baseStyle = {
            width: '50px',
            height: '50px',
            border: '2px solid #666',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none'
        };
        switch (type) {
            case 'start':
                return {
                    ...baseStyle,
                    backgroundColor: '#4CAF50', // Green
                    color: 'white',
                    borderColor: '#2E7D32'
                };
            case 'end':
                return {
                    ...baseStyle,
                    backgroundColor: '#F44336', // Red
                    color: 'white',
                    borderColor: '#C62828'
                };
            case 'last-selected':
                return {
                    ...baseStyle,
                    backgroundColor: '#FF9800', // Orange
                    color: 'white',
                    borderColor: '#F57C00',
                    transform: 'scale(1.1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                };
            case 'selected':
                return {
                    ...baseStyle,
                    backgroundColor: '#2196F3', // Blue
                    color: 'white',
                    borderColor: '#1565C0'
                };
            default:
                return {
                    ...baseStyle,
                    backgroundColor: disabled ? '#E0E0E0' : '#FFFFFF',
                    color: disabled ? '#9E9E9E' : '#333333',
                    borderColor: disabled ? '#BDBDBD' : '#666666'
                };
        }
    };
    const handleClick = () => {
        if (!disabled) {
            onClick();
        }
    };
    const handleKeyPress = (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            onClick();
        }
    };
    return (React.createElement("div", { style: getTileStyle(), onClick: handleClick, onKeyPress: handleKeyPress, tabIndex: disabled ? -1 : 0, role: "button", "aria-label": `Tile ${letter} at row ${coord.row}, column ${coord.col}` }, letter || ''));
};
export default Tile;
