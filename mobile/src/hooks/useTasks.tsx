import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Task } from "../types/Task";

type TaskValues = Pick<Task, "title" | "description">;

type TasksContextValue = {
  tasks: Task[];
  addTask: (values: TaskValues) => void;
  updateTask: (id: string, values: TaskValues) => void;
  deleteTask: (id: string) => void;
};

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Preparar materiales",
    description: "Revisar los requisitos de la evaluación.",
  },
  {
    id: "2",
    title: "Diseñar la lista",
    description: "Mostrar título y descripción de cada tarea.",
  },
];

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks);
  const nextId = useRef(3);

  function addTask(values: TaskValues) {
    const id = String(nextId.current++);
    setTasks((current) => [...current, { id, ...values }]);
  }

  function updateTask(id: string, values: TaskValues) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...values } : task)),
    );
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) throw new Error("useTasks debe usarse dentro de TasksProvider");
  return context;
}
