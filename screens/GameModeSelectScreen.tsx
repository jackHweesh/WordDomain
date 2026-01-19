import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Fonts } from '../src/styles/theme';
import WordDomainLogo from '../components/WordDomainLogo';
import { audioManager } from '../services/audioManager';
import { SoundCategory } from '../services/audioManager';

interface GameModeSelectScreenProps {
  onSelectClassic: () => void;
  onSelectFogOfWar: () => void;
  onSelectBlackout: () => void;
}

export default function GameModeSelectScreen({ onSelectClassic, onSelectFogOfWar, onSelectBlackout }: GameModeSelectScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

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
        {/* Logo and Title */}
        <View style={styles.logoContainer}>
          <WordDomainLogo size={80} />
          <Text style={styles.gameTitle}>WordDomain</Text>
        </View>

        {/* Game Mode Buttons */}
        <View style={styles.buttonsContainer}>
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + 0 * 10],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.classicButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectClassic();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeButtonText}>Classic</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + 1 * 10],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fogButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectFogOfWar();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeButtonText}>Fog of War</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + 2 * 10],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.blackoutButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                onSelectBlackout();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.blackoutButtonText}>Blackout</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 30],
                      outputRange: [0, 30 + 3 * 10],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dailyButton}
              onPress={() => {
                audioManager.playSound(SoundCategory.UI);
                setShowComingSoonModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeButtonText}>Daily Puzzle</Text>
            </TouchableOpacity>
          </Animated.View>
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
              onPress={() => setShowComingSoonModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: Spacing.xl * 2,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  animatedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  gameTitle: {
    ...Fonts.title,
    fontSize: 40,
    color: Colors.textPrimary,
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  classicButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  fogButton: {
    backgroundColor: Colors.fogGrey,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  blackoutButton: {
    backgroundColor: Colors.blackout,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  dailyButton: {
    backgroundColor: Colors.accentSecondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  modeButtonText: {
    ...Fonts.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  blackoutButtonText: {
    ...Fonts.subtitle,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
});

