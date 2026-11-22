import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import { useTask } from "../../../src/hooks/useTasks";
import { colors, displayFont } from "../../../src/theme";
import { taskSchema } from "../../../src/schemas/taskSchema";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    task,
    updateTask,
    deleteTask,
    isLoading,
    isError,
    error,
    refetchTask,
    isUpdatingTask,
    isDeletingTask,
  } = useTask(id);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [editingField, setEditingField] = useState<"title" | "description" | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [saveError, setSaveError] = useState(false);
  const isNotFound = error instanceof Error && error.message === "Tarea no encontrada";
  function startEditing(field: "title" | "description", value: string) {
    setEditingField(field);
    setEditingValue(value);
    setFieldError(undefined);
    setSaveError(false);
  }

  function cancelEditing() {
    setEditingField(null);
    setEditingValue("");
    setFieldError(undefined);
    setSaveError(false);
  }

  async function saveField() {
    if (!task || !editingField) return;

    const parsed = taskSchema.safeParse({
      title: editingField === "title" ? editingValue : task.title,
      description:
        editingField === "description" ? editingValue : task.description ?? "",
    });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors[editingField]?.[0]);
      return;
    }

    setSaveError(false);
    try {
      await updateTask(parsed.data);
      cancelEditing();
    } catch {
      setSaveError(true);
    }
  }

  function closeDeleteDialog() {
    setDeleteDialogVisible(false);
    setDeleteError(false);
  }

  async function confirmDelete() {
    try {
      await deleteTask(id);
      router.replace("/");
    } catch {
      setDeleteError(true);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Detalle" />
      {isLoading ? (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text variant="bodyMedium">Cargando tarea...</Text>
        </View>
      ) : isError ? (
        <View style={styles.status}>
          <Text variant="bodyLarge" style={styles.statusText}>
            {isNotFound
              ? "No se encontró la tarea."
              : "No se pudo cargar la tarea."}
          </Text>
          {!isNotFound && (
            <Button onPress={() => void refetchTask()}>Reintentar</Button>
          )}
          <Button onPress={() => router.replace("/")}>Volver a tareas</Button>
        </View>
      ) : task ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              {editingField === "title" ? (
                <TextInput
                  accessibilityLabel="Título"
                  label="Título"
                  value={editingValue}
                  onChangeText={(value) => {
                    setEditingValue(value);
                    setFieldError(undefined);
                    setSaveError(false);
                  }}
                  maxLength={100}
                  error={Boolean(fieldError)}
                  mode="flat"
                  style={styles.titleInput}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar título"
                  disabled={editingField !== null}
                  onPress={() => startEditing("title", task.title)}
                  style={({ pressed }) => [styles.titleField, pressed && styles.pressed]}
                >
                  <Text style={styles.title}>{task.title}</Text>
                </Pressable>
              )}
              <Button
                compact
                mode="text"
                textColor={colors.error}
                onPress={() => {
                  setDeleteError(false);
                  setDeleteDialogVisible(true);
                }}
                disabled={isDeletingTask || isUpdatingTask}
                style={styles.deleteAction}
              >
                Eliminar
              </Button>
            </View>
            <View style={styles.rule} />
            {editingField === "description" ? (
              <TextInput
                accessibilityLabel="Descripción (opcional)"
                label="Descripción (opcional)"
                value={editingValue}
                onChangeText={(value) => {
                  setEditingValue(value);
                  setFieldError(undefined);
                  setSaveError(false);
                }}
                multiline
                numberOfLines={4}
                error={Boolean(fieldError)}
                mode="flat"
                style={styles.descriptionInput}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar descripción"
                disabled={editingField !== null}
                onPress={() =>
                  startEditing("description", task.description ?? "")
                }
                style={({ pressed }) => [
                  styles.descriptionField,
                  pressed && styles.pressed,
                ]}
              >
                {task.description?.trim() ? (
                  <Text variant="bodyLarge" style={styles.description}>
                    {task.description}
                  </Text>
                ) : (
                  <Text variant="bodyLarge" style={styles.emptyDescription}>
                    Sin descripción
                  </Text>
                )}
              </Pressable>
            )}
            <View style={styles.locationDetails}>
              {task.latitude !== null && task.longitude !== null ? (
                <>
                  <Text variant="bodyMedium" style={styles.locationText}>
                    Ubicación: {task.locationName?.trim() || "Ciudad no disponible"}
                  </Text>
                  <Button
                    compact
                    mode="text"
                    onPress={() =>
                      void Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`,
                      )
                    }
                  >
                    Ver en el mapa
                  </Button>
                </>
              ) : (
                <Text variant="bodyMedium" style={styles.locationText}>
                  Sin ubicación
                </Text>
              )}
            </View>
            {fieldError && (
              <Text variant="bodySmall" style={styles.inlineError}>
                {fieldError}
              </Text>
            )}
            {saveError && (
              <Text variant="bodySmall" style={styles.inlineError}>
                No se pudo guardar el cambio.
              </Text>
            )}
            {editingField !== null && (
              <View style={styles.editActions}>
                <Button
                  mode="contained"
                  onPress={() => void saveField()}
                  loading={isUpdatingTask}
                  disabled={isUpdatingTask}
                >
                  Guardar
                </Button>
                <Button onPress={cancelEditing} disabled={isUpdatingTask}>
                  Cancelar
                </Button>
              </View>
            )}
          </View>
          {editingField === null && (
            <Text variant="bodySmall" style={styles.hint}>
              Toca el título o la descripción para editar.
            </Text>
          )}
        </ScrollView>
      ) : null}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={closeDeleteDialog}>
          <Dialog.Title>Eliminar tarea</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Quieres eliminar “{task?.title}”? Esta acción no se puede deshacer.
            </Text>
            {deleteError && (
              <Text style={styles.deleteError}>
                No se pudo eliminar la tarea.
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
  status: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  statusText: {
    color: colors.ink,
    textAlign: "center",
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    width: "100%",
    maxWidth: 640,
    gap: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  titleField: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  descriptionField: {
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  titleInput: {
    flex: 1,
    backgroundColor: "transparent",
  },
  descriptionInput: {
    backgroundColor: "transparent",
  },
  deleteAction: {
    alignSelf: "flex-start",
  },
  hint: {
    width: "100%",
    maxWidth: 640,
    color: colors.muted,
  },
  editActions: {
    alignItems: "flex-start",
    gap: 8,
  },
  inlineError: {
    color: colors.error,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
  },
  description: {
    color: colors.ink,
    lineHeight: 26,
  },
  emptyDescription: {
    color: colors.muted,
    fontStyle: "italic",
    lineHeight: 26,
  },
  locationDetails: {
    alignItems: "flex-start",
    gap: 4,
  },
  locationText: {
    color: colors.muted,
  },
  deleteError: {
    marginTop: 8,
    color: colors.error,
  },
});
