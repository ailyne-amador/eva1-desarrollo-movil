import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Lora_600SemiBold, useFonts } from "@expo-google-fonts/lora";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "../src/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lora_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
