// TODO: validate user words using bigdictionary
import { loadBigDictionary } from "./dictionaryLoader.js";
// Cache for the big dictionary
let bigDictionaryCache = null;
/**
 * Load big dictionary for word validation
 */
async function loadBigDictionaryForValidation() {
    if (bigDictionaryCache) {
        return bigDictionaryCache;
    }
    bigDictionaryCache = await loadBigDictionary();
    return bigDictionaryCache;
}
/**
 * Validate if a word exists in the big dictionary
 */
export async function isValidWord(word) {
    if (!word || word.length < 3) {
        return false;
    }
    const dictionary = await loadBigDictionaryForValidation();
    return dictionary.includes(word.toLowerCase());
}
/**
 * Get minimum word length
 */
export function getMinWordLength() {
    return 3;
}
