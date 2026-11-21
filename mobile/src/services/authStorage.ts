import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const tokenKey = "auth_token";

export async function getAuthToken(): Promise<string | null> {
  return Platform.OS === "web"
    ? globalThis.localStorage.getItem(tokenKey)
    : SecureStore.getItemAsync(tokenKey);
}

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage.setItem(tokenKey, token);
    return;
  }
  await SecureStore.setItemAsync(tokenKey, token);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage.removeItem(tokenKey);
    return;
  }
  await SecureStore.deleteItemAsync(tokenKey);
}
