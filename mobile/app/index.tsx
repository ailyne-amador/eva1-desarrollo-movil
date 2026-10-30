import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";
import { Appbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskItem } from "../src/components/TaskItem";
import type { Task } from "../src/types/Task";

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Preparar materiales",
    description: "Revisar los requisitos de la evaluación.",
  },
  {
    id: "2",
    title: "Diseñar la lista",
    description: "Mostrar título y descripción de cada tarea.",
  },
];

export default function Index() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.screen}>
      <Appbar.Header>
        <Appbar.Content title="Tareas pendientes" />
      </Appbar.Header>
      <FlatList
        data={mockTasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => <TaskItem task={item} />}
        contentContainerStyle={[
          styles.list,
          mockTasks.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <Text variant="bodyLarge">No hay tareas pendientes</Text>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear nueva tarea"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/task/new")}
      >
        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
          Nueva tarea
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    gap: 12,
    padding: 16,
    paddingBottom: 96,
  },
  emptyList: {
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
  },
  fabPressed: {
    opacity: 0.85,
  },
});
