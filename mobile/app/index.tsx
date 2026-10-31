import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";
import {
  Appbar,
  Button,
  Dialog,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskItem } from "../src/components/TaskItem";
import { useTasks } from "../src/hooks/useTasks";
import type { Task } from "../src/types/Task";

export default function Index() {
  const router = useRouter();
  const theme = useTheme();
  const { tasks, deleteTask } = useTasks();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  function confirmDelete() {
    if (!taskToDelete) return;
    deleteTask(taskToDelete.id);
    setTaskToDelete(null);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Appbar.Header>
        <Appbar.Content title="Tareas pendientes" />
      </Appbar.Header>
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onEdit={() =>
              router.push({ pathname: "/task/[id]", params: { id: item.id } })
            }
            onDelete={() => setTaskToDelete(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          tasks.length === 0 && styles.emptyList,
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
      <Portal>
        <Dialog
          visible={taskToDelete !== null}
          onDismiss={() => setTaskToDelete(null)}
        >
          <Dialog.Title>Eliminar tarea</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Quieres eliminar “{taskToDelete?.title}”? Esta acción no se puede
              deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTaskToDelete(null)}>Cancelar</Button>
            <Button onPress={confirmDelete} textColor={theme.colors.error}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
