import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Lora_600SemiBold, useFonts } from "@expo-google-fonts/lora";
import { Stack } from "expo-router";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import {
  addSyncCompletionListener,
  initializeSync,
} from "../src/services/sync";
import { colors, theme } from "../src/theme";

const tasksQueryKey = ["tasks"];
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function SyncListener() {
  const { status, user } = useAuth();

  useEffect(() => {
    const unsubscribe = addSyncCompletionListener(() => {
      void queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status !== "signedIn" || !user) return;
    return initializeSync(String(user.id));
  }, [status, user]);

  return null;
}

function AppNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel="Comprobando sesión" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="index" />
        <Stack.Screen name="task/new" />
        <Stack.Screen name="task/view/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lora_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <SyncListener />
            <AppNavigator />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
});
