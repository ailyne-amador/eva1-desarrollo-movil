import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TasksProvider } from "../src/hooks/useTasks";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <TasksProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TasksProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
