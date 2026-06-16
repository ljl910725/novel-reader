import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'nr_access_token';
const REFRESH_TOKEN_KEY = 'nr_refresh_token';
const REMEMBER_UNTIL_KEY = 'nr_remember_until';

let sessionAccessToken: string | null = null;
let sessionRefreshToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (await isRememberExpired()) {
    await clearTokens();
    return null;
  }
  if (sessionAccessToken) return sessionAccessToken;

  const until = await AsyncStorage.getItem(REMEMBER_UNTIL_KEY);
  if (until && Date.now() <= Number(until)) {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  if (sessionRefreshToken) return sessionRefreshToken;

  const until = await AsyncStorage.getItem(REMEMBER_UNTIL_KEY);
  if (until && Date.now() <= Number(until)) {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string, rememberDays?: number) {
  await clearTokens();
  if (rememberDays && rememberDays > 0) {
    const until = Date.now() + rememberDays * 24 * 60 * 60 * 1000;
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
      [REMEMBER_UNTIL_KEY, String(until)],
    ]);
    return;
  }
  sessionAccessToken = accessToken;
  sessionRefreshToken = refreshToken;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  sessionAccessToken = null;
  sessionRefreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, REMEMBER_UNTIL_KEY]);
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // SecureStore may be unavailable in tests
  }
}

export async function isRememberExpired(): Promise<boolean> {
  const until = await AsyncStorage.getItem(REMEMBER_UNTIL_KEY);
  if (!until) return false;
  return Date.now() > Number(until);
}

/** 冷启动时清除非「保持登录」的残留 token */
export async function initAuthStorage() {
  const until = await AsyncStorage.getItem(REMEMBER_UNTIL_KEY);
  if (!until || Date.now() > Number(until)) {
    sessionAccessToken = null;
    sessionRefreshToken = null;
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
    if (until && Date.now() > Number(until)) {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, REMEMBER_UNTIL_KEY]);
    }
  }
}
