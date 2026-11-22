import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Platform,
  StyleSheet,
  Switch,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { Button, Text, TextInput as PaperTextInput } from "react-native-paper";
import { taskSchema, type TaskFormValues } from "../schemas/taskSchema";
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
  onSave: (values: TaskFormValues) => Promise<void> | void;
  onSuccess?: () => void;
  isSaving?: boolean;
}) {
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyValues,
  });

  const [saveError, setSaveError] = useState(false);
  const [locationWarning, setLocationWarning] = useState("");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTask = handleSubmit(async (values) => {
    setSaveError(false);
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
      await onSave({ ...values, latitude, longitude, locationName });
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
    } catch {
      setSaveError(true);
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
          No se pudo conectar con el servidor.
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
