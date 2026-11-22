import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  Platform,
  StyleSheet,
  Switch,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { Button, Text, TextInput as PaperTextInput } from "react-native-paper";
import { taskSchema, type TaskFormValues } from "../schemas/taskSchema";
import { takePhoto as takePhotoFromCamera } from "../services/camera";
import { getCityName, getCurrentCoords } from "../services/location";
import { colors } from "../theme";

type TaskFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  multiline?: boolean;
};

const emptyValues: TaskFormValues = { title: "", description: "" };

function TaskField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  multiline = false,
}: TaskFieldProps) {
  const errorText = error ? (
    <Text variant="bodySmall" style={styles.errorText}>
      {error}
    </Text>
  ) : null;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.field}>
        <PaperTextInput
          accessibilityLabel={label}
          label={label}
          mode="flat"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          error={Boolean(error)}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          style={styles.flatInput}
        />
        {errorText}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={styles.webLabel}>
        {label}
      </Text>
      <NativeTextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        placeholderTextColor={colors.muted}
        style={[
          styles.webInput,
          { borderBottomColor: error ? colors.error : colors.line },
          multiline && styles.multiline,
        ]}
      />
      {errorText}
    </View>
  );
}

export function TaskForm({
  onSave,
  onSuccess,
  isSaving = false,
}: {
  onSave: (values: TaskFormValues, photoUri?: string) => Promise<void> | void;
  onSuccess?: () => void;
  isSaving?: boolean;
}) {
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyValues,
  });

  const [saveError, setSaveError] = useState("");
  const [locationWarning, setLocationWarning] = useState("");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  async function capturePhoto() {
    setPhotoError("");
    setIsTakingPhoto(true);
    const result = await takePhotoFromCamera();
    setIsTakingPhoto(false);
    if (result.status === "ok") setPhotoUri(result.uri);
    else if (result.status === "denied") {
      setPhotoError("Se necesita permiso de cámara para tomar una foto.");
    } else if (result.status === "unavailable") {
      setPhotoError("No se pudo abrir la cámara.");
    }
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTask = handleSubmit(async (values) => {
    setSaveError("");
    setLocationWarning("");
    setIsSubmitting(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationName: string | null = null;
      if (includeLocation) {
        const location = await getCurrentCoords();
        if (location.status === "ok") {
          latitude = location.latitude;
          longitude = location.longitude;
          locationName = await getCityName(latitude, longitude);
        }
      }
      const taskValues = { ...values, latitude, longitude, locationName };
      if (photoUri) await onSave(taskValues, photoUri);
      else await onSave(taskValues);
      setPhotoUri(null);
      reset(emptyValues);
      setIncludeLocation(false);
      if (includeLocation && latitude === null) {
        setLocationWarning(
          "Tarea guardada, pero no se pudo registrar la ubicación.",
        );
      } else if (includeLocation && locationName === null) {
        setLocationWarning(
          "Tarea guardada, pero no se pudo determinar la ciudad.",
        );
      } else {
        onSuccess?.();
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor.",
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TaskField
            label="Título"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TaskField
            label="Descripción (opcional)"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
          />
        )}
      />
      <View style={styles.photoSection}>
        <Button
          mode="outlined"
          onPress={() => void capturePhoto()}
          loading={isTakingPhoto}
          disabled={isSaving || isSubmitting || isTakingPhoto}
        >
          Tomar foto
        </Button>
        {photoUri && (
          <>
            <Image
              accessible
              accessibilityLabel="Vista previa de la foto"
              source={{ uri: photoUri }}
              resizeMode="cover"
              style={styles.photoPreview}
            />
            <Button
              onPress={() => setPhotoUri(null)}
              disabled={isSaving || isSubmitting}
            >
              Quitar foto
            </Button>
          </>
        )}
        {photoError && (
          <Text variant="bodySmall" style={styles.errorText}>
            {photoError}
          </Text>
        )}
      </View>
      <View style={styles.locationOption}>
        <View style={styles.locationOptionCopy}>
          <Text variant="bodyMedium">Añadir ubicación</Text>
          <Text variant="bodySmall" style={styles.locationHelp}>
            La ubicación actual se comparte con BigDataCloud para obtener la ciudad.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Añadir ubicación"
          accessibilityHint="Comparte tu ubicación actual con BigDataCloud al guardar."
          value={includeLocation}
          onValueChange={(value) => {
            setIncludeLocation(value);
            setLocationWarning("");
          }}
          disabled={isSaving || isSubmitting}
        />
      </View>
      {saveError && (
        <Text variant="bodyMedium" style={styles.errorText}>
          {saveError}
        </Text>
      )}
      {locationWarning && (
        <Text variant="bodySmall" style={styles.locationWarning}>
          {locationWarning}
        </Text>
      )}
      <Button
        mode="contained"
        onPress={saveTask}
        loading={isSaving || isSubmitting}
        disabled={isSaving || isSubmitting}
        style={styles.save}
        contentStyle={styles.saveContent}
      >
        Guardar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingHorizontal: 20,
  },
  field: {
    gap: 6,
  },
  flatInput: {
    backgroundColor: "transparent",
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationOptionCopy: {
    flex: 1,
    gap: 4,
  },
  locationHelp: {
    color: colors.muted,
  },
  errorText: {
    color: colors.error,
  },
  locationWarning: {
    color: colors.muted,
  },
  photoSection: {
    gap: 8,
  },
  photoPreview: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },
  webLabel: {
    color: colors.muted,
  },
  webInput: {
    minHeight: 48,
    borderBottomWidth: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 10,
    // RN no tipa outlineStyle, pero react-native-web sí lo aplica
    ...({ outlineStyle: "none" } as object),
  },
  multiline: {
    height: 120,
    textAlignVertical: "top",
  },
  save: {
    marginTop: 12,
    borderRadius: 28,
  },
  saveContent: {
    paddingVertical: 8,
  },
});
