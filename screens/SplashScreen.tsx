import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WordDomainLogo from '../components/WordDomainLogo';
import { Fonts, Spacing } from '../src/styles/theme';

const GRADIENT_COLORS = ['#8062E8', '#4A47ED'] as const;
const SPLASH_DURATION_MS = 2000;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_TEXT_WIDTH = 220;
const DEFAULT_TEXT_HEIGHT = 48;
// Top padding so "WordDomain" sits in the upper quarter; logo + spacing + half title height
const CONTENT_TOP_PADDING = SCREEN_HEIGHT * 0.12;

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [textDimensions, setTextDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) onComplete?.();
    });
    return () => animation.stop();
  }, [onComplete, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const barWidth = textDimensions?.width ?? DEFAULT_TEXT_WIDTH;
  const barHeight = textDimensions?.height ?? DEFAULT_TEXT_HEIGHT;

  return (
    <LinearGradient
      colors={[...GRADIENT_COLORS]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Logo + title + progress as one block, positioned in upper quarter */}
      <View style={[styles.contentBlock, { paddingTop: CONTENT_TOP_PADDING }]}>
        <View style={styles.brandSection}>
          <WordDomainLogo size={80} />
          <Text
            style={styles.title}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setTextDimensions((prev) =>
                prev ? prev : { width, height }
              );
            }}
          >
            WordDomain
          </Text>
        </View>
        <View style={[styles.progressSection, { marginTop: Spacing.lg }]}>
          <View style={[styles.progressTrack, { width: barWidth, height: barHeight, borderRadius: barHeight / 2 }]}>
            <Animated.View style={[styles.progressFill, { width: progressWidth, borderRadius: barHeight / 2, height: barHeight }]}>
              <LinearGradient
                colors={['#FFFFFF', 'rgba(255,255,255,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  contentBlock: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  brandSection: {
    alignItems: 'center',
  },
  progressSection: {
    alignItems: 'center',
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    overflow: 'hidden',
  },
  title: {
    ...Fonts.title,
    fontSize: 40,
    color: '#000000',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
