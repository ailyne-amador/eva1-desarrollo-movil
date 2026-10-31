import { Button, Card, Text } from "react-native-paper";
import type { Task } from "../types/Task";

type TaskItemProps = {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <Text variant="titleMedium">{task.title}</Text>
        <Text variant="bodyMedium">{task.description}</Text>
      </Card.Content>
      <Card.Actions>
        <Button compact onPress={onEdit} accessibilityLabel="Editar tarea">
          Editar
        </Button>
        <Button compact onPress={onDelete} accessibilityLabel="Eliminar tarea">
          Eliminar
        </Button>
      </Card.Actions>
    </Card>
  );
}
