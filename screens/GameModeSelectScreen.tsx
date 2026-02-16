import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, Fonts } from '../src/styles/theme';
import WordDomainLogo from '../components/WordDomainLogo';
import TokenIcon from '../components/TokenIcon';
import ProgressRing from '../components/ProgressRing';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';
import { USERNAME_MAX_LENGTH } from '../services/userProfile';
import { getTokenBalance } from '../services/tokenStorage';
import { getCategories } from '../services/puzzleLoader';
import { Category } from '../services/progressStorage';
import * as classicProgress from '../services/progressStorage';
import * as fogProgress from '../services/fogOfWarProgressStorage';
import * as blackoutProgress from '../services/blackoutProgressStorage';
import { getPuzzleCount } from '../services/puzzleLoader';
import { getBlackoutPuzzleCount } from '../services/blackoutPuzzleCache';

interface GameModeSelectScreenProps {
  onSelectClassic: () => void;
  onSelectFogOfWar: () => void;
  onSelectBlackout: () => void;
  username: string;
  onUpdateUsername: (next: string) => Promise<{ value: string; error: string | null }>;
  onOpenStats: () => void;
}

export default function GameModeSelectScreen({
  onSelectClassic,
  onSelectFogOfWar,
  onSelectBlackout,
  username,
  onUpdateUsername,
  onOpenStats,
}: GameModeSelectScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showEditUsernameModal, setShowEditUsernameModal] = useState(false);
  const [editUsernameText, setEditUsernameText] = useState(username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [classicPercent, setClassicPercent] = useState(0);
  const [fogPercent, setFogPercent] = useState(0);
  const [blackoutPercent, setBlackoutPercent] = useState(0);
  const [dailyPercent, setDailyPercent] = useState(0);

  const loadTokenBalance = useCallback(async () => {
    const balance = await getTokenBalance();
    setTokenBalance(balance);
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const categories: Category[] = await getCategories();
      if (categories.length === 0) return;

      let classicCompleted = 0;
      let classicTotal = 0;
      let fogCompleted = 0;
      let fogTotal = 0;
      let blackoutCompleted = 0;
      let blackoutTotal = 0;

      for (const c of categories) {
        const [classicMedals, fogMedals, blackoutTrophies, classicCount, fogCount, blackoutCount] = await Promise.all([
          classicProgress.getMedalsForCategory(c),
          fogProgress.getMedalsForCategory(c),
          blackoutProgress.getTrophiesForCategory(c),
          getPuzzleCount(c),
          getPuzzleCount(c),
          getBlackoutPuzzleCount(c),
        ]);
        classicCompleted += Object.keys(classicMedals).length;
        classicTotal += classicCount;
        fogCompleted += Object.keys(fogMedals).length;
        fogTotal += fogCount;
        blackoutCompleted += Object.keys(blackoutTrophies).length;
        blackoutTotal += blackoutCount;
      }

      setClassicPercent(classicTotal > 0 ? Math.round((classicCompleted / classicTotal) * 100) : 0);
      setFogPercent(fogTotal > 0 ? Math.round((fogCompleted / fogTotal) * 100) : 0);
      setBlackoutPercent(blackoutTotal > 0 ? Math.round((blackoutCompleted / blackoutTotal) * 100) : 0);
      // Daily: 0 or 100% (1 per day); no storage yet so always 0
      setDailyPercent(0);
    } catch (e) {
      // keep defaults 0
    }
  }, []);

  useEffect(() => {
    loadTokenBalance();
    loadProgress();
  }, [loadTokenBalance, loadProgress]);

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

  useEffect(() => {
    // Keep edit modal prefill in sync with persisted name
    setEditUsernameText(username);
  }, [username]);

  const openEditUsername = () => {
    setUsernameError(null);
    setEditUsernameText(username);
    setShowEditUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    setUsernameError(null);
    const result = await onUpdateUsername(editUsernameText);
    if (result.error) {
      setUsernameError(result.error);
      return;
    }
    setShowEditUsernameModal(false);
    setShowProfilePopover(false);
  };

  return (
    <View style={styles.root}>
      {/* Top row: coins left, profile + settings right */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TokenIcon size={28} count={tokenBalance} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              audioManager.playSound(SoundCategory.UI);
              setShowProfilePopover(true);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
          >
            <Text style={styles.profileButtonEmoji}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              audioManager.playSound(SoundCategory.UI);
              setShowComingSoonModal(true);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.settingsButtonEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Centered WordDomain logo + title (original font size) */}
      <View style={styles.brandCenter}>
        <WordDomainLogo size={80} />
        <Text style={styles.gameTitle}>WordDomain</Text>
      </View>

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
          {/* Game Mode Cards */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.classicButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectClassic();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardInner}>
                <View style={styles.ringWrap}>
                  <ProgressRing
                    size={52}
                    strokeWidth={8}
                    percent={classicPercent}
                    trackColor="#EDE0CC"
                    progressColor="#F5F0E8"
                  >
                    <Text style={styles.circlePercentText}>{classicPercent}</Text>
                  </ProgressRing>
                </View>
                <View style={styles.cardCenter}>
                  <Text style={styles.modeButtonText}>Classic</Text>
                  <Text style={styles.modeSubtext}>{classicPercent}% Complete</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fogButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectFogOfWar();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardInner}>
                <View style={styles.ringWrap}>
                  <ProgressRing
                    size={52}
                    strokeWidth={8}
                    percent={fogPercent}
                    trackColor="#D4D4D4"
                    progressColor="#EEEEEE"
                  >
                    <Text style={styles.circlePercentText}>{fogPercent}</Text>
                  </ProgressRing>
                </View>
                <View style={styles.cardCenter}>
                  <Text style={styles.modeButtonText}>Fog of War</Text>
                  <Text style={styles.modeSubtext}>{fogPercent}% Complete</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.blackoutButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectBlackout();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardInner}>
                <View style={styles.ringWrap}>
                  <ProgressRing
                    size={52}
                    strokeWidth={8}
                    percent={blackoutPercent}
                    trackColor="#6B6B6B"
                    progressColor="rgba(255,255,255,0.6)"
                  >
                    <Text style={styles.circlePercentTextLight}>{blackoutPercent}</Text>
                  </ProgressRing>
                </View>
                <View style={styles.cardCenter}>
                  <Text style={styles.blackoutButtonText}>Blackout</Text>
                  <Text style={styles.modeSubtextLight}>{blackoutPercent}% Complete</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dailyButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                setShowComingSoonModal(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardInner}>
                <View style={styles.ringWrap}>
                  <ProgressRing
                    size={52}
                    strokeWidth={8}
                    percent={dailyPercent}
                    trackColor="#8FB3F5"
                    progressColor="#B8D0FF"
                  >
                    <Text style={styles.circlePercentText}>{dailyPercent}</Text>
                  </ProgressRing>
                </View>
                <View style={styles.cardCenter}>
                  <Text style={styles.modeButtonText}>Daily Puzzle</Text>
                  <Text style={styles.modeSubtext}>{dailyPercent}% Complete</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Coming Soon Modal */}
        <Modal
          visible={showComingSoonModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowComingSoonModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Feature Coming Soon!</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  audioManager.playSound(SoundCategory.UI);
                  setShowComingSoonModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Profile popover */}
      <Modal
        visible={showProfilePopover}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfilePopover(false)}
      >
        <View style={styles.popoverRoot}>
          <Pressable style={styles.popoverBackdrop} onPress={() => setShowProfilePopover(false)} />
          <View style={styles.popoverCard} accessibilityRole="menu">
            <View style={styles.popoverHeader}>
              <Text style={styles.popoverBigEmoji} accessibilityLabel="Profile">
                👤
              </Text>
              <TouchableOpacity
                onPress={openEditUsername}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit username"
              >
                <Text style={styles.popoverUsername}>{username}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.popoverDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                setShowProfilePopover(false);
                onOpenStats();
              }}
              activeOpacity={0.7}
              accessibilityRole="menuitem"
              accessibilityLabel="Open stats"
            >
              <Text style={styles.menuRowText}>Stats</Text>
              <Text style={styles.menuRowChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Username Modal */}
      <Modal
        visible={showEditUsernameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Edit Username</Text>
              <TextInput
                value={editUsernameText}
                onChangeText={(t) => {
                  setEditUsernameText(t);
                  if (usernameError) setUsernameError(null);
                }}
                placeholder="Enter username"
                placeholderTextColor={Colors.textSecondary}
                style={styles.usernameInput}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={USERNAME_MAX_LENGTH + 5}
                returnKeyType="done"
                onSubmitEditing={handleSaveUsername}
                accessibilityLabel="Username"
              />
              <Text style={styles.inputHint}>Max {USERNAME_MAX_LENGTH} characters.</Text>
              {usernameError ? <Text style={styles.inputError}>{usernameError}</Text> : null}

              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={() => {
                    setUsernameError(null);
                    setShowEditUsernameModal(false);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel username edit"
                >
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editSaveButton}
                  onPress={handleSaveUsername}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Save username"
                >
                  <Text style={styles.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonEmoji: {
    fontSize: 22,
  },
  settingsButtonEmoji: {
    fontSize: 20,
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  gameTitle: {
    ...Fonts.title,
    fontSize: 40,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  animatedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  ringWrap: {
    marginRight: Spacing.md,
  },
  circlePercentText: {
    ...Fonts.small,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  circlePercentTextLight: {
    ...Fonts.small,
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  cardCenter: {
    flex: 1,
  },
  modeButtonText: {
    ...Fonts.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeSubtext: {
    ...Fonts.small,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modeSubtextLight: {
    ...Fonts.small,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  blackoutButtonText: {
    ...Fonts.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  classicButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    minHeight: 60,
  },
  fogButton: {
    backgroundColor: Colors.fogGrey,
    borderRadius: Radius.lg,
    minHeight: 60,
  },
  blackoutButton: {
    backgroundColor: Colors.blackout,
    borderRadius: Radius.lg,
    minHeight: 60,
  },
  dailyButton: {
    backgroundColor: Colors.accentSecondary,
    borderRadius: Radius.lg,
    minHeight: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    ...Fonts.title,
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  popoverRoot: {
    flex: 1,
  },
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  popoverCard: {
    position: 'absolute',
    top: Spacing.xl + Spacing.sm + 44 + Spacing.sm,
    right: Spacing.md,
    width: Math.min(Dimensions.get('window').width * 0.78, 320),
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  popoverHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  popoverBigEmoji: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  popoverUsername: {
    ...Fonts.subtitle,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  popoverDivider: {
    height: 1,
    backgroundColor: 'rgba(90, 59, 37, 0.2)',
    marginVertical: Spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.tileBackground,
    marginBottom: Spacing.sm,
  },
  menuRowText: {
    ...Fonts.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuRowChevron: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '700',
  },

  editModalContent: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: Dimensions.get('window').width * 0.88,
    maxWidth: 420,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  editModalTitle: {
    ...Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  usernameInput: {
    backgroundColor: Colors.tileBackground,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.tileBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputHint: {
    ...Fonts.small,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    textAlign: 'left',
  },
  inputError: {
    ...Fonts.small,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: Colors.tileBackground,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.tileBorder,
  },
  editCancelText: {
    ...Fonts.subtitle,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  editSaveText: {
    ...Fonts.subtitle,
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
});

