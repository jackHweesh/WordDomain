// Import expo-av Audio module
// @ts-ignore - expo-av types may not be available in all environments
import { Audio } from 'expo-av';

// Type alias for Audio.Sound
type Sound = any;

/**
 * Sound categories for the game
 */
export enum SoundCategory {
  UI = 'ui',
  PUZZLE = 'puzzle',
  CELEBRATION = 'celebration',
  DENY = 'deny',
  TILE_PRESS = 'tile_press',
}

/**
 * Configuration for each sound category
 */
interface SoundConfig {
  /** Path to the sound file (relative to assets/audio/) */
  filePath: string;
  /** Volume level (0.0 to 100.0) */
  volume: number;
  /** Minimum time between plays to prevent spam (in milliseconds) */
  cooldown: number;
}

/**
 * Sound file mappings
 * 
 * Sound files are loaded from assets/audio/
 * Pre-loaded at module level to catch errors early and prevent crashes
 */
let soundFiles: Record<SoundCategory, any> = {
  [SoundCategory.UI]: null,
  [SoundCategory.PUZZLE]: null,
  [SoundCategory.CELEBRATION]: null,
  [SoundCategory.DENY]: null,
  [SoundCategory.TILE_PRESS]: null,
};

// Try to load sound files - if they fail, the app will still work
try {
  soundFiles[SoundCategory.UI] = require('../assets/audio/ui_interaction.mp3');
} catch (e) {
  console.warn('AudioManager: Could not load UI sound file');
}

try {
  soundFiles[SoundCategory.PUZZLE] = require('../assets/audio/puzzle_interaction.mp3');
} catch (e) {
  console.warn('AudioManager: Could not load Puzzle sound file');
}

try {
  soundFiles[SoundCategory.CELEBRATION] = require('../assets/audio/celebration.mp3');
} catch (e) {
  console.warn('AudioManager: Could not load Celebration sound file');
}

try {
  soundFiles[SoundCategory.DENY] = require('../assets/audio/deny_sound.mp3');
} catch (e) {
  console.warn('AudioManager: Could not load Deny sound file');
}

try {
  soundFiles[SoundCategory.TILE_PRESS] = require('../assets/audio/press_tile.mp3');
} catch (e) {
  console.warn('AudioManager: Could not load Tile Press sound file');
}

const getSoundFile = (category: SoundCategory): any => {
  return soundFiles[category] || null;
};

/**
 * Maximum volume value in our internal scale (0-100)
 * expo-av only accepts 0-1, so we scale our values down
 */
const MAX_VOLUME = 100;

/**
 * Convert internal volume (0-100) to expo-av volume (0-1)
 * Clamps the value to ensure it's within valid range
 */
const toExpoVolume = (volume: number): number => {
  return Math.max(0, Math.min(1, volume / MAX_VOLUME));
};

/**
 * Default sound configurations
 * To adjust volume or cooldown, modify the values below.
 */
const SOUND_CONFIGS: Record<SoundCategory, Omit<SoundConfig, 'filePath'>> = {
  [SoundCategory.UI]: {
    volume: 60.0, // 2x previous actual volume (was 0.3, now 0.6 in expo-av)
    cooldown: 100, // 100ms cooldown prevents rapid button spam
  },
  [SoundCategory.PUZZLE]: {
    volume: 24.0, // 2x previous actual volume (was 0.12, now 0.24 in expo-av)
    cooldown: 200, // 200ms cooldown for puzzle interactions
  },
  [SoundCategory.CELEBRATION]: {
    volume: 84.0, // 2x previous actual volume (was 0.42, now 0.84 in expo-av)
    cooldown: 0, // No cooldown for celebration (shouldn't overlap anyway)
  },
  [SoundCategory.DENY]: {
    volume: 30.0, // 2x previous actual volume (was 0.15, now 0.3 in expo-av)
    cooldown: 100, // 100ms cooldown for deny sounds
  },
  [SoundCategory.TILE_PRESS]: {
    volume: 100.0, // 2x previous would be 1.998, but capped at 100 (1.0 max in expo-av)
    cooldown: 50, // Very short cooldown for rapid tile selection
  },
};

