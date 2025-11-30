/**
 * Dictionary Loader Service
 *
 * Loads dictionary files
 * SMALL DICTIONARY: Loaded via require from assets/data/
 * BIG DICTIONARY: Loaded via require from data/ (lazy-loaded JSON)
 */

let smallDictionaryCache: string[] | null = null;
let bigDictionaryCache: string[] | null = null;

/**
 * Load the small dictionary for puzzle generation
 */
export async function loadSmallDictionary(): Promise<string[]> {
  if (smallDictionaryCache) {
    return smallDictionaryCache;
  }

  try {
    const smallDictionaryData = require('../assets/data/smalldictionary.json');
    smallDictionaryCache = smallDictionaryData as string[];
    console.log(`📚 Loaded small dictionary: ${smallDictionaryCache.length} words`);
    return smallDictionaryCache;
  } catch (error) {
    console.error("❌ Error loading small dictionary:", error);
    throw error;
  }
}

/**
 * Load the big dictionary for word validation
 * 
 * Lazy-loaded JSON dictionary from data/bigdictionary.json
 */
export async function loadBigDictionary(): Promise<string[]> {
  if (bigDictionaryCache) {
    return bigDictionaryCache;
  }

  try {
    const words = require('../data/bigdictionary.json');
    bigDictionaryCache = words as string[];
    console.log(`📚 Loaded big dictionary: ${bigDictionaryCache.length} words`);
    return bigDictionaryCache;
  } catch (error) {
    console.error("❌ Error loading big dictionary:", error);
    throw error;
  }
}

/**
 * Get words that start with a specific letter from the small dictionary
 */
export async function getWordsStartingWith(letter: string): Promise<string[]> {
  const dictionary = await loadSmallDictionary();
  return dictionary.filter(word => word.startsWith(letter.toLowerCase()));
}

/**
 * Get a random word from the small dictionary
 */
export async function getRandomWord(): Promise<string> {
  const dictionary = await loadSmallDictionary();
  return dictionary[Math.floor(Math.random() * dictionary.length)];
}
