import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../src/styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOKEN_FILL = Colors.accent;
const TOKEN_RIM = Colors.surfaceDark;

interface TokenRewardOverlayProps {
  /** Number of tokens to show (1, 2, or 3) */
  amount: number;
  onComplete: () => void;
  /** Target position for fly-to (default: top-right where counter lives) */
  targetPosition?: { x: number; y: number };
}

const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const DEFAULT_TARGET = { x: SCREEN_WIDTH - 72, y: 56 };

export default function TokenRewardOverlay({
  amount,
  onComplete,
  targetPosition = DEFAULT_TARGET,
}: TokenRewardOverlayProps) {
  const tokens = Math.max(1, Math.min(3, amount));
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const targetX = targetPosition.x - CENTER_X;
    const targetY = targetPosition.y - CENTER_Y;

    // Enter: fade in + scale up (celebratory)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start(() => {
      // Hold for a short pause
      const hold = 800;
      const flyDuration = 500;
      const timer = setTimeout(() => {
        // Fly to counter: move and shrink
        Animated.parallel([
          Animated.timing(flyX, {
            toValue: targetX,
            duration: flyDuration,
            useNativeDriver: true,
          }),
          Animated.timing(flyY, {
            toValue: targetY,
            duration: flyDuration,
            useNativeDriver: true,
          }),
          Animated.timing(flyScale, {
            toValue: 0.2,
            duration: flyDuration,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: flyDuration,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, hold);
      return () => clearTimeout(timer);
    });
  }, [targetPosition.x, targetPosition.y, onComplete]);

  const spacing = 28;
  const groupWidth = (tokens - 1) * spacing + TOKEN_SIZE;
  const groupCenterX = -groupWidth / 2;
  const groupCenterY = -TOKEN_SIZE / 2;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.groupWrap,
          {
            transform: [
              { translateX: groupCenterX },
              { translateY: groupCenterY },
              { scale },
              { translateX: flyX },
              { translateY: flyY },
              { scale: flyScale },
            ],
          },
        ]}
      >
        {Array.from({ length: tokens }, (_, i) => (
          <View key={i} style={[styles.tokenWrap, i > 0 && { marginLeft: spacing }]}>
            <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
            <View style={styles.token}>
              <View style={styles.tokenFill} />
            </View>
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const TOKEN_SIZE = 80;
const STROKE = 6;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  groupWrap: {
    position: 'absolute',
    left: CENTER_X,
    top: CENTER_Y,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenWrap: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: TOKEN_SIZE + 40,
    height: TOKEN_SIZE + 40,
    borderRadius: (TOKEN_SIZE + 40) / 2,
    backgroundColor: TOKEN_FILL,
    opacity: 0.4,
  },
  token: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: TOKEN_SIZE / 2,
    borderWidth: STROKE,
    borderColor: TOKEN_RIM,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenFill: {
    position: 'absolute',
    width: TOKEN_SIZE - STROKE * 2,
    height: TOKEN_SIZE - STROKE * 2,
    borderRadius: (TOKEN_SIZE - STROKE * 2) / 2,
    backgroundColor: TOKEN_FILL,
  },
});
