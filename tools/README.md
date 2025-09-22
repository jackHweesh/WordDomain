# WordDomain Tools

This directory contains utility scripts for the WordDomain game.

## convertDicts.ts

Converts dictionary files from `.txt` format to `.json` format for use in the game.

### Usage

```bash
npx tsx tools/convertDicts.ts
```

### What it does

1. Reads `smalldictionary.txt` and `bigdictionary.txt` from the project root
2. Validates and cleans the words:
   - Trims whitespace
   - Converts to lowercase
   - Removes empty lines
   - Removes malformed words (non-alphabetic)
   - Removes duplicates
3. Sorts words alphabetically
4. Writes clean JSON arrays to `data/smalldictionary.json` and `data/bigdictionary.json`
5. Validates the output files

### Master Files

- `smalldictionary.txt` - Master source for small dictionary (4,113 words)
- `bigdictionary.txt` - Master source for big dictionary (279,373 words)

**⚠️ Important**: Never modify the `.txt` files directly. They are the master source files. Always use this script to regenerate the `.json` files when needed.

### Game Usage

The game imports from the `.json` files:
- `data/smalldictionary.json` - Used by puzzle generator
- `data/bigdictionary.json` - Used by word validator

