/**
 * Audio Setup Script
 * Downloads free, public domain sound effects for the game
 * 
 * Run with: node tools/setupAudio.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'assets', 'audio');

// Create directory if it doesn't exist
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

/**
 * Download a file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

console.log('🎵 Audio Setup for WordDomain Game');
console.log('='.repeat(60));
console.log('');

// Since we can't directly download from external sources without API keys,
// we'll provide clear instructions and create placeholder files

const instructions = `
Since direct downloads require API authentication, please follow these steps:

1. Go to https://freesound.org and create a free account
2. Search for these sounds (filter by CC0 license - public domain):

   a) UI Click Sound:
      - Search: "button click" or "ui click"
      - License: CC0 (public domain)
      - Download and save as: assets/audio/ui_interaction.mp3
      - Recommended: Short, subtle click (0.1-0.3 seconds)

   b) Puzzle Success Sound:
      - Search: "success" or "pop" or "ding"
      - License: CC0 (public domain)
      - Download and save as: assets/audio/puzzle_interaction.mp3
      - Recommended: Pleasant success tone (0.2-0.5 seconds)

   c) Celebration Sound:
      - Search: "fanfare" or "victory" or "triumph"
      - License: CC0 (public domain)
      - Download and save as: assets/audio/celebration.mp3
      - Recommended: Triumphant sound (1-3 seconds)

3. Alternative: Use https://opengameart.org
   - Browse sound effects
   - Filter by CC0/public domain
   - Download and rename to match the names above

4. After adding files, uncomment the require() statements in:
   services/audioManager.ts (lines 39-48)

NOTE: The app works perfectly fine WITHOUT sound files!
Audio is completely optional - the game will run silently if files don't exist.
`;

console.log(instructions);
console.log('');
console.log('Current audio directory:', audioDir);
console.log('Files needed:');
console.log('  - ui_interaction.mp3');
console.log('  - puzzle_interaction.mp3');
console.log('  - celebration.mp3');
console.log('');
console.log('Once you add the files, audio will work automatically!');
console.log('='.repeat(60));

