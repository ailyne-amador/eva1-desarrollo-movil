import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const accessTokenKey = "auth_token";
const refreshTokenKey = "refresh_token";

function getStorage() {
  return Platform.OS === "web" ? globalThis.localStorage : null;
}

function getItem(key: string): string | null {
  const storage = getStorage();
  return storage ? storage.getItem(key) : null;
}

function setItem(key: string, value: string): void {
  const storage = getStorage();
  if (storage) storage.setItem(key, value);
}

function removeItem(key: string): void {
  const storage = getStorage();
  if (storage) storage.removeItem(key);
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(accessTokenKey);
  }
  return getItem(accessTokenKey);
}

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(accessTokenKey, token);
    return;
  }
  setItem(accessTokenKey, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(refreshTokenKey);
  }
  return getItem(refreshTokenKey);
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(refreshTokenKey, token);
    return;
  }
  setItem(refreshTokenKey, token);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(accessTokenKey);
    await SecureStore.deleteItemAsync(refreshTokenKey);
    return;
  }
  removeItem(accessTokenKey);
  removeItem(refreshTokenKey);
}
