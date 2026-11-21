import { render, screen } from "@testing-library/react-native";
import { TaskItem } from "./TaskItem";

test("muestra el título de la tarea", async () => {
  await render(
    <TaskItem
      task={{
        id: "1",
        title: "Preparar evaluación",
        description: null,
        latitude: null,
        longitude: null,
        clientId: null,
        hasPhoto: false,
      }}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(screen.getByText("Preparar evaluación")).toBeTruthy();
});
