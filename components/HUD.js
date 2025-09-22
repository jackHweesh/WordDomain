const HUD = ({ currentWord, onSubmit, onBacktrack, goldMoves, playedCount, status, medal }) => {
    const getStatusStyle = () => {
        switch (status) {
            case 'invalid':
                return { color: '#F44336', fontWeight: 'bold' };
            case 'won':
                return { color: '#4CAF50', fontWeight: 'bold' };
            default:
                return { color: '#333' };
        }
    };
    const getMedalEmoji = () => {
        switch (medal) {
            case 'gold': return '🥇';
            case 'silver': return '🥈';
            case 'bronze': return '🥉';
            default: return '';
        }
    };
    const getMedalText = () => {
        switch (medal) {
            case 'gold': return 'GOLD MEDAL!';
            case 'silver': return 'SILVER MEDAL!';
            case 'bronze': return 'BRONZE MEDAL!';
            default: return '';
        }
    };
    return (React.createElement("div", { style: {
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center'
        } },
        React.createElement("div", { style: { marginBottom: '10px' } },
            React.createElement("h3", { style: { margin: '0 0 5px 0', color: '#333' } }, "Current Word:"),
            React.createElement("div", { style: {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: currentWord ? '#2196F3' : '#666',
                    minHeight: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                } }, currentWord || 'Select tiles...'),
            React.createElement("div", { style: { fontSize: '14px', color: '#666' } },
                currentWord.length,
                " letters")),
        React.createElement("div", { style: { marginBottom: '15px' } },
            React.createElement("div", { style: getStatusStyle() },
                status === 'won' && (React.createElement("div", { style: { fontSize: '20px', marginBottom: '5px' } },
                    "\uD83C\uDF89 ",
                    getMedalEmoji(),
                    " ",
                    getMedalText(),
                    " \uD83C\uDF89")),
                status === 'invalid' && (React.createElement("div", null, "\u274C Invalid word - try again!")),
                status === 'playing' && (React.createElement("div", null, "\uD83C\uDFAF Build words from START to END")))),
        React.createElement("div", { style: {
                display: 'flex',
                justifyContent: 'space-around',
                marginBottom: '15px',
                fontSize: '14px'
            } },
            React.createElement("div", null,
                React.createElement("strong", null, "Words Played:"),
                " ",
                playedCount),
            React.createElement("div", null,
                React.createElement("strong", null, "Gold Target:"),
                " ",
                goldMoves),
            React.createElement("div", null,
                React.createElement("strong", null, "Remaining:"),
                " ",
                goldMoves - playedCount)),
        React.createElement("div", { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
            React.createElement("button", { onClick: onBacktrack, disabled: currentWord.length <= 1, style: {
                    padding: '8px 16px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentWord.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentWord.length <= 1 ? 0.5 : 1
                } }, "\u2B05\uFE0F Backtrack"),
            React.createElement("button", { onClick: onSubmit, disabled: currentWord.length < 3 || status === 'won', style: {
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (currentWord.length < 3 || status === 'won') ? 'not-allowed' : 'pointer',
                    opacity: (currentWord.length < 3 || status === 'won') ? 0.5 : 1
                } }, "\u2705 Submit Word")),
        React.createElement("div", { style: {
                marginTop: '15px',
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.4'
            } },
            React.createElement("div", null, "\u2022 First tap must be START tile"),
            React.createElement("div", null, "\u2022 Next taps must be adjacent (including diagonals)"),
            React.createElement("div", null, "\u2022 No tile reuse within the same word"),
            React.createElement("div", null, "\u2022 Submit valid words to clear tiles and advance"))));
};
export default HUD;
