import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../src/styles/theme';

type Pip = { row: 0 | 1 | 2; col: 0 | 1 | 2 };

const PIP_MAP: Record<1 | 2 | 3 | 4 | 5 | 6, Pip[]> = {
  1: [{ row: 1, col: 1 }],
  2: [
    { row: 0, col: 0 },
    { row: 2, col: 2 },
  ],
  3: [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
  ],
  4: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
  ],
  5: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
  ],
  6: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
  ],
};

interface DiceIconProps {
  size?: number;
  style?: ViewStyle;
}

function DieFace({
  value,
  size,
  style,
}: {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  size: number;
  style?: ViewStyle;
}) {
  const pipSize = size * 0.18;
  const positions = [0.23, 0.5, 0.77] as const;

  return (
    <View
      style={[
        styles.die,
        {
          width: size,
          height: size,
          borderRadius: size * 0.18,
        },
        style,
      ]}
    >
      {PIP_MAP[value].map((pip, idx) => (
        <View
          key={idx}
          style={[
            styles.pip,
            {
              width: pipSize,
              height: pipSize,
              borderRadius: pipSize / 2,
              left: size * positions[pip.col] - pipSize / 2,
              top: size * positions[pip.row] - pipSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function DiceIcon({ size = 32, style }: DiceIconProps) {
  const dieSize = size * 0.7;
  const offset = size * 0.25;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <DieFace value={5} size={dieSize} style={{ position: 'absolute', left: 0, top: 0 }} />
      <DieFace value={1} size={dieSize} style={{ position: 'absolute', left: offset, top: offset }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  die: {
    position: 'relative',
    backgroundColor: Colors.tileBackground,
    borderWidth: 1,
    borderColor: Colors.tileBorder,
  },
  pip: {
    position: 'absolute',
    backgroundColor: '#000000',
  },
});