/**
 * AudioManager - Centralized audio system for the game
 * 
 * Features:
 * - Prevents overlapping sounds of the same category
 * - Consistent volume levels per category
 * - Easy to swap sound files by updating SOUND_CONFIGS
 * - Cooldown system prevents audio spam
 */
class AudioManager {
  private soundObjects: Map<SoundCategory, Sound> = new Map();
  private lastPlayed: Map<SoundCategory, number> = new Map();
  private isInitialized: boolean = false;
  private hasPlayedOnce: boolean = false; // Track if we've successfully played any sound (unlocks audio context on mobile)
  private playedCategories: Set<SoundCategory> = new Set(); // Track which categories have been successfully played


  /**
   * Initialize the AudioManager and preload all sounds
   * Gracefully handles missing files - app works fine without audio
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set audio mode for better performance
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        allowsRecordingIOS: false,
      });
      console.log('AudioManager: Audio mode set successfully');

      // Try to load sound files
      let loadedCount = 0;
      const categories = [SoundCategory.UI, SoundCategory.PUZZLE, SoundCategory.CELEBRATION, SoundCategory.DENY, SoundCategory.TILE_PRESS];
      
      for (const category of categories) {
        try {
          const soundFile = getSoundFile(category);
          const config = SOUND_CONFIGS[category];
          
          if (!soundFile) {
            console.warn(`AudioManager: No file found for ${category}`);
            continue;
          }
          
          console.log(`AudioManager: Loading sound for ${category}...`);
          const { sound } = await Audio.Sound.createAsync(
            soundFile,
            { 
              volume: toExpoVolume(config.volume), 
              shouldPlay: false,
              isLooping: false,
            }
          );
          this.soundObjects.set(category, sound);
          loadedCount++;
          console.log(`AudioManager: ✓ Loaded ${category} sound`);
        } catch (error: any) {
          console.error(`AudioManager: Failed to load sound for ${category}:`, error?.message || error);
          // Continue loading other sounds
        }
      }

      console.log(`AudioManager: Initialized with ${loadedCount}/${categories.length} sounds loaded`);
      this.isInitialized = true;

      // Silently warm up audio context to ensure first sound plays immediately
      // This may not work on all mobile devices (requires user interaction), but trying doesn't hurt
      this.warmupAudioContext();
    } catch (error: any) {
      console.error('AudioManager: Initialization error:', error?.message || error);
      // Don't throw - allow game to continue without audio
      this.isInitialized = true; // Mark as initialized even if no sounds loaded
    }
  }

  /**
   * Silently warm up the audio context by playing and immediately stopping a sound
   * This unlocks the audio context on mobile devices
   */
  private async warmupAudioContext(): Promise<void> {
    // Use TILE_PRESS as it's commonly used and quick
    const sound = this.soundObjects.get(SoundCategory.TILE_PRESS);
    if (!sound) {
      return; // Can't warm up if no sounds loaded
    }

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        return;
      }

      // Play at extremely low volume (silent) to unlock audio context
      const originalVolume = SOUND_CONFIGS[SoundCategory.TILE_PRESS].volume;
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(0.001); // Nearly silent
      await sound.playAsync();
      // Stop almost immediately
      await new Promise(resolve => setTimeout(resolve, 5));
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(toExpoVolume(originalVolume));
      
