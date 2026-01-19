import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { Category } from '../services/progressStorage';
import { getUnlockedPuzzles, getMedalsForCategory, isPuzzleUnlocked } from '../services/fogOfWarProgressStorage';
import { getPuzzlesForCategory } from '../services/puzzleLoader';
import { PuzzleData } from '../core/types';
import Card from '../components/Card';
import MedalIcon from '../components/MedalIcon';
import { Colors, Spacing, Radius, Fonts } from '../src/styles/theme';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

interface FogOfWarCategoryScreenProps {
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

export default function FogOfWarCategoryScreen({ category, onSelectPuzzle, onBack }: FogOfWarCategoryScreenProps) {
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [unlockedPuzzles, setUnlockedPuzzles] = useState<number[]>([]);
  const [medals, setMedals] = useState<{ [key: string]: 'gold' | 'silver' | 'bronze' }>({});
  const scaleAnims = useRef<{ [key: number]: Animated.Value }>({}).current;

  useEffect(() => {
    loadCategoryData();
  }, [category]);

  const loadCategoryData = async () => {
    try {
      const [puzzleList, unlocked, categoryMedals] = await Promise.all([
        getPuzzlesForCategory(category),
        getUnlockedPuzzles(),
        getMedalsForCategory(category),
      ]);

      // Limit to 5 puzzles for now (as requested)
      const limitedPuzzles = puzzleList.slice(0, 5);
      setPuzzles(limitedPuzzles);
      setUnlockedPuzzles(unlocked[category] || [1]); // At least puzzle 1 is unlocked
      setMedals(categoryMedals);
    } catch (error) {
      console.error(`Error loading category ${category}:`, error);
    }
  };

  const getMedal = (puzzleId: number): 'gold' | 'silver' | 'bronze' | null => {
    const key = `fog-${category}-${puzzleId}`;
    return medals[key] || null;
  };

  const getCompletedCount = (): number => {
    return Object.keys(medals).length;
  };

  const getProgressPercentage = (): number => {
    if (puzzles.length === 0) return 0;
    return (getCompletedCount() / puzzles.length) * 100;
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

  const renderPuzzleCard = ({ item, index }: { item: PuzzleData; index: number }) => {
    const puzzleId = index + 1;
    const isUnlocked = unlockedPuzzles.includes(puzzleId);
    const medal = getMedal(puzzleId);

    if (!scaleAnims[puzzleId]) {
      scaleAnims[puzzleId] = new Animated.Value(1);
    }

    const screenWidth = Dimensions.get('window').width;
    const cardSize = (screenWidth - Spacing.md * 2 - Spacing.md * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

    return (
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnims[puzzleId] }],
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
                backgroundColor: Colors.fogGrey,
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
                {medal && (
                  <View style={styles.medalContainer}>
                    <MedalIcon type={medal} size={24} />
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

  const completedCount = getCompletedCount();
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
        
        <View style={styles.headerBottom}>
          <Text style={styles.subtitle}>
            {puzzles.length} puzzles available · {completedCount} completed
          </Text>
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
        data={puzzles}
        renderItem={renderPuzzleCard}
        keyExtractor={(item, index) => `puzzle-${index + 1}`}
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
    color: Colors.surfaceDark,
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
    color: Colors.textPrimary,
  },
  medalContainer: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
});

