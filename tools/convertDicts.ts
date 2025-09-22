#!/usr/bin/env node

/**
 * Dictionary Conversion Script
 * 
 * Reads smalldictionary.txt and bigdictionary.txt (master source files)
 * and converts them to JSON format for use in the game.
 * 
 * Usage: npx tsx tools/convertDicts.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const SMALL_TXT = path.join(ROOT_DIR, 'smalldictionary.txt');
const BIG_TXT = path.join(ROOT_DIR, 'bigdictionary.txt');
const SMALL_JSON = path.join(DATA_DIR, 'smalldictionary.json');
const BIG_JSON = path.join(DATA_DIR, 'bigdictionary.json');

interface ConversionStats {
  inputLines: number;
  validWords: number;
  duplicates: number;
  malformed: number;
  outputWords: number;
}

function convertDictionary(inputFile: string, outputFile: string, name: string): ConversionStats {
  console.log(`\n🔄 Converting ${name}...`);
  
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }
  
  // Read the input file
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`📖 Read ${lines.length} lines from ${name}`);
  
  const stats: ConversionStats = {
    inputLines: lines.length,
    validWords: 0,
    duplicates: 0,
    malformed: 0,
    outputWords: 0
  };
  
  const wordSet = new Set<string>();
  const validWords: string[] = [];
  
  for (const line of lines) {
    // Trim whitespace and convert to lowercase
    const word = line.trim().toLowerCase();
    
    // Skip empty lines
    if (!word) {
      continue;
    }
    
    // Check for malformed words (non-alphabetic characters)
    if (!/^[a-z]+$/.test(word)) {
      stats.malformed++;
      console.log(`⚠️  Skipping malformed word: "${line.trim()}"`);
      continue;
    }
    
    // Check for duplicates
    if (wordSet.has(word)) {
      stats.duplicates++;
      console.log(`⚠️  Skipping duplicate word: "${word}"`);
      continue;
    }
    
    // Valid word
    wordSet.add(word);
    validWords.push(word);
    stats.validWords++;
  }
  
  // Sort words alphabetically
  validWords.sort();
  
  // Write to JSON file
  const jsonContent = JSON.stringify(validWords, null, 2);
  fs.writeFileSync(outputFile, jsonContent, 'utf-8');
  
  stats.outputWords = validWords.length;
  
  console.log(`✅ Conversion complete for ${name}:`);
  console.log(`   📊 Input lines: ${stats.inputLines}`);
  console.log(`   ✅ Valid words: ${stats.validWords}`);
  console.log(`   🔄 Duplicates: ${stats.duplicates}`);
  console.log(`   ❌ Malformed: ${stats.malformed}`);
  console.log(`   📤 Output words: ${stats.outputWords}`);
  console.log(`   💾 Written to: ${outputFile}`);
  
  return stats;
}

function validateJsonFile(filePath: string, name: string): boolean {
  console.log(`\n🔍 Validating ${name}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = JSON.parse(content);
    
    if (!Array.isArray(words)) {
      console.error(`❌ ${name} is not an array`);
      return false;
    }
    
    if (words.length === 0) {
      console.error(`❌ ${name} is empty`);
      return false;
    }
    
    // Check that all entries are strings
    for (let i = 0; i < words.length; i++) {
      if (typeof words[i] !== 'string') {
        console.error(`❌ ${name} contains non-string at index ${i}: ${typeof words[i]}`);
        return false;
      }
      
      if (!/^[a-z]+$/.test(words[i])) {
        console.error(`❌ ${name} contains malformed word at index ${i}: "${words[i]}"`);
        return false;
      }
    }
    
    // Check for duplicates
    const wordSet = new Set(words);
    if (wordSet.size !== words.length) {
      console.error(`❌ ${name} contains duplicates`);
      return false;
    }
    
    console.log(`✅ ${name} validation passed:`);
    console.log(`   📊 Total words: ${words.length}`);
    console.log(`   🔤 Sample words: ${words.slice(0, 5).join(', ')}...`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error validating ${name}:`, error);
    return false;
  }
}

function main() {
  console.log('🎯 WordDomain Dictionary Converter');
  console.log('==================================');
  
  try {
    // Convert small dictionary
    const smallStats = convertDictionary(SMALL_TXT, SMALL_JSON, 'Small Dictionary');
    
    // Convert big dictionary
    const bigStats = convertDictionary(BIG_TXT, BIG_JSON, 'Big Dictionary');
    
    // Validate the generated files
    const smallValid = validateJsonFile(SMALL_JSON, 'Small Dictionary JSON');
    const bigValid = validateJsonFile(BIG_JSON, 'Big Dictionary JSON');
    
    console.log('\n📊 Conversion Summary:');
    console.log('=====================');
    console.log(`Small Dictionary: ${smallStats.outputWords} words (${smallValid ? '✅' : '❌'})`);
    console.log(`Big Dictionary: ${bigStats.outputWords} words (${bigValid ? '✅' : '❌'})`);
    
    if (smallValid && bigValid) {
      console.log('\n🎉 All dictionaries converted successfully!');
      console.log('✅ Ready for use in WordDomain game');
    } else {
      console.log('\n❌ Some dictionaries failed validation');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Conversion failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
