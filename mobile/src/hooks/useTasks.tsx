import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  getTasks,
  updateTask as updateTaskRequest,
} from "../services/api";
import type { TaskFormValues } from "../schemas/taskSchema";

const tasksQueryKey = ["tasks"] as const;

export function useTasks() {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({ queryKey: tasksQueryKey, queryFn: getTasks });
  const addMutation = useMutation({
    mutationFn: createTaskRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      updateTaskRequest(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteTaskRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isPending,
    isError: tasksQuery.isError,
    refetchTasks: tasksQuery.refetch,
    addTask: addMutation.mutateAsync,
    isAddingTask: addMutation.isPending,
    updateTask: (id: string, values: TaskFormValues) =>
      updateMutation.mutateAsync({ id, values }),
    isUpdatingTask: updateMutation.isPending,
    deleteTask: deleteMutation.mutateAsync,
    isDeletingTask: deleteMutation.isPending,
  };
}
