import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { TaskForm } from "../../src/components/TaskForm";
import { useTasks } from "../../src/hooks/useTasks";
import { colors } from "../../src/theme";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    tasks,
    updateTask,
    isLoading,
    isError,
    refetchTasks,
    isUpdatingTask,
  } = useTasks();
  const task = tasks.find((item) => item.id === id);

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Editar tarea" />
      {isLoading ? (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text variant="bodyMedium">Cargando tarea...</Text>
        </View>
      ) : isError ? (
        <View style={styles.status}>
          <Text variant="bodyLarge" style={styles.errorText}>
            No se pudo conectar con el servidor.
          </Text>
          <Button onPress={() => void refetchTasks()}>Reintentar</Button>
        </View>
      ) : task ? (
        <TaskForm
          key={task.id}
          defaultValues={{ title: task.title, description: task.description }}
          isSaving={isUpdatingTask}
          onSave={(values) => updateTask(task.id, values)}
          onSuccess={() => router.back()}
        />
      ) : (
        <View style={styles.notFound}>
          <Text variant="bodyLarge" style={styles.notFoundText}>
            No se encontró la tarea.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            hitSlop={8}
          >
            <Text variant="bodyLarge" style={styles.link}>
              Volver a tareas
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  status: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  notFoundText: {
    color: colors.ink,
  },
  link: {
    color: colors.teal,
  },
});
