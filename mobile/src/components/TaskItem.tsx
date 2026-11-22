import { Pressable, StyleSheet, View } from "react-native";
import { TaskPhoto } from "./TaskPhoto";
import { Text } from "react-native-paper";
import { colors, radius, shadow } from "../theme";
import type { Task } from "../types/Task";

type TaskItemProps = {
  task: Task;
  onView: () => void;
  onDelete: () => void;
};

export function TaskItem({ task, onView, onDelete }: TaskItemProps) {
  return (
    <View style={styles.row}>
      {task.hasPhoto && (
        <TaskPhoto
          taskId={task.id}
          accessibilityLabel={`Foto de ${task.title}`}
          style={styles.thumbnail}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${task.title}`}
        onPress={onView}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {task.description?.trim() || "Sin descripción"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${task.title}`}
        onPress={onDelete}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text variant="bodySmall" style={styles.deleteText}>
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
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.65,
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
    paddingHorizontal: 4,
  },
  deleteText: {
    color: colors.muted,
  },
});
