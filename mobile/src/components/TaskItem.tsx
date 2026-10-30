import { Button, Card, Text } from "react-native-paper";
import type { Task } from "../types/Task";

type TaskItemProps = {
  task: Task;
};

export function TaskItem({ task }: TaskItemProps) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <Text variant="titleMedium">{task.title}</Text>
        <Text variant="bodyMedium">{task.description}</Text>
      </Card.Content>
      <Card.Actions>
        <Button compact disabled accessibilityLabel="Editar tarea">
          Editar
        </Button>
        <Button compact disabled accessibilityLabel="Eliminar tarea">
          Eliminar
        </Button>
      </Card.Actions>
    </Card>
  );
}
