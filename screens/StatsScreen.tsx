import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Card from '../components/Card';
import { Colors, Spacing, Fonts, Radius } from '../src/styles/theme';
import { Category } from '../services/progressStorage';
import { getCategories } from '../services/puzzleLoader';
import * as classicProgress from '../services/progressStorage';
import * as fogProgress from '../services/fogOfWarProgressStorage';
import * as blackoutProgress from '../services/blackoutProgressStorage';

type MedalCounts = { gold: number; silver: number; bronze: number; total: number };

function countMedals(medalsByKey: Record<string, classicProgress.Medal>): MedalCounts {
  const counts: MedalCounts = { gold: 0, silver: 0, bronze: 0, total: 0 };
  for (const key of Object.keys(medalsByKey)) {
    const medal = medalsByKey[key];
    if (medal === 'gold') counts.gold += 1;
    if (medal === 'silver') counts.silver += 1;
    if (medal === 'bronze') counts.bronze += 1;
    counts.total += 1;
  }
  return counts;
}

function sumMedalCounts(a: MedalCounts, b: MedalCounts): MedalCounts {
  return {
    gold: a.gold + b.gold,
    silver: a.silver + b.silver,
    bronze: a.bronze + b.bronze,
    total: a.total + b.total,
  };
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

interface StatsScreenProps {
  username: string;
  onBack: () => void;
}

export default function StatsScreen({ username, onBack }: StatsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>(['4x4', '5x5', '6x6', '7x7', '8x8']);

  const [classicMedals, setClassicMedals] = useState<MedalCounts>({ gold: 0, silver: 0, bronze: 0, total: 0 });
  const [fogMedals, setFogMedals] = useState<MedalCounts>({ gold: 0, silver: 0, bronze: 0, total: 0 });
  const [blackoutCompletions, setBlackoutCompletions] = useState<number>(0);

  const [classicUnlocked, setClassicUnlocked] = useState<number>(0);
  const [fogUnlocked, setFogUnlocked] = useState<number>(0);
  const [blackoutUnlocked, setBlackoutUnlocked] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const cats = await getCategories();
        if (cats.length > 0) setCategories(cats);
      } catch (e) {
        // ignore; keep defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        // Classic medals + unlocked
        let classicAll: Record<string, classicProgress.Medal> = {};
        for (const c of categories) {
          const medals = await classicProgress.getMedalsForCategory(c);
          classicAll = { ...classicAll, ...medals };
        }
        setClassicMedals(countMedals(classicAll));

        const classicUnlockedMap = await classicProgress.getUnlockedPuzzles();
        setClassicUnlocked(Object.values(classicUnlockedMap).reduce((acc, ids) => acc + (ids?.length ?? 0), 0));

        // Fog medals + unlocked
        let fogAll: Record<string, classicProgress.Medal> = {};
        for (const c of categories) {
          const medals = await fogProgress.getMedalsForCategory(c);
          fogAll = { ...fogAll, ...medals };
        }
        setFogMedals(countMedals(fogAll));

        const fogUnlockedMap = await fogProgress.getUnlockedPuzzles();
        setFogUnlocked(Object.values(fogUnlockedMap).reduce((acc, ids) => acc + (ids?.length ?? 0), 0));

        // Blackout trophies + unlocked
        let trophiesTotal = 0;
        for (const c of categories) {
          const trophies = await blackoutProgress.getTrophiesForCategory(c);
          trophiesTotal += Object.keys(trophies).length;
        }
        setBlackoutCompletions(trophiesTotal);

        const blackoutUnlockedMap = await blackoutProgress.getUnlockedPuzzles();
        setBlackoutUnlocked(Object.values(blackoutUnlockedMap).reduce((acc, ids) => acc + (ids?.length ?? 0), 0));
      } catch (e) {
        // If anything fails, keep partial values (defaults are 0)
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [categories]);

  const overallMedals = useMemo(() => sumMedalCounts(classicMedals, fogMedals), [classicMedals, fogMedals]);
  const totalCompleted = useMemo(
    () => overallMedals.total + blackoutCompletions,
    [overallMedals.total, blackoutCompletions]
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.chevron}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>👤</Text>
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityLabel={`Username ${username}`}>
            {username}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading stats…</Text>
          </View>
        ) : (
          <>
            <Card style={styles.sectionCard} padding="lg">
              <Text style={styles.sectionTitle}>Overall</Text>
              <StatRow label="Total puzzles completed" value={totalCompleted} />
              <StatRow label="Gold medals" value={overallMedals.gold} />
              <StatRow label="Silver medals" value={overallMedals.silver} />
              <StatRow label="Bronze medals" value={overallMedals.bronze} />
              <View style={styles.sectionDivider} />
              <StatRow label="Total puzzles unlocked" value={classicUnlocked + fogUnlocked + blackoutUnlocked} />
            </Card>

            <Card style={styles.sectionCard} padding="lg">
              <Text style={styles.sectionTitle}>By Game Mode</Text>

              <View style={styles.modeBlock}>
                <Text style={styles.modeTitle}>Classic</Text>
                <StatRow label="Puzzles completed" value={classicMedals.total} />
                <View style={styles.inline3}>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Gold</Text>
                    <Text style={styles.inlineValue}>{classicMedals.gold}</Text>
                  </View>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Silver</Text>
                    <Text style={styles.inlineValue}>{classicMedals.silver}</Text>
                  </View>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Bronze</Text>
                    <Text style={styles.inlineValue}>{classicMedals.bronze}</Text>
                  </View>
                </View>
                <StatRow label="Puzzles unlocked" value={classicUnlocked} />
              </View>

              <View style={styles.modeDivider} />

              <View style={styles.modeBlock}>
                <Text style={styles.modeTitle}>Fog of War</Text>
                <StatRow label="Puzzles completed" value={fogMedals.total} />
                <View style={styles.inline3}>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Gold</Text>
                    <Text style={styles.inlineValue}>{fogMedals.gold}</Text>
                  </View>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Silver</Text>
                    <Text style={styles.inlineValue}>{fogMedals.silver}</Text>
                  </View>
                  <View style={styles.inlineItem}>
                    <Text style={styles.inlineLabel}>Bronze</Text>
                    <Text style={styles.inlineValue}>{fogMedals.bronze}</Text>
                  </View>
                </View>
                <StatRow label="Puzzles unlocked" value={fogUnlocked} />
              </View>

              <View style={styles.modeDivider} />

              <View style={styles.modeBlock}>
                <Text style={styles.modeTitle}>Blackout</Text>
                <StatRow label="Puzzles completed" value={blackoutCompletions} />
                <StatRow label="Puzzles unlocked" value={blackoutUnlocked} />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  headerTitle: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Fonts.body,
    color: Colors.textPrimary,
  },
  sectionCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: Radius.lg,
  },
  sectionTitle: {
    ...Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  rowLabel: {
    ...Fonts.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  rowValue: {
    ...Fonts.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(90, 59, 37, 0.2)',
    marginVertical: Spacing.md,
  },
  modeBlock: {
    width: '100%',
    backgroundColor: Colors.tileBackground,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  modeTitle: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modeDivider: {
    height: Spacing.sm,
  },
  inline3: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inlineItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  inlineLabel: {
    ...Fonts.small,
    color: Colors.textSecondary,
  },
  inlineValue: {
    ...Fonts.subtitle,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 2,
  },
});

