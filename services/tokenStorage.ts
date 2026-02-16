/**
 * Token Storage
 *
 * Persists token balance and last daily claim date.
 * - 3 tokens per calendar day when entering any puzzle screen (first time that day).
 * - 2 tokens per Watch Ad (handled by caller; this just addTokens(2)).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BALANCE_KEY = '@worddomain:tokenBalance';
const LAST_DAILY_CLAIM_KEY = '@worddomain:tokenLastDailyClaim';

export async function getTokenBalance(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(BALANCE_KEY);
    if (stored == null) return 0;
    const n = parseInt(stored, 10);
    return isNaN(n) || n < 0 ? 0 : n;
  } catch {
    return 0;
  }
}

export async function setTokenBalance(value: number): Promise<void> {
  const n = Math.max(0, Math.floor(value));
  await AsyncStorage.setItem(BALANCE_KEY, String(n));
}

export async function addTokens(amount: number): Promise<number> {
  const current = await getTokenBalance();
  const next = current + Math.max(0, Math.floor(amount));
  await setTokenBalance(next);
  return next;
}

export async function deductTokens(amount: number): Promise<{ success: boolean; newBalance: number }> {
  const current = await getTokenBalance();
  const deduct = Math.max(0, Math.floor(amount));
  if (current < deduct) {
    return { success: false, newBalance: current };
  }
  const next = current - deduct;
  await setTokenBalance(next);
  return { success: true, newBalance: next };
}

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getLastDailyClaimDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_DAILY_CLAIM_KEY);
  } catch {
    return null;
  }
}

/**
 * If the user has not yet claimed today's daily tokens, add 3 and persist today's date.
 * Returns the amount granted (3 or 0).
 */
export async function claimDailyTokensIfEligible(): Promise<number> {
  const today = getTodayDateString();
  const last = await getLastDailyClaimDate();
  if (last === today) return 0;
  await AsyncStorage.setItem(LAST_DAILY_CLAIM_KEY, today);
  await addTokens(3);
  return 3;
}
