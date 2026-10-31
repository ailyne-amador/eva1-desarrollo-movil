import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "../theme";
import type { Task } from "../types/Task";

type TaskItemProps = {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${task.title}`}
        onPress={onEdit}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {task.description}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${task.title}`}
        onPress={onDelete}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text variant="bodyMedium" style={styles.deleteText}>
          Eliminar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    color: colors.ink,
    fontWeight: "600",
  },
  description: {
    color: colors.muted,
  },
  delete: {
    paddingVertical: 8,
  },
  deleteText: {
    color: colors.error,
  },
});
