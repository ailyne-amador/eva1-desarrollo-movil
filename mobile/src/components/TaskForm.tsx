import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Platform,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import {
  Button,
  Text,
  TextInput as PaperTextInput,
  useTheme,
} from "react-native-paper";
import { taskSchema, type TaskFormValues } from "../schemas/taskSchema";

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
  const theme = useTheme();

  if (Platform.OS !== "web") {
    return (
      <View style={styles.field}>
        <PaperTextInput
          accessibilityLabel={label}
          label={label}
          mode="outlined"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          error={Boolean(error)}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
        />
        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text variant="labelLarge">{label}</Text>
      <NativeTextInput
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          styles.webInput,
          {
            borderColor: error ? theme.colors.error : theme.colors.outline,
            backgroundColor: theme.colors.surface,
            color: theme.colors.onSurface,
          },
          multiline && styles.multiline,
        ]}
      />
      {error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TaskForm({
  defaultValues = emptyValues,
  onSave,
}: {
  defaultValues?: TaskFormValues;
  onSave: (values: TaskFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues,
  });

  const saveTask = handleSubmit((values) => {
    reset(defaultValues);
    onSave(values);
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
            label="Descripción"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
          />
        )}
      />
      <Button mode="contained" onPress={saveTask}>
        Guardar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
  },
  field: {
    gap: 8,
  },
  webInput: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  multiline: {
    height: 120,
    textAlignVertical: "top",
  },
});
