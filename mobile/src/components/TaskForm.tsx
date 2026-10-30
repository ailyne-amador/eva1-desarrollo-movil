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

type TaskFieldProps = {
  label: string;
  multiline?: boolean;
};

function TaskField({ label, multiline = false }: TaskFieldProps) {
  const theme = useTheme();

  if (Platform.OS !== "web") {
    return (
      <PaperTextInput
        label={label}
        mode="outlined"
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
      />
    );
  }

  return (
    <View style={styles.field}>
      <Text variant="labelLarge">{label}</Text>
      <NativeTextInput
        accessibilityLabel={label}
        placeholder={label}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          styles.webInput,
          {
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surface,
            color: theme.colors.onSurface,
          },
          multiline && styles.multiline,
        ]}
      />
    </View>
  );
}

export function TaskForm() {
  return (
    <View style={styles.container}>
      <TaskField label="Título" />
      <TaskField label="Descripción" multiline />
      <Button mode="contained" disabled>
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
