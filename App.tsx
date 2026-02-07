import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaView, StyleSheet } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import PuzzleScreen from './screens/PuzzleScreen';
import PuzzleSelectScreen from './screens/PuzzleSelectScreen';
import CategoryPuzzleScreen from './screens/CategoryPuzzleScreen';
import GameModeSelectScreen from './screens/GameModeSelectScreen';
import FogOfWarSelectScreen from './screens/FogOfWarSelectScreen';
import FogOfWarCategoryScreen from './screens/FogOfWarCategoryScreen';
import FogOfWarPuzzleScreen from './screens/FogOfWarPuzzleScreen';
import BlackoutSelectScreen from './screens/BlackoutSelectScreen';
import BlackoutCategoryScreen from './screens/BlackoutCategoryScreen';
import BlackoutPuzzleScreen from './screens/BlackoutPuzzleScreen';
import { Category } from './services/progressStorage';
import { audioManager } from './services/audioManager';
import StatsScreen from './screens/StatsScreen';
import { getUsername as loadUsername, setUsername as persistUsername } from './services/userProfile';

type Screen =
  | 'home'
  | 'select'
  | 'category'
  | 'puzzle'
  | 'custom'
  | 'fogSelect'
  | 'fogCategory'
  | 'fogPuzzle'
  | 'fogCustom'
  | 'blackoutSelect'
  | 'blackoutCategory'
  | 'blackoutPuzzle'
  | 'blackoutCustom'
  | 'stats';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<number | undefined>();
  const [username, setUsername] = useState<string>('Player');

  const hideNavBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkNavBarIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio system (completely optional - app works fine without it)
  useEffect(() => {
    // Wrap in try-catch to prevent any initialization errors from crashing the app
    const initAudio = async () => {
      try {
        await audioManager.initialize();
      } catch (error) {
        // Silently fail - audio is optional
      }
    };
    
    initAudio();

    return () => {
      // Cleanup audio on unmount
      const cleanupAudio = async () => {
        try {
          await audioManager.cleanup();
        } catch (error) {
          // Silently fail
        }
      };
      cleanupAudio();
    };
  }, []);

  // Load username once (persisted)
  useEffect(() => {
    const load = async () => {
      const name = await loadUsername();
      setUsername(name);
    };
    load();
  }, []);

  // Force status bar to always be black
  useEffect(() => {
    StatusBar.setBarStyle('dark-content', false);
  }, [currentScreen]);

  // Configure navigation bar for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set navigation bar to immersive mode (hidden by default, shows on swipe)
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      
      // Poll to check if navigation bar becomes visible (when user swipes up)
      // When visible, hide it after 3 seconds
      checkNavBarIntervalRef.current = setInterval(async () => {
        try {
          const visibility = await NavigationBar.getVisibilityAsync();
          if (visibility === 'visible') {
            // Clear existing timeout
            if (hideNavBarTimeoutRef.current) {
              clearTimeout(hideNavBarTimeoutRef.current);
            }
            // Hide navigation bar after 3 seconds
            hideNavBarTimeoutRef.current = setTimeout(() => {
              NavigationBar.setVisibilityAsync('hidden');
              hideNavBarTimeoutRef.current = null;
            }, 3000);
          }
        } catch (error) {
          // Ignore errors
        }
      }, 100); // Check every 100ms
    }

    return () => {
      if (hideNavBarTimeoutRef.current) {
        clearTimeout(hideNavBarTimeoutRef.current);
      }
      if (checkNavBarIntervalRef.current) {
        clearInterval(checkNavBarIntervalRef.current);
      }
    };
  }, []);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('category');
  };

  const handleSelectPuzzle = (category: Category, puzzleId: number) => {
    setSelectedCategory(category);
    setSelectedPuzzleId(puzzleId);
    setCurrentScreen('puzzle');
  };

  const handleGenerateCustom = () => {
    setSelectedCategory(undefined);
    setSelectedPuzzleId(undefined);
    setCurrentScreen('custom');
  };

  const handleSelectFogCategory = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('fogCategory');
  };

  const handleSelectFogPuzzle = (category: Category, puzzleId: number) => {
    setSelectedCategory(category);
    setSelectedPuzzleId(puzzleId);
    setCurrentScreen('fogPuzzle');
  };

  const handleGenerateFogCustom = () => {
    setSelectedCategory(undefined);
    setSelectedPuzzleId(undefined);
    setCurrentScreen('fogCustom');
  };

  const handleSelectBlackoutCategory = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('blackoutCategory');
  };

  const handleSelectBlackoutPuzzle = (category: Category, puzzleId: number) => {
    setSelectedCategory(category);
    setSelectedPuzzleId(puzzleId);
    setCurrentScreen('blackoutPuzzle');
  };

  const handleGenerateBlackoutCustom = () => {
    setSelectedCategory(undefined);
    setSelectedPuzzleId(undefined);
    setCurrentScreen('blackoutCustom');
  };

  const handleSelectClassic = () => {
    setCurrentScreen('select');
  };

  const handleSelectFogOfWar = () => {
    setCurrentScreen('fogSelect');
  };

  const handleSelectBlackout = () => {
    setCurrentScreen('blackoutSelect');
  };

  const handleOpenStats = () => {
    setCurrentScreen('stats');
  };

  const handleUpdateUsername = async (next: string): Promise<{ value: string; error: string | null }> => {
    const result = await persistUsername(next);
    if (!result.error) {
      setUsername(result.value);
    }
    return result;
  };

  const handleBack = () => {
    if (currentScreen === 'puzzle') {
      setCurrentScreen('category');
    } else if (currentScreen === 'category' || currentScreen === 'custom') {
      setCurrentScreen('select');
    } else if (currentScreen === 'select') {
      setCurrentScreen('home');
    } else if (currentScreen === 'fogPuzzle') {
      setCurrentScreen('fogCategory');
    } else if (currentScreen === 'fogCategory' || currentScreen === 'fogCustom') {
      setCurrentScreen('fogSelect');
    } else if (currentScreen === 'fogSelect') {
      setCurrentScreen('home');
    } else if (currentScreen === 'blackoutPuzzle') {
      setCurrentScreen('blackoutCategory');
    } else if (currentScreen === 'blackoutCategory' || currentScreen === 'blackoutCustom') {
      setCurrentScreen('blackoutSelect');
    } else if (currentScreen === 'blackoutSelect') {
      setCurrentScreen('home');
    } else if (currentScreen === 'stats') {
      setCurrentScreen('home');
    }
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FAF8F3" 
        translucent={false}
        hidden={false}
        animated={false}
      />
      <SafeAreaView style={styles.safeArea}>
        {currentScreen === 'home' && (
          <GameModeSelectScreen
            onSelectClassic={handleSelectClassic}
            onSelectFogOfWar={handleSelectFogOfWar}
            onSelectBlackout={handleSelectBlackout}
            username={username}
            onUpdateUsername={handleUpdateUsername}
            onOpenStats={handleOpenStats}
          />
        )}
        {currentScreen === 'stats' && (
          <StatsScreen
            username={username}
            onBack={handleBack}
          />
        )}
        {currentScreen === 'select' && (
          <PuzzleSelectScreen
            onSelectCategory={handleSelectCategory}
            onGenerateCustom={handleGenerateCustom}
            onBack={handleBack}
          />
        )}
        {currentScreen === 'category' && selectedCategory && (
          <CategoryPuzzleScreen
            category={selectedCategory}
            onSelectPuzzle={handleSelectPuzzle}
            onBack={handleBack}
          />
        )}
        {(currentScreen === 'puzzle' || currentScreen === 'custom') && (
          <PuzzleScreen
            category={selectedCategory}
            puzzleId={selectedPuzzleId}
            onBack={currentScreen === 'puzzle' ? handleBack : handleBack}
            onSelectPuzzle={handleSelectPuzzle}
            onBackToHome={handleBackToHome}
          />
        )}
        {currentScreen === 'fogSelect' && (
          <FogOfWarSelectScreen
            onSelectCategory={handleSelectFogCategory}
            onGenerateCustom={handleGenerateFogCustom}
            onBack={handleBack}
          />
        )}
        {currentScreen === 'fogCategory' && selectedCategory && (
          <FogOfWarCategoryScreen
            category={selectedCategory}
            onSelectPuzzle={handleSelectFogPuzzle}
            onBack={handleBack}
          />
        )}
        {(currentScreen === 'fogPuzzle' || currentScreen === 'fogCustom') && (
          <FogOfWarPuzzleScreen
            category={selectedCategory}
            puzzleId={selectedPuzzleId}
            onBack={currentScreen === 'fogPuzzle' ? handleBack : handleBack}
            onSelectPuzzle={handleSelectFogPuzzle}
            onBackToHome={handleBackToHome}
          />
        )}
        {currentScreen === 'blackoutSelect' && (
          <BlackoutSelectScreen
            onSelectCategory={handleSelectBlackoutCategory}
            onGenerateCustom={handleGenerateBlackoutCustom}
            onBack={handleBack}
          />
        )}
        {currentScreen === 'blackoutCategory' && selectedCategory && (
          <BlackoutCategoryScreen
            category={selectedCategory}
            onSelectPuzzle={handleSelectBlackoutPuzzle}
            onBack={handleBack}
          />
        )}
        {(currentScreen === 'blackoutPuzzle' || currentScreen === 'blackoutCustom') && (
          <BlackoutPuzzleScreen
            category={selectedCategory}
            puzzleId={selectedPuzzleId}
            onBack={currentScreen === 'blackoutPuzzle' ? handleBack : handleBack}
            onSelectPuzzle={handleSelectBlackoutPuzzle}
            onBackToHome={handleBackToHome}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Match the cream background
  },
});