      this.hasPlayedOnce = true;
      console.log('AudioManager: Audio context warmed up silently');
    } catch (error) {
      // Silent fail - warm-up may not work without user interaction on some devices
      // The warm-up on first playSound call will handle it if this doesn't work
    }
  }

  /**
   * Play a sound from the specified category
   * @param category The sound category to play
   * @returns Promise that resolves when sound starts playing (or immediately if skipped)
   */
  async playSound(category: SoundCategory): Promise<void> {
    // If not initialized yet, wait for initialization (fixes first word issue)
    if (!this.isInitialized) {
      console.log(`AudioManager: Waiting for initialization before playing ${category}...`);
      // Wait up to 2 seconds for initialization
      const maxWait = 2000;
      const startTime = Date.now();
      while (!this.isInitialized && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (!this.isInitialized) {
        console.warn(`AudioManager: Initialization timeout, cannot play ${category}`);
        return;
      }
    }

    const sound = this.soundObjects.get(category);
    if (!sound) {
      console.warn(`AudioManager: No sound loaded for ${category}`);
      return;
    }

    const config = SOUND_CONFIGS[category];
    const now = Date.now();
    const lastPlayedTime = this.lastPlayed.get(category) || 0;

    // Check cooldown
    if (now - lastPlayedTime < config.cooldown) {
      return; // Skip playing if still in cooldown
    }

    try {
      // Warm up audio context on mobile devices for this specific sound category if not played before
      // This ensures each sound category plays reliably on first try
      // Use the actual sound we're about to play for warm-up
      if (!this.playedCategories.has(category)) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            // Unlock audio context by playing and immediately stopping
            const originalVolume = config.volume;
            await sound.setPositionAsync(0);
            await sound.setVolumeAsync(0.001); // Nearly silent
            await sound.playAsync();
            // Stop almost immediately (unlocks audio context on mobile)
            await new Promise(resolve => setTimeout(resolve, 5));
            await sound.stopAsync();
            await sound.setPositionAsync(0);
            await sound.setVolumeAsync(toExpoVolume(originalVolume));
            // Small delay to ensure audio context is fully unlocked
            await new Promise(resolve => setTimeout(resolve, 10));
            console.log(`AudioManager: Audio context warmed up for ${category}`);
          }
        } catch (warmupError) {
          // If warmup fails, continue anyway - might work without it on some devices
          console.log('AudioManager: Warmup failed, continuing anyway');
        }
      }

      // Get current status
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        console.warn(`AudioManager: Sound for ${category} is not loaded`);
        return;
      }
      
      // Stop any currently playing sound of this category (prevents overlap)
      if (status.isPlaying) {
        await sound.stopAsync();
        // Small delay to ensure stop completes
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Reset to beginning, set volume, and play
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(toExpoVolume(config.volume));
      await sound.playAsync();
      
      // Update last played time and mark that we've successfully played this category
      // Only set this AFTER the sound actually plays successfully
      this.lastPlayed.set(category, now);
      this.playedCategories.add(category);
      this.hasPlayedOnce = true;
      
      console.log(`AudioManager: ✓ Playing ${category} sound (volume: ${config.volume})`);
    } catch (error: any) {
      console.error(`AudioManager: ✗ Failed to play sound for ${category}:`, error?.message || error);
      // Don't throw - allow game to continue
      // Don't set hasPlayedOnce if play failed
    }
  }

  /**
   * Stop a sound from the specified category
   * @param category The sound category to stop
   */
  async stopSound(category: SoundCategory): Promise<void> {
    const sound = this.soundObjects.get(category);
    if (sound) {
      try {
        await sound.stopAsync();
      } catch (error) {
        console.warn(`Failed to stop sound for ${category}:`, error);
      }
    }
  }

  /**
   * Set volume for a specific category
   * @param category The sound category
   * @param volume Volume level (0.0 to 100.0)
   */
  async setVolume(category: SoundCategory, volume: number): Promise<void> {
    const sound = this.soundObjects.get(category);
    if (sound) {
      try {
        // Clamp to 0-100 range and convert to expo-av's 0-1 range
        const clampedVolume = Math.max(0, Math.min(MAX_VOLUME, volume));
        await sound.setVolumeAsync(toExpoVolume(clampedVolume));
        SOUND_CONFIGS[category].volume = clampedVolume;
      } catch (error) {
        console.warn(`Failed to set volume for ${category}:`, error);
      }
    }
  }

  /**
   * Cleanup and unload all sounds
   */
  async cleanup(): Promise<void> {
    for (const [category, sound] of this.soundObjects.entries()) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        console.warn(`Failed to unload sound for ${category}:`, error);
      }
    }
    this.soundObjects.clear();
    this.lastPlayed.clear();
    this.playedCategories.clear();
    this.isInitialized = false;
    this.hasPlayedOnce = false;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

