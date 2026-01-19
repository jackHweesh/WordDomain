# Audio Files

This directory contains the sound effects for the game.

## ⚠️ Important: Audio is Optional!

**The app works perfectly fine without sound files!** Audio is completely optional. The game will run silently if files don't exist - no errors, no crashes.

## Quick Setup (5 minutes)

### Step 1: Get Free Sounds

Go to one of these sites and download **CC0 (public domain)** sounds:

**Option A: Freesound.org** (Recommended)
1. Visit: https://freesound.org
2. Create a free account
3. Search for:
   - `"button click"` or `"ui click"` → save as `ui_interaction.mp3`
   - `"success"` or `"pop"` or `"ding"` → save as `puzzle_interaction.mp3`
   - `"fanfare"` or `"victory"` → save as `celebration.mp3`
4. **Important**: Filter by **CC0 license** (public domain, no attribution needed)

**Option B: OpenGameArt.org**
1. Visit: https://opengameart.org
2. Browse "Sound Effects" → Filter by "CC0" license
3. Download and rename to match the names above

**Option C: Use the built-in script**
```bash
node tools/setupAudio.js
```

### Step 2: Enable Audio

Once you have the 3 MP3 files in this directory:

1. Open `services/audioManager.ts`
2. Find the `getSoundFile()` function (around line 36)
3. Uncomment the `switch` statement (remove the `/*` and `*/`)
4. Audio will work automatically!

## Required Files

Place these 3 files in `assets/audio/`:

1. **ui_interaction.mp3** - Button/card click sound (~0.1-0.3s)
2. **puzzle_interaction.mp3** - Word success sound (~0.2-0.5s)  
3. **celebration.mp3** - Win celebration sound (~1-3s)

## File Format

- **Format**: MP3 (recommended)
- **Sample Rate**: 44.1kHz or 48kHz
- **Bitrate**: 128kbps or higher

## Volume Levels

Default volumes (adjustable in `services/audioManager.ts`):
- UI: 50%
- Puzzle: 60%
- Celebration: 70%

## No Files? No Problem!

The app runs perfectly without audio files. All audio calls are silently ignored if files don't exist.

