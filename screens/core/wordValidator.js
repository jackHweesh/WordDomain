// TODO: validate user words using bigdictionary
import { loadBigDictionary } from "./dictionaryLoader.js";
// Cache for the word set (built once)
let cachedWordSet = null;
/**
 * Load and cache all words from big dictionary
 */
async function loadWordSet() {
    if (cachedWordSet) {
        return cachedWordSet;
    }
    console.log("🔤 Loading word set from big dictionary...");
    const bigDictionary = await loadBigDictionary();
    // Create a set for O(1) lookup, lowercase for case-insensitive matching
    const wordSet = new Set();
    for (const word of bigDictionary) {
        if (word.length >= 3) {
            wordSet.add(word.toLowerCase());
        }
    }
    console.log(`📚 Loaded ${wordSet.size} words into word set`);
    cachedWordSet = wordSet;
    return wordSet;
}
/**
 * Check if a word is valid (case-insensitive, min length 3)
 */
export async function isValidWord(word) {
    if (!word || word.length < 3) {
        return false;
    }
    const wordSet = await loadWordSet();
    return wordSet.has(word.toLowerCase());
}
