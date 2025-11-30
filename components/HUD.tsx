import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HUDProps {
  currentWord: string;
  goldMoves: number;
  playedCount: number;
  status: 'playing' | 'won' | 'invalid';
  medal?: 'gold' | 'silver' | 'bronze';
}

export default function HUD({
  currentWord,
  goldMoves,
  playedCount,
  status,
  medal,
}: HUDProps) {
  const getStatusStyle = () => {
    switch (status) {
      case 'invalid':
        return { color: '#F44336', fontWeight: 'bold' as const };
      case 'won':
        return { color: '#4CAF50', fontWeight: 'bold' as const };
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

  return (
    <View style={styles.container}>
      <View style={styles.statusSection}>
        {status === 'won' && (
          <Text style={styles.wonText}>
            🎉 {getMedalEmoji()} {getMedalText()} 🎉
          </Text>
        )}
        {status === 'invalid' && (
          <Text style={styles.invalidText}>❌ Invalid word - try again!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
    padding: 2,
    backgroundColor: 'transparent', // No background box
    borderRadius: 8,
    width: '100%',
  },
  statusSection: {
    alignItems: 'center',
    minHeight: 24,
  },
  wonText: {
    fontSize: 16,
    color: '#8B6F47', // Warm brown for success
    fontWeight: 'bold',
  },
  invalidText: {
    fontSize: 14,
    color: '#A85D3A', // Warm reddish-brown for error
    fontWeight: 'bold',
  },
});
