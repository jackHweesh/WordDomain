import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface ConfettiProps {
  color: 'gold' | 'silver';
  duration?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PARTICLE_COUNT = 400; // Even more confetti!

export default function Confetti({ color, duration = 8000 }: ConfettiProps) {
  const particles = useRef<Animated.Value[]>(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))
  ).current;

  const xDrifts = useRef<number[]>(
    Array.from({ length: PARTICLE_COUNT }, () => (Math.random() - 0.5) * 400)
  ).current;

  const rotations = useRef<number[]>(
    Array.from({ length: PARTICLE_COUNT }, () => Math.random() * 360)
  ).current;

  const shapes = useRef<string[]>(
    Array.from({ length: PARTICLE_COUNT }, () => {
      const rand = Math.random();
      if (rand < 0.33) return 'circle';
      if (rand < 0.66) return 'square';
      return 'triangle'; // 33% triangles
    })
  ).current;

  const colors = {
    gold: ['#FFD700', '#FFA500', '#FF8C00', '#FFD700', '#FFC125', '#FFB347', '#FFD700'],
    silver: ['#C0C0C0', '#A8A8A8', '#808080', '#E8E8E8', '#D3D3D3', '#B0B0B0', '#C8C8C8'],
  };

  const colorPalette = colors[color];

  useEffect(() => {
    // Animate all particles falling - NO DELAY, start immediately!
    const animations = particles.map((particle) => {
      const fallDuration = (duration + Math.random() * 2000) / 3; // 3x faster fall time

      return Animated.timing(particle, {
        toValue: 1,
        duration: fallDuration,
        delay: 0, // Zero delay - start immediately!
        useNativeDriver: true,
      });
    });

    // Start immediately when component mounts
    Animated.parallel(animations).start();
  }, []);

  const renderParticle = (index: number) => {
    const startX = Math.random() * screenWidth;
    const startY = -50; // Start higher up
    const endY = screenHeight + 50;
    const size = 4 + Math.random() * 12;
    const colorIndex = Math.floor(Math.random() * colorPalette.length);
    const shape = shapes[index];
    const particleColor = colorPalette[colorIndex];

    const baseStyle = {
      position: 'absolute' as const,
      left: startX,
      transform: [
        {
          translateY: particles[index].interpolate({
            inputRange: [0, 1],
            outputRange: [startY, endY],
          }),
        },
        {
          translateX: particles[index].interpolate({
            inputRange: [0, 0.2, 0.5, 0.8, 1],
            outputRange: [0, xDrifts[index] * 0.3, xDrifts[index] * 0.7, xDrifts[index], xDrifts[index] * 0.8],
          }),
        },
        {
          rotate: particles[index].interpolate({
            inputRange: [0, 1],
            outputRange: [`${rotations[index]}deg`, `${rotations[index] + 1440}deg`],
          }),
        },
        {
          scale: particles[index].interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [1, 1.2, 1.1, 0.7],
          }),
        },
      ],
      opacity: particles[index].interpolate({
        inputRange: [0, 0.05, 0.95, 1],
        outputRange: [1, 1, 1, 0], // Fully visible immediately
      }),
    };

    if (shape === 'circle') {
      return (
        <Animated.View
          key={index}
          style={[
            baseStyle,
            {
              width: size,
              height: size,
              backgroundColor: particleColor,
              borderRadius: size / 2,
            },
          ]}
        />
      );
    } else if (shape === 'square') {
      return (
        <Animated.View
          key={index}
          style={[
            baseStyle,
            {
              width: size,
              height: size,
              backgroundColor: particleColor,
              borderRadius: 2,
            },
          ]}
        />
      );
    } else {
      // Triangle using border trick - pointing down
      const triangleSize = size * 1.2;
      return (
        <Animated.View
          key={index}
          style={[
            baseStyle,
            {
              width: 0,
              height: 0,
              borderLeftWidth: triangleSize / 2,
              borderRightWidth: triangleSize / 2,
              borderBottomWidth: triangleSize * 0.866, // Height of equilateral triangle
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: particleColor,
              backgroundColor: 'transparent',
            },
          ]}
        />
      );
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((_, index) => renderParticle(index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001, // Higher than modal (which is 9999/10000)
    elevation: 10001, // Android
  },
});
