import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { TaskForm } from "../../src/components/TaskForm";
import { useTasks } from "../../src/hooks/useTasks";
import { colors } from "../../src/theme";

export default function NewTaskScreen() {
  const { addTask, isAddingTask } = useTasks();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Nueva tarea" />
      <TaskForm
        isSaving={isAddingTask}
        onSave={addTask}
        onSuccess={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});
