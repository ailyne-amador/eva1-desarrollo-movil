import { taskSchema } from "./taskSchema";

const task = { title: "Tarea", description: "" };

test("acepta tareas sin ubicación o con coordenadas y ciudad válidas", () => {
  expect(taskSchema.safeParse(task).success).toBe(true);
  expect(
    taskSchema.safeParse({
      ...task,
      latitude: 90,
      longitude: 180,
      locationName: "Bogotá",
    }).success,
  ).toBe(true);
});

test("rechaza coordenadas incompletas o fuera de rango", () => {
  expect(taskSchema.safeParse({ ...task, latitude: 10 }).success).toBe(false);
  expect(
    taskSchema.safeParse({ ...task, latitude: 91, longitude: 0 }).success,
  ).toBe(false);
});
