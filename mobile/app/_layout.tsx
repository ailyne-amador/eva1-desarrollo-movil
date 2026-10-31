import { Lora_600SemiBold, useFonts } from "@expo-google-fonts/lora";
import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TasksProvider } from "../src/hooks/useTasks";
import { theme } from "../src/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lora_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <TasksProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TasksProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
