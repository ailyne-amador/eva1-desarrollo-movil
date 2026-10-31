import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Appbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskForm } from "../../src/components/TaskForm";
import { useTasks } from "../../src/hooks/useTasks";

export default function NewTaskScreen() {
  const { addTask } = useTasks();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Appbar.Header>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a tareas"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backPressed,
          ]}
        >
          <Text variant="labelLarge">Volver</Text>
        </Pressable>
        <Appbar.Content title="Nueva tarea" />
      </Appbar.Header>
      <TaskForm
        onSave={(values) => {
          addTask(values);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backButton: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  backPressed: {
    opacity: 0.7,
  },
});
