import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
  InteractionManager,
} from 'react-native';
import { Category } from '../services/progressStorage';
import { getUnlockedPuzzles, getTrophiesForCategory, isPuzzleUnlocked } from '../services/blackoutProgressStorage';
import { getBlackoutPuzzleCount } from '../services/blackoutPuzzleCache';
import Card from '../components/Card';
import TrophyIcon from '../components/TrophyIcon';
import { Colors, Spacing, Radius, Fonts } from '../src/styles/theme';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

interface BlackoutCategoryScreenProps {
  category: Category;
  onSelectPuzzle: (category: Category, puzzleId: number) => void;
  onBack: () => void;
}

const CATEGORY_TITLES: { [key in Category]: string } = {
  '4x4': '4×4 Domain',
  '5x5': '5×5 Domain',
  '6x6': '6×6 Domain',
  '7x7': '7×7 Domain',
  '8x8': '8×8 Domain',
};

const NUM_COLUMNS = 3;

export default function BlackoutCategoryScreen({ category, onSelectPuzzle, onBack }: BlackoutCategoryScreenProps) {
  // Only need puzzle IDs for this screen (render uses index/id), not full PuzzleData.
  const [puzzleIds, setPuzzleIds] = useState<number[]>([1, 2, 3, 4, 5]); // optimistic default for instant render
  const [unlockedPuzzles, setUnlockedPuzzles] = useState<number[]>([1]); // puzzle 1 is always unlocked
  const [trophies, setTrophies] = useState<{ [key: string]: boolean }>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnims = useRef<{ [key: number]: Animated.Value }>({}).current;
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    loadCategoryData();
  }, [category]);

  useEffect(() => {
    // Run fade only once the list exists, and after interactions to avoid jank.
    if (puzzleIds.length === 0) return;

    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (task as any)?.cancel?.();
    };
  }, [category, puzzleIds.length, fadeAnim, slideAnim]);

  const loadCategoryData = async () => {
    const requestId = (loadRequestIdRef.current += 1);
    try {
      // Keep grid responsive: determine how many puzzle IDs to show first.
      const count = await getBlackoutPuzzleCount(category);
      if (requestId !== loadRequestIdRef.current) return;
      const maxToShow = Math.min(count || 5, 5);
      setPuzzleIds(Array.from({ length: maxToShow }, (_, i) => i + 1));

      // Load unlock/trophy progress in the background; update when ready.
      Promise.all([getUnlockedPuzzles(), getTrophiesForCategory(category)])
        .then(([unlocked, categoryTrophies]) => {
          if (requestId !== loadRequestIdRef.current) return;
          setUnlockedPuzzles(unlocked[category] || [1]);
          setTrophies(categoryTrophies);
        })
        .catch((error) => {
          console.error(`Error loading Blackout progress for category ${category}:`, error);
        });
    } catch (error) {
      console.error(`Error loading category ${category}:`, error);
    }
  };

  const hasTrophy = (puzzleId: number): boolean => {
    const key = `blackout-${category}-${puzzleId}`;
    return trophies[key] || false;
  };

  const getCompletedCount = (): number => {
    return Object.keys(trophies).length;
  };

  const getProgressPercentage = (): number => {
    if (puzzleIds.length === 0) return 0;
    return (getCompletedCount() / puzzleIds.length) * 100;
  };

  const handlePuzzlePress = async (puzzleId: number) => {
    const unlocked = await isPuzzleUnlocked(category, puzzleId);
    if (!unlocked) return;

    // Play UI interaction sound
    audioManager.playSound(SoundCategory.UI);

    // Scale animation
    if (!scaleAnims[puzzleId]) {
      scaleAnims[puzzleId] = new Animated.Value(1);
    }
    const scaleAnim = scaleAnims[puzzleId];

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSelectPuzzle(category, puzzleId);
    });
  };

  const renderPuzzleCard = ({ item, index }: { item: number; index: number }) => {
    const puzzleId = item;
    const isUnlocked = unlockedPuzzles.includes(puzzleId);
    const trophy = hasTrophy(puzzleId);

    if (!scaleAnims[puzzleId]) {
      scaleAnims[puzzleId] = new Animated.Value(1);
    }

    const screenWidth = Dimensions.get('window').width;
    const cardSize = (screenWidth - Spacing.md * 2 - Spacing.md * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
    const rowIndex = Math.floor(index / NUM_COLUMNS);
    const stagger = Math.min(rowIndex, 6) * 8;

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 30 + stagger],
                }),
              },
              { scale: scaleAnims[puzzleId] },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handlePuzzlePress(puzzleId)}
          disabled={!isUnlocked}
          activeOpacity={0.9}
          style={{ position: 'relative' }}
        >
          <Card
            style={[
              styles.puzzleCard,
              {
                width: cardSize,
                aspectRatio: 1,
                backgroundColor: Colors.blackout,
              },
              !isUnlocked ? styles.puzzleCardLocked : undefined,
            ]}
            padding="md"
          >
            {!isUnlocked ? (
              <View style={styles.lockedContent} />
            ) : (
              <>
                <Text style={styles.puzzleNumber}>{puzzleId}</Text>
                {trophy && (
                  <View style={styles.trophyContainer}>
                    <TrophyIcon size={24} />
                  </View>
                )}
              </>
            )}
          </Card>
          {!isUnlocked && (
            <View style={[styles.lockIconContainer, { width: cardSize, aspectRatio: 1 }]}>
              <View style={styles.lockIcon}>
                <View style={styles.lockBody} />
                <View style={styles.lockShackle} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const progressPercentage = getProgressPercentage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              audioManager.playSound(SoundCategory.UI);
              onBack();
            }} 
            activeOpacity={0.7}
          >
            <Text style={styles.chevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{CATEGORY_TITLES[category]}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Puzzle Grid */}
      <FlatList
        data={puzzleIds}
        renderItem={renderPuzzleCard}
        keyExtractor={(puzzleId) => `puzzle-${puzzleId}`}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Spacing.xl + Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 32,
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  title: {
    ...Fonts.title,
    fontSize: 24,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerBottom: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Fonts.small,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    marginTop: Spacing.sm,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: Colors.tileBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  gridContainer: {
    padding: Spacing.md,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  puzzleCard: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  puzzleCardLocked: {
    opacity: 0.5,
    backgroundColor: Colors.tileBackground,
  },
  lockedContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  lockIcon: {
    width: 32,
    height: 32,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBody: {
    width: 20,
    height: 16,
    backgroundColor: '#000000',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  lockShackle: {
    width: 16,
    height: 16,
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 8,
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
  },
  puzzleNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trophyContainer: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
});

