import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskItem } from "../src/components/TaskItem";
import { useTasks } from "../src/hooks/useTasks";
import { colors, displayFont } from "../src/theme";
import type { Task } from "../src/types/Task";

export default function Index() {
  const router = useRouter();

  const { tasks, deleteTask } = useTasks();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  function confirmDelete() {
    if (!taskToDelete) return;
    deleteTask(taskToDelete.id);
    setTaskToDelete(null);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Tareas</Text>
        <Text variant="bodyMedium" style={styles.count}>
          {tasks.length === 0
            ? "Nada pendiente"
            : `${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"}`}
        </Text>
      </View>
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.list,
          tasks.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Aún no hay tareas.
            </Text>
            <Text variant="bodyMedium" style={styles.emptyHint}>
              Crea la primera con el botón Nueva tarea.
            </Text>
          </View>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear nueva tarea"
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/task/new")}
      >
        <Text variant="titleMedium" style={styles.fabText}>
          + Nueva tarea
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
            <Button onPress={confirmDelete} textColor={colors.error}>
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
    backgroundColor: colors.paper,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 2,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 40,
    lineHeight: 48,
    color: colors.ink,
  },
  count: {
    color: colors.muted,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 104,
  },
  emptyList: {
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: 4,
  },
  emptyText: {
    color: colors.ink,
  },
  emptyHint: {
    color: colors.muted,
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: colors.teal,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    color: "#FFFFFF",
  },
});
