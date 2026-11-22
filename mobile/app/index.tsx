import { useState } from "react";
import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskItem } from "../src/components/TaskItem";
import { useTasks } from "../src/hooks/useTasks";
import { useAuth } from "../src/context/AuthContext";
import { useSyncStatus } from "../src/services/sync";
import { colors, displayFont, radius, shadow } from "../src/theme";
import type { Task } from "../src/types/Task";

export default function Index() {
  const router = useRouter();
  const { signOut } = useAuth();

  const {
    tasks,
    deleteTask,
    isLoading,
    isError,
    refetchTasks,
    isDeletingTask,
  } = useTasks();
  const isSyncing = useSyncStatus();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  function requestDelete(task: Task) {
    setTaskToDelete(task);
    setDeleteError(false);
  }

  function closeDeleteDialog() {
    setTaskToDelete(null);
    setDeleteError(false);
  }

  async function confirmDelete() {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      closeDeleteDialog();
    } catch {
      setDeleteError(true);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Tareas</Text>
          {!isError && !isLoading && (
            <Text variant="bodyMedium" style={styles.count}>
              {tasks.length === 0
                ? "Nada pendiente"
                : `${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"}`}
              {isSyncing && " · Sincronizando..."}
            </Text>
          )}
        </View>
        <Button
          mode="outlined"
          compact
          onPress={() => void signOut()}
          style={styles.logoutButton}
        >
          Cerrar sesión
        </Button>
      </View>
      {isError && (
        <View style={styles.serverError}>
          <Text variant="bodyMedium" style={styles.errorText}>
            No se pudo conectar con el servidor.
          </Text>
          <Button compact onPress={() => void refetchTasks()}>
            Reintentar
          </Button>
        </View>
      )}
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onView={() =>
              router.push({
                pathname: "/task/view/[id]",
                params: { id: item.id },
              })
            }
            onDelete={() => requestDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => void refetchTasks()}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={[
          styles.list,
          tasks.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.status}>
              <ActivityIndicator />
              <Text variant="bodyMedium">Cargando tareas...</Text>
            </View>
          ) : isError ? null : (
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                Aún no hay tareas.
              </Text>
              <Text variant="bodyMedium" style={styles.emptyHint}>
                Crea la primera con el botón Nueva tarea.
              </Text>
            </View>
          )
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear nueva tarea"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/task/new")}
      >
        <Text variant="titleMedium" style={styles.fabText}>
          +  Nueva tarea
        </Text>
      </Pressable>
      <Portal>
        <Dialog visible={taskToDelete !== null} onDismiss={closeDeleteDialog}>
          <Dialog.Title>Eliminar tarea</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Quieres eliminar “{taskToDelete?.title}”? Esta acción no se puede
              deshacer.
            </Text>
            {deleteError && (
              <Text style={styles.errorText}>
                No se pudo conectar con el servidor.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDeleteDialog}>Cancelar</Button>
            <Button
              onPress={confirmDelete}
              textColor={colors.error}
              loading={isDeletingTask}
              disabled={isDeletingTask}
            >
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heading: {
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
  logoutButton: {
    borderRadius: radius.md,
  },
  status: {
    alignItems: "center",
    gap: 8,
  },
  serverError: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 104,
    gap: 10,
  },
  emptyList: {
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    color: colors.ink,
  },
  emptyHint: {
    color: colors.muted,
    textAlign: "center",
  },
  separator: {
    height: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.xl,
    ...shadow.md,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    color: "#FFFFFF",
  },
});
