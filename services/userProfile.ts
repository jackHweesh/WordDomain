/**
 * User Profile Storage
 *
 * Currently stores only username (persistent via AsyncStorage).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME_KEY = '@worddomain:username';

export const DEFAULT_USERNAME = 'Player';
export const USERNAME_MAX_LENGTH = 20;

export function sanitizeUsername(input: string): { value: string; error: string | null } {
  const trimmed = (input ?? '').trim();

  if (!trimmed) {
    return { value: '', error: 'Username cannot be empty.' };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { value: trimmed.slice(0, USERNAME_MAX_LENGTH), error: `Max ${USERNAME_MAX_LENGTH} characters.` };
  }

  return { value: trimmed, error: null };
}

export async function getUsername(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(USERNAME_KEY);
    if (!stored) return DEFAULT_USERNAME;

    const { value, error } = sanitizeUsername(stored);
    if (error) return DEFAULT_USERNAME;
    return value;
  } catch (error) {
    return DEFAULT_USERNAME;
  }
}

export async function setUsername(input: string): Promise<{ value: string; error: string | null }> {
  const { value, error } = sanitizeUsername(input);
  if (error) return { value, error };

  try {
    await AsyncStorage.setItem(USERNAME_KEY, value);
    return { value, error: null };
  } catch (e) {
    return { value, error: 'Failed to save username. Please try again.' };
  }
}

