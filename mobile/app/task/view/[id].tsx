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
import { TaskPhoto } from "../../../src/components/TaskPhoto";
import { takePhoto as takePhotoFromCamera } from "../../../src/services/camera";
import { getCityName, getCurrentCoords } from "../../../src/services/location";
import { useTask } from "../../../src/hooks/useTasks";
import { colors, displayFont, radius, shadow } from "../../../src/theme";
import { taskSchema } from "../../../src/schemas/taskSchema";
import type { TaskFormValues } from "../../../src/schemas/taskSchema";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    task,
    updateTask,
    deleteTask,
    uploadTaskPhoto,
    deleteTaskPhoto,
    isUploadingTaskPhoto,
    isDeletingTaskPhoto,
    isLoading,
    isError,
    error,
    refetchTask,
    isUpdatingTask,
    isDeletingTask,
  } = useTask(id);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [editingField, setEditingField] = useState<"title" | "description" | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [saveError, setSaveError] = useState(false);
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
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
      await deleteTask();
      router.replace("/");
    } catch {
      setDeleteError(true);
    }
  }

  async function addPhoto() {
    setPhotoError("");
    setIsTakingPhoto(true);
    try {
      const result = await takePhotoFromCamera();
      if (result.status === "cancelled") return;
      if (result.status === "denied") {
        setPhotoError("Se necesita permiso de cámara para tomar una foto.");
        return;
      }
      if (result.status === "unavailable") {
        setPhotoError("No se pudo abrir la cámara.");
        return;
      }

      await uploadTaskPhoto(result.uri);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "No se pudo subir la foto. Inténtalo de nuevo.",
      );
    } finally {
      setIsTakingPhoto(false);
    }
  }

  async function confirmDeletePhoto() {
    setPhotoError("");
    try {
      await deleteTaskPhoto();
      setPhotoDialogVisible(false);
    } catch {
      setPhotoError("No se pudo eliminar la foto.");
    }
  }

  function closeLocationDialog() {
    setLocationDialogVisible(false);
    setLocationError("");
  }

  async function addLocation() {
    if (!task) return;
    setLocationError("");
    setIsLoadingLocation(true);
    try {
      const result = await getCurrentCoords();
      if (result.status === "denied") {
        setLocationError("Se necesita permiso de ubicación.");
        return;
      }
      if (result.status === "unavailable") {
        setLocationError("No se pudo obtener la ubicación.");
        return;
      }
      const locationName = await getCityName(result.latitude, result.longitude);
      const values: TaskFormValues = {
        title: task.title,
        description: task.description ?? "",
        latitude: result.latitude,
        longitude: result.longitude,
        locationName,
      };
      await updateTask(values);
    } catch {
      setLocationError("No se pudo guardar la ubicación.");
    } finally {
      setIsLoadingLocation(false);
    }
  }

  async function confirmRemoveLocation() {
    if (!task) return;
    setLocationError("");
    try {
      const values: TaskFormValues = {
        title: task.title,
        description: task.description ?? "",
        latitude: null,
        longitude: null,
        locationName: null,
      };
      await updateTask(values);
      setLocationDialogVisible(false);
    } catch {
      setLocationError("No se pudo eliminar la ubicación.");
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
                  mode="outlined"
                  style={styles.titleInput}
                  outlineStyle={styles.inputOutline}
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
                mode="outlined"
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
                mode="outlined"
                style={styles.descriptionInput}
                outlineStyle={styles.inputOutline}
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
                  <View style={styles.locationActions}>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`,
                        )
                      }
                    >
                      Ver en el mapa
                    </Button>
                    <Button
                      compact
                      mode="text"
                      textColor={colors.error}
                      onPress={() => {
                        setLocationError("");
                        setLocationDialogVisible(true);
                      }}
                      disabled={isLoadingLocation || editingField !== null}
                    >
                      Eliminar ubicación
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <Text variant="bodyMedium" style={styles.locationText}>
                    Sin ubicación
                  </Text>
                  <Button
                    compact
                    mode="outlined"
                    onPress={() => void addLocation()}
                    loading={isLoadingLocation}
                    disabled={isLoadingLocation || editingField !== null}
                  >
                    Añadir ubicación
                  </Button>
                </>
              )}
              {locationError && (
                <Text variant="bodySmall" style={styles.inlineError}>
                  {locationError}
                </Text>
              )}
            </View>
            <View style={styles.photoSection}>
              <Text variant="labelMedium" style={styles.sectionLabel}>
                Foto
              </Text>
              {task.hasPhoto && (
                <TaskPhoto
                  task={task}
                  accessibilityLabel={`Foto de ${task.title}`}
                  style={styles.taskPhoto}
                />
              )}
              <Button
                mode={task.hasPhoto ? "text" : "outlined"}
                textColor={task.hasPhoto ? colors.error : undefined}
                onPress={() => {
                  setPhotoError("");
                  if (task.hasPhoto) setPhotoDialogVisible(true);
                  else void addPhoto();
                }}
                loading={isTakingPhoto || isUploadingTaskPhoto}
                disabled={
                  editingField !== null ||
                  isTakingPhoto ||
                  isUploadingTaskPhoto ||
                  isDeletingTaskPhoto
                }
              >
                {task.hasPhoto ? "Eliminar foto" : "Tomar foto"}
              </Button>
              {photoError && (
                <Text variant="bodySmall" style={styles.inlineError}>
                  {photoError}
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
                  buttonColor={colors.accent}
                >
                  Guardar
                </Button>
                <Button
                  mode="outlined"
                  onPress={cancelEditing}
                  disabled={isUpdatingTask}
                >
                  Cancelar
                </Button>
              </View>
            )}
          </View>
          {editingField === null && (
            <Text variant="bodySmall" style={styles.hint}>
              Toca el título o la descripción para editar. Usa los botones de ubicación para añadirla o quitarla.
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
        <Dialog
          visible={photoDialogVisible}
          onDismiss={() => setPhotoDialogVisible(false)}
        >
          <Dialog.Title>Eliminar foto</Dialog.Title>
          <Dialog.Content>
            <Text>¿Quieres eliminar la foto de esta tarea?</Text>
            {photoError && (
              <Text style={styles.deleteError}>{photoError}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPhotoDialogVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={confirmDeletePhoto}
              textColor={colors.error}
              loading={isDeletingTaskPhoto}
              disabled={isDeletingTaskPhoto}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={locationDialogVisible} onDismiss={closeLocationDialog}>
          <Dialog.Title>Eliminar ubicación</Dialog.Title>
          <Dialog.Content>
            <Text>¿Quieres eliminar la ubicación de esta tarea?</Text>
            {locationError && (
              <Text style={styles.deleteError}>{locationError}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeLocationDialog}>Cancelar</Button>
            <Button
              onPress={() => void confirmRemoveLocation()}
              textColor={colors.error}
              loading={isLoadingLocation}
              disabled={isLoadingLocation}
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  titleField: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
  },
  descriptionField: {
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.65,
  },
  titleInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
  },
  inputOutline: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deleteAction: {
    alignSelf: "flex-start",
    borderRadius: radius.md,
  },
  hint: {
    width: "100%",
    maxWidth: 640,
    color: colors.muted,
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  sectionLabel: {
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationDetails: {
    alignItems: "flex-start",
    gap: 8,
  },
  locationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoSection: {
    gap: 8,
  },
  taskPhoto: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
  },
  locationText: {
    color: colors.ink,
  },
  deleteError: {
    marginTop: 8,
    color: colors.error,
  },
});
