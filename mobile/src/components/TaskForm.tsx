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
} from "react-native-paper";
import { taskSchema, type TaskFormValues } from "../schemas/taskSchema";
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
      <Button
        mode="contained"
        onPress={saveTask}
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
  errorText: {
    color: colors.error,
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
