import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Category } from '../services/progressStorage';
import { getMedalsForCategory } from '../services/fogOfWarProgressStorage';
import { getCategories, getPuzzleCount } from '../services/puzzleLoader';
import Card from '../components/Card';
import PillBadge from '../components/PillBadge';
import WordDomainLogo from '../components/WordDomainLogo';
import { Colors, Spacing, Radius, Fonts } from '../src/styles/theme';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

interface FogOfWarSelectScreenProps {
  onSelectCategory: (category: Category) => void;
  onGenerateCustom: () => void;
  onBack?: () => void;
}

interface CategoryProgress {
  [category: string]: { completed: number; total: number };
}

const CATEGORY_SUBTITLES: { [key in Category]: string } = {
  '4x4': 'Mini Domain',
  '5x5': 'Classic Domain',
  '6x6': 'Grand Domain',
  '7x7': 'Master Domain',
  '8x8': 'Legend Domain',
};

export default function FogOfWarSelectScreen({ onSelectCategory, onGenerateCustom, onBack }: FogOfWarSelectScreenProps) {
  const [categories, setCategories] = useState<Category[]>(['4x4', '5x5', '6x6', '7x7', '8x8']); // Default categories for immediate render
  const [progress, setProgress] = useState<CategoryProgress>({});
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start at 0 for fade animation
  const slideAnim = useRef(new Animated.Value(30)).current; // Start at 30 for slide animation

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      loadProgress();
    }
  }, [categories]);

  useEffect(() => {
    // Fade and slide animation on mount
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
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      // Only update if categories actually changed (to avoid unnecessary re-renders)
      if (cats.length > 0 && JSON.stringify(cats) !== JSON.stringify(categories)) {
        setCategories(cats);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Keep default categories on error
    }
  };

  const loadProgress = async () => {
    const progressData: CategoryProgress = {};

    for (const category of categories) {
      try {
        const total = await getPuzzleCount(category);
        const medals = await getMedalsForCategory(category);
        const completed = Object.keys(medals).length;
        progressData[category] = { completed, total };
      } catch (error) {
        console.error(`Error loading progress for ${category}:`, error);
        progressData[category] = { completed: 0, total: 0 };
      }
    }

    setProgress(progressData);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Top Brand Header */}
        <View style={styles.brandHeader}>
          {onBack && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onBack();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={styles.logoWrapper}>
            <WordDomainLogo size={40} />
          </View>
          <Text style={styles.brandTitle}>Fog of War</Text>
        </View>

        {/* Puzzle Size Cards */}
        <View style={styles.cardsContainer}>
          {categories.map((cat, index) => {
            const catProgress = progress[cat] || { completed: 0, total: 0 };
            return (
              <Animated.View
                key={cat}
                style={[
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 30],
                          outputRange: [0, 30 + index * 10],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    audioManager.playSound(SoundCategory.UI);
                    onSelectCategory(cat);
                  }}
                  activeOpacity={0.9}
                >
                  <Card style={[styles.categoryCard, { backgroundColor: Colors.fogGrey }]} padding="md">
                    <View style={styles.categoryCardContent}>
                      <View style={styles.categoryCardLeft}>
                        <Text style={styles.categoryCardTitle}>{cat}</Text>
                        <Text style={styles.categoryCardSubtitle}>
                          {CATEGORY_SUBTITLES[cat]}
                        </Text>
                      </View>
                      <View style={styles.categoryCardRight}>
                        <PillBadge
                          text={`${catProgress.completed}/${catProgress.total}`}
                          borderColor="surfaceDark"
                        />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Custom Puzzle Card */}
        <Animated.View
          style={[
            styles.customCardWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity 
            onPress={() => {
              audioManager.playSound(SoundCategory.UI);
              onGenerateCustom();
            }} 
            activeOpacity={0.9}
          >
            <Card style={[styles.customCard, { backgroundColor: Colors.fogGrey }]} padding="md">
              <View style={styles.customCardContent}>
                <Text style={styles.customCardIcon}>🎲</Text>
                <View style={styles.customCardText}>
                  <Text style={styles.customCardTitle}>Custom Puzzle</Text>
                  <Text style={styles.customCardSubtitle}>
                    Generate a random board of any size
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Fonts.body,
    color: Colors.textSecondary,
  },
  animatedContainer: {
    width: '100%',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  backButtonText: {
    fontSize: 32,
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  logoWrapper: {
    marginRight: Spacing.md,
  },
  brandTitle: {
    ...Fonts.title,
    color: Colors.textPrimary,
  },
  cardsContainer: {
    marginBottom: Spacing.md,
  },
  categoryCard: {
    marginBottom: Spacing.md,
  },
  categoryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCardLeft: {
    flex: 1,
  },
  categoryCardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  categoryCardSubtitle: {
    ...Fonts.small,
    color: Colors.textSecondary,
  },
  categoryCardRight: {
    marginLeft: Spacing.md,
  },
  customCardWrapper: {
    marginTop: Spacing.md,
  },
  customCard: {
    // Bottom floating card
  },
  customCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customCardIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  customCardText: {
    flex: 1,
  },
  customCardTitle: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  customCardSubtitle: {
    ...Fonts.small,
    color: Colors.textSecondary,
  },
});

