import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Appbar, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskForm } from "../../src/components/TaskForm";
import { useTasks } from "../../src/hooks/useTasks";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, updateTask } = useTasks();
  const task = tasks.find((item) => item.id === id);

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
        <Appbar.Content title="Editar tarea" />
      </Appbar.Header>
      {task ? (
        <TaskForm
          key={task.id}
          defaultValues={{ title: task.title, description: task.description }}
          onSave={(values) => {
            updateTask(task.id, values);
            router.back();
          }}
        />
      ) : (
        <View style={styles.notFound}>
          <Text variant="bodyLarge">No se encontró la tarea.</Text>
          <Button mode="outlined" onPress={() => router.replace("/")}>
            Volver a tareas
          </Button>
        </View>
      )}
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
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 16,
  },
});
