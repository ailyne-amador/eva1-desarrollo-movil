import { render, screen } from "@testing-library/react-native";
import { TaskItem } from "./TaskItem";
jest.mock("../services/authStorage", () => ({
  getAuthToken: jest.fn().mockResolvedValue("token"),
}));
jest.mock("../services/photoStorage", () => ({
  getPhotoUri: jest.fn().mockResolvedValue(null),
}));

test("muestra el título de la tarea", async () => {
  await render(
    <TaskItem
      task={{
        id: "1",
        title: "Preparar evaluación",
        description: null,
        latitude: null,
        longitude: null,
        locationName: null,
        clientId: null,
        hasPhoto: false,
      }}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(screen.getByText("Preparar evaluación")).toBeTruthy();
  expect(screen.queryByLabelText("Foto de Preparar evaluación")).toBeNull();
});

test("muestra una miniatura accesible cuando la tarea tiene foto", async () => {
  await render(
    <TaskItem
      task={{
        id: "1",
        title: "Preparar evaluación",
        description: null,
        latitude: null,
        longitude: null,
        locationName: null,
        clientId: null,
        hasPhoto: true,
      }}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(await screen.findByLabelText("Foto de Preparar evaluación")).toBeTruthy();
});
